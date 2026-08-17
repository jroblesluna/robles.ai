import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { ensureFtsTable, indexPost, indexNewPosts, type PostJson } from './indexer';

// --- Helpers ---

function createTestDb() {
  const db = new Database(':memory:');
  ensureFtsTable(db);
  return db;
}

// --- Custom Arbitraries ---

/** Arbitrary for a non-empty trimmed string suitable for titles/excerpts. */
const nonEmptyTextArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,40}$/);

/** Arbitrary for a content section (heading + body). */
const contentSectionArb = fc.record({
  heading: nonEmptyTextArb,
  body: nonEmptyTextArb,
});

/** Arbitrary for a valid translation object. */
const validTranslationArb = fc.record({
  title: nonEmptyTextArb,
  excerpt: nonEmptyTextArb,
  content: fc.array(contentSectionArb, { minLength: 1, maxLength: 5 }),
});

/** Arbitrary for a slug string (date-prefixed format). */
const slugArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.array(fc.stringMatching(/^[a-z]{2,8}$/), { minLength: 2, maxLength: 5 }),
  )
  .map(([year, month, day, words]) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}-${words.join('-')}`;
  });

/** Arbitrary for a fully valid PostJson with both translations. */
const validPostArb: fc.Arbitrary<PostJson> = fc
  .tuple(slugArb, validTranslationArb, validTranslationArb, fc.array(fc.stringMatching(/^[A-Za-z]{2,10}$/), { minLength: 1, maxLength: 4 }))
  .map(([slug, en, es, categories]) => ({
    slug,
    categories,
    translations: { en, es },
  }));

/** Arbitrary for an invalid PostJson (missing translations). */
const invalidPostArb: fc.Arbitrary<PostJson> = fc
  .tuple(slugArb, fc.array(fc.stringMatching(/^[A-Za-z]{2,10}$/), { minLength: 0, maxLength: 3 }))
  .map(([slug, categories]) => ({
    slug,
    categories,
    translations: {},
  }));

// --- Property Tests ---

describe('Indexer Indexing Property Tests', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Property 5: Indexing idempotency
   * **Validates: Requirements 2.7**
   *
   * For any valid post, calling indexPost N times (N >= 1) produces
   * the same number of rows as calling it exactly once.
   */
  it('Property 5: indexing the same post N times produces the same row count as indexing once', () => {
    fc.assert(
      fc.property(
        validPostArb,
        fc.integer({ min: 2, max: 10 }),
        (post, n) => {
          // Clear the table
          db.exec('DELETE FROM blog_fts');

          // Index once and record the row count
          indexPost(db, post);
          const countAfterOnce = (db.prepare('SELECT count(*) as cnt FROM blog_fts').get() as { cnt: number }).cnt;

          // Index N-1 more times (total N)
          for (let i = 1; i < n; i++) {
            indexPost(db, post);
          }
          const countAfterN = (db.prepare('SELECT count(*) as cnt FROM blog_fts').get() as { cnt: number }).cnt;

          // The row count should be the same
          expect(countAfterN).toBe(countAfterOnce);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Upsert replaces content
   * **Validates: Requirements 3.3**
   *
   * For any post that has been indexed with content A, re-indexing the same post
   * (same slug) with content B results in only content B being present — no duplicates, no stale data.
   */
  it('Property 6: re-indexing a post with new content replaces old content, no duplicates', () => {
    fc.assert(
      fc.property(
        validPostArb,
        validTranslationArb,
        validTranslationArb,
        (originalPost, newEn, newEs) => {
          // Clear the table
          db.exec('DELETE FROM blog_fts');

          // Index the original post
          indexPost(db, originalPost);

          // Create an updated version with same slug but new content
          const updatedPost: PostJson = {
            slug: originalPost.slug,
            categories: originalPost.categories,
            translations: { en: newEn, es: newEs },
          };

          // Re-index with new content
          indexPost(db, updatedPost);

          // Verify: no duplicates — still exactly 2 rows for this slug
          const rows = db.prepare('SELECT * FROM blog_fts WHERE slug = ?').all(originalPost.slug) as any[];
          expect(rows).toHaveLength(2);

          // Verify: content matches the new version, not the old
          const enRow = rows.find((r: any) => r.language === 'en');
          const esRow = rows.find((r: any) => r.language === 'es');

          expect(enRow).toBeDefined();
          expect(esRow).toBeDefined();
          expect(enRow.title).toBe(newEn.title);
          expect(esRow.title).toBe(newEs.title);
          expect(enRow.excerpt).toBe(newEn.excerpt);
          expect(esRow.excerpt).toBe(newEs.excerpt);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7: Resilient batch processing
   * **Validates: Requirements 3.4**
   *
   * For any batch of PostJson objects containing a mix of valid and invalid entries,
   * indexing the batch successfully indexes all valid posts regardless of how many invalid posts are in the batch.
   */
  it('Property 7: a batch with valid and invalid posts indexes all valid posts regardless of invalid ones', () => {
    fc.assert(
      fc.property(
        fc.array(validPostArb, { minLength: 1, maxLength: 10 }),
        fc.array(invalidPostArb, { minLength: 0, maxLength: 10 }),
        (validPosts, invalidPosts) => {
          // Clear the table
          db.exec('DELETE FROM blog_fts');

          // Deduplicate valid posts by slug to avoid counting issues
          const uniqueValidPosts = new Map<string, PostJson>();
          for (const post of validPosts) {
            uniqueValidPosts.set(post.slug, post);
          }
          const deduped = Array.from(uniqueValidPosts.values());

          // Interleave valid and invalid posts
          const batch: PostJson[] = [];
          let vi = 0;
          let ii = 0;
          while (vi < deduped.length || ii < invalidPosts.length) {
            if (vi < deduped.length) batch.push(deduped[vi++]);
            if (ii < invalidPosts.length) batch.push(invalidPosts[ii++]);
          }

          // Index the mixed batch
          indexNewPosts(db, batch);

          // Verify: all valid posts should be indexed (2 rows each: en + es)
          const totalRows = (db.prepare('SELECT count(*) as cnt FROM blog_fts').get() as { cnt: number }).cnt;
          expect(totalRows).toBe(deduped.length * 2);

          // Verify: each valid post's slug exists in the table
          for (const post of deduped) {
            const postRows = db.prepare('SELECT * FROM blog_fts WHERE slug = ?').all(post.slug);
            expect(postRows).toHaveLength(2);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
