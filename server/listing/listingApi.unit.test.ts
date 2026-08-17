import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ensureListingTable, indexListingPosts, type PostJson } from './indexer';

/**
 * Helper that mirrors the listing handler's SQL query logic.
 */
function queryBlog(
  db: Database.Database,
  params: { page?: number; limit?: number; editorId?: number; category?: string }
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
       FROM blog_posts_index ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`
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

/**
 * Generates N test posts with sequential dates and configurable editorId/categories.
 */
function generatePosts(
  count: number,
  overrides?: Partial<PostJson> & { editorIdFn?: (i: number) => number; categoriesFn?: (i: number) => string[] }
): PostJson[] {
  const posts: PostJson[] = [];
  for (let i = 0; i < count; i++) {
    const day = String(i + 1).padStart(2, '0');
    posts.push({
      slug: `post-${i}`,
      date: `2025-01-${day}`,
      editorId: overrides?.editorIdFn ? overrides.editorIdFn(i) : overrides?.editorId ?? 1,
      categories: overrides?.categoriesFn ? overrides.categoriesFn(i) : overrides?.categories ?? ['General'],
      translations: {
        en: { title: `Post ${i} EN`, excerpt: `Excerpt ${i} EN`, content: [] },
        es: { title: `Post ${i} ES`, excerpt: `Excerpt ${i} ES`, content: [] },
      },
    });
  }
  return posts;
}

describe('Listing API query logic', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    ensureListingTable(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('default pagination', () => {
    it('returns 9 posts on page 1 when no params given and total reflects all posts', () => {
      const posts = generatePosts(15);
      indexListingPosts(db, posts);

      const result = queryBlog(db, {});

      expect(result.posts).toHaveLength(9);
      expect(result.total).toBe(15);
    });

    it('returns remaining posts on page 2', () => {
      const posts = generatePosts(15);
      indexListingPosts(db, posts);

      const result = queryBlog(db, { page: 2 });

      expect(result.posts).toHaveLength(6);
      expect(result.total).toBe(15);
    });
  });

  describe('editorId filter', () => {
    it('returns only posts matching the given editorId', () => {
      const posts = generatePosts(10, {
        editorIdFn: (i) => (i < 6 ? 1 : 2),
      });
      indexListingPosts(db, posts);

      const result = queryBlog(db, { editorId: 1 });

      expect(result.posts).toHaveLength(6);
      expect(result.total).toBe(6);
      result.posts.forEach((p) => {
        expect(p.editorId).toBe(1);
      });
    });

    it('returns zero posts for non-existent editorId', () => {
      const posts = generatePosts(5);
      indexListingPosts(db, posts);

      const result = queryBlog(db, { editorId: 999 });

      expect(result.posts).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('category filter', () => {
    it('returns only posts containing the specified category', () => {
      const posts = generatePosts(10, {
        categoriesFn: (i) => (i < 4 ? ['AI', 'Cloud'] : ['DevOps']),
      });
      indexListingPosts(db, posts);

      const result = queryBlog(db, { category: 'AI' });

      expect(result.posts).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it('returns only posts with the exact category match (not partial)', () => {
      const posts: PostJson[] = [
        {
          slug: 'ai-post',
          date: '2025-01-01',
          editorId: 1,
          categories: ['AI'],
          translations: { en: { title: 'AI', excerpt: '', content: [] } },
        },
        {
          slug: 'fair-post',
          date: '2025-01-02',
          editorId: 1,
          categories: ['FAIR'],
          translations: { en: { title: 'FAIR', excerpt: '', content: [] } },
        },
      ];
      indexListingPosts(db, posts);

      const result = queryBlog(db, { category: 'AI' });

      // "AI" should match only the post with ["AI"], not ["FAIR"]
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].slug).toBe('ai-post');
    });
  });

  describe('combined filters', () => {
    it('applies editorId AND category filter together', () => {
      const posts: PostJson[] = [
        { slug: 'match', date: '2025-01-03', editorId: 1, categories: ['AI'], translations: { en: { title: 'A', excerpt: '', content: [] } } },
        { slug: 'editor-only', date: '2025-01-02', editorId: 1, categories: ['DevOps'], translations: { en: { title: 'B', excerpt: '', content: [] } } },
        { slug: 'cat-only', date: '2025-01-01', editorId: 2, categories: ['AI'], translations: { en: { title: 'C', excerpt: '', content: [] } } },
      ];
      indexListingPosts(db, posts);

      const result = queryBlog(db, { editorId: 1, category: 'AI' });

      expect(result.posts).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.posts[0].slug).toBe('match');
    });
  });

  describe('invalid page/limit defaults', () => {
    it('defaults page to 1 when page is less than 1', () => {
      const posts = generatePosts(5);
      indexListingPosts(db, posts);

      const result = queryBlog(db, { page: -1 });

      expect(result.posts).toHaveLength(5);
      expect(result.total).toBe(5);
    });

    it('caps limit at 100 when a larger value is provided', () => {
      const posts = generatePosts(5);
      indexListingPosts(db, posts);

      const result = queryBlog(db, { limit: 500 });

      // Should still return all 5 posts (capped at 100, but only 5 exist)
      expect(result.posts).toHaveLength(5);
      expect(result.total).toBe(5);
    });

    it('defaults limit to 9 when not provided', () => {
      const posts = generatePosts(20);
      indexListingPosts(db, posts);

      const result = queryBlog(db, {});

      expect(result.posts).toHaveLength(9);
    });
  });

  describe('date ordering', () => {
    it('returns posts in descending date order', () => {
      const posts: PostJson[] = [
        { slug: 'oldest', date: '2025-01-01', editorId: 1, categories: [], translations: { en: { title: 'Old', excerpt: '', content: [] } } },
        { slug: 'newest', date: '2025-03-15', editorId: 1, categories: [], translations: { en: { title: 'New', excerpt: '', content: [] } } },
        { slug: 'middle', date: '2025-02-10', editorId: 1, categories: [], translations: { en: { title: 'Mid', excerpt: '', content: [] } } },
      ];
      indexListingPosts(db, posts);

      const result = queryBlog(db, {});

      expect(result.posts[0].slug).toBe('newest');
      expect(result.posts[1].slug).toBe('middle');
      expect(result.posts[2].slug).toBe('oldest');

      // Verify non-increasing order
      for (let i = 0; i < result.posts.length - 1; i++) {
        expect(result.posts[i].date >= result.posts[i + 1].date).toBe(true);
      }
    });
  });

  describe('response shape', () => {
    it('returns posts with correct transformed structure', () => {
      const posts: PostJson[] = [
        {
          slug: 'shape-test',
          date: '2025-06-01',
          editorId: 3,
          categories: ['AI', 'Cloud'],
          translations: {
            en: { title: 'Title EN', excerpt: 'Excerpt EN', content: [] },
            es: { title: 'Título ES', excerpt: 'Extracto ES', content: [] },
          },
        },
      ];
      indexListingPosts(db, posts);

      const result = queryBlog(db, {});

      expect(result.posts).toHaveLength(1);
      const post = result.posts[0];
      expect(post.slug).toBe('shape-test');
      expect(post.date).toBe('2025-06-01');
      expect(post.editorId).toBe(3);
      expect(post.translations.en.title).toBe('Title EN');
      expect(post.translations.en.excerpt).toBe('Excerpt EN');
      expect(post.translations.es.title).toBe('Título ES');
      expect(post.translations.es.excerpt).toBe('Extracto ES');
    });
  });
});
