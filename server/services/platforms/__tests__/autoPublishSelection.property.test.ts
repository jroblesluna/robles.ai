// Feature: multi-platform-publishing, Property 7: Auto-Publish Platform Selection and Independence
// **Validates: Requirements 7.1, 7.2**

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
      id INTEGER PRIMARY KEY,
      week_start TEXT,
      week_end TEXT,
      post_text TEXT,
      post_text_instagram TEXT,
      image_url TEXT,
      created_at TEXT
    );

    CREATE TABLE carousel_slides (
      id INTEGER PRIMARY KEY,
      report_id INTEGER,
      position INTEGER,
      slide_type TEXT,
      title_text TEXT,
      status TEXT,
      created_at TEXT,
      UNIQUE(report_id, position)
    );

    CREATE TABLE platform_publish_status (
      id INTEGER PRIMARY KEY,
      report_id INTEGER,
      platform TEXT,
      status TEXT DEFAULT 'not_published',
      platform_post_id TEXT,
      error_message TEXT,
      published_at TEXT,
      created_at TEXT,
      updated_at TEXT,
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

/** Arbitrary for credential configuration per platform */
interface PlatformConfig {
  platform: PlatformName;
  hasCredentials: boolean;
  initialStatus: 'not_published' | 'published' | 'failed';
  publishOutcome: PublishResult;
}

const platformStatusArb = fc.constantFrom<'not_published' | 'published' | 'failed'>(
  'not_published',
  'published',
  'failed'
);

const publishOutcomeArb: fc.Arbitrary<PublishResult> = fc.oneof(
  fc.string({ minLength: 1, maxLength: 30 }).map(
    (id): PublishResult => ({ success: true, platformPostId: `post-${id}` })
  ),
  fc.string({ minLength: 1, maxLength: 50 }).map(
    (err): PublishResult => ({ success: false, error: `Error: ${err}` })
  )
);

/** Generate a config for a single platform */
function platformConfigArb(platform: PlatformName): fc.Arbitrary<PlatformConfig> {
  return fc.record({
    platform: fc.constant(platform),
    hasCredentials: fc.boolean(),
    initialStatus: platformStatusArb,
    publishOutcome: publishOutcomeArb,
  });
}

/** Generate configurations for all three platforms */
const allPlatformConfigsArb: fc.Arbitrary<PlatformConfig[]> = fc.tuple(
  platformConfigArb('linkedin'),
  platformConfigArb('instagram'),
  platformConfigArb('facebook')
).map(([a, b, c]) => [a, b, c]);

/** Create a mock adapter that tracks whether publish was called */
function createTrackedAdapter(
  config: PlatformConfig
): PlatformAdapter & { publishCalled: boolean } {
  const adapter = {
    platform: config.platform,
    publishCalled: false,
    hasCredentials: () => config.hasCredentials,
    publish: vi.fn().mockImplementation(async (): Promise<PublishResult> => {
      adapter.publishCalled = true;
      if (!config.publishOutcome.success) {
        // Simulate failure by returning the error result
        return config.publishOutcome;
      }
      return config.publishOutcome;
    }),
    validateCredentials: vi.fn().mockResolvedValue({ valid: true }),
  };
  return adapter;
}

describe('Property 7: Auto-Publish Platform Selection and Independence', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    vi.useFakeTimers();
    db = createTestDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    db.close();
  });

  it('only platforms with credentials AND not_published status are attempted', async () => {
    const reportId = 1;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 3);

    await fc.assert(
      fc.asyncProperty(
        allPlatformConfigsArb,
        async (configs) => {
          // Reset platform statuses
          db.exec('DELETE FROM platform_publish_status');

          // Insert initial statuses per config
          const now = new Date().toISOString();
          for (const config of configs) {
            db.prepare(`
              INSERT INTO platform_publish_status
                (report_id, platform, status, platform_post_id, error_message, published_at, created_at, updated_at)
              VALUES (?, ?, ?, NULL, NULL, NULL, ?, NULL)
            `).run(reportId, config.platform, config.initialStatus, now);
          }

          // Create tracked adapters
          const adapters = new Map<PlatformName, PlatformAdapter>();
          const trackedAdapters: (PlatformAdapter & { publishCalled: boolean })[] = [];

          for (const config of configs) {
            const adapter = createTrackedAdapter(config);
            adapters.set(config.platform, adapter);
            trackedAdapters.push(adapter);
          }

          const engine = new PublishingEngine(db, adapters, 'https://robles.ai');

          // Act: call publishToAll and advance timers for delays
          const publishPromise = engine.publishToAll(reportId);
          // Advance past all possible delays (3 platforms × 5000ms = 15000ms max)
          await vi.advanceTimersByTimeAsync(20000);
          await publishPromise;

          // Assert: verify which platforms were called
          for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            const adapter = trackedAdapters[i];
            const isEligible = config.hasCredentials && config.initialStatus === 'not_published';

            if (isEligible) {
              expect(adapter.publishCalled).toBe(true);
            } else {
              expect(adapter.publishCalled).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all eligible platforms are attempted even when some fail', async () => {
    const reportId = 1;
    insertTestReport(db, reportId);
    insertTestSlides(db, reportId, 3);

    // Generate configs where at least 2 platforms are eligible and at least one will fail
    const eligibleConfigArb: fc.Arbitrary<PlatformConfig[]> = fc.tuple(
      fc.record({
        platform: fc.constant<PlatformName>('linkedin'),
        hasCredentials: fc.constant(true),
        initialStatus: fc.constant<'not_published'>('not_published'),
        publishOutcome: publishOutcomeArb,
      }),
      fc.record({
        platform: fc.constant<PlatformName>('instagram'),
        hasCredentials: fc.constant(true),
        initialStatus: fc.constant<'not_published'>('not_published'),
        publishOutcome: publishOutcomeArb,
      }),
      fc.record({
        platform: fc.constant<PlatformName>('facebook'),
        hasCredentials: fc.constant(true),
        initialStatus: fc.constant<'not_published'>('not_published'),
        publishOutcome: publishOutcomeArb,
      })
    ).map(([a, b, c]) => [a, b, c]).filter(configs => {
      // Ensure at least one fails
      return configs.some(c => !c.publishOutcome.success);
    });

    await fc.assert(
      fc.asyncProperty(
        eligibleConfigArb,
        async (configs) => {
          // Reset platform statuses
          db.exec('DELETE FROM platform_publish_status');

          // Insert initial statuses
          const now = new Date().toISOString();
          for (const config of configs) {
            db.prepare(`
              INSERT INTO platform_publish_status
                (report_id, platform, status, platform_post_id, error_message, published_at, created_at, updated_at)
              VALUES (?, ?, ?, NULL, NULL, NULL, ?, NULL)
            `).run(reportId, config.platform, config.initialStatus, now);
          }

          // Create tracked adapters
          const adapters = new Map<PlatformName, PlatformAdapter>();
          const trackedAdapters: (PlatformAdapter & { publishCalled: boolean })[] = [];

          for (const config of configs) {
            const adapter = createTrackedAdapter(config);
            adapters.set(config.platform, adapter);
            trackedAdapters.push(adapter);
          }

          const engine = new PublishingEngine(db, adapters, 'https://robles.ai');

          // Act: call publishToAll and advance timers
          const publishPromise = engine.publishToAll(reportId);
          await vi.advanceTimersByTimeAsync(20000);
          await publishPromise;

          // Assert: ALL eligible platforms were attempted regardless of failures
          for (const adapter of trackedAdapters) {
            expect(adapter.publishCalled).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
