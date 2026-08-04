import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildBlogMeta, buildBlogJsonLd } from '../metaBuilders.js';
import type { BlogPostData } from '../types.js';

const BASE_URL = 'https://robles.ai';

/**
 * Property 2: Description truncation invariant
 * **Validates: Requirements 1.2**
 *
 * For any blog post excerpt of any length, the description in PageMeta has length <= 160.
 *
 * Feature: seo-improvements, Property 2: Description truncation invariant
 */

/**
 * Property 7: Hreflang symmetry for blog posts
 * **Validates: Requirements 5.1, 5.2, 5.3**
 *
 * For any blog post with EN/ES translations, hreflangLinks contains exactly 3 entries
 * (en, es, x-default) with correct URLs pointing to the respective slugs.
 *
 * Feature: seo-improvements, Property 7: Hreflang symmetry for blog posts
 */

/** Arbitrary for generating a valid slug string (date-prefixed, lowercase alphanumeric with dashes). */
const slugArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
    fc.array(fc.stringMatching(/^[a-z][a-z0-9]{1,12}$/), { minLength: 2, maxLength: 6 }),
  )
  .map(([year, month, day, hour, min, sec, words]) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const mi = String(min).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    return `${year}-${mm}-${dd}-${hh}-${mi}-${ss}-${words.join('-')}`;
  });

/** Arbitrary for a BlogTranslation with a given slug. */
const blogTranslationArb = (slug: fc.Arbitrary<string>) =>
  fc.record({
    slug,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    excerpt: fc.string({ minLength: 1, maxLength: 300 }),
    content: fc.array(
      fc.record({
        heading: fc.string({ minLength: 1, maxLength: 50 }),
        body: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { minLength: 1, maxLength: 3 },
    ),
  });

/** Arbitrary for BlogPostData with distinct EN and ES slugs. */
const blogPostDataArb = fc
  .tuple(slugArb, slugArb)
  .filter(([enSlug, esSlug]) => enSlug !== esSlug)
  .chain(([enSlug, esSlug]) =>
    fc.record({
      slug: fc.constant(enSlug),
      date: fc.constant(enSlug.slice(0, 10)),
      image: fc.option(fc.constant('/images/test.jpg'), { nil: undefined }),
      editorId: fc.integer({ min: 1, max: 20 }),
      categories: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
      keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
      translations: fc.record({
        en: blogTranslationArb(fc.constant(enSlug)),
        es: blogTranslationArb(fc.constant(esSlug)),
      }),
      sources: fc.array(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          url: fc.constant('https://example.com'),
          source: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        { minLength: 0, maxLength: 2 },
      ),
    }),
  );

/**
 * Arbitrary for generating excerpts with varying lengths to test truncation.
 * Covers: empty, short, exactly 160, 161, and very long strings.
 */
const excerptLengthArb = fc.oneof(
  // Empty excerpt
  fc.constant(''),
  // Short excerpt (1–50 chars)
  fc.string({ minLength: 1, maxLength: 50 }),
  // Medium excerpt (51–159 chars)
  fc.string({ minLength: 51, maxLength: 159 }),
  // Exactly 160 characters
  fc.string({ minLength: 160, maxLength: 160 }),
  // Exactly 161 characters (just over the limit)
  fc.string({ minLength: 161, maxLength: 161 }),
  // Very long excerpt (162–1000 chars)
  fc.string({ minLength: 162, maxLength: 1000 }),
);

/** Arbitrary for BlogPostData with varying excerpt lengths for truncation testing. */
const blogPostWithVaryingExcerptArb = fc
  .tuple(slugArb, slugArb, excerptLengthArb, excerptLengthArb)
  .filter(([enSlug, esSlug]) => enSlug !== esSlug)
  .chain(([enSlug, esSlug, enExcerpt, esExcerpt]) =>
    fc.record({
      slug: fc.constant(enSlug),
      date: fc.constant(enSlug.slice(0, 10)),
      image: fc.option(fc.constant('/images/test.jpg'), { nil: undefined }),
      editorId: fc.integer({ min: 1, max: 20 }),
      categories: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
      keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
      translations: fc.record({
        en: fc.record({
          slug: fc.constant(enSlug),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          excerpt: fc.constant(enExcerpt),
          content: fc.array(
            fc.record({
              heading: fc.string({ minLength: 1, maxLength: 50 }),
              body: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 2 },
          ),
        }),
        es: fc.record({
          slug: fc.constant(esSlug),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          excerpt: fc.constant(esExcerpt),
          content: fc.array(
            fc.record({
              heading: fc.string({ minLength: 1, maxLength: 50 }),
              body: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 2 },
          ),
        }),
      }),
      sources: fc.constant([]),
    }),
  );

describe('BlogMetaBuilder Property Tests', () => {
  describe('Property 2: Description truncation invariant', () => {
    it('for any blog post excerpt of any length, the description in PageMeta has length <= 160', () => {
      fc.assert(
        fc.property(
          blogPostWithVaryingExcerptArb,
          fc.constantFrom('en' as const, 'es' as const),
          (post: BlogPostData, lang) => {
            const slug = post.translations[lang].slug;
            const result = buildBlogMeta({ post, lang, slug });

            expect(result.description.length).toBeLessThanOrEqual(160);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  it('Property 7: hreflangLinks contains exactly 3 entries (en, es, x-default) with correct URLs', () => {
    fc.assert(
      fc.property(
        blogPostDataArb,
        fc.constantFrom('en' as const, 'es' as const),
        (post: BlogPostData, lang) => {
          const slug = post.translations[lang].slug;
          const result = buildBlogMeta({ post, lang, slug });

          const enSlug = post.translations.en.slug;
          const esSlug = post.translations.es.slug;

          // 1. hreflangLinks has exactly 3 entries
          expect(result.hreflangLinks).toHaveLength(3);

          // 2. One entry has hreflang="en" with href containing the EN slug
          const enLink = result.hreflangLinks.find((l) => l.hreflang === 'en');
          expect(enLink).toBeDefined();
          expect(enLink!.href).toBe(`${BASE_URL}/blog/${enSlug}`);

          // 3. One entry has hreflang="es" with href containing the ES slug
          const esLink = result.hreflangLinks.find((l) => l.hreflang === 'es');
          expect(esLink).toBeDefined();
          expect(esLink!.href).toBe(`${BASE_URL}/blog/${esSlug}`);

          // 4. One entry has hreflang="x-default" with href containing the EN slug
          const defaultLink = result.hreflangLinks.find((l) => l.hreflang === 'x-default');
          expect(defaultLink).toBeDefined();
          expect(defaultLink!.href).toBe(`${BASE_URL}/blog/${enSlug}`);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 9: JSON-LD BlogPosting schema completeness
 * **Validates: Requirements 3.1, 3.2**
 *
 * For any blog post, JSON-LD contains @type BlogPosting with all required properties:
 * headline, description, datePublished, author, publisher, image, mainEntityOfPage.
 *
 * Feature: seo-improvements, Property 9: JSON-LD BlogPosting schema completeness
 */

/** Arbitrary for generating a random editor name. */
const editorNameArb = fc.string({ minLength: 1, maxLength: 50 });

describe('Property 9: JSON-LD BlogPosting schema completeness', () => {
  it('for any blog post, JSON-LD contains @type BlogPosting with all required properties', () => {
    fc.assert(
      fc.property(
        blogPostDataArb,
        fc.constantFrom('en' as const, 'es' as const),
        editorNameArb,
        (post: BlogPostData, lang, editorName) => {
          const slug = post.translations[lang].slug;
          const result = buildBlogJsonLd({ post, lang, slug }, editorName);

          // The first element should be the BlogPosting schema
          const blogPosting = result[0] as Record<string, any>;

          // 1. First element has @type "BlogPosting"
          expect(blogPosting['@type']).toBe('BlogPosting');

          // 2. All 7 required properties exist with truthy/non-empty values
          expect(blogPosting.headline).toBeTruthy();
          expect(blogPosting.description).toBeTruthy();
          expect(blogPosting.datePublished).toBeTruthy();
          expect(blogPosting.author).toBeTruthy();
          expect(blogPosting.publisher).toBeTruthy();
          expect(blogPosting.image).toBeTruthy();
          expect(blogPosting.mainEntityOfPage).toBeTruthy();

          // 3. author has @type "Person" and a non-empty name
          expect(blogPosting.author['@type']).toBe('Person');
          expect(blogPosting.author.name).toBeTruthy();
          expect(typeof blogPosting.author.name).toBe('string');
          expect(blogPosting.author.name.length).toBeGreaterThan(0);

          // 4. publisher has @type "Organization"
          expect(blogPosting.publisher['@type']).toBe('Organization');
        },
      ),
      { numRuns: 100 },
    );
  });
});
