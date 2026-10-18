/**
 * Shared interfaces and types for the SEO meta injection system.
 */

/** Represents an alternate language link for hreflang annotations. */
export interface HreflangLink {
  hreflang: string; // "en", "es", "x-default"
  href: string;
}

/** Full page metadata used by the HtmlInjector to populate <head> tags. */
export interface PageMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogType: string; // "article" for blog, "website" for static
  ogImage: string;
  twitterCard: string; // "summary_large_image"
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonicalUrl: string;
  hreflangLinks: HreflangLink[];
  jsonLd?: object[];
  language?: 'en' | 'es';
  robots?: string;
}

/** An entry in the slug-to-file index for O(1) blog post lookup. */
export interface SlugIndexEntry {
  lastModified?: string;
  filePath: string; // Absolute path to JSON file
  enSlug: string;
  esSlug: string;
  date: string; // "YYYY-MM-DD"
}

/** Blog post JSON data structure (existing format, unchanged). */
export interface BlogPostData {
  slug: string;
  date: string;
  dateModified?: string;
  image?: string;
  editorId: number;
  categories: string[];
  keywords: string[];
  translations: {
    en: BlogTranslation;
    es: BlogTranslation;
  };
  sources: { title: string; url: string; source: string }[];
}

/** Translation content for a single language variant of a blog post. */
export interface BlogTranslation {
  slug: string;
  title: string;
  excerpt: string;
  content: { heading: string; body: string }[];
}

/** Configuration for the MetaInjector middleware factory. */
export interface MetaInjectorConfig {
  mode: 'development' | 'production';
  distPath: string; // Path to built dist/ directory
  sourcePath: string; // Path to source index.html
  postsDir?: string;
  translationsDir?: string;
  renderHome?: (url: string, translations: Record<string, unknown>) => Promise<string>;
  viteTransform?: (url: string, html: string) => Promise<string>;
}

export { STATIC_PAGES } from '../../shared/seoPolicy.js';
