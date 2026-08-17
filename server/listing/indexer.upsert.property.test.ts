import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { ensureListingTable, indexListingPosts, type PostJson } from './indexer';

// --- Helpers ---

function createTestDb() {
  const db = new Database(':memory:');
  ensureListingTable(db);
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

/** Arbitrary for a date string (YYYY-MM-DD). */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([year, month, day]) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  });

/** Arbitrary for a category array. */
const categoriesArb = fc.array(fc.stringMatching(/^[A-Za-z]{2,10}$/), { minLength: 1, maxLength: 4 });

/** Arbitrary for an editorId. */
const editorIdArb = fc.integer({ min: 1, max: 50 });

/** Arbitrary for a fully valid PostJson with both translations. */
const validListingPostArb: fc.Arbitrary<PostJson> = fc
  .tuple(slugArb, dateArb, editorIdArb, categoriesArb, validTranslationArb, validTranslationArb)
  .map(([slug, date, editorId, categories, en, es]) => ({
    slug,
    date,
    editorId,
    categories,
    translations: { en, es },
  }));

// --- Property Tests ---

describe('Listing Indexer Upsert Property Tests', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Property 3: Upsert Preserves Latest Data
   * **Validates: Requirements 3.2, 3.3**
   *
   * For any post object, calling `indexListingPosts` with that post SHALL result in the
   * `blog_posts_index` row for that slug containing the exact metadata from that post object
   * (regardless of whether a prior row existed).
   */
  it('Property 3: upserting a post twice with different data preserves the latest data', () => {
    fc.assert(
      fc.property(
        slugArb,
        validListingPostArb,
        validListingPostArb,
        (sharedSlug, firstPostBase, secondPostBase) => {
          // Clear the table
          db.exec('DELETE FROM blog_posts_index');

          // Create two posts with the SAME slug but different data
          const firstPost: PostJson = { ...firstPostBase, slug: sharedSlug };
          const secondPost: PostJson = { ...secondPostBase, slug: sharedSlug };

          // Index the first post
          indexListingPosts(db, [firstPost]);

          // Verify first post is stored
          const rowAfterFirst = db.prepare('SELECT * FROM blog_posts_index WHERE slug = ?').get(sharedSlug) as any;
          expect(rowAfterFirst).toBeDefined();
          expect(rowAfterFirst.slug).toBe(sharedSlug);

          // Index the second post (upsert — same slug, new data)
          indexListingPosts(db, [secondPost]);

          // Query the row for that slug
          const row = db.prepare('SELECT * FROM blog_posts_index WHERE slug = ?').get(sharedSlug) as any;

          // Assert: the row matches the SECOND (most recent) post's data
          expect(row).toBeDefined();
          expect(row.slug).toBe(sharedSlug);
          expect(row.date).toBe(secondPost.date);
          expect(row.editor_id).toBe(secondPost.editorId);
          expect(row.categories).toBe(JSON.stringify(secondPost.categories || []));
          expect(row.title_en).toBe(secondPost.translations.en?.title ?? null);
          expect(row.excerpt_en).toBe(secondPost.translations.en?.excerpt ?? null);
          expect(row.title_es).toBe(secondPost.translations.es?.title ?? null);
          expect(row.excerpt_es).toBe(secondPost.translations.es?.excerpt ?? null);

          // Confirm there's only one row for that slug (no duplicates)
          const count = db.prepare('SELECT COUNT(*) as cnt FROM blog_posts_index WHERE slug = ?').get(sharedSlug) as { cnt: number };
          expect(count.cnt).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
