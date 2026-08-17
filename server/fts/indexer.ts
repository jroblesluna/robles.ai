import type Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';

// --- Interfaces ---

export interface IndexableRow {
  slug: string;
  language: 'en' | 'es';
  title: string;
  excerpt: string;
  content: string;     // All headings + bodies concatenated
  categories: string;  // Space-separated category names
}

export interface PostJson {
  slug: string;
  categories: string[];
  translations: {
    en?: {
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
    es?: {
      title: string;
      excerpt: string;
      content: { heading: string; body: string }[];
    };
  };
}

// --- FTS5 Table Management ---

/**
 * Creates the blog_fts virtual table if it doesn't already exist.
 * Uses unicode61 tokenizer with remove_diacritics 2 for accent-insensitive matching.
 */
export function ensureFtsTable(db: Database.Database): void {
  const existing = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_fts'"
  ).get();

  if (existing) {
    console.log('[FTS] blog_fts table already exists, skipping creation.');
    return;
  }

  db.exec(`
    CREATE VIRTUAL TABLE blog_fts USING fts5(
      slug UNINDEXED,
      language UNINDEXED,
      title,
      excerpt,
      content,
      categories,
      tokenize='unicode61 remove_diacritics 2'
    );
  `);
  console.log('[FTS] Created blog_fts virtual table.');
}

// --- Content Extraction ---

/**
 * Checks whether a translation object has the required fields for indexing.
 */
function isValidTranslation(
  t: { title?: string; excerpt?: string; content?: { heading: string; body: string }[] } | undefined
): t is { title: string; excerpt: string; content: { heading: string; body: string }[] } {
  if (!t) return false;
  if (!t.title || !t.excerpt) return false;
  if (!Array.isArray(t.content)) return false;
  return true;
}

/**
 * Extracts indexable rows from a post JSON object.
 * Returns an array of 0-2 rows (one per available translation).
 * Skips translations missing required fields.
 */
export function extractContent(post: PostJson): IndexableRow[] {
  const rows: IndexableRow[] = [];

  if (!post || !post.slug || !post.translations) {
    return rows;
  }

  const categories = Array.isArray(post.categories)
    ? post.categories.join(' ')
    : '';

  const langs: Array<'en' | 'es'> = ['en', 'es'];

  for (const lang of langs) {
    const translation = post.translations[lang];
    if (!isValidTranslation(translation)) continue;

    const contentParts: string[] = [];
    for (const section of translation.content) {
      if (section.heading) contentParts.push(section.heading);
      if (section.body) contentParts.push(section.body);
    }

    rows.push({
      slug: post.slug,
      language: lang,
      title: translation.title,
      excerpt: translation.excerpt,
      content: contentParts.join(' '),
      categories,
    });
  }

  return rows;
}

// --- Single Post Indexing ---

/**
 * Indexes a single post (upserts both language rows).
 * Uses DELETE + INSERT pattern since FTS5 doesn't support unique constraints.
 */
export function indexPost(db: Database.Database, post: PostJson): void {
  const rows = extractContent(post);

  const deleteStmt = db.prepare('DELETE FROM blog_fts WHERE slug = ? AND language = ?');
  const insertStmt = db.prepare(
    'INSERT INTO blog_fts (slug, language, title, excerpt, content, categories) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const row of rows) {
    deleteStmt.run(row.slug, row.language);
    insertStmt.run(row.slug, row.language, row.title, row.excerpt, row.content, row.categories);
  }
}

// --- Bulk Indexing ---

/**
 * Recursively collects all .json file paths under a directory.
 */
async function collectJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectJsonFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Bulk indexes all posts from a directory (recursive JSON scan).
 * Runs within a single transaction for atomicity.
 * Clears existing rows before re-inserting for idempotency.
 * Skips invalid files with warning logs.
 */
export async function indexAllPosts(db: Database.Database, postsDir: string): Promise<void> {
  const jsonFiles = await collectJsonFiles(postsDir);

  const insertStmt = db.prepare(
    'INSERT INTO blog_fts (slug, language, title, excerpt, content, categories) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction((files: string[]) => {
    // Clear all existing rows for idempotency
    db.exec('DELETE FROM blog_fts');

    let indexed = 0;
    let skipped = 0;

    for (const filePath of files) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const post: PostJson = JSON.parse(raw);
        const rows = extractContent(post);

        if (rows.length === 0) {
          console.warn(`[FTS] Skipped (no valid translations): ${filePath}`);
          skipped++;
          continue;
        }

        for (const row of rows) {
          insertStmt.run(row.slug, row.language, row.title, row.excerpt, row.content, row.categories);
        }
        indexed++;
      } catch (err) {
        console.warn(`[FTS] Skipped (parse error): ${filePath}`, err);
        skipped++;
      }
    }

    console.log(`[FTS] Indexed ${indexed} posts, skipped ${skipped}.`);
  });

  transaction(jsonFiles);
}

/**
 * Indexes an array of newly generated posts (incremental).
 * Each post is upserted individually; errors on one post don't stop others.
 */
export function indexNewPosts(db: Database.Database, posts: PostJson[]): void {
  let indexed = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      indexPost(db, post);
      indexed++;
    } catch (err) {
      console.error(`[FTS] Error indexing post "${post?.slug}":`, err);
      errors++;
    }
  }

  console.log(`[FTS] Incremental index: ${indexed} posts indexed, ${errors} errors.`);
}
