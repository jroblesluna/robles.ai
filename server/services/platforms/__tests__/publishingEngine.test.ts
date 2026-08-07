// Unit tests for PublishingEngine.publishToPlatform and PublishingEngine.publishToAll

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { PublishingEngine } from '../publishingEngine.js';
import type { PlatformAdapter, PlatformName, PublishRequest, PublishResult } from '../types.js';

/** Create a mock adapter */
function createMockAdapter(
  platform: PlatformName,
  opts: { hasCredentials?: boolean; publishResult?: PublishResult } = {}
): PlatformAdapter {
  const { hasCredentials = true, publishResult = { success: true, platformPostId: `${platform}-post-123` } } = opts;
  return {
    platform,
    hasCredentials: () => hasCredentials,
    publish: vi.fn().mockResolvedValue(publishResult),
    validateCredentials: vi.fn().mockResolvedValue({ valid: true }),
  };
}

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE dominical_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      selected_news TEXT,
      all_news TEXT,
      post_text TEXT,
      post_text_instagram TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'pending_review',
      created_at TEXT NOT NULL,
      last_edited_at TEXT,
      published_at TEXT,
      linkedin_post_id TEXT,
      error_log TEXT
    );

    CREATE TABLE carousel_slides (
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
    VALUES (?, '2025-01-01', '2025-01-07', 'Test post content #AI @robles', '/images/cover.jpg', ?)
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

describe('PublishingEngine.publishToPlatform', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('publishes successfully and stores platformPostId', async () => {
    const reportId = 1;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 3);

    const linkedinAdapter = createMockAdapter('linkedin', {
      publishResult: { success: true, platformPostId: 'urn:li:share:12345' },
    });

    const adapters = new Map<PlatformName, PlatformAdapter>([['linkedin', linkedinAdapter]]);
    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const result = await engine.publishToPlatform(reportId, 'linkedin');

    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('urn:li:share:12345');

    // Verify DB state
    const statuses = engine.getStatuses(reportId);
    const linkedin = statuses.find(s => s.platform === 'linkedin')!;
    expect(linkedin.status).toBe('published');
    expect(linkedin.platformPostId).toBe('urn:li:share:12345');
    expect(linkedin.publishedAt).not.toBeNull();

    // Other platforms unchanged
    const instagram = statuses.find(s => s.platform === 'instagram')!;
    expect(instagram.status).toBe('not_published');
  });

  it('sets status to failed when adapter returns failure', async () => {
    const reportId = 2;
    insertTestReport(db, reportId);

    const instagramAdapter = createMockAdapter('instagram', {
      publishResult: { success: false, error: 'Token expired' },
    });

    const adapters = new Map<PlatformName, PlatformAdapter>([['instagram', instagramAdapter]]);
    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const result = await engine.publishToPlatform(reportId, 'instagram');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Token expired');

    const statuses = engine.getStatuses(reportId);
    const ig = statuses.find(s => s.platform === 'instagram')!;
    expect(ig.status).toBe('failed');
    expect(ig.errorMessage).toBe('Token expired');
  });

  it('sets status to failed when adapter throws an exception', async () => {
    const reportId = 3;
    insertTestReport(db, reportId);

    const adapter: PlatformAdapter = {
      platform: 'facebook',
      hasCredentials: () => true,
      publish: vi.fn().mockRejectedValue(new Error('Network timeout')),
      validateCredentials: vi.fn().mockResolvedValue({ valid: true }),
    };

    const adapters = new Map<PlatformName, PlatformAdapter>([['facebook', adapter]]);
    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const result = await engine.publishToPlatform(reportId, 'facebook');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network timeout');

    const statuses = engine.getStatuses(reportId);
    const fb = statuses.find(s => s.platform === 'facebook')!;
    expect(fb.status).toBe('failed');
    expect(fb.errorMessage).toBe('Network timeout');
  });

  it('fails when no adapter registered for the platform', async () => {
    const reportId = 4;
    insertTestReport(db, reportId);

    const engine = new PublishingEngine(db, new Map(), 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const result = await engine.publishToPlatform(reportId, 'instagram');

    expect(result.success).toBe(false);
    expect(result.error).toContain('No adapter registered');

    const statuses = engine.getStatuses(reportId);
    const ig = statuses.find(s => s.platform === 'instagram')!;
    expect(ig.status).toBe('failed');
  });

  it('fails when adapter has no credentials', async () => {
    const reportId = 5;
    insertTestReport(db, reportId);

    const adapter = createMockAdapter('linkedin', { hasCredentials: false });
    const adapters = new Map<PlatformName, PlatformAdapter>([['linkedin', adapter]]);
    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const result = await engine.publishToPlatform(reportId, 'linkedin');

    expect(result.success).toBe(false);
    expect(result.error).toContain('No credentials configured');
  });

  it('builds PublishRequest with correct slide URLs', async () => {
    const reportId = 6;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 4);

    const adapter = createMockAdapter('linkedin');
    const adapters = new Map<PlatformName, PlatformAdapter>([['linkedin', adapter]]);
    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    await engine.publishToPlatform(reportId, 'linkedin');

    // Verify the publish was called with proper request
    const publishFn = adapter.publish as ReturnType<typeof vi.fn>;
    expect(publishFn).toHaveBeenCalledTimes(1);

    const request: PublishRequest = publishFn.mock.calls[0][0];
    expect(request.reportId).toBe(reportId);
    expect(request.text).toBe('Test post content #AI @robles');
    expect(request.slideImageUrls).toHaveLength(4);
    expect(request.slideImageUrls[0]).toBe('https://robles.ai/api/public/slides/6/1.png');
    expect(request.slideImageUrls[3]).toBe('https://robles.ai/api/public/slides/6/4.png');
    expect(request.coverImageUrl).toBe('https://robles.ai/images/cover.jpg');
  });
});

describe('PublishingEngine.publishToAll', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    vi.useFakeTimers();
    db = createTestDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    db.close();
  });

  it('publishes to all eligible platforms (has credentials + not_published)', async () => {
    const reportId = 10;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 3);

    const linkedinAdapter = createMockAdapter('linkedin');
    const instagramAdapter = createMockAdapter('instagram');
    const facebookAdapter = createMockAdapter('facebook', { hasCredentials: false }); // no credentials

    const adapters = new Map<PlatformName, PlatformAdapter>([
      ['linkedin', linkedinAdapter],
      ['instagram', instagramAdapter],
      ['facebook', facebookAdapter],
    ]);

    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const promise = engine.publishToAll(reportId);

    // Advance timers to resolve the 5-second delay between platforms
    await vi.advanceTimersByTimeAsync(10000);

    const results = await promise;

    // LinkedIn and Instagram should be attempted (have credentials + not_published)
    expect(results.size).toBe(2);
    expect(results.get('linkedin')?.success).toBe(true);
    expect(results.get('instagram')?.success).toBe(true);
    // Facebook was not eligible (no credentials)
    expect(results.has('facebook')).toBe(false);
  });

  it('failure on one platform does not stop others', async () => {
    const reportId = 11;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 2);

    const linkedinAdapter = createMockAdapter('linkedin', {
      publishResult: { success: false, error: 'Rate limit' },
    });
    const instagramAdapter = createMockAdapter('instagram', {
      publishResult: { success: true, platformPostId: 'ig-media-456' },
    });
    const facebookAdapter = createMockAdapter('facebook', {
      publishResult: { success: true, platformPostId: 'fb-post-789' },
    });

    const adapters = new Map<PlatformName, PlatformAdapter>([
      ['linkedin', linkedinAdapter],
      ['instagram', instagramAdapter],
      ['facebook', facebookAdapter],
    ]);

    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    const promise = engine.publishToAll(reportId);

    // Advance timers to resolve all delays (2 delays of 5s between 3 platforms)
    await vi.advanceTimersByTimeAsync(15000);

    const results = await promise;

    // All three were eligible and attempted
    expect(results.size).toBe(3);
    expect(results.get('linkedin')?.success).toBe(false);
    expect(results.get('instagram')?.success).toBe(true);
    expect(results.get('facebook')?.success).toBe(true);

    // Verify DB: linkedin failed, others published
    const statuses = engine.getStatuses(reportId);
    expect(statuses.find(s => s.platform === 'linkedin')!.status).toBe('failed');
    expect(statuses.find(s => s.platform === 'instagram')!.status).toBe('published');
    expect(statuses.find(s => s.platform === 'facebook')!.status).toBe('published');
  });

  it('skips platforms that are already published', async () => {
    const reportId = 12;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 2);

    const linkedinAdapter = createMockAdapter('linkedin');
    const instagramAdapter = createMockAdapter('instagram');

    const adapters = new Map<PlatformName, PlatformAdapter>([
      ['linkedin', linkedinAdapter],
      ['instagram', instagramAdapter],
    ]);

    const engine = new PublishingEngine(db, adapters, 'https://robles.ai');
    engine.initializeStatuses(reportId);

    // Manually mark linkedin as already published
    db.prepare(`
      UPDATE platform_publish_status SET status = 'published' WHERE report_id = ? AND platform = 'linkedin'
    `).run(reportId);

    const promise = engine.publishToAll(reportId);
    await vi.advanceTimersByTimeAsync(10000);
    const results = await promise;

    // Only instagram should be attempted (linkedin already published, facebook no adapter)
    expect(results.size).toBe(1);
    expect(results.has('linkedin')).toBe(false);
    expect(results.get('instagram')?.success).toBe(true);
  });
});
