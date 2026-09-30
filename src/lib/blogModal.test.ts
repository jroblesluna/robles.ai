import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  type BlogModalLang,
  type BlogModalPost,
  absoluteUrl,
  blogPath,
  canGoNext,
  canGoPrev,
  findPostBySlug,
  nextIndex,
  prevIndex,
  selectTranslation,
  slugForLang,
} from './blogModal';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

// Slug fragments that are URL-safe and unique enough per post/lang.
const slugArb = fc
  .stringMatching(/^[a-z0-9]{1,12}(-[a-z0-9]{1,12}){0,3}$/)
  .filter((s) => s.length > 0);

function translationArb(slug: string) {
  return fc.record({
    slug: fc.constant(slug),
    title: fc.string(),
    excerpt: fc.string(),
    content: fc.array(
      fc.record({ heading: fc.string(), body: fc.string() }),
      { minLength: 0, maxLength: 4 },
    ),
  });
}

/**
 * A post whose `en` slug and (optional) `es` slug are distinct, so slug lookup
 * is unambiguous. `includeEs` toggles the presence of the `es` translation to
 * exercise the language-fallback path (Property 4 / Property 3).
 */
function postArb(): fc.Arbitrary<BlogModalPost> {
  return fc
    .record({
      enSlug: slugArb,
      esSlug: slugArb,
      editorId: fc.integer({ min: 1, max: 24 }),
      includeEs: fc.boolean(),
    })
    .map(({ enSlug, esSlug, editorId, includeEs }) => {
      const uniqueEs = esSlug === enSlug ? `${esSlug}-es` : esSlug;
      const post: BlogModalPost = {
        slug: enSlug,
        editorId,
        translations: {
          en: {
            slug: enSlug,
            title: `EN ${enSlug}`,
            excerpt: '',
            content: [],
          },
          ...(includeEs
            ? {
                es: {
                  slug: uniqueEs,
                  title: `ES ${uniqueEs}`,
                  excerpt: '',
                  content: [],
                },
              }
            : {}),
        },
      };
      return post;
    });
}

/**
 * A list of posts whose slugs are globally unique across BOTH `en` and `es`
 * translations. Round-trip lookup (Property 3) is only well-defined when no
 * two posts share a slug, so the generator rewrites every slug to a
 * guaranteed-unique value (deriving each from its list position) rather than
 * relying on random distinctness.
 */
function uniquePostsArb(): fc.Arbitrary<BlogModalPost[]> {
  return fc.array(postArb(), { minLength: 1, maxLength: 8 }).map((posts) =>
    posts.map((p, i) => {
      const enSlug = `en-${i}-${p.translations.en.slug}`;
      const translations: BlogModalPost['translations'] = {
        en: { ...p.translations.en, slug: enSlug },
      };
      if (p.translations.es) {
        translations.es = {
          ...p.translations.es,
          slug: `es-${i}-${p.translations.es.slug}`,
        };
      }
      return { ...p, slug: enSlug, translations };
    }),
  );
}

const langArb: fc.Arbitrary<BlogModalLang> = fc.constantFrom('en', 'es');

// ---------------------------------------------------------------------------

describe('blogModal pure helpers — Correctness Properties', () => {
  // Feature: ux-overhaul, Property 1: Prev/next stays within bounds
  it('Property 1: prev/next stay within [0, length-1] and disable at the ends', () => {
    // Validates: Requirements 15.1, 15.4, 15.5
    fc.assert(
      fc.property(
        fc.array(postArb(), { minLength: 1, maxLength: 10 }),
        fc.nat(),
        (posts, rawIndex) => {
          const length = posts.length;
          const i = rawIndex % length; // valid index in range

          const next = nextIndex(i, length);
          const prev = prevIndex(i, length);

          // Results stay within bounds.
          expect(next).toBeGreaterThanOrEqual(0);
          expect(next).toBeLessThanOrEqual(length - 1);
          expect(prev).toBeGreaterThanOrEqual(0);
          expect(prev).toBeLessThanOrEqual(length - 1);

          // Disabled iff at the corresponding end.
          expect(canGoNext(i, length)).toBe(i !== length - 1);
          expect(canGoPrev(i, length)).toBe(i !== 0);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: ux-overhaul, Property 2: Navigation moves exactly one adjacent post
  it('Property 2: enabled next selects posts[i+1] and enabled prev selects posts[i-1]', () => {
    // Validates: Requirements 15.2, 15.3
    fc.assert(
      fc.property(
        fc.array(postArb(), { minLength: 1, maxLength: 10 }),
        fc.nat(),
        (posts, rawIndex) => {
          const length = posts.length;
          const i = rawIndex % length;

          if (canGoNext(i, length)) {
            const ni = nextIndex(i, length);
            expect(ni).toBe(i + 1);
            expect(posts[ni]).toBe(posts[i + 1]); // preserves order
          }
          if (canGoPrev(i, length)) {
            const pi = prevIndex(i, length);
            expect(pi).toBe(i - 1);
            expect(posts[pi]).toBe(posts[i - 1]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: ux-overhaul, Property 3: URL/slug derivation round-trips to the correct post
  it('Property 3: the built link resolves to /blog/<slug> and looks back up to the same post', () => {
    // Validates: Requirements 12.1, 12.4, 14.1, 14.2, 11.2
    fc.assert(
      fc.property(uniquePostsArb(), fc.nat(), langArb, (posts, rawIndex, lang) => {
        const i = rawIndex % posts.length;
        const post = posts[i];

        const expectedSlug = slugForLang(post, lang); // en fallback when es missing
        const origin = 'https://robles.ai';

        // The path and absolute URL end in the derived slug.
        expect(blogPath(post, lang)).toBe(`/blog/${expectedSlug}`);
        expect(absoluteUrl(post, lang, origin)).toBe(
          `${origin}/blog/${expectedSlug}`,
        );

        // Looking the derived slug back up returns the same post.
        const found = findPostBySlug(posts, expectedSlug);
        expect(found).toBe(post);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: ux-overhaul, Property 4: Language fallback selects a defined translation
  it('Property 4: content chosen is translations[L] when present else translations.en, never undefined', () => {
    // Validates: Requirements 11.2
    fc.assert(
      fc.property(postArb(), langArb, (post, lang) => {
        const chosen = selectTranslation(post, lang);
        expect(chosen).toBeDefined();

        if (post.translations[lang]) {
          expect(chosen).toBe(post.translations[lang]);
        } else {
          expect(chosen).toBe(post.translations.en);
        }
      }),
      { numRuns: 200 },
    );
  });
});
