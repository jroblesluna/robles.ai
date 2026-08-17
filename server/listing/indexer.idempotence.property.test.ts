import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { ensureListingTable, rebuildListingIndex, type PostJson } from './indexer';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// --- Helpers ---

function createTestDb() {
  const db = new Database(':memory:');
  ensureListingTable(db);
  return db;
}

// --- Custom Arbitraries ---

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

/** Arbitrary for a non-empty trimmed string suitable for titles/excerpts. */
const nonEmptyTextArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,40}$/);

/** Arbitrary for a content section. */
const contentSectionArb = fc.record({
  heading: nonEmptyTextArb,
  body: nonEmptyTextArb,
});

/** Arbitrary for a valid translation object. */
const validTranslationArb = fc.record({
  title: nonEmptyTextArb,
  excerpt: nonEmptyTextArb,
  content: fc.array(contentSectionArb, { minLength: 1, maxLength: 3 }),
});

/** Arbitrary for a valid PostJson with listing-specific fields. */
const validListingPostArb: fc.Arbitrary<PostJson> = fc
  .tuple(
    slugArb,
    dateArb,
    fc.integer({ min: 1, max: 20 }),
    fc.array(fc.stringMatching(/^[A-Za-z]{2,10}$/), { minLength: 0, maxLength: 4 }),
    validTranslationArb,
    validTranslationArb,
  )
  .map(([slug, date, editorId, categories, en, es]) => ({
    slug,
    date,
    editorId,
    categories,
    translations: { en, es },
  }));

/**
 * Generates an array of unique PostJson objects (unique by slug).
 */
const uniquePostsArb = fc
  .array(validListingPostArb, { minLength: 1, maxLength: 15 })
  .map((posts) => {
    const seen = new Map<string, PostJson>();
    for (const post of posts) {
      seen.set(post.slug, post);
    }
    return Array.from(seen.values());
  })
  .filter((arr) => arr.length >= 1);

// --- Property Tests ---

describe('Listing Indexer — Property 2: Rebuild Idempotence', () => {
  let db: InstanceType<typeof Database>;
  let tempDir: string;

  beforeEach(() => {
    db = createTestDb();
    tempDir = mkdtempSync(join(tmpdir(), 'listing-idempotence-'));
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Property 2: Rebuild Idempotence
   * **Validates: Requirements 2.2, 2.4**
   *
   * For any set of JSON files on disk, calling `rebuildListingIndex` twice in
   * succession produces the same database state as calling it once (same row
   * count, same data).
   */
  it('calling rebuildListingIndex twice produces the same state as calling it once', async () => {
    await fc.assert(
      fc.asyncProperty(uniquePostsArb, async (posts) => {
        // Write each post as a JSON file in the temp directory
        for (const post of posts) {
          const filename = `${post.slug}.json`;
          writeFileSync(join(tempDir, filename), JSON.stringify(post), 'utf-8');
        }

        // First rebuild
        await rebuildListingIndex(db, tempDir);

        // Snapshot after first rebuild (exclude created_at)
        const snapshot1 = db
          .prepare(
            'SELECT slug, date, editor_id, categories, title_en, excerpt_en, title_es, excerpt_es FROM blog_posts_index ORDER BY slug',
          )
          .all();

        // Second rebuild
        await rebuildListingIndex(db, tempDir);

        // Snapshot after second rebuild (exclude created_at)
        const snapshot2 = db
          .prepare(
            'SELECT slug, date, editor_id, categories, title_en, excerpt_en, title_es, excerpt_es FROM blog_posts_index ORDER BY slug',
          )
          .all();

        // Assert same row count
        expect(snapshot2.length).toBe(snapshot1.length);

        // Assert same data per row
        for (let i = 0; i < snapshot1.length; i++) {
          expect(snapshot2[i]).toEqual(snapshot1[i]);
        }

        // Clean up table for next iteration
        db.exec('DELETE FROM blog_posts_index');

        // Clean up temp files for next iteration
        const fs = await import('fs');
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(join(tempDir, file));
        }
      }),
      { numRuns: 100 },
    );
  });
});
