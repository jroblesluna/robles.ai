import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ensureListingTable, extractListingRow, type PostJson } from './indexer';

function createTestDb() {
  const db = new Database(':memory:');
  ensureListingTable(db);
  return db;
}

function makeValidPost(slug = 'test-post'): PostJson {
  return {
    slug,
    date: '2025-03-28',
    editorId: 3,
    categories: ['AI', 'Cloud'],
    translations: {
      en: {
        title: 'Test Post Title',
        excerpt: 'A short excerpt about the test post.',
        content: [{ heading: 'Intro', body: 'Body text.' }],
      },
      es: {
        title: 'Título del Post',
        excerpt: 'Un breve extracto sobre el post.',
        content: [{ heading: 'Intro', body: 'Texto del cuerpo.' }],
      },
    },
  };
}

describe('ensureListingTable', () => {
  it('creates the blog_posts_index table', () => {
    const db = new Database(':memory:');
    ensureListingTable(db);

    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_posts_index'"
    ).get() as { name: string } | undefined;

    expect(table).toBeDefined();
    expect(table!.name).toBe('blog_posts_index');
    db.close();
  });

  it('does not throw when called twice (idempotent)', () => {
    const db = new Database(':memory:');
    ensureListingTable(db);
    expect(() => ensureListingTable(db)).not.toThrow();

    // Verify the table still exists after the second call
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_posts_index'"
    ).get() as { name: string } | undefined;

    expect(table).toBeDefined();
    expect(table!.name).toBe('blog_posts_index');
    db.close();
  });
});

describe('extractListingRow', () => {
  it('returns correct field mapping for a valid post', () => {
    const post = makeValidPost();
    const row = extractListingRow(post);

    expect(row).not.toBeNull();
    expect(row!.slug).toBe('test-post');
    expect(row!.date).toBe('2025-03-28');
    expect(row!.editor_id).toBe(3);
    expect(row!.categories).toBe(JSON.stringify(['AI', 'Cloud']));
    expect(row!.title_en).toBe('Test Post Title');
    expect(row!.excerpt_en).toBe('A short excerpt about the test post.');
    expect(row!.title_es).toBe('Título del Post');
    expect(row!.excerpt_es).toBe('Un breve extracto sobre el post.');
    // created_at should be a valid ISO date string
    expect(row!.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns null when slug is missing', () => {
    const post = makeValidPost();
    (post as any).slug = '';
    const row = extractListingRow(post);
    expect(row).toBeNull();
  });

  it('returns null when date is missing', () => {
    const post = makeValidPost();
    (post as any).date = '';
    const row = extractListingRow(post);
    expect(row).toBeNull();
  });

  it('returns null when editorId is missing', () => {
    const post = makeValidPost();
    (post as any).editorId = null;
    const row = extractListingRow(post);
    expect(row).toBeNull();
  });

  it('returns null title/excerpt when translations are missing', () => {
    const post: PostJson = {
      slug: 'no-translations',
      date: '2025-01-01',
      editorId: 1,
      categories: ['Tech'],
      translations: {},
    };
    const row = extractListingRow(post);

    expect(row).not.toBeNull();
    expect(row!.slug).toBe('no-translations');
    expect(row!.title_en).toBeNull();
    expect(row!.excerpt_en).toBeNull();
    expect(row!.title_es).toBeNull();
    expect(row!.excerpt_es).toBeNull();
  });

  it('handles missing categories gracefully', () => {
    const post = makeValidPost();
    delete (post as any).categories;
    const row = extractListingRow(post);

    expect(row).not.toBeNull();
    expect(row!.categories).toBe('[]');
  });
});
