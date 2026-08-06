import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';

/**
 * Property 11: Carousel metadata round-trip with ordering
 * **Validates: Requirements 11.1, 11.2**
 *
 * For any generated carousel, storing slide metadata to the database and then
 * retrieving it SHALL produce the same ordered sequence of slides with identical
 * position values, types, text content, and file paths.
 *
 * Feature: dominical-carousel-images, Property 11: Carousel metadata round-trip with ordering
 */

/** Slide type literal union */
type SlideType = 'cover' | 'article' | 'cta';

/** Interface representing a slide record to insert */
interface SlideRecord {
  report_id: number;
  position: number;
  slide_type: SlideType;
  article_slug: string | null;
  title_text: string;
  engagement_phrase: string | null;
  background_image_path: string | null;
  composite_image_path: string | null;
  status: 'pending' | 'generating' | 'generated' | 'failed';
}

/** Arbitrary for slide_type */
const slideTypeArb: fc.Arbitrary<SlideType> = fc.constantFrom('cover', 'article', 'cta');

/** Arbitrary for slide status */
const slideStatusArb = fc.constantFrom(
  'pending' as const,
  'generating' as const,
  'generated' as const,
  'failed' as const,
);

/** Arbitrary for a non-empty string without null bytes (safe for SQLite TEXT) */
const safeStringArb = (minLen = 1, maxLen = 100) =>
  fc.string({ minLength: minLen, maxLength: maxLen }).filter((s) => !s.includes('\0') && s.trim().length > 0);

/** Arbitrary for a nullable safe string */
const nullableSafeStringArb = (minLen = 1, maxLen = 100) =>
  fc.option(safeStringArb(minLen, maxLen), { nil: null });

/** Arbitrary for a file path string */
const filePathArb = fc
  .tuple(
    fc.integer({ min: 1, max: 9999 }),
    fc.constantFrom('backgrounds', 'composites'),
    safeStringArb(3, 30),
  )
  .map(([reportId, dir, filename]) => `server/data/carousel/${reportId}/${dir}/${filename}.png`);

/** Arbitrary for a nullable file path */
const nullableFilePathArb = fc.option(filePathArb, { nil: null });

/**
 * Arbitrary for a set of carousel slides for a single report.
 * Generates 1-15 slides with unique positions (shuffled to test ordering).
 */
const carouselSlidesArb = (reportId: number): fc.Arbitrary<SlideRecord[]> =>
  fc
    .tuple(
      fc.integer({ min: 1, max: 15 }), // number of slides
      fc.infiniteStream(
        fc.tuple(
          slideTypeArb,
          nullableSafeStringArb(3, 50), // article_slug
          safeStringArb(5, 100), // title_text
          nullableSafeStringArb(5, 80), // engagement_phrase
          nullableFilePathArb, // background_image_path
          nullableFilePathArb, // composite_image_path
          slideStatusArb,
        ),
      ),
    )
    .map(([count, stream]) => {
      const slides: SlideRecord[] = [];
      const iter = stream[Symbol.iterator]();
      for (let i = 0; i < count; i++) {
        const val = iter.next().value!;
        slides.push({
          report_id: reportId,
          position: i,
          slide_type: val[0],
          article_slug: val[1],
          title_text: val[2],
          engagement_phrase: val[3],
          background_image_path: val[4],
          composite_image_path: val[5],
          status: val[6],
        });
      }
      // Shuffle to verify ordering is restored on retrieval
      return slides.sort(() => Math.random() - 0.5);
    });

describe('CarouselGenerator Round-Trip Property Tests', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    // Create an in-memory SQLite database with the same schema as production
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS dominical_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        selected_news TEXT,
        status TEXT DEFAULT 'pending_review',
        created_at TEXT NOT NULL
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
  });

  afterEach(() => {
    db.close();
  });

  describe('Property 11: Carousel metadata round-trip with ordering', () => {
    it('storing and retrieving carousel slides preserves ordering and all field values', () => {
      const insertReport = db.prepare(`
        INSERT INTO dominical_reports (week_start, week_end, selected_news, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertSlide = db.prepare(`
        INSERT INTO carousel_slides
          (report_id, position, slide_type, article_slug, title_text, engagement_phrase,
           background_image_path, composite_image_path, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const querySlides = db.prepare(`
        SELECT report_id, position, slide_type, article_slug, title_text,
               engagement_phrase, background_image_path, composite_image_path, status
        FROM carousel_slides
        WHERE report_id = ?
        ORDER BY position ASC
      `);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (seed) => {
            // Create a report for this iteration
            const now = new Date().toISOString();
            const result = insertReport.run('2025-01-06', '2025-01-12', '[]', 'pending_review', now);
            const reportId = Number(result.lastInsertRowid);

            // Generate arbitrary carousel slides for this report
            const slidesArb = carouselSlidesArb(reportId);
            const slides = fc.sample(slidesArb, 1)[0];

            // Insert all slides (in shuffled order)
            for (const slide of slides) {
              insertSlide.run(
                slide.report_id,
                slide.position,
                slide.slide_type,
                slide.article_slug,
                slide.title_text,
                slide.engagement_phrase,
                slide.background_image_path,
                slide.composite_image_path,
                slide.status,
                now,
                now,
              );
            }

            // Retrieve slides ordered by position
            const retrieved = querySlides.all(reportId) as SlideRecord[];

            // Sort the original slides by position for comparison
            const expected = [...slides].sort((a, b) => a.position - b.position);

            // Verify count matches
            expect(retrieved).toHaveLength(expected.length);

            // Verify ordering is correct (positions are ascending)
            for (let i = 0; i < retrieved.length; i++) {
              if (i > 0) {
                expect(retrieved[i].position).toBeGreaterThan(retrieved[i - 1].position);
              }
            }

            // Verify all field values match
            for (let i = 0; i < expected.length; i++) {
              const exp = expected[i];
              const ret = retrieved[i];

              expect(ret.report_id).toBe(exp.report_id);
              expect(ret.position).toBe(exp.position);
              expect(ret.slide_type).toBe(exp.slide_type);
              expect(ret.article_slug).toBe(exp.article_slug);
              expect(ret.title_text).toBe(exp.title_text);
              expect(ret.engagement_phrase).toBe(exp.engagement_phrase);
              expect(ret.background_image_path).toBe(exp.background_image_path);
              expect(ret.composite_image_path).toBe(exp.composite_image_path);
              expect(ret.status).toBe(exp.status);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
