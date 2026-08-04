# Implementation Plan: SEO Improvements

## Overview

Server-side HTML meta tag injection for the Robles.AI website, enabling search engine crawlers to see correct metadata without executing JavaScript. Implementation follows the dependency order: SlugIndex → MetaBuilders → HtmlInjector → MetaInjector middleware → Sitemap enhancements → Testing infrastructure.

## Tasks

- [x] 1. Set up testing infrastructure and core interfaces
  - [x] 1.1 Install testing dependencies (vitest, fast-check) and create vitest config
    - Add `vitest`, `fast-check`, and `@types/node` as devDependencies
    - Create `vitest.config.ts` at project root with TypeScript path aliases matching `vite.config.ts`
    - Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: N/A (infrastructure)_

  - [x] 1.2 Create shared interfaces and types in `server/seo/types.ts`
    - Define `PageMeta`, `HreflangLink`, `SlugIndexEntry`, `BlogPostData`, `BlogTranslation` interfaces
    - Define `MetaInjectorConfig` interface
    - Define `STATIC_PAGES` registry constant
    - _Requirements: 1.1, 1.3, 2.1, 5.1_

- [x] 2. Implement SlugIndex
  - [x] 2.1 Create `server/seo/slugIndex.ts` with lazy-loading slug-to-file map
    - Implement `createSlugIndex(postsDir)` factory function
    - Recursively scan `server/data/posts/` to build `Map<string, SlugIndexEntry>`
    - Key by both EN and ES slugs for O(1) lookup
    - Implement `get(slug)`, `rebuild()`, and `addEntry()` methods
    - Lazy initialization on first `get()` call
    - _Requirements: 1.1, 1.6, 9.4_

  - [x] 2.2 Write property test for SlugIndex lookup consistency
    - **Property 4: Language resolution from slug**
    - **Validates: Requirements 1.6**
    - For any post with distinct EN/ES slugs, both slugs resolve to the same SlugIndexEntry

  - [x] 2.3 Write unit tests for SlugIndex
    - Test lookup by EN slug, ES slug, and non-existent slug
    - Test `addEntry()` makes new entries immediately queryable
    - Test `rebuild()` refreshes the index
    - _Requirements: 1.6, 1.7_

- [x] 3. Implement BlogMetaBuilder
  - [x] 3.1 Create `server/seo/metaBuilders.ts` with `buildBlogMeta()` function
    - Build `PageMeta` from blog post JSON and language
    - Truncate description to 160 characters
    - Construct canonical URL without query params
    - Build hreflang links (en, es, x-default)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4_

  - [x] 3.2 Implement `buildBlogJsonLd()` for BlogPosting and BreadcrumbList schemas
    - Generate BlogPosting JSON-LD with headline, description, datePublished, author, publisher, image, mainEntityOfPage
    - Generate BreadcrumbList with Home > Blog > Post Title
    - Use editor name from `editors.json` for author field
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Write property test for description truncation invariant
    - **Property 2: Description truncation invariant**
    - **Validates: Requirements 1.2**
    - For any blog post excerpt of any length, the description in PageMeta has length <= 160

  - [x] 3.4 Write property test for Open Graph completeness
    - **Property 3: Open Graph completeness for blog posts**
    - **Validates: Requirements 1.3**
    - For any valid blog post, PageMeta contains all five OG tags with non-empty values

  - [x] 3.5 Write property test for JSON-LD BlogPosting schema completeness
    - **Property 9: JSON-LD BlogPosting schema completeness**
    - **Validates: Requirements 3.1, 3.2**
    - For any blog post, JSON-LD contains @type BlogPosting with all required properties

  - [x] 3.6 Write property test for canonical URL cleanliness
    - **Property 8: Canonical URL is clean (no query parameters)**
    - **Validates: Requirements 5.4**
    - For any blog post, the canonical URL contains no query parameters

  - [x] 3.7 Write property test for hreflang symmetry
    - **Property 7: Hreflang symmetry for blog posts**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - For any blog post with EN/ES translations, hreflangLinks contains exactly 3 entries (en, es, x-default) with correct URLs

- [x] 4. Implement StaticMetaBuilder
  - [x] 4.1 Add `buildStaticMeta()` and `buildHomeJsonLd()` to `server/seo/metaBuilders.ts`
    - Map route path to i18n key via STATIC_PAGES registry
    - Read title/description from i18n translation data
    - Build hreflang links for static pages (EN base, ES with `?lang=es`)
    - Build WebSite JSON-LD for home page with SearchAction
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 6.1, 6.2, 6.3_

  - [x] 4.2 Write property test for static page meta i18n resolution
    - **Property 11: Static page meta uses correct i18n key**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - For any known static page path and language, the title matches the corresponding i18n translation value

- [x] 5. Implement HtmlInjector
  - [x] 5.1 Create `server/seo/htmlInjector.ts` with `injectMeta()` function
    - Replace `<title>...</title>` content
    - Replace/insert `<meta name="description">` tag
    - Replace/insert Open Graph meta tags
    - Replace/insert Twitter Card meta tags
    - Remove existing canonical/alternate link tags, insert new ones
    - Insert JSON-LD script blocks (preserve existing Organization schema)
    - Guarantee no modification to `<body>` content
    - _Requirements: 1.1, 1.3, 1.4, 1.8, 4.2, 5.5_

  - [x] 5.2 Write property test for body content preservation
    - **Property 6: Body content preservation**
    - **Validates: Requirements 1.8, 9.1**
    - For any HTML template and PageMeta, the `<body>` element is byte-identical after injection

  - [x] 5.3 Write property test for blog meta injection round-trip
    - **Property 1: Blog meta injection round-trip**
    - **Validates: Requirements 1.1, 1.5, 1.6**
    - For any valid blog post, the injected HTML contains a `<title>` matching the post title in the resolved language

  - [x] 5.4 Write property test for missing post passthrough
    - **Property 5: Missing post preserves default HTML**
    - **Validates: Requirements 1.7, 1.8**
    - For any unknown slug, the HTML body and script references are identical to the unmodified template

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement MetaInjector middleware
  - [x] 7.1 Create `server/seo/metaInjector.ts` with `createMetaInjector()` factory
    - Implement route matching: blog post (`/blog/:slug`) vs static page vs unknown
    - In development mode: read source `index.html`, apply Vite `transformIndexHtml`
    - In production mode: read and cache built `index.html` from `dist/`
    - Resolve language from slug match or `?lang` query param
    - Delegate to BlogMetaBuilder or StaticMetaBuilder based on route type
    - Call HtmlInjector to produce final HTML
    - On error or unknown route: serve default template unmodified
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 2.1, 2.5, 9.3, 9.5, 9.6_

  - [x] 7.2 Integrate MetaInjector into Express server
    - Register middleware in `server/vite.ts` after API routes but before Vite dev middleware / static serving
    - Pass `vite.transformIndexHtml` as the viteTransform option in dev mode
    - In production, register before `serveStatic` catch-all
    - _Requirements: 9.1, 9.3, 9.5, 9.6_

  - [x] 7.3 Write integration tests for MetaInjector middleware
    - Test blog post request returns HTML with correct meta tags
    - Test static page request returns HTML with correct meta tags
    - Test unknown route returns default HTML unmodified
    - Test `?lang=es` parameter selects Spanish translations
    - _Requirements: 1.1, 1.5, 1.7, 2.1, 2.5_

- [x] 8. Enhance Sitemap Generator
  - [x] 8.1 Update `src/scripts/sitemapService.ts` to generate consolidated sitemaps with hreflang
    - Add `xmlns:xhtml` namespace declaration to `<urlset>`
    - Include `xhtml:link` alternate elements for each blog post URL (EN and ES)
    - Generate one sitemap file per month combining both languages
    - Use clean URLs without `?lang=` query parameters
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.3_

  - [x] 8.2 Update sitemap index endpoint to list all monthly sitemaps
    - Ensure `/sitemap.xml` returns a sitemap index including `static-pages.xml` and all monthly blog sitemaps
    - Include `<lastmod>` element based on file modification date
    - _Requirements: 8.1, 8.2_

  - [x] 8.3 Update cron job to register new posts in SlugIndex and consolidated sitemap
    - Call `slugIndex.addEntry()` when a new post is generated
    - Call updated `updateSitemap()` with both EN and ES slugs
    - _Requirements: 7.3, 9.4_

  - [x] 8.4 Write property test for sitemap hreflang pairing
    - **Property 10: Sitemap hreflang pairing**
    - **Validates: Requirements 7.1**
    - For any blog post entry in a monthly sitemap, there are exactly two xhtml:link elements (EN, ES) with correct slugs

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project currently has no testing framework — task 1.1 sets up vitest + fast-check
- All new SEO modules live under `server/seo/` to keep them organized

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.6", "3.7", "4.1"] },
    { "id": 4, "tasks": ["3.5", "4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "8.4"] }
  ]
}
```
