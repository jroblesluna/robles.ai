import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { ensureListingTable, indexListingPosts, type PostJson } from './indexer';

// --- Custom Arbitraries ---

/** Arbitrary for a date string in YYYY-MM-DD format. */
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

/** Arbitrary for editor ID (small range for filtering tests). */
const editorIdArb = fc.integer({ min: 1, max: 5 });

/** Arbitrary for a categories array from a known pool. */
const categoryPool = ['AI', 'Cloud', 'DevOps', 'ML', 'Security', 'Web', 'Data'];
const categoriesArb = fc.subarray(categoryPool, { minLength: 1, maxLength: 4 });

/** Arbitrary for a non-empty trimmed string suitable for titles/excerpts. */
const nonEmptyTextArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,30}$/);

/** Arbitrary for a translation object with title and excerpt. */
const translationArb = fc.record({
  title: nonEmptyTextArb,
  excerpt: nonEmptyTextArb,
  content: fc.constant([{ heading: 'Test', body: 'Content' }]),
});

/**
 * Generates a list of N posts with unique slugs.
 * Uses an index suffix to guarantee uniqueness.
 */
function uniquePostsArb(minLength: number, maxLength: number): fc.Arbitrary<PostJson[]> {
  return fc
    .tuple(
      fc.integer({ min: minLength, max: maxLength }),
      fc.array(
        fc.tuple(dateArb, editorIdArb, categoriesArb, translationArb, translationArb),
        { minLength: maxLength, maxLength: maxLength },
      ),
    )
    .map(([count, tuples]) => {
      return tuples.slice(0, count).map(([date, editorId, categories, en, es], idx) => ({
        slug: `${date}-post-${idx}`,
        date,
        editorId,
        categories,
        translations: { en, es },
      }));
    });
}

// --- Query Helper (mirrors GET /api/blog handler logic) ---

function queryBlog(
  db: Database.Database,
  params: { page?: number; limit?: number; editorId?: number; category?: string },
) {
  let page = params.page || 1;
  let limit = params.limit || 9;
  if (limit > 100) limit = 100;
  if (page < 1) page = 1;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (params.editorId) {
    conditions.push('editor_id = ?');
    queryParams.push(params.editorId);
  }
  if (params.category) {
    conditions.push('categories LIKE ?');
    queryParams.push(`%"${params.category}"%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const posts = db
    .prepare(
      `SELECT slug, date, editor_id, categories, title_en, excerpt_en, title_es, excerpt_es
       FROM blog_posts_index ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`,
    )
    .all(...queryParams, limit, offset) as any[];

  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM blog_posts_index ${whereClause}`)
    .get(...queryParams) as { total: number };

  const transformed = posts.map((row: any) => ({
    slug: row.slug,
    date: row.date,
    editorId: row.editor_id,
    translations: {
      en: { title: row.title_en || '', excerpt: row.excerpt_en || '' },
      es: { title: row.title_es || '', excerpt: row.excerpt_es || '' },
    },
  }));

  return { posts: transformed, total: totalRow.total };
}

// --- Test Suite ---

describe('Listing API — Property Tests (Properties 4–7)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    ensureListingTable(db);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Property 4: Pagination Completeness
   * **Validates: Requirements 4.2, 4.6**
   *
   * For any total set of N posts in the index, iterating through all pages
   * with a fixed limit SHALL return exactly N distinct posts with no duplicates
   * and no omissions.
   */
  describe('Property 4: Pagination Completeness', () => {
    it('iterating all pages returns exactly N distinct posts', () => {
      fc.assert(
        fc.property(
          uniquePostsArb(1, 30),
          fc.integer({ min: 1, max: 10 }),
          (posts, limit) => {
            // Clear and seed DB
            db.exec('DELETE FROM blog_posts_index');
            indexListingPosts(db, posts);

            const allSlugs: string[] = [];
            let page = 1;

            // Iterate pages until empty
            while (true) {
              const result = queryBlog(db, { page, limit });
              if (result.posts.length === 0) break;
              for (const post of result.posts) {
                allSlugs.push(post.slug);
              }
              page++;
              // Safety limit to prevent infinite loops
              if (page > posts.length + 2) break;
            }

            // All posts accounted for (no omissions)
            expect(allSlugs.length).toBe(posts.length);

            // No duplicates
            const uniqueSlugs = new Set(allSlugs);
            expect(uniqueSlugs.size).toBe(posts.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Editor Filter Correctness
   * **Validates: Requirements 4.3, 4.7**
   *
   * For any editor_id value, querying with that filter SHALL return only posts
   * whose editor_id matches, and the count SHALL equal the number of matching
   * rows in the full table.
   */
  describe('Property 5: Editor Filter Correctness', () => {
    it('filter returns only matching editor_id rows with correct total', () => {
      fc.assert(
        fc.property(
          uniquePostsArb(5, 25),
          editorIdArb,
          (posts, filterEditorId) => {
            // Clear and seed DB
            db.exec('DELETE FROM blog_posts_index');
            indexListingPosts(db, posts);

            // Expected: posts matching the filter
            const expectedCount = posts.filter((p) => p.editorId === filterEditorId).length;

            // Query all pages with the editor filter
            const allMatchingSlugs: string[] = [];
            let page = 1;
            const limit = 100; // Large limit to get all in one page

            const result = queryBlog(db, { page, limit, editorId: filterEditorId });

            // Total count matches expected
            expect(result.total).toBe(expectedCount);

            // All returned posts have the correct editorId
            for (const post of result.posts) {
              expect(post.editorId).toBe(filterEditorId);
            }

            // Returned count matches total
            expect(result.posts.length).toBe(expectedCount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Category Filter Correctness
   * **Validates: Requirements 8.1, 8.2**
   *
   * For any category string, querying with that filter SHALL return only posts
   * whose categories JSON array contains that category value.
   */
  describe('Property 6: Category Filter Correctness', () => {
    it('filter returns only posts containing the category', () => {
      fc.assert(
        fc.property(
          uniquePostsArb(5, 25),
          fc.constantFrom(...categoryPool),
          (posts, filterCategory) => {
            // Clear and seed DB
            db.exec('DELETE FROM blog_posts_index');
            indexListingPosts(db, posts);

            // Expected: posts whose categories include the filter value
            const expectedSlugs = posts
              .filter((p) => (p.categories || []).includes(filterCategory))
              .map((p) => p.slug);

            // Query with category filter (large limit to get all)
            const result = queryBlog(db, { page: 1, limit: 100, category: filterCategory });

            // Total matches expected count
            expect(result.total).toBe(expectedSlugs.length);

            // All returned posts contain the category
            for (const post of result.posts) {
              // Retrieve categories from DB for this slug
              const row = db
                .prepare('SELECT categories FROM blog_posts_index WHERE slug = ?')
                .get(post.slug) as { categories: string } | undefined;
              expect(row).toBeDefined();
              const cats: string[] = JSON.parse(row!.categories || '[]');
              expect(cats).toContain(filterCategory);
            }

            // No matching posts are missing from results
            const returnedSlugs = result.posts.map((p: any) => p.slug);
            for (const slug of expectedSlugs) {
              expect(returnedSlugs).toContain(slug);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Date Ordering
   * **Validates: Requirements 4.4**
   *
   * For any page of results returned by the listing API, the posts SHALL be
   * sorted in strictly non-increasing order by date.
   */
  describe('Property 7: Date Ordering', () => {
    it('results are in non-increasing date order', () => {
      fc.assert(
        fc.property(
          uniquePostsArb(2, 30),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (posts, limit, page) => {
            // Clear and seed DB
            db.exec('DELETE FROM blog_posts_index');
            indexListingPosts(db, posts);

            const result = queryBlog(db, { page, limit });

            // Check consecutive pairs are in non-increasing date order
            for (let i = 0; i < result.posts.length - 1; i++) {
              const current = result.posts[i].date;
              const next = result.posts[i + 1].date;
              expect(current >= next).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
