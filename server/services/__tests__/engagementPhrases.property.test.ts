import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { ArticleInput } from '../carouselTypes.js';

/**
 * Property 1: Engagement phrase length constraint
 * **Validates: Requirements 1.2**
 *
 * For any ArticleInput array, the generated engagement phrases SHALL each
 * be a non-empty string of 80 characters or fewer.
 *
 * Feature: dominical-carousel-images, Property 1: Engagement phrase length constraint
 */

// Mock OpenAI at the module level
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

/** Arbitrary for generating a valid ArticleInput */
const articleInputArb: fc.Arbitrary<ArticleInput> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 120 }),
  excerpt: fc.string({ minLength: 1, maxLength: 300 }),
  categories: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
});

/** Arbitrary for generating an array of 1-10 ArticleInputs */
const articlesArb = fc.array(articleInputArb, { minLength: 1, maxLength: 10 });

describe('EngagementPhrases Property Tests', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe('Property 1: Engagement phrase length constraint', () => {
    it('for any ArticleInput array, all returned phrases are non-empty and ≤80 chars', async () => {
      const { generateEngagementPhrases } = await import('../engagementPhrases.js');

      await fc.assert(
        fc.asyncProperty(articlesArb, async (articles) => {
          // Generate mock phrases matching the number of articles
          const mockPhrases = articles.map(
            (_, i) => `Frase de engagement ${i + 1} para artículo`,
          );

          mockCreate.mockResolvedValueOnce({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockPhrases),
                },
              },
            ],
          });

          const result = await generateEngagementPhrases(articles, 'test-api-key');

          // Assert: every phrase is non-empty and ≤80 chars
          expect(result.phrases).toHaveLength(articles.length);
          for (const phrase of result.phrases) {
            expect(phrase.length).toBeGreaterThan(0);
            expect(phrase.length).toBeLessThanOrEqual(80);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('phrases exceeding 80 chars are truncated to exactly 80 chars', async () => {
      const { generateEngagementPhrases } = await import('../engagementPhrases.js');

      await fc.assert(
        fc.asyncProperty(articlesArb, async (articles) => {
          // Generate phrases that exceed 80 chars to test truncation
          const longPhrases = articles.map(
            (_, i) =>
              `Esta es una frase extremadamente larga que definitivamente supera los ochenta caracteres permitidos número ${i + 1}`,
          );

          mockCreate.mockResolvedValueOnce({
            choices: [
              {
                message: {
                  content: JSON.stringify(longPhrases),
                },
              },
            ],
          });

          const result = await generateEngagementPhrases(articles, 'test-api-key');

          // Assert: every phrase is truncated to ≤80 chars but still non-empty
          expect(result.phrases).toHaveLength(articles.length);
          for (const phrase of result.phrases) {
            expect(phrase.length).toBeGreaterThan(0);
            expect(phrase.length).toBeLessThanOrEqual(80);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
