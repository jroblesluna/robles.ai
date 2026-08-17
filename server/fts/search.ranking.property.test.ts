import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { ensureFtsTable, type PostJson } from './indexer';

// --- Helpers ---

function createTestDb() {
  const db = new Database(':memory:');
  ensureFtsTable(db);
  return db;
}

/**
 * Filler text guaranteed not to contain any alphabetic search terms we generate.
 * Uses numeric/symbol-heavy content that won't match alpha-only search terms.
 */
const FILLER_TITLE = 'Lorem ipsum dolor sit amet consectetur';
const FILLER_EXCERPT = 'Pellentesque habitant morbi tristique senectus';
const FILLER_CONTENT = 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia';
const FILLER_CATEGORIES = 'general miscellaneous';

// --- Custom Arbitraries ---

/**
 * Generates unique search terms that are:
 * - Alphabetic only (safe for FTS5 tokenizer)
 * - Minimum 6 chars to avoid matching substrings in filler text
 * - Lowercase to ensure consistent matching
 * - Uses 'zx' prefix to guarantee no collision with filler text words
 */
const searchTermArb = fc
  .stringMatching(/^[a-z]{4,8}$/)
  .map((s) => `zx${s}`); // Prefix ensures no collision with Latin filler words

// --- Property Tests ---

describe('Search Ranking Property Tests', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Property 14: Title-weighted ranking (metamorphic)
   * **Validates: Requirements 6.1**
   *
   * For any search term T and two posts P1 and P2 where P1 contains T only in its title
   * and P2 contains T only in its content body, searching for T SHALL rank P1 higher than P2
   * (P1 appears before P2 in results).
   *
   * BM25 returns negative values where more negative = more relevant.
   * Title weight (10) > content weight (2), so P1 should have a more negative score.
   */
  it('Property 14: a post with search term in title ranks higher than a post with the same term in content body only', () => {
    fc.assert(
      fc.property(
        searchTermArb,
        (term) => {
          // Clean up from previous iteration
          db.exec('DELETE FROM blog_fts');

          // P1: term appears ONLY in title
          const p1Slug = 'p1-title-match';
          db.prepare(
            'INSERT INTO blog_fts (slug, language, title, excerpt, content, categories) VALUES (?, ?, ?, ?, ?, ?)',
          ).run(
            p1Slug,
            'en',
            `${term} ${FILLER_TITLE}`,
            FILLER_EXCERPT,
            FILLER_CONTENT,
            FILLER_CATEGORIES,
          );

          // P2: term appears ONLY in content body
          const p2Slug = 'p2-content-match';
          db.prepare(
            'INSERT INTO blog_fts (slug, language, title, excerpt, content, categories) VALUES (?, ?, ?, ?, ?, ?)',
          ).run(
            p2Slug,
            'en',
            FILLER_TITLE,
            FILLER_EXCERPT,
            `${FILLER_CONTENT} ${term} ${FILLER_CONTENT}`,
            FILLER_CATEGORIES,
          );

          // Execute search with BM25 ranking matching the design doc weights
          const results = db.prepare(`
            SELECT slug, bm25(blog_fts, 0, 0, 10, 5, 2, 3) as score
            FROM blog_fts
            WHERE blog_fts MATCH ?
            ORDER BY score
          `).all(term) as Array<{ slug: string; score: number }>;

          // Both posts should match
          expect(results).toHaveLength(2);

          // P1 (title match) should rank first (more negative score = more relevant)
          expect(results[0].slug).toBe(p1Slug);
          expect(results[1].slug).toBe(p2Slug);

          // Verify the score ordering: P1's score should be more negative (better) than P2's
          expect(results[0].score).toBeLessThan(results[1].score);
        },
      ),
      { numRuns: 100 },
    );
  });
});
