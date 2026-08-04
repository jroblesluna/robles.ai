import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { injectMeta } from '../htmlInjector.js';
import { buildBlogMeta } from '../metaBuilders.js';
import type { BlogPostData, PageMeta, HreflangLink } from '../types.js';

/**
 * Property 1: Blog meta injection round-trip
 * **Validates: Requirements 1.1, 1.5, 1.6**
 *
 * For any valid blog post, the injected HTML contains a `<title>` matching the post title
 * in the resolved language (with HTML entities escaped).
 *
 * Feature: seo-improvements, Property 1: Blog meta injection round-trip
 */

/**
 * Property 6: Body content preservation
 * **Validates: Requirements 1.8, 9.1**
 *
 * For any HTML template and PageMeta, the <body> element is byte-identical after injection.
 *
 * Feature: seo-improvements, Property 6: Body content preservation
 */

/** Base HTML template used as injection target. */
const BASE_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Default</title>
  <meta name="description" content="Default description">
</head>
<body>
  <div id="root"></div>
  <script src="/assets/main.js"></script>
</body>
</html>`;

/** Escape special HTML characters for text content (mirrors htmlInjector's escapeHtml). */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

describe('HtmlInjector Property Tests', () => {
  describe('Property 1: Blog meta injection round-trip', () => {
    it('for any valid blog post, the injected HTML contains a <title> matching the post title in the resolved language', () => {
      fc.assert(
        fc.property(
          blogPostDataArb,
          fc.constantFrom('en' as const, 'es' as const),
          (post: BlogPostData, lang) => {
            const slug = post.translations[lang].slug;

            // Build meta from the blog post
            const meta = buildBlogMeta({ post, lang, slug });

            // Inject meta into the base HTML template
            const result = injectMeta(BASE_HTML_TEMPLATE, meta);

            // The title in the resolved language should appear in the HTML,
            // escaped for HTML content (& → &amp;, < → &lt;, > → &gt;)
            const expectedTitle = escapeHtml(post.translations[lang].title);
            const titleMatch = result.match(/<title>(.*?)<\/title>/);

            expect(titleMatch).not.toBeNull();
            expect(titleMatch![1]).toBe(expectedTitle);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 6: Body content preservation', () => {
    /** Arbitrary for generating random body content (may include scripts, divs, text, etc.) */
    const bodyContentArb = fc.oneof(
      // Simple text content
      fc.stringMatching(/^[a-zA-Z0-9 .,!?]{0,100}$/),
      // Content with script tags
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9 ]{0,50}$/),
        fc.stringMatching(/^\/[a-z]+\/[a-z]+\.[a-z]+$/),
      ).map(([text, scriptSrc]) =>
        `<div id="root">${text}</div>\n  <script type="module" src="${scriptSrc}"></script>`
      ),
      // Content with nested elements
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9 ]{0,30}$/),
        fc.stringMatching(/^[a-zA-Z0-9 ]{0,30}$/),
        fc.stringMatching(/^[a-zA-Z0-9 ]{0,30}$/),
      ).map(([a, b, c]) =>
        `<div id="root"><h1>${a}</h1><p>${b}</p></div><footer>${c}</footer>`
      ),
      // Content with inline scripts
      fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).map(code =>
        `<div id="app"></div>\n  <script>var x = "${code}";</script>`
      ),
    );

    /** Arbitrary for generating random head content (meta tags, links, etc.) */
    const headContentArb = fc.tuple(
      fc.stringMatching(/^[a-zA-Z0-9 ]{1,40}$/),
      fc.stringMatching(/^[a-zA-Z0-9 .,]{1,80}$/),
      fc.boolean(),
      fc.boolean(),
    ).map(([title, description, hasCanonical, hasOg]) => {
      let head = `  <meta charset="UTF-8">\n  <title>${title}</title>`;
      head += `\n  <meta name="description" content="${description}">`;
      if (hasOg) {
        head += `\n  <meta property="og:title" content="${title}">`;
        head += `\n  <meta property="og:description" content="${description}">`;
        head += `\n  <meta property="og:url" content="https://robles.ai/">`;
        head += `\n  <meta property="og:type" content="website">`;
        head += `\n  <meta property="og:image" content="https://robles.ai/images/logo.png">`;
      }
      if (hasCanonical) {
        head += `\n  <link rel="canonical" href="https://robles.ai/">`;
      }
      return head;
    });

    /** Arbitrary for generating an HTML template with <head> and <body> */
    const htmlTemplateArb = fc.tuple(headContentArb, bodyContentArb).map(([headContent, bodyContent]) =>
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n${headContent}\n</head>\n<body>\n  ${bodyContent}\n</body>\n</html>`
    );

    /** Arbitrary for generating a valid URL path */
    const urlPathArb = fc.array(
      fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/),
      { minLength: 1, maxLength: 3 },
    ).map(parts => `https://robles.ai/${parts.join('/')}`);

    /** Arbitrary for generating HreflangLink entries */
    const hreflangLinksArb: fc.Arbitrary<HreflangLink[]> = urlPathArb.chain(baseUrl =>
      fc.constant([
        { hreflang: 'en', href: baseUrl },
        { hreflang: 'es', href: `${baseUrl}-es` },
        { hreflang: 'x-default', href: baseUrl },
      ])
    );

    /** Arbitrary for generating a random PageMeta object */
    const pageMetaArb: fc.Arbitrary<PageMeta> = fc.tuple(
      fc.stringMatching(/^[a-zA-Z0-9 ]{1,60}$/),
      fc.stringMatching(/^[a-zA-Z0-9 .,]{1,120}$/),
      urlPathArb,
      hreflangLinksArb,
      fc.boolean(),
    ).map(([title, description, url, hreflangLinks, hasJsonLd]) => ({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: url,
      ogType: 'article',
      ogImage: 'https://robles.ai/images/test.jpg',
      twitterCard: 'summary_large_image',
      twitterTitle: title,
      twitterDescription: description,
      twitterImage: 'https://robles.ai/images/test.jpg',
      canonicalUrl: url,
      hreflangLinks,
      jsonLd: hasJsonLd
        ? [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: title, description }]
        : undefined,
    }));

    it('for any HTML template and PageMeta, the <body> element is byte-identical after injection', () => {
      fc.assert(
        fc.property(
          htmlTemplateArb,
          pageMetaArb,
          (html, meta) => {
            const result = injectMeta(html, meta);

            // Extract the body section from the original HTML (from <body> to end)
            const originalBodyStart = html.indexOf('<body>');
            const originalBody = html.slice(originalBodyStart);

            // Extract the body section from the output HTML (from <body> to end)
            const resultBodyStart = result.indexOf('<body>');
            const resultBody = result.slice(resultBodyStart);

            // Body must be byte-identical
            expect(resultBody).toBe(originalBody);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
