import type { BlogPostData, HreflangLink, PageMeta } from '../server/seo/types.js';
import { STATIC_PAGES, SITE_URL, staticPagePath, blogAlternates, schemaDate, blogPagePath } from './seoPolicy.js';

const BASE_URL = SITE_URL;
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/logo.png`;

/**
 * Input for the blog meta builder.
 */
export interface BlogMetaBuilderInput {
  post: BlogPostData;
  lang: 'en' | 'es';
  slug: string;
}

/**
 * Truncates a string to the specified max length.
 * If the string exceeds maxLength, truncates at (maxLength - 3) and appends "...".
 */
function truncateDescription(text: string, maxLength = 160): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Resolves the full image URL from the post's image field.
 * Handles relative paths, absolute URLs, and missing images.
 */
function resolveImageUrl(image?: string): string {
  if (!image) {
    return DEFAULT_OG_IMAGE;
  }
  // Already an absolute URL
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  // Relative path — prefix with base URL
  const path = image.startsWith('/') ? image : `/${image}`;
  return `${BASE_URL}${path}`;
}

/**
 * Builds hreflang links for a blog post (en, es, x-default).
 */
function buildHreflangLinks(enSlug: string, esSlug: string): HreflangLink[] {
  return blogAlternates(enSlug, esSlug);
}

/**
 * Builds JSON-LD structured data for a blog post page.
 * Returns an array of two schema objects:
 * 1. BlogPosting schema with article metadata
 * 2. BreadcrumbList schema with Home > Blog > Post Title
 */
export function buildBlogJsonLd(input: BlogMetaBuilderInput, _editorName: string): object[] {
  const { post, lang } = input;
  const translation = post.translations[lang];

  const headline = translation.title;
  const description = truncateDescription(translation.excerpt);
  const canonicalUrl = BASE_URL + blogPagePath(post.translations.en.slug, post.translations.es.slug, lang);
  const imageUrl = resolveImageUrl(post.image);

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    ...(schemaDate(post.date) ? { datePublished: schemaDate(post.date) } : {}),
    ...(schemaDate(post.dateModified) ? { dateModified: schemaDate(post.dateModified) } : {}),
    inLanguage: lang,
    author: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Robles.AI',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Robles.AI',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/images/logo.png`,
      },
    },
    image: imageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: headline, item: canonicalUrl },
    ],
  };

  return [blogPosting, breadcrumbList];
}

/**
 * Builds complete PageMeta from a blog post, language, and slug.
 * - Description is truncated to 160 characters
 * - Canonical URL distinguishes EN when translated slugs coincide
 * - Hreflang links include en, es, and x-default
 */
export function buildBlogMeta(input: BlogMetaBuilderInput): PageMeta {
  const { post, lang } = input;
  const translation = post.translations[lang];

  const title = translation.title;
  const description = truncateDescription(translation.excerpt);
  const canonicalUrl = BASE_URL + blogPagePath(post.translations.en.slug, post.translations.es.slug, lang);
  const imageUrl = resolveImageUrl(post.image);

  const enSlug = post.translations.en.slug;
  const esSlug = post.translations.es.slug;
  const hreflangLinks = buildHreflangLinks(enSlug, esSlug);

  return {
    language: lang,
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogType: 'article',
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: imageUrl,
    canonicalUrl,
    hreflangLinks,
  };
}


/**
 * Builds hreflang links for a static page.
 * EN uses the base URL path, ES appends `?lang=es`.
 */
function buildStaticHreflangLinks(pagePath: string, page = 1): HreflangLink[] {
  const enUrl = BASE_URL + staticPagePath(pagePath, 'en', page);
  const esUrl = BASE_URL + staticPagePath(pagePath, 'es', page);
  return [
    { hreflang: 'en', href: enUrl },
    { hreflang: 'es', href: esUrl },
    { hreflang: 'x-default', href: enUrl },
  ];
}

/**
 * Builds PageMeta for a known static page using i18n translation data.
 * - Maps pagePath to i18n key via STATIC_PAGES registry
 * - Reads title/description from translations.seo[key]
 * - ogType is 'website'
 * - Canonical URL has no query param for EN, `?lang=es` for ES
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3
 */
export function buildStaticMeta(
  pagePath: string,
  lang: 'en' | 'es',
  translations: Record<string, any>,
  options: { page?: number; filtered?: boolean } = {},
): PageMeta {
  const i18nKey = STATIC_PAGES[pagePath];
  const seoData = translations.seo?.[i18nKey] ?? translations.seo?.home ?? { title: 'Robles.AI', description: lang === 'es' ? 'Soluciones de inteligencia artificial para empresas.' : 'Artificial intelligence solutions for businesses.' };

  const page = options.page ?? 1;
  const title: string = (seoData.title || 'Robles.AI') + (page > 1 ? ` | ${lang === 'es' ? 'Página' : 'Page'} ${page}` : '');
  const description: string = seoData.description || (lang === 'es' ? 'Soluciones de inteligencia artificial para empresas.' : 'Artificial intelligence solutions for businesses.');

  const canonicalUrl = BASE_URL + staticPagePath(pagePath, lang, page);
  const hreflangLinks = buildStaticHreflangLinks(pagePath, page);

  return {
    language: lang,
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ...(options.filtered || pagePath === '/try-medical' ? { robots: 'noindex,follow' } : {}),
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: DEFAULT_OG_IMAGE,
    canonicalUrl,
    hreflangLinks,
  };
}

/**
 * Builds WebSite JSON-LD structured data for the home page.
 * Includes a SearchAction pointing to the blog search.
 *
 * Requirements: 4.1
 */
export function buildHomeJsonLd(): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'Robles.AI',
      url: `${BASE_URL}`,
      publisher: { '@id': `${BASE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${BASE_URL}/blog?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}
