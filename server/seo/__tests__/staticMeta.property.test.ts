import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildStaticMeta } from '../metaBuilders.js';
import { STATIC_PAGES } from '../types.js';

/**
 * Property 11: Static page meta uses correct i18n key
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 *
 * For any known static page path and language, the title matches the corresponding
 * i18n translation value at seo[key].title.
 *
 * Feature: seo-improvements, Property 11: Static page meta uses correct i18n key
 */

const staticPagePaths = Object.keys(STATIC_PAGES);
const staticPageKeys = Object.values(STATIC_PAGES);

/** Arbitrary for generating a random translations data object with random title/description for each static page key. */
const translationsArb = fc
  .tuple(
    ...staticPageKeys.map((key) =>
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 120 }),
        description: fc.string({ minLength: 1, maxLength: 200 }),
      }),
    ),
  )
  .map((entries) => {
    const seo: Record<string, { title: string; description: string }> = {};
    staticPageKeys.forEach((key, idx) => {
      seo[key] = entries[idx];
    });
    return { seo };
  });

describe('StaticMetaBuilder Property Tests', () => {
  describe('Property 11: Static page meta uses correct i18n key', () => {
    it('for any known static page path and language, the title matches translations.seo[key].title', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...staticPagePaths),
          fc.constantFrom('en' as const, 'es' as const),
          translationsArb,
          (pagePath, lang, translations) => {
            const result = buildStaticMeta(pagePath, lang, translations);
            const i18nKey = STATIC_PAGES[pagePath];
            const expectedTitle = translations.seo[i18nKey].title;

            expect(result.title).toBe(expectedTitle);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
