import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';

/**
 * Property 9: Slide regeneration isolation
 * **Validates: Requirements 9.1, 9.2**
 *
 * For any carousel and any single slide at position P, regenerating that slide
 * SHALL not modify the composite image files or database records of any slide at position != P.
 *
 * Feature: dominical-carousel-images, Property 9: Slide regeneration isolation
 */

// --- Mocks ---

// Mock OpenAI for engagement phrases
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

// Mock image generation functions
vi.mock('../carouselImageGen.js', () => ({
  generateCarouselBackgroundImage: vi.fn(async (_title: string, _cats: string[], _key: string, outputPath: string) => {
    // Write a fake file to simulate background generation
    const fs = await import('node:fs');
    fs.mkdirSync(await import('node:path').then(p => p.dirname(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, `fake-bg-${outputPath}`);
  }),
  generateCoverBackground: vi.fn(async (_key: string, outputPath: string) => {
    const fs = await import('node:fs');
    fs.mkdirSync(await import('node:path').then(p => p.dirname(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, `fake-cover-bg-${outputPath}`);
  }),
  generateCTABackground: vi.fn(async (_key: string, outputPath: string) => {
    const fs = await import('node:fs');
    fs.mkdirSync(await import('node:path').then(p => p.dirname(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, `fake-cta-bg-${outputPath}`);
  }),
  ensureBackgroundsDir: vi.fn((reportId: number) => {
    const path = require('node:path');
    const fs = require('node:fs');
    const dir = path.resolve(process.cwd(), 'server/data/carousel', String(reportId), 'backgrounds');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }),
}));

// Mock slide compositor
vi.mock('../slideCompositor.js', () => ({
  composeArticleSlide: vi.fn(async (opts: any) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
    fs.writeFileSync(opts.outputPath, `composite-article-${opts.titleText}-${Date.now()}`);
  }),
  composeCoverSlide: vi.fn(async (opts: any) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
    fs.writeFileSync(opts.outputPath, `composite-cover-${Date.now()}`);
  }),
  composeCTASlide: vi.fn(async (opts: any) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
    fs.writeFileSync(opts.outputPath, `composite-cta-${Date.now()}`);
  }),
}));

// Use a real in-memory SQLite DB but mock the db module
let testDb: InstanceType<typeof Database>;

vi.mock('../../db.js', () => {
  return {
    default: {
      prepare: (...args: any[]) => testDb.prepare(...args),
      exec: (...args: any[]) => testDb.exec(...args),
      pragma: (...args: any[]) => testDb.pragma(...args),
    },
  };
});

import fs from 'node:fs';
import path from 'node:path';

describe('CarouselGenerator Regeneration Property Tests', () => {
  const TEST_REPORT_ID = 999;
  let carouselDataDir: string;

  function setupTestDb() {
    testDb = new Database(':memory:');
    testDb.pragma('journal_mode = WAL');

    testDb.exec(`
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

    // Insert API key in settings
    testDb.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(
      'openai_api_key',
      'test-api-key-fake',
      new Date().toISOString(),
    );
  }

  function insertReport(articleCount: number) {
    const articles = Array.from({ length: articleCount }, (_, i) => ({
      title: `Article ${i + 1} Title`,
      excerpt: `Excerpt for article ${i + 1}`,
      categories: ['AI', 'Tech'],
      slug: `article-${i + 1}`,
    }));

    testDb.prepare(`
      INSERT INTO dominical_reports (id, week_start, week_end, selected_news, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      TEST_REPORT_ID,
      '2025-01-06',
      '2025-01-12',
      JSON.stringify(articles),
      new Date().toISOString(),
    );
  }

  function getSlideRecords(): Array<{
    position: number;
    slide_type: string;
    composite_image_path: string | null;
    background_image_path: string | null;
    status: string;
    title_text: string;
    engagement_phrase: string | null;
  }> {
    return testDb
      .prepare(
        'SELECT position, slide_type, composite_image_path, background_image_path, status, title_text, engagement_phrase FROM carousel_slides WHERE report_id = ? ORDER BY position',
      )
      .all(TEST_REPORT_ID) as any[];
  }

  function readCompositeFiles(slides: Array<{ composite_image_path: string | null }>): Map<number, string | null> {
    const fileContents = new Map<number, string | null>();
    for (let i = 0; i < slides.length; i++) {
      const imgPath = slides[i].composite_image_path;
      if (imgPath && fs.existsSync(imgPath)) {
        fileContents.set(i, fs.readFileSync(imgPath, 'utf-8'));
      } else {
        fileContents.set(i, null);
      }
    }
    return fileContents;
  }

  beforeEach(() => {
    setupTestDb();
    carouselDataDir = path.resolve(process.cwd(), 'server/data/carousel', String(TEST_REPORT_ID));
    fs.mkdirSync(path.join(carouselDataDir, 'backgrounds'), { recursive: true });
    fs.mkdirSync(path.join(carouselDataDir, 'composites'), { recursive: true });
  });

  afterEach(() => {
    testDb.close();
    // Clean up generated files
    try {
      fs.rmSync(carouselDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('Property 9: Regenerating one slide does not modify other slides\' DB records or composite files', async () => {
    const { generateCarousel, regenerateSlide } = await import('../carouselGenerator.js');

    await fc.assert(
      fc.asyncProperty(
        // Generate article count between 2 and 8
        fc.integer({ min: 2, max: 8 }).chain((articleCount) =>
          // Generate a valid position to regenerate (0 to totalSlides-1)
          fc.tuple(
            fc.constant(articleCount),
            fc.integer({ min: 0, max: articleCount + 1 }),
          ),
        ),
        async ([articleCount, positionToRegen]) => {
          // Reset state for each iteration
          testDb.exec('DELETE FROM carousel_slides WHERE report_id = ' + TEST_REPORT_ID);
          testDb.exec('DELETE FROM dominical_reports WHERE id = ' + TEST_REPORT_ID);
          insertReport(articleCount);

          // Clean carousel files
          try {
            fs.rmSync(carouselDataDir, { recursive: true, force: true });
          } catch { /* ignore */ }
          fs.mkdirSync(path.join(carouselDataDir, 'backgrounds'), { recursive: true });
          fs.mkdirSync(path.join(carouselDataDir, 'composites'), { recursive: true });

          // Mock engagement phrases for full generation
          const phrases = Array.from({ length: articleCount }, (_, i) => `Engagement ${i + 1}`);
          mockCreate.mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(phrases) } }],
          });

          // Step 1: Generate full carousel
          await generateCarousel(TEST_REPORT_ID);

          // Step 2: Record state of all slides after generation
          const slidesBeforeRegen = getSlideRecords();
          const filesBeforeRegen = readCompositeFiles(slidesBeforeRegen);

          const totalSlides = articleCount + 2;

          // Mock engagement phrases for regeneration (if article slide)
          if (positionToRegen > 0 && positionToRegen < totalSlides - 1) {
            mockCreate.mockResolvedValueOnce({
              choices: [{ message: { content: JSON.stringify([`Regenerated phrase`]) } }],
            });
          }

          // Step 3: Regenerate a single slide
          await regenerateSlide(TEST_REPORT_ID, positionToRegen);

          // Step 4: Record state after regeneration
          const slidesAfterRegen = getSlideRecords();

          // Step 5: Verify isolation — all slides except the regenerated one remain unchanged
          for (let pos = 0; pos < totalSlides; pos++) {
            if (pos === positionToRegen) {
              // The regenerated slide should still be 'generated' status
              const regenSlide = slidesAfterRegen.find((s) => s.position === pos);
              expect(regenSlide).toBeDefined();
              expect(regenSlide!.status).toBe('generated');
              continue;
            }

            const before = slidesBeforeRegen.find((s) => s.position === pos);
            const after = slidesAfterRegen.find((s) => s.position === pos);

            // DB record unchanged
            expect(after).toBeDefined();
            expect(after!.composite_image_path).toBe(before!.composite_image_path);
            expect(after!.status).toBe(before!.status);
            expect(after!.title_text).toBe(before!.title_text);
            expect(after!.slide_type).toBe(before!.slide_type);

            // Composite file on disk unchanged
            const fileContentBefore = filesBeforeRegen.get(pos);
            if (after!.composite_image_path && fs.existsSync(after!.composite_image_path)) {
              const fileContentAfter = fs.readFileSync(after!.composite_image_path, 'utf-8');
              expect(fileContentAfter).toBe(fileContentBefore);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
