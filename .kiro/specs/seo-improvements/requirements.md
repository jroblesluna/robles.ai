# Requirements Document

## Introduction

This document specifies the SEO improvements for the Robles.AI website (robles.ai). The site is a React SPA served by Express with 800+ auto-generated blog posts in EN and ES. The goal is to make blog post metadata, structured data, and hreflang tags visible to search engine crawlers without implementing full SSR. The approach uses server-side HTML template injection in Express to replace meta tags in the `<head>` before serving the response.

## Glossary

- **Meta_Injector**: The Express middleware responsible for intercepting HTML responses and injecting correct meta tags (title, description, Open Graph, Twitter Card) into the `<head>` of the built `index.html` before sending it to the client.
- **Blog_Post**: A JSON file stored in `server/data/posts/YYYY/MM/DD/` containing slug, date, editorId, categories, keywords, translations (en/es), and sources.
- **Sitemap_Generator**: The service responsible for producing and updating XML sitemaps for blog posts, organized by year-month and language.
- **Schema_Renderer**: The component responsible for generating JSON-LD structured data (BlogPosting, WebSite, BreadcrumbList) and embedding it in the HTML response.
- **Hreflang_Tag**: An HTML `<link rel="alternate" hreflang="...">` element that tells search engines about alternate language versions of a page.
- **Static_Page**: A non-blog route (/, /careers, /blog, /get-started) that has fixed SEO metadata sourced from i18n translation files.
- **Client_SEO_Hook**: The existing `useSEO` React hook that updates document title and meta description during client-side navigation.

## Requirements

### Requirement 1: Server-Side Meta Tag Injection for Blog Posts

**User Story:** As a search engine crawler, I want to receive correct title, description, Open Graph, and Twitter Card meta tags in the initial HTML response for blog post pages, so that I can index the content without executing JavaScript.

#### Acceptance Criteria

1. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL read the corresponding Blog_Post JSON file and inject the post title into the `<title>` element of the HTML response.
2. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject a `<meta name="description">` tag containing the post excerpt (up to 160 characters) into the HTML response.
3. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject Open Graph tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:image`) into the HTML response.
4. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) into the HTML response.
5. WHEN a request is received for a path matching `/blog/:slug` with a `?lang=es` query parameter, THE Meta_Injector SHALL use the Spanish translation fields (title, excerpt) for all injected meta tags.
6. WHEN a request is received for a path matching `/blog/:slug` with no `lang` query parameter, THE Meta_Injector SHALL determine the language by matching the slug against both `translations.en.slug` and `translations.es.slug` and use the matching language.
7. IF the Blog_Post JSON file is not found for the given slug, THEN THE Meta_Injector SHALL serve the default `index.html` without modifications so the client-side 404 handling can operate.
8. THE Meta_Injector SHALL not alter the `<body>` content or the JavaScript bundle references in the HTML response.

### Requirement 2: Server-Side Meta Tag Injection for Static Pages

**User Story:** As a search engine crawler, I want to receive correct meta tags for static pages (home, careers, blog listing, get-started) in the initial HTML response, so that each page is indexed with accurate metadata.

#### Acceptance Criteria

1. WHEN a request is received for the path `/`, THE Meta_Injector SHALL inject the home page title and description from the EN i18n translation file into the HTML response.
2. WHEN a request is received for the path `/careers`, THE Meta_Injector SHALL inject the careers page title and description from the EN i18n translation file into the HTML response.
3. WHEN a request is received for the path `/blog`, THE Meta_Injector SHALL inject the blog listing title and description from the EN i18n translation file into the HTML response.
4. WHEN a request is received for the path `/get-started`, THE Meta_Injector SHALL inject the landing page title and description from the EN i18n translation file into the HTML response.
5. WHEN a request is received for a Static_Page path with a `?lang=es` query parameter, THE Meta_Injector SHALL use the Spanish i18n translation file for the injected title and description.
6. THE Meta_Injector SHALL inject Open Graph tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:image`) for each Static_Page.

### Requirement 3: Schema.org Structured Data for Blog Posts

**User Story:** As a search engine, I want to find JSON-LD structured data on blog post pages, so that I can display rich results (article snippets, author info, dates) in search listings.

#### Acceptance Criteria

1. WHEN a request is received for a path matching `/blog/:slug`, THE Schema_Renderer SHALL inject a JSON-LD `<script type="application/ld+json">` block containing a `BlogPosting` schema into the HTML `<head>`.
2. THE Schema_Renderer SHALL include the following properties in the BlogPosting schema: `headline`, `description`, `datePublished`, `dateModified`, `author` (with `name` and `@type: Person`), `image`, `publisher` (Robles.AI Organization), and `mainEntityOfPage`.
3. WHEN the blog post language is Spanish, THE Schema_Renderer SHALL use the Spanish translation for `headline` and `description` in the BlogPosting schema.
4. THE Schema_Renderer SHALL include a `BreadcrumbList` schema in the blog post HTML response with items: Home > Blog > [Post Title].

### Requirement 4: Schema.org Structured Data for Home Page

**User Story:** As a search engine, I want to find WebSite structured data on the home page, so that sitelinks search box and other rich features can be presented.

#### Acceptance Criteria

1. WHEN a request is received for the path `/`, THE Schema_Renderer SHALL inject a JSON-LD block containing a `WebSite` schema with `name`, `url`, and `potentialAction` (SearchAction with search URL template) into the HTML `<head>`.
2. THE Schema_Renderer SHALL preserve the existing `Organization` schema already present in `index.html`.

### Requirement 5: Hreflang Implementation for Blog Posts

**User Story:** As a search engine, I want to find hreflang alternate link tags on blog post pages, so that I can serve the correct language version to users in different locales.

#### Acceptance Criteria

1. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject `<link rel="alternate" hreflang="en" href="https://robles.ai/blog/{en_slug}">` into the HTML `<head>`.
2. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject `<link rel="alternate" hreflang="es" href="https://robles.ai/blog/{es_slug}">` into the HTML `<head>`.
3. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject `<link rel="alternate" hreflang="x-default" href="https://robles.ai/blog/{en_slug}">` into the HTML `<head>`.
4. WHEN a request is received for a path matching `/blog/:slug`, THE Meta_Injector SHALL inject a `<link rel="canonical" href="https://robles.ai/blog/{current_language_slug}">` tag without query parameters.
5. THE Meta_Injector SHALL remove or replace any existing canonical or alternate tags from the template HTML before injecting the correct ones.

### Requirement 6: Hreflang Implementation for Static Pages

**User Story:** As a search engine, I want to find hreflang alternate link tags on static pages, so that I can associate the EN and ES versions of each page.

#### Acceptance Criteria

1. WHEN a request is received for a Static_Page path, THE Meta_Injector SHALL inject `<link rel="alternate" hreflang="en" href="https://robles.ai/{path}">` into the HTML `<head>`.
2. WHEN a request is received for a Static_Page path, THE Meta_Injector SHALL inject `<link rel="alternate" hreflang="es" href="https://robles.ai/{path}?lang=es">` into the HTML `<head>`.
3. WHEN a request is received for a Static_Page path, THE Meta_Injector SHALL inject `<link rel="alternate" hreflang="x-default" href="https://robles.ai/{path}">` into the HTML `<head>`.

### Requirement 7: Sitemap Hreflang Annotations

**User Story:** As a search engine, I want sitemaps to include hreflang annotations for each blog post URL, so that I can discover all language variants during crawling.

#### Acceptance Criteria

1. THE Sitemap_Generator SHALL include `xhtml:link` alternate elements for each blog post URL entry, referencing both the EN and ES versions of that post.
2. THE Sitemap_Generator SHALL declare the `xmlns:xhtml` namespace in the sitemap `<urlset>` element.
3. WHEN a new Blog_Post is created by the cron job, THE Sitemap_Generator SHALL add the new post URLs (both EN and ES) with hreflang annotations to the appropriate monthly sitemap file.
4. THE Sitemap_Generator SHALL use clean URLs without `?lang=` query parameters in sitemap entries (e.g., `https://robles.ai/blog/{slug}`).

### Requirement 8: Sitemap Index Completeness

**User Story:** As a search engine, I want the sitemap index at `/sitemap.xml` to include all monthly blog sitemaps, so that all blog content is discoverable.

#### Acceptance Criteria

1. WHEN the `/sitemap.xml` endpoint is requested, THE Express server SHALL return a sitemap index that includes `static-pages.xml` and all monthly blog sitemap files from the sitemaps directory.
2. THE Express server SHALL include a `<lastmod>` element for each sitemap entry based on the file modification date.
3. THE Sitemap_Generator SHALL produce one sitemap file per month (combining both languages with hreflang) instead of separate per-language files, to consolidate hreflang signals.

### Requirement 9: Preserve Existing Client-Side Functionality

**User Story:** As a user navigating the site, I want client-side i18n switching and the existing useSEO hook to continue functioning after SEO improvements are deployed, so that my browsing experience is not degraded.

#### Acceptance Criteria

1. THE Meta_Injector SHALL not interfere with the Client_SEO_Hook's ability to update title and description during client-side route transitions.
2. THE Meta_Injector SHALL not modify the Blog_Post JSON file format or storage structure.
3. THE Meta_Injector SHALL work in both development mode (Vite dev server with Express proxy) and production mode (Express serving static files from `dist/`).
4. THE Meta_Injector SHALL not affect the blog post auto-generation cron job or its output.
5. WHILE the site is running in development mode, THE Meta_Injector SHALL read the source `index.html` template and apply Vite transforms before injecting meta tags.
6. WHILE the site is running in production mode, THE Meta_Injector SHALL read the built `index.html` from the `dist/` directory and inject meta tags before serving.
