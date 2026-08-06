import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 6: Carousel structural ordering
 * **Validates: Requirements 4.1, 5.1**
 *
 * For any generated carousel with N articles, the carousel SHALL contain exactly N+2 slides,
 * where position 0 is always a 'cover' type, positions 1 through N are 'article' type,
 * and position N+1 is always a 'cta' type.
 *
 * Feature: dominical-carousel-images, Property 6: Carousel structural ordering
 */

// Mock better-sqlite3 database
const mockPrepare = vi.fn();
const mockDb = { prepare: mockPrepare };

vi.mock('../../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

// Mock engagement phrases
vi.mock('../engagementPhrases.js', () => ({
  generateEngagementPhrases: vi.fn().mockResolvedValue({ phrases: [] }),
}));

// Mock carouselImageGen
vi.mock('../carouselImageGen.js', () => ({
  generateCarouselBackgroundImage: vi.fn().mockResolvedValue(undefined),
  generateCoverBackground: vi.fn().mockResolvedValue(undefined),
  generateCTABackground: vi.fn().mockResolvedValue(undefined),
  ensureBackgroundsDir: vi.fn().mockReturnValue('/tmp/mock-backgrounds'),
}));

// Mock slideCompositor
vi.mock('../slideCompositor.js', () => ({
  composeArticleSlide: vi.fn().mockResolvedValue(undefined),
  composeCoverSlide: vi.fn().mockResolvedValue(undefined),
  composeCTASlide: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

/** Arbitrary for generating article data as it would come from the DB */
const articleArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  excerpt: fc.string({ minLength: 1, maxLength: 200 }),
  categories: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 3 }),
  slug: fc.string({ minLength: 1, maxLength: 50 }),
});

/** Arbitrary for generating 1-20 articles */
const articlesArb = fc.array(articleArb, { minLength: 1, maxLength: 20 });

describe('CarouselGenerator Ordering Property Tests', () => {
  beforeEach(() => {
    mockPrepare.mockReset();
  });

  describe('Property 6: Carousel structural ordering', () => {
    it('for any N articles (1-20), carousel has exactly N+2 slides in order: cover, N articles, cta', async () => {
      const { generateCarousel } = await import('../carouselGenerator.js');
      const { generateEngagementPhrases } = await import('../engagementPhrases.js');

      await fc.assert(
        fc.asyncProperty(articlesArb, async (articles) => {
          const N = articles.length;

          // Setup mock DB responses
          mockPrepare.mockImplementation((sql: string) => {
            // Concurrency guard: no slides currently generating
            if (sql.includes('SELECT COUNT(*)')) {
              return { get: () => ({ count: 0 }) };
            }
            // Settings table for API key
            if (sql.includes('SELECT value FROM settings')) {
              return { get: () => ({ value: 'mock-api-key' }) };
            }
            // Fetch report
            if (sql.includes('SELECT id, week_start, week_end, selected_news')) {
              return {
                get: () => ({
                  id: 1,
                  week_start: '2025-01-06',
                  week_end: '2025-01-12',
                  selected_news: JSON.stringify(articles),
                }),
              };
            }
            // INSERT OR REPLACE for slide upsert
            if (sql.includes('INSERT OR REPLACE')) {
              return { run: vi.fn() };
            }
            return { get: () => undefined, run: vi.fn() };
          });

          // Mock engagement phrases to return one phrase per article
          vi.mocked(generateEngagementPhrases as any).mockResolvedValue({
            phrases: articles.map((_, i) => `Frase ${i + 1}`),
          });

          const result = await generateCarousel(1);

          // PROPERTY: Total slides = N + 2
          expect(result.slides).toHaveLength(N + 2);

          // PROPERTY: Position 0 is always type 'cover'
          expect(result.slides[0].position).toBe(0);
          expect(result.slides[0].type).toBe('cover');

          // PROPERTY: Positions 1..N are type 'article'
          for (let i = 1; i <= N; i++) {
            expect(result.slides[i].position).toBe(i);
            expect(result.slides[i].type).toBe('article');
          }

          // PROPERTY: Position N+1 is type 'cta'
          expect(result.slides[N + 1].position).toBe(N + 1);
          expect(result.slides[N + 1].type).toBe('cta');
        }),
        { numRuns: 100 },
      );
    });
  });
});
