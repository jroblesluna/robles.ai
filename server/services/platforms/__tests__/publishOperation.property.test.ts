// Feature: multi-platform-publishing, Property 2: Publish Operation Isolation
// **Validates: Requirements 1.3, 1.4**

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { PublishingEngine } from '../publishingEngine.js';
import type { PlatformAdapter, PlatformName, PublishResult } from '../types.js';

const ALL_PLATFORMS: PlatformName[] = ['linkedin', 'instagram', 'facebook'];

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE dominical_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      post_text TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'pending_review',
      created_at TEXT NOT NULL
    );

    CREATE TABLE carousel_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      slide_type TEXT NOT NULL CHECK(slide_type IN ('cover', 'article', 'cta')),
      title_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'generated', 'failed')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES dominical_reports(id),
      UNIQUE(report_id, position)
    );

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
      FOREIGN KEY (report_id) REFERENCES dominical_reports(id),
      UNIQUE(report_id, platform)
    );
  `);
  return db;
}

function insertTestReport(db: InstanceType<typeof Database>, reportId: number): void {
  db.prepare(`
    INSERT INTO dominical_reports (id, week_start, week_end, post_text, image_url, created_at)
    VALUES (?, '2025-01-01', '2025-01-07', 'Test post content #AI', '/images/cover.jpg', ?)
  `).run(reportId, new Date().toISOString());
}

function insertTestSlides(db: InstanceType<typeof Database>, reportId: number, count: number): void {
  const now = new Date().toISOString();
  for (let i = 1; i <= count; i++) {
    db.prepare(`
      INSERT INTO carousel_slides (report_id, position, slide_type, title_text, status, created_at)
      VALUES (?, ?, 'article', 'Slide Title', 'generated', ?)
    `).run(reportId, i, now);
  }
}

/** Create a mock adapter with configurable publish outcome */
function createMockAdapter(
  platform: PlatformName,
  result: PublishResult
): PlatformAdapter {
  return {
    platform,
    hasCredentials: () => true,
    publish: vi.fn().mockResolvedValue(result),
    validateCredentials: vi.fn().mockResolvedValue({ valid: true }),
  };
}

/** Arbitrary for selecting a platform */
const platformArb = fc.constantFrom<PlatformName>('linkedin', 'instagram', 'facebook');

/** Arbitrary for a publish outcome (success with post ID or failure with error message) */
const publishOutcomeArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).map(
    (id): PublishResult => ({ success: true, platformPostId: `post-${id}` })
  ),
  fc.string({ minLength: 1, maxLength: 100 }).map(
    (err): PublishResult => ({ success: false, error: `Error: ${err}` })
  )
);

describe('Property 2: Publish Operation Isolation', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('publishing to one platform does not change statuses of other platforms', async () => {
    const reportId = 1;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 3);

    await fc.assert(
      fc.asyncProperty(
        platformArb,
        publishOutcomeArb,
        async (targetPlatform, outcome) => {
          // Reset: delete all statuses and re-initialize for a clean state
          db.exec('DELETE FROM platform_publish_status');

          // Create adapters — only the target platform gets a mock adapter
          const adapters = new Map<PlatformName, PlatformAdapter>();
          adapters.set(targetPlatform, createMockAdapter(targetPlatform, outcome));

          const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
          engine.initializeStatuses(reportId);

          // Snapshot statuses of OTHER platforms before publishing
          const otherPlatforms = ALL_PLATFORMS.filter(p => p !== targetPlatform);
          const beforeStatuses = new Map<PlatformName, string>();
          for (const p of otherPlatforms) {
            const row = db.prepare(
              'SELECT status FROM platform_publish_status WHERE report_id = ? AND platform = ?'
            ).get(reportId, p) as { status: string };
            beforeStatuses.set(p, row.status);
          }

          // Act: publish to the target platform
          await engine.publishToPlatform(reportId, targetPlatform);

          // Assert: other platforms' statuses remain unchanged
          for (const p of otherPlatforms) {
            const row = db.prepare(
              'SELECT status, platform_post_id, error_message, published_at FROM platform_publish_status WHERE report_id = ? AND platform = ?'
            ).get(reportId, p) as {
              status: string;
              platform_post_id: string | null;
              error_message: string | null;
              published_at: string | null;
            };

            expect(row.status).toBe('not_published');
            expect(row.platform_post_id).toBeNull();
            expect(row.error_message).toBeNull();
            expect(row.published_at).toBeNull();
          }

          // Also verify the target platform DID change (sanity check for isolation)
          const targetRow = db.prepare(
            'SELECT status FROM platform_publish_status WHERE report_id = ? AND platform = ?'
          ).get(reportId, targetPlatform) as { status: string };
          expect(targetRow.status).not.toBe('not_published');
        }
      ),
      { numRuns: 100 }
    );
  });
});
