import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
`);

export default db;
