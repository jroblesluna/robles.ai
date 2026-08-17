import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ensureFtsTable, extractContent, indexPost, indexNewPosts, type PostJson } from './indexer';

function createTestDb() {
  const db = new Database(':memory:');
  ensureFtsTable(db);
  return db;
}

function makeValidPost(slug = 'test-post'): PostJson {
  return {
    slug,
    categories: ['AI', 'Technology'],
    translations: {
      en: {
        title: 'Test Post Title',
        excerpt: 'A short excerpt about the test post.',
        content: [
          { heading: 'Introduction', body: 'This is the introduction body.' },
          { heading: 'Conclusion', body: 'This is the conclusion body.' },
        ],
      },
      es: {
        title: 'Título del Post de Prueba',
        excerpt: 'Un breve extracto sobre el post de prueba.',
        content: [
          { heading: 'Introducción', body: 'Este es el cuerpo de la introducción.' },
          { heading: 'Conclusión', body: 'Este es el cuerpo de la conclusión.' },
        ],
      },
    },
  };
}

describe('ensureFtsTable', () => {
  it('creates the blog_fts table', () => {
    const db = new Database(':memory:');
    ensureFtsTable(db);

    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_fts'"
    ).get() as { name: string } | undefined;

    expect(table).toBeDefined();
    expect(table!.name).toBe('blog_fts');
    db.close();
  });

  it('does not throw when called twice (idempotent)', () => {
    const db = new Database(':memory:');
    ensureFtsTable(db);
    expect(() => ensureFtsTable(db)).not.toThrow();
    db.close();
  });
});

describe('extractContent', () => {
  it('produces 2 rows for a post with both translations', () => {
    const post = makeValidPost();
    const rows = extractContent(post);

    expect(rows).toHaveLength(2);
    expect(rows[0].language).toBe('en');
    expect(rows[1].language).toBe('es');
    expect(rows[0].slug).toBe('test-post');
    expect(rows[1].slug).toBe('test-post');
  });

  it('concatenates all headings and bodies into content', () => {
    const post = makeValidPost();
    const rows = extractContent(post);

    const enRow = rows[0];
    expect(enRow.content).toContain('Introduction');
    expect(enRow.content).toContain('This is the introduction body.');
    expect(enRow.content).toContain('Conclusion');
    expect(enRow.content).toContain('This is the conclusion body.');
  });

  it('joins categories with spaces', () => {
    const post = makeValidPost();
    const rows = extractContent(post);

    expect(rows[0].categories).toBe('AI Technology');
  });

  it('returns empty array when translations are missing', () => {
    const post: PostJson = {
      slug: 'empty-post',
      categories: [],
      translations: {},
    };
    const rows = extractContent(post);
    expect(rows).toHaveLength(0);
  });

  it('skips a translation missing title', () => {
    const post: PostJson = {
      slug: 'partial-post',
      categories: ['Test'],
      translations: {
        en: {
          title: '',  // empty title
          excerpt: 'Has excerpt',
          content: [{ heading: 'H', body: 'B' }],
        },
        es: {
          title: 'Título válido',
          excerpt: 'Extracto válido',
          content: [{ heading: 'H', body: 'B' }],
        },
      },
    };
    const rows = extractContent(post);
    expect(rows).toHaveLength(1);
    expect(rows[0].language).toBe('es');
  });

  it('skips a translation missing content array', () => {
    const post: PostJson = {
      slug: 'no-content-post',
      categories: [],
      translations: {
        en: {
          title: 'Has Title',
          excerpt: 'Has Excerpt',
          content: undefined as any,
        },
      },
    };
    const rows = extractContent(post);
    expect(rows).toHaveLength(0);
  });
});

describe('indexPost', () => {
  let db: ReturnType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('inserts rows for a valid post', () => {
    const post = makeValidPost();
    indexPost(db, post);

    const rows = db.prepare('SELECT * FROM blog_fts').all();
    expect(rows).toHaveLength(2);
  });

  it('replaces content on re-index (upsert)', () => {
    const post = makeValidPost();
    indexPost(db, post);

    // Modify and re-index
    post.translations.en!.title = 'Updated Title';
    indexPost(db, post);

    const rows = db.prepare('SELECT * FROM blog_fts WHERE slug = ?').all('test-post') as any[];
    expect(rows).toHaveLength(2);

    const enRow = rows.find((r: any) => r.language === 'en');
    expect(enRow.title).toBe('Updated Title');
  });

  it('does not insert rows for invalid posts', () => {
    const post: PostJson = {
      slug: 'bad-post',
      categories: [],
      translations: {},
    };
    indexPost(db, post);

    const rows = db.prepare('SELECT * FROM blog_fts').all();
    expect(rows).toHaveLength(0);
  });
});

describe('indexNewPosts', () => {
  let db: ReturnType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('indexes multiple valid posts', () => {
    const posts = [makeValidPost('post-1'), makeValidPost('post-2')];
    indexNewPosts(db, posts);

    const rows = db.prepare('SELECT * FROM blog_fts').all();
    expect(rows).toHaveLength(4); // 2 posts × 2 languages
  });

  it('continues processing when one post is invalid', () => {
    const posts: PostJson[] = [
      makeValidPost('good-post'),
      { slug: '', categories: [], translations: {} }, // invalid but won't throw
      makeValidPost('another-good'),
    ];
    indexNewPosts(db, posts);

    const rows = db.prepare('SELECT * FROM blog_fts').all();
    // good-post: 2 rows, invalid: 0 rows, another-good: 2 rows
    expect(rows).toHaveLength(4);
  });
});
