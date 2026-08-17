import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { extractContent, type PostJson } from './indexer';

// --- Custom Arbitraries ---

/** Arbitrary for a non-empty string (used for required fields like title, excerpt) */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Arbitrary for a content section with heading and body */
const contentSection = fc.record({
  heading: fc.string({ minLength: 0, maxLength: 100 }),
  body: fc.string({ minLength: 0, maxLength: 200 }),
});

/** Arbitrary for a valid translation object with all required fields */
const validTranslation = fc.record({
  title: nonEmptyString,
  excerpt: nonEmptyString,
  content: fc.array(contentSection, { minLength: 1, maxLength: 10 }),
});

/** Arbitrary for a valid PostJson with both en and es translations */
const validBilingualPost: fc.Arbitrary<PostJson> = fc.record({
  slug: nonEmptyString,
  categories: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  translations: fc.record({
    en: validTranslation,
    es: validTranslation,
  }),
});

/** Arbitrary for a valid PostJson with only one translation (en or es) */
const validSingleLangPost: fc.Arbitrary<PostJson> = fc.oneof(
  fc.record({
    slug: nonEmptyString,
    categories: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    translations: fc.record({ en: validTranslation }).map((t) => ({ en: t.en })),
  }),
  fc.record({
    slug: nonEmptyString,
    categories: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    translations: fc.record({ es: validTranslation }).map((t) => ({ es: t.es })),
  }),
);

// --- Property Tests ---

describe('extractContent — Property Tests', () => {
  describe('Property 1: Two rows per post with correct slug and language', () => {
    /**
     * **Validates: Requirements 1.3, 2.3, 2.4, 3.2**
     *
     * For any valid post JSON with both translations.en and translations.es present,
     * extractContent produces exactly 2 rows: one with language='en' and one with
     * language='es', both sharing the same slug value.
     */
    it('produces exactly 2 rows for a bilingual post, each with correct slug and language', () => {
      fc.assert(
        fc.property(validBilingualPost, (post) => {
          const rows = extractContent(post);

          // Exactly 2 rows
          expect(rows).toHaveLength(2);

          // Both rows have the post's slug
          expect(rows[0].slug).toBe(post.slug);
          expect(rows[1].slug).toBe(post.slug);

          // One row per language
          const languages = rows.map((r) => r.language).sort();
          expect(languages).toEqual(['en', 'es']);
        }),
        { numRuns: 100 },
      );
    });

    it('produces exactly 1 row for a single-language post', () => {
      fc.assert(
        fc.property(validSingleLangPost, (post) => {
          const rows = extractContent(post);

          expect(rows).toHaveLength(1);
          expect(rows[0].slug).toBe(post.slug);

          // Language matches whichever translation is present
          const expectedLang = post.translations.en ? 'en' : 'es';
          expect(rows[0].language).toBe(expectedLang);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Content extraction completeness', () => {
    /**
     * **Validates: Requirements 2.2**
     *
     * For any valid post translation containing N content sections (each with heading
     * and body), the extracted content string contains every heading and every body
     * value from that translation.
     */
    it('extracted content contains every heading and body from the source translation', () => {
      fc.assert(
        fc.property(validBilingualPost, (post) => {
          const rows = extractContent(post);

          for (const row of rows) {
            const translation = post.translations[row.language]!;

            for (const section of translation.content) {
              if (section.heading) {
                expect(row.content).toContain(section.heading);
              }
              if (section.body) {
                expect(row.content).toContain(section.body);
              }
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('extracted title and excerpt match the source translation', () => {
      fc.assert(
        fc.property(validBilingualPost, (post) => {
          const rows = extractContent(post);

          for (const row of rows) {
            const translation = post.translations[row.language]!;
            expect(row.title).toBe(translation.title);
            expect(row.excerpt).toBe(translation.excerpt);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Invalid post handling', () => {
    /**
     * **Validates: Requirements 2.5, 3.4**
     *
     * For any post JSON object missing required translation fields (title, excerpt,
     * or content), extractContent returns an empty array for that translation without
     * throwing an error.
     */
    it('returns empty array for posts with empty translations object', () => {
      fc.assert(
        fc.property(nonEmptyString, fc.array(fc.string(), { maxLength: 5 }), (slug, categories) => {
          const post: PostJson = { slug, categories, translations: {} };
          expect(() => extractContent(post)).not.toThrow();
          expect(extractContent(post)).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('returns empty array for posts with missing title', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          nonEmptyString,
          fc.array(contentSection, { minLength: 1, maxLength: 5 }),
          (slug, excerpt, content) => {
            const post: PostJson = {
              slug,
              categories: [],
              translations: {
                en: { title: '', excerpt, content },
                es: { title: '', excerpt, content },
              },
            };
            expect(() => extractContent(post)).not.toThrow();
            expect(extractContent(post)).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns empty array for posts with missing excerpt', () => {
      fc.assert(
        fc.property(
          nonEmptyString,
          nonEmptyString,
          fc.array(contentSection, { minLength: 1, maxLength: 5 }),
          (slug, title, content) => {
            const post: PostJson = {
              slug,
              categories: [],
              translations: {
                en: { title, excerpt: '', content },
                es: { title, excerpt: '', content },
              },
            };
            expect(() => extractContent(post)).not.toThrow();
            expect(extractContent(post)).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns empty array for posts with missing content array', () => {
      fc.assert(
        fc.property(nonEmptyString, nonEmptyString, nonEmptyString, (slug, title, excerpt) => {
          const post: PostJson = {
            slug,
            categories: [],
            translations: {
              en: { title, excerpt, content: undefined as any },
              es: { title, excerpt, content: null as any },
            },
          };
          expect(() => extractContent(post)).not.toThrow();
          expect(extractContent(post)).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('does not throw for null/undefined post input', () => {
      expect(() => extractContent(null as any)).not.toThrow();
      expect(extractContent(null as any)).toHaveLength(0);
      expect(() => extractContent(undefined as any)).not.toThrow();
      expect(extractContent(undefined as any)).toHaveLength(0);
    });

    it('skips invalid translation while keeping valid one', () => {
      fc.assert(
        fc.property(validTranslation, nonEmptyString, (validTrans, slug) => {
          // Post with valid 'en' but invalid 'es' (missing title)
          const post: PostJson = {
            slug,
            categories: [],
            translations: {
              en: validTrans,
              es: { title: '', excerpt: 'some excerpt', content: [{ heading: 'H', body: 'B' }] },
            },
          };
          const rows = extractContent(post);

          expect(rows).toHaveLength(1);
          expect(rows[0].language).toBe('en');
          expect(rows[0].slug).toBe(slug);
        }),
        { numRuns: 100 },
      );
    });
  });
});
