import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { migrateChatTables } from './migrations/chatTables.js';

// Reconstruct __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use server/data/ for the database — persists across builds (dist/ is regenerated each build)
const dataDir = path.resolve(process.cwd(), 'server/data');
fs.mkdirSync(dataDir, { recursive: true });

// Open or create the SQLite database
const dbPath = path.resolve(dataDir, 'dominical.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS dominical_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    selected_news TEXT,
    all_news TEXT,
    post_text TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending_review',
    created_at TEXT NOT NULL,
    last_edited_at TEXT,
    published_at TEXT,
    linkedin_post_id TEXT,
    error_log TEXT
  );

  CREATE TABLE IF NOT EXISTS carousel_slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    slide_type TEXT NOT NULL CHECK(slide_type IN ('cover', 'article', 'cta')),
    article_slug TEXT,
    title_text TEXT NOT NULL,
    engagement_phrase TEXT,
    background_image_path TEXT,
    composite_image_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'generated', 'failed')),
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (report_id) REFERENCES dominical_reports(id),
    UNIQUE(report_id, position)
  );

  CREATE TABLE IF NOT EXISTS platform_publish_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('linkedin', 'instagram', 'facebook')),
    status TEXT NOT NULL DEFAULT 'not_published'
      CHECK(status IN ('not_published', 'publishing', 'published', 'failed')),
    platform_post_id TEXT,
    error_message TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (report_id) REFERENCES dominical_reports(id),
    UNIQUE(report_id, platform)
  );

  CREATE TABLE IF NOT EXISTS analytics_cache (
    cache_key TEXT PRIMARY KEY,
    response_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    ttl_seconds INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    whatsapp TEXT,
    answers TEXT NOT NULL,
    score INTEGER NOT NULL,
    profile TEXT NOT NULL,
    recommended_services TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'es',
    result_message TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS quiz_verification_tokens (
    token TEXT PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES quiz_leads(id)
  );
`);

// Add new columns for platform-specific text (safe to call multiple times)
try {
  db.exec('ALTER TABLE dominical_reports ADD COLUMN post_text_instagram TEXT');
} catch (e: any) {
  // Column already exists — ignore
  if (!e.message.includes('duplicate column')) throw e;
}

// Add columns for the robot video summary feature (safe to call multiple times)
for (const stmt of [
  'ALTER TABLE dominical_reports ADD COLUMN video_script TEXT',
  'ALTER TABLE dominical_reports ADD COLUMN video_status TEXT',
  'ALTER TABLE dominical_reports ADD COLUMN video_url TEXT',
  'ALTER TABLE dominical_reports ADD COLUMN video_error TEXT',
  'ALTER TABLE dominical_reports ADD COLUMN video_status_updated_at TEXT',
]) {
  try {
    db.exec(stmt);
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) throw e;
  }
}

// Add columns for per-slide carousel generation metadata (safe to call multiple times)
for (const stmt of [
  'ALTER TABLE carousel_slides ADD COLUMN palette TEXT',
  'ALTER TABLE carousel_slides ADD COLUMN image_style TEXT',
  'ALTER TABLE carousel_slides ADD COLUMN image_prompt TEXT',
]) {
  try {
    db.exec(stmt);
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) throw e;
  }
}

// Run chat tables migration
migrateChatTables(db);

export default db;
