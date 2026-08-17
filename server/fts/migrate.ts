import Database from 'better-sqlite3';
import path from 'path';
import { ensureFtsTable, indexAllPosts } from './indexer.js';

async function main(): Promise<void> {
  console.log('[FTS Migration] Starting full-text search migration...');

  const dataDir = path.resolve(process.cwd(), 'server/data');
  const dbPath = path.resolve(dataDir, 'dominical.db');
  const postsDir = path.resolve(process.cwd(), 'server/data/posts');

  console.log(`[FTS Migration] Database: ${dbPath}`);
  console.log(`[FTS Migration] Posts directory: ${postsDir}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  try {
    // Step 1: Ensure the FTS5 virtual table exists
    ensureFtsTable(db);

    // Step 2: Index all posts from the posts directory
    await indexAllPosts(db, postsDir);

    // Step 3: Report final row count
    const row = db.prepare('SELECT count(*) as count FROM blog_fts').get() as { count: number };
    console.log(`[FTS Migration] Complete. Total rows in blog_fts: ${row.count}`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('[FTS Migration] Fatal error:', err);
  process.exit(1);
});
