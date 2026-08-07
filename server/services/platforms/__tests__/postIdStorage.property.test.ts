// Feature: multi-platform-publishing, Property 3: Post ID Storage on Success
// **Validates: Requirements 1.5, 3.5, 4.5**

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { PublishingEngine } from '../publishingEngine.js';
import type { PlatformName, PlatformAdapter, PublishRequest, PublishResult } from '../types.js';

/**
 * Creates a mock adapter that returns a successful publish result with the given post ID.
 */
function createSuccessAdapter(platform: PlatformName, postId: string): PlatformAdapter {
  return {
    platform,
    hasCredentials: () => true,
    publish: async (_request: PublishRequest): Promise<PublishResult> => ({
      success: true,
      platformPostId: postId,
    }),
    validateCredentials: async () => ({ valid: true }),
  };
}

describe('Property 3: Post ID Storage on Success', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(':memory:');

    // Create required tables
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
    `);

    db.exec(`
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
    `);

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
  });

  afterEach(() => {
    db.close();
  });

  it('after a successful publish, the platform post ID is stored and status is published', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PlatformName>('linkedin', 'instagram', 'facebook'),
        fc.string({ minLength: 1, maxLength: 64 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
        async (platform, postId) => {
          // Clean slate for this iteration (reset autoincrement)
          db.exec('DELETE FROM dominical_reports');
          db.exec('DELETE FROM carousel_slides');
          db.exec('DELETE FROM platform_publish_status');
          db.exec("DELETE FROM sqlite_sequence WHERE name='dominical_reports'");

          // Insert a report with post_text so buildPublishRequest succeeds
          const now = new Date().toISOString();
          const info = db.prepare(`
            INSERT INTO dominical_reports (week_start, week_end, post_text, created_at)
            VALUES (?, ?, ?, ?)
          `).run('2025-01-06', '2025-01-12', 'Test post content for publishing.', now);

          const reportId = Number(info.lastInsertRowid);

          // Create the mock adapter that will return the generated post ID
          const adapters = new Map<PlatformName, PlatformAdapter>();
          adapters.set(platform, createSuccessAdapter(platform, postId));

          const engine = new PublishingEngine(db, adapters);

          // Initialize platform statuses
          engine.initializeStatuses(reportId);

          // Act: publish to the platform
          const result = await engine.publishToPlatform(reportId, platform);

          // The publish call itself should succeed
          expect(result.success).toBe(true);
          expect(result.platformPostId).toBe(postId);

          // Assert: query statuses and verify post ID is stored
          const statuses = engine.getStatuses(reportId);
          const platformStatus = statuses.find(s => s.platform === platform);

          expect(platformStatus).toBeDefined();
          expect(platformStatus!.status).toBe('published');
          expect(platformStatus!.platformPostId).toBe(postId);
          expect(platformStatus!.publishedAt).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
