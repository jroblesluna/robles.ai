// Feature: multi-platform-publishing, Property 1: Platform Status Initialization Invariant
// **Validates: Requirements 1.1, 1.2**

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { PublishingEngine } from '../publishingEngine.js';

describe('Property 1: Platform Status Initialization Invariant', () => {
  let db: InstanceType<typeof Database>;
  let engine: PublishingEngine;

  beforeEach(() => {
    // Create an in-memory SQLite database for each test
    db = new Database(':memory:');

    // Create the platform_publish_status table matching the migration schema
    db.exec(`
      CREATE TABLE platform_publish_status (
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
        UNIQUE(report_id, platform)
      );
    `);

    engine = new PublishingEngine(db);
  });

  afterEach(() => {
    db.close();
  });

  it('after initializeStatuses, exactly 3 rows exist with status not_published for any report ID', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (reportId) => {
          // Act: initialize statuses for an arbitrary report ID
          engine.initializeStatuses(reportId);

          // Assert: query the table for this report
          const rows = db.prepare(
            'SELECT platform, status FROM platform_publish_status WHERE report_id = ?'
          ).all(reportId) as Array<{ platform: string; status: string }>;

          // Exactly 3 rows must exist
          expect(rows.length).toBe(3);

          // All platforms must be present
          const platforms = rows.map(r => r.platform).sort();
          expect(platforms).toEqual(['facebook', 'instagram', 'linkedin']);

          // All statuses must be 'not_published'
          for (const row of rows) {
            expect(row.status).toBe('not_published');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('initializeStatuses is idempotent — calling it twice for the same report still results in exactly 3 rows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (reportId) => {
          // Act: call initializeStatuses twice
          engine.initializeStatuses(reportId);
          engine.initializeStatuses(reportId);

          // Assert: still exactly 3 rows
          const rows = db.prepare(
            'SELECT platform, status FROM platform_publish_status WHERE report_id = ?'
          ).all(reportId) as Array<{ platform: string; status: string }>;

          expect(rows.length).toBe(3);

          const platforms = rows.map(r => r.platform).sort();
          expect(platforms).toEqual(['facebook', 'instagram', 'linkedin']);

          for (const row of rows) {
            expect(row.status).toBe('not_published');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different report IDs get independent status rows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        (reportId1, reportId2) => {
          // Clean slate for each iteration
          db.exec('DELETE FROM platform_publish_status');

          // Act: initialize statuses for two different report IDs
          engine.initializeStatuses(reportId1);
          engine.initializeStatuses(reportId2);

          // Assert: each report has exactly 3 rows
          const rows1 = db.prepare(
            'SELECT platform, status FROM platform_publish_status WHERE report_id = ?'
          ).all(reportId1) as Array<{ platform: string; status: string }>;

          const rows2 = db.prepare(
            'SELECT platform, status FROM platform_publish_status WHERE report_id = ?'
          ).all(reportId2) as Array<{ platform: string; status: string }>;

          expect(rows1.length).toBe(3);
          expect(rows2.length).toBe(3);

          // Total rows in table should be 6
          const totalRows = db.prepare(
            'SELECT COUNT(*) as count FROM platform_publish_status'
          ).get() as { count: number };
          expect(totalRows.count).toBe(6);
        }
      ),
      { numRuns: 100 }
    );
  });
});
