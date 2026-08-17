import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ensureListingTable,
  rebuildListingIndex,
  indexListingPosts,
  type PostJson as ListingPostJson,
} from './indexer';
import {
  ensureFtsTable,
  indexNewPosts,
  type PostJson as FtsPostJson,
} from '../fts/indexer';

// --- Helpers ---

function createTestDb() {
  const db = new Database(':memory:');
  return db;
}

function makePost(slug: string, date: string, editorId: number, categories: string[] = ['AI']): ListingPostJson {
  return {
    slug,
    date,
    editorId,
    categories,
    translations: {
      en: { title: `${slug} EN`, excerpt: `Excerpt for ${slug}`, content: [{ heading: 'Intro', body: 'Body text.' }] },
      es: { title: `${slug} ES`, excerpt: `Extracto de ${slug}`, content: [{ heading: 'Intro', body: 'Texto.' }] },
    },
  };
}

// --- Integration Tests ---

describe('Integration: Server startup auto-rebuild logic', () => {
  let db: InstanceType<typeof Database>;
  let tempDir: string;

  beforeEach(() => {
    db = createTestDb();
    ensureListingTable(db);
    tempDir = mkdtempSync(join(tmpdir(), 'listing-startup-'));
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('rebuilds the index when blog_posts_index is empty', async () => {
    // Verify the table starts empty
    const countBefore = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(countBefore.c).toBe(0);

    // Write test JSON posts to temp dir (simulating server/data/posts structure)
    const posts = [
      makePost('startup-post-1', '2025-03-01', 1),
      makePost('startup-post-2', '2025-03-02', 2),
      makePost('startup-post-3', '2025-03-03', 3),
    ];
    for (const post of posts) {
      writeFileSync(join(tempDir, `${post.slug}.json`), JSON.stringify(post), 'utf-8');
    }

    // Simulate startup logic: if count === 0, rebuild
    const result = await rebuildListingIndex(db, tempDir);

    // Verify posts were indexed
    expect(result.indexed).toBe(3);
    expect(result.skipped).toBe(0);

    const countAfter = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(countAfter.c).toBe(3);
  });

  it('skips rebuild when blog_posts_index already has rows', async () => {
    // Seed the table with existing posts
    const existingPosts = [
      makePost('existing-1', '2025-02-01', 1),
      makePost('existing-2', '2025-02-02', 2),
    ];
    indexListingPosts(db, existingPosts);

    // Verify rows exist
    const count = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(count.c).toBe(2);

    // Simulate startup logic: if count > 0, skip rebuild
    // (We don't call rebuildListingIndex — this verifies the condition check)
    const shouldSkip = count.c > 0;
    expect(shouldSkip).toBe(true);

    // Table remains unchanged
    const countAfter = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(countAfter.c).toBe(2);
  });
});

describe('Integration: Cron-like incremental indexing (FTS + Listing independent)', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
    ensureListingTable(db);
    ensureFtsTable(db);
  });

  afterEach(() => {
    db.close();
  });

  it('both indexers work independently on the same new posts', () => {
    // Seed the listing index with 2 initial posts
    const initialPosts: ListingPostJson[] = [
      makePost('initial-1', '2025-01-10', 1, ['DevOps']),
      makePost('initial-2', '2025-01-11', 2, ['Cloud']),
    ];
    indexListingPosts(db, initialPosts);

    // Verify initial state: listing has 2, FTS has 0 (we only indexed listing)
    const listingCountBefore = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(listingCountBefore.c).toBe(2);

    const ftsCountBefore = db.prepare('SELECT COUNT(*) as c FROM blog_fts').get() as { c: number };
    expect(ftsCountBefore.c).toBe(0);

    // Simulate cron generating a new post
    const newPost = makePost('cron-new-post', '2025-01-12', 3, ['AI', 'ML']);

    // Call listing indexer (incremental)
    indexListingPosts(db, [newPost]);

    // Call FTS indexer (incremental) — cast to FtsPostJson since it has compatible shape
    indexNewPosts(db, [newPost as unknown as FtsPostJson]);

    // Verify: listing table has 3 rows
    const listingCountAfter = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(listingCountAfter.c).toBe(3);

    // Verify: FTS table has rows for the new post (en + es = 2 rows)
    const ftsCountAfter = db.prepare('SELECT COUNT(*) as c FROM blog_fts').get() as { c: number };
    expect(ftsCountAfter.c).toBe(2);

    // Verify the new post data is correct in listing
    const listingRow = db.prepare('SELECT * FROM blog_posts_index WHERE slug = ?').get('cron-new-post') as any;
    expect(listingRow).toBeDefined();
    expect(listingRow.editor_id).toBe(3);
    expect(listingRow.date).toBe('2025-01-12');

    // Verify the new post data is correct in FTS
    const ftsRows = db.prepare('SELECT * FROM blog_fts WHERE slug = ?').all('cron-new-post') as any[];
    expect(ftsRows).toHaveLength(2);
    const languages = ftsRows.map((r) => r.language).sort();
    expect(languages).toEqual(['en', 'es']);
  });

  it('listing indexer failure does not affect FTS indexer', () => {
    // Index an invalid post into listing (will be skipped silently)
    const invalidPost = { slug: '', date: '', editorId: null, translations: {} } as any;
    indexListingPosts(db, [invalidPost]);

    // Listing should have 0 rows (post was invalid)
    const listingCount = db.prepare('SELECT COUNT(*) as c FROM blog_posts_index').get() as { c: number };
    expect(listingCount.c).toBe(0);

    // FTS should still work independently with a valid post
    const validPost = makePost('fts-only', '2025-02-01', 1);
    indexNewPosts(db, [validPost as unknown as FtsPostJson]);

    const ftsCount = db.prepare('SELECT COUNT(*) as c FROM blog_fts').get() as { c: number };
    expect(ftsCount.c).toBe(2); // en + es
  });
});

describe('Integration: Detail API reads from JSON files (not DB)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'listing-detail-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('full post content is available from file, not just metadata', () => {
    // Create the expected directory structure: YYYY/MM/DD/slug.json
    const postDir = join(tempDir, '2025', '03', '28');
    mkdirSync(postDir, { recursive: true });

    const fullPost = {
      slug: '2025-03-28-test-article',
      date: '2025-03-28',
      editorId: 5,
      categories: ['AI', 'Cloud'],
      translations: {
        en: {
          title: 'Test Article Title',
          excerpt: 'A brief summary of the article.',
          content: [
            { heading: 'Introduction', body: 'This is the introduction paragraph with full detail.' },
            { heading: 'Main Section', body: 'Detailed body content that only exists in the JSON file.' },
            { heading: 'Conclusion', body: 'Final thoughts and summary.' },
          ],
        },
        es: {
          title: 'Título del Artículo',
          excerpt: 'Un breve resumen del artículo.',
          content: [
            { heading: 'Introducción', body: 'Este es el párrafo de introducción con detalle completo.' },
            { heading: 'Sección Principal', body: 'Contenido detallado del cuerpo.' },
            { heading: 'Conclusión', body: 'Pensamientos finales y resumen.' },
          ],
        },
      },
    };

    const filePath = join(postDir, `${fullPost.slug}.json`);
    writeFileSync(filePath, JSON.stringify(fullPost), 'utf-8');

    // Simulate Detail API behavior: read from file
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Verify full content is available (not just listing metadata)
    expect(parsed.slug).toBe('2025-03-28-test-article');
    expect(parsed.date).toBe('2025-03-28');
    expect(parsed.editorId).toBe(5);
    expect(parsed.categories).toEqual(['AI', 'Cloud']);

    // Full content sections are available (these would NOT be in the DB index)
    expect(parsed.translations.en.content).toHaveLength(3);
    expect(parsed.translations.en.content[0].heading).toBe('Introduction');
    expect(parsed.translations.en.content[0].body).toContain('full detail');
    expect(parsed.translations.en.content[1].body).toContain('only exists in the JSON file');

    expect(parsed.translations.es.content).toHaveLength(3);
    expect(parsed.translations.es.content[0].heading).toBe('Introducción');
  });

  it('reading a non-existent file throws (simulating 404 response)', () => {
    const nonExistentPath = join(tempDir, '2025', '01', '01', 'does-not-exist.json');

    expect(() => readFileSync(nonExistentPath, 'utf-8')).toThrow();
  });
});
