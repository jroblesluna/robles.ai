import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 4: Slide generation independence (error isolation)
 * **Validates: Requirements 2.4**
 *
 * For any set of N slides where K slides fail image generation (K < N),
 * exactly N-K slides SHALL complete successfully with status 'generated',
 * and the failed slides SHALL have status 'failed' without affecting the successful ones.
 *
 * Feature: dominical-carousel-images, Property 4: Slide generation independence (error isolation)
 */

// --- Mutable state for controlling test behavior per iteration ---
let currentArticles: Array<{ title: string; excerpt: string; categories: string[]; slug: string }> = [];
let failureMask: boolean[] = [];

// --- Mock setup ---

vi.mock('../../db.js', () => ({
  default: {
    prepare: (sql: string) => {
      // For the settings query (getApiKey)
      if (sql.includes('settings')) {
        return { get: () => ({ value: 'test-api-key' }) };
      }
      // For the concurrency guard (assertNotGenerating)
      if (sql.includes('COUNT(*)')) {
        return { get: () => ({ count: 0 }) };
      }
      // For fetchReport
      if (sql.includes('dominical_reports')) {
        return {
          get: () => ({
            id: 1,
            week_start: '2025-01-06',
            week_end: '2025-01-12',
            selected_news: JSON.stringify(currentArticles),
          }),
        };
      }
      // For INSERT OR REPLACE (upsertSlide)
      return { run: vi.fn() };
    },
  },
}));

// Mock engagement phrases - always succeed
vi.mock('../engagementPhrases.js', () => ({
  generateEngagementPhrases: vi.fn().mockImplementation(async (articles: any[]) => ({
    phrases: articles.map((_: any, i: number) => `Frase ${i + 1}`),
  })),
}));

// Mock image generation - uses failureMask to determine which calls throw
vi.mock('../carouselImageGen.js', () => ({
  ensureBackgroundsDir: vi.fn().mockReturnValue('/tmp/backgrounds'),
  generateCarouselBackgroundImage: vi.fn().mockImplementation(
    async (_title: string, _cats: string[], _key: string, outputPath: string) => {
      const match = outputPath.match(/slide-(\d+)\.png$/);
      if (match) {
        const slidePosition = parseInt(match[1], 10); // 1-based position
        // failureMask: index 0 = cover, 1..N = articles, N+1 = CTA
        if (failureMask[slidePosition]) {
          throw new Error(`Simulated failure for article at position ${slidePosition}`);
        }
      }
    },
  ),
  generateCoverBackground: vi.fn().mockImplementation(async () => {
    if (failureMask[0]) {
      throw new Error('Simulated failure for cover');
    }
  }),
  generateCTABackground: vi.fn().mockImplementation(async () => {
    // CTA is always the last position
    if (failureMask[failureMask.length - 1]) {
      throw new Error('Simulated failure for CTA');
    }
  }),
}));

// Mock slide compositor - always succeeds (composition only runs when bg exists)
vi.mock('../slideCompositor.js', () => ({
  composeArticleSlide: vi.fn().mockResolvedValue(undefined),
  composeCoverSlide: vi.fn().mockResolvedValue(undefined),
  composeCTASlide: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: (filePath: string) => {
      // If cover.png
      if (filePath.includes('cover.png')) {
        return !failureMask[0];
      }
      // If cta.png
      if (filePath.includes('cta.png')) {
        return !failureMask[failureMask.length - 1];
      }
      // If slide-N.png (article backgrounds)
      const slideMatch = filePath.match(/slide-(\d+)\.png/);
      if (slideMatch) {
        const position = parseInt(slideMatch[1], 10);
        return !failureMask[position];
      }
      return true;
    },
  },
  mkdirSync: vi.fn(),
  existsSync: (filePath: string) => {
    if (filePath.includes('cover.png')) {
      return !failureMask[0];
    }
    if (filePath.includes('cta.png')) {
      return !failureMask[failureMask.length - 1];
    }
    const slideMatch = filePath.match(/slide-(\d+)\.png/);
    if (slideMatch) {
      const position = parseInt(slideMatch[1], 10);
      return !failureMask[position];
    }
    return true;
  },
}));

// --- Arbitraries ---

/** Generate article count between 2 and 10 */
const articleCountArb = fc.integer({ min: 2, max: 10 });

/**
 * Generate a failure mask (boolean array) for totalSlides.
 * Ensures at least one success and at least one failure for meaningful tests.
 */
function failureMaskArb(totalSlides: number): fc.Arbitrary<boolean[]> {
  return fc
    .array(fc.boolean(), { minLength: totalSlides, maxLength: totalSlides })
    .filter((mask) => mask.some((v) => !v) && mask.some((v) => v));
}

describe('CarouselGenerator Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentArticles = [];
    failureMask = [];
  });

  describe('Property 4: Slide generation independence (error isolation)', () => {
    it('successful slides are unaffected by failed ones for arbitrary failure patterns', async () => {
      const { generateCarousel } = await import('../carouselGenerator.js');

      await fc.assert(
        fc.asyncProperty(
          articleCountArb.chain((count) => {
            const totalSlides = count + 2;
            return failureMaskArb(totalSlides).map((mask) => ({ count, mask }));
          }),
          async ({ count, mask }) => {
            const totalSlides = count + 2;

            // Set up test state for this iteration
            currentArticles = Array.from({ length: count }, (_, i) => ({
              title: `Article ${i + 1}`,
              excerpt: `Excerpt ${i + 1}`,
              categories: ['AI', 'Tech'],
              slug: `article-${i + 1}`,
            }));
            failureMask = mask;

            // Execute
            const result = await generateCarousel(1);

            // --- Assertions ---

            // Total slides equals the expected count (cover + articles + CTA)
            expect(result.slides.length).toBe(totalSlides);

            const expectedSuccessCount = mask.filter((f) => !f).length;
            const expectedFailureCount = mask.filter((f) => f).length;

            // Total slides = successful + failed
            const generated = result.slides.filter((s) => s.status === 'generated');
            const failed = result.slides.filter((s) => s.status === 'failed');
            expect(generated.length + failed.length).toBe(totalSlides);
            expect(generated.length).toBe(expectedSuccessCount);
            expect(failed.length).toBe(expectedFailureCount);

            // Each slide's status matches its entry in the failure mask
            for (let i = 0; i < result.slides.length; i++) {
              const slide = result.slides[i];
              if (mask[i]) {
                // This slide's background generation should have failed
                expect(slide.status).toBe('failed');
                expect(slide.imagePath).toBeNull();
              } else {
                // This slide's background generation succeeded
                expect(slide.status).toBe('generated');
                expect(slide.imagePath).not.toBeNull();
              }
            }

            // Errors array matches exactly the failed slides
            expect(result.errors.length).toBe(expectedFailureCount);

            // Verify independence: success/failure of one slide doesn't affect others
            // (Already proven by per-slide assertions above matching the mask exactly,
            // but let's also verify no cross-contamination of positions)
            for (const error of result.errors) {
              expect(mask[error.position]).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
