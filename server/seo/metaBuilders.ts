import type { BlogPostData, HreflangLink, PageMeta } from './types.js';
import { STATIC_PAGES } from './types.js';

const BASE_URL = 'https://robles.ai';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

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
  return [
    { hreflang: 'en', href: `${BASE_URL}/blog/${enSlug}` },
    { hreflang: 'es', href: `${BASE_URL}/blog/${esSlug}` },
    { hreflang: 'x-default', href: `${BASE_URL}/blog/${enSlug}` },
  ];
}

/**
 * Builds JSON-LD structured data for a blog post page.
 * Returns an array of two schema objects:
 * 1. BlogPosting schema with article metadata
 * 2. BreadcrumbList schema with Home > Blog > Post Title
 */
export function buildBlogJsonLd(input: BlogMetaBuilderInput, editorName: string): object[] {
  const { post, lang, slug } = input;
  const translation = post.translations[lang];

  const headline = translation.title;
  const description = truncateDescription(translation.excerpt);
  const canonicalUrl = `${BASE_URL}/blog/${slug}`;
  const imageUrl = resolveImageUrl(post.image);

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: editorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Robles.AI',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
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
 * - Canonical URL has no query parameters
 * - Hreflang links include en, es, and x-default
 */
export function buildBlogMeta(input: BlogMetaBuilderInput): PageMeta {
  const { post, lang, slug } = input;
  const translation = post.translations[lang];
  const otherLang = lang === 'en' ? 'es' : 'en';

  const title = translation.title;
  const description = truncateDescription(translation.excerpt);
  const canonicalUrl = `${BASE_URL}/blog/${slug}`;
  const imageUrl = resolveImageUrl(post.image);

  const enSlug = post.translations.en.slug;
  const esSlug = post.translations.es.slug;
  const hreflangLinks = buildHreflangLinks(enSlug, esSlug);

  return {
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
function buildStaticHreflangLinks(pagePath: string): HreflangLink[] {
  const enUrl = `${BASE_URL}${pagePath}`;
  const separator = pagePath.includes('?') ? '&' : '?';
  const esUrl = `${BASE_URL}${pagePath}${separator}lang=es`;
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
  translations: Record<string, any>
): PageMeta {
  const i18nKey = STATIC_PAGES[pagePath];
  const seoData = translations.seo?.[i18nKey] ?? { title: '', description: '' };

  const title: string = seoData.title ?? '';
  const description: string = seoData.description ?? '';

  const enUrl = `${BASE_URL}${pagePath}`;
  const separator = pagePath.includes('?') ? '&' : '?';
  const esUrl = `${BASE_URL}${pagePath}${separator}lang=es`;
  const canonicalUrl = lang === 'en' ? enUrl : esUrl;

  const hreflangLinks = buildStaticHreflangLinks(pagePath);

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
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
      name: 'Robles.AI',
      url: `${BASE_URL}`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${BASE_URL}/blog?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}
