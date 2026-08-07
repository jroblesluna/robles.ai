import type Database from 'better-sqlite3';

/**
 * Migration: Create platform_publish_status table and backfill existing data.
 *
 * This migration:
 * 1. Creates the platform_publish_status table with per-platform publish tracking
 * 2. Backfills existing reports that have status='published' with a linkedin row
 * 3. Initializes all three platform rows (linkedin, instagram, facebook) for every report
 */
export function up(db: Database.Database): void {
  // 1. Create the platform_publish_status table
  db.exec(`
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
  `);

  // 2. Backfill: For existing reports with status='published', insert linkedin row as 'published'
  const now = new Date().toISOString();

  const publishedReports = db.prepare(`
    SELECT id, linkedin_post_id, published_at
    FROM dominical_reports
    WHERE status = 'published'
  `).all() as Array<{ id: number; linkedin_post_id: string | null; published_at: string | null }>;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO platform_publish_status 
      (report_id, platform, status, platform_post_id, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const report of publishedReports) {
    insertStmt.run(
      report.id,
      'linkedin',
      'published',
      report.linkedin_post_id,
      report.published_at || now,
      now,
      now
    );
  }

  // 3. Initialize all three platform rows for every report (skip existing ones via INSERT OR IGNORE)
  const allReports = db.prepare(`SELECT id FROM dominical_reports`).all() as Array<{ id: number }>;
  const platforms = ['linkedin', 'instagram', 'facebook'] as const;

  for (const report of allReports) {
    for (const platform of platforms) {
      insertStmt.run(
        report.id,
        platform,
        'not_published',
        null,
        null,
        now,
        null
      );
    }
  }
}
