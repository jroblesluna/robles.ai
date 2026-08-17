import type Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';

// --- Interfaces ---

export interface ListingPostRow {
  slug: string;
  date: string;
  editor_id: number;
  categories: string;    // JSON array string, e.g. '["AI","Cloud"]'
  title_en: string | null;
  excerpt_en: string | null;
  title_es: string | null;
  excerpt_es: string | null;
  created_at: string;
}

export interface PostJson {
  slug: string;
  date: string;
  editorId: number;
  categories?: string[];
  translations: {
    en?: { title: string; excerpt: string; content: any[] };
    es?: { title: string; excerpt: string; content: any[] };
  };
}

// --- Table Management ---

/**
 * Creates the blog_posts_index table and its indexes if they don't exist.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export function ensureListingTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts_index (
      slug       TEXT PRIMARY KEY,
      date       TEXT NOT NULL,
      editor_id  INTEGER NOT NULL,
      categories TEXT,
      title_en   TEXT,
      excerpt_en TEXT,
      title_es   TEXT,
      excerpt_es TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blog_posts_editor_id ON blog_posts_index(editor_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON blog_posts_index(date DESC);
  `);
}

// --- Content Extraction ---

/**
 * Extracts a ListingPostRow from a PostJson object.
 * Returns null if the post is missing required fields (slug, date, editorId).
 */
export function extractListingRow(post: PostJson): ListingPostRow | null {
  if (!post || !post.slug || !post.date || post.editorId == null) {
    return null;
  }

  const en = post.translations?.en;
  const es = post.translations?.es;

  return {
    slug: post.slug,
    date: post.date,
    editor_id: post.editorId,
    categories: JSON.stringify(post.categories || []),
    title_en: en?.title ?? null,
    excerpt_en: en?.excerpt ?? null,
    title_es: es?.title ?? null,
    excerpt_es: es?.excerpt ?? null,
    created_at: new Date().toISOString(),
  };
}

// --- Full Rebuild ---

export interface RebuildResult {
  indexed: number;
  skipped: number;
}

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
 * Rebuilds the entire blog_posts_index from JSON files on disk.
 * Runs in a single transaction: DELETE all + INSERT all.
 * Skips unparseable files with a warning log.
 * Returns counts of indexed and skipped files.
 */
export async function rebuildListingIndex(
  db: Database.Database,
  postsDir: string
): Promise<RebuildResult> {
  const jsonFiles = await collectJsonFiles(postsDir);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO blog_posts_index
      (slug, date, editor_id, categories, title_en, excerpt_en, title_es, excerpt_es, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let indexed = 0;
  let skipped = 0;

  const transaction = db.transaction((files: string[]) => {
    db.exec('DELETE FROM blog_posts_index');

    for (const filePath of files) {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const post: PostJson = JSON.parse(raw);
        const row = extractListingRow(post);

        if (!row) {
          console.warn(`[Listing] Skipped (invalid post data): ${filePath}`);
          skipped++;
          continue;
        }

        insertStmt.run(
          row.slug, row.date, row.editor_id, row.categories,
          row.title_en, row.excerpt_en, row.title_es, row.excerpt_es,
          row.created_at
        );
        indexed++;
      } catch (err) {
        console.warn(`[Listing] Skipped (parse error): ${filePath}`, err);
        skipped++;
      }
    }
  });

  transaction(jsonFiles);

  console.log(`[Listing] Indexed ${indexed} posts, skipped ${skipped}.`);
  return { indexed, skipped };
}

// --- Incremental Indexing ---

/**
 * Upserts an array of posts into blog_posts_index.
 * Uses INSERT OR REPLACE (slug is PK).
 * Logs errors per-post and continues.
 */
export function indexListingPosts(db: Database.Database, posts: PostJson[]): void {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO blog_posts_index
      (slug, date, editor_id, categories, title_en, excerpt_en, title_es, excerpt_es, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let indexed = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      const row = extractListingRow(post);
      if (!row) {
        console.warn(`[Listing] Skipped invalid post: ${post?.slug}`);
        errors++;
        continue;
      }

      insertStmt.run(
        row.slug, row.date, row.editor_id, row.categories,
        row.title_en, row.excerpt_en, row.title_es, row.excerpt_es,
        row.created_at
      );
      indexed++;
    } catch (err) {
      console.error(`[Listing] Error indexing post "${post?.slug}":`, err);
      errors++;
    }
  }

  console.log(`[Listing] Incremental index: ${indexed} posts indexed, ${errors} errors.`);
}
