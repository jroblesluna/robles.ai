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
}

/** An entry in the slug-to-file index for O(1) blog post lookup. */
export interface SlugIndexEntry {
  filePath: string; // Absolute path to JSON file
  enSlug: string;
  esSlug: string;
  date: string; // "YYYY-MM-DD"
}

/** Blog post JSON data structure (existing format, unchanged). */
export interface BlogPostData {
  slug: string;
  date: string;
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
  viteTransform?: (url: string, html: string) => Promise<string>;
}

/** Registry of static page paths to their i18n translation keys. */
export const STATIC_PAGES: Record<string, string> = {
  '/': 'home',
  '/blog': 'blog',
  '/careers': 'careers',
  '/get-started': 'landing',
  '/apply': 'apply',
};
