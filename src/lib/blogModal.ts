// Pure URL/slug + navigation helpers for the blog in-page modal viewer.
//
// These are intentionally free of React/DOM so they can be unit- and
// property-tested in isolation (Correctness Properties 1–4).
// Design: Area 2 — 2a/2b; Correctness Properties 3, 4.

export type BlogModalLang = 'en' | 'es';

export interface BlogModalTranslation {
  slug: string;
  title: string;
  excerpt: string;
  content: { heading: string; body: string }[];
}

export interface BlogModalPost {
  /** The canonical (English) slug used as the stable post key and file name. */
  slug: string;
  editorId: number;
  translations: {
    en: BlogModalTranslation;
    // `es` may be absent in edge data; the helpers fall back to `en`.
    es?: BlogModalTranslation;
  };
}

/**
 * A blog post as returned by the `/api/blog` LIST endpoint: it carries only
 * `title`/`excerpt` per language and the canonical top-level `slug` — NOT the
 * per-language slugs or the article `content` (those live in the full
 * `/api/blog/:slug` JSON). The modal derives its URL from the canonical `slug`
 * and lazily fetches the full post for rendering.
 */
export interface BlogListPost {
  slug: string;
  date?: string;
  editorId: number;
  translations: {
    en: { title: string; excerpt: string };
    es: { title: string; excerpt: string };
  };
}

/**
 * The `/blog/:slug` path for a list post. The post JSON files are named by the
 * canonical (top-level) slug, and each card already links to `/blog/<slug>`,
 * so the modal URL uses that same canonical slug (Req 12.1, 12.4).
 */
export function listPostPath(post: BlogListPost): string {
  return `/blog/${post.slug}`;
}

/** Absolute shareable link for a list post's canonical `/blog/:slug`. */
export function listPostAbsoluteUrl(post: BlogListPost, origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' && window.location ? window.location.origin : '');
  return `${base}${listPostPath(post)}`;
}

/**
 * Selects the translation to render for the active language, falling back to
 * `en` when the active language's translation is unavailable (Req 11.2).
 *
 * The result is always defined for a well-formed post (English is required by
 * the data model), satisfying Property 4.
 */
export function selectTranslation(
  post: BlogModalPost,
  lang: BlogModalLang,
): BlogModalTranslation {
  return post.translations[lang] ?? post.translations.en;
}

/**
 * The language-appropriate URL slug for a post (Req 11.2, 12.1, 12.4).
 * Uses the active language translation's slug, falling back to `en`.
 */
export function slugForLang(post: BlogModalPost, lang: BlogModalLang): string {
  return selectTranslation(post, lang).slug;
}

/**
 * Builds the app-relative `/blog/:slug` path for a post in the active language.
 */
export function blogPath(post: BlogModalPost, lang: BlogModalLang): string {
  return `/blog/${slugForLang(post, lang)}`;
}

/**
 * Builds the absolute shareable link for a post's `/blog/:slug` (Req 14.1, 14.2).
 *
 * `origin` defaults to the current `window.location.origin` when available, so
 * the copy-link / open-in-new-tab controls produce a fully qualified URL. A
 * caller can pass an explicit origin (e.g. in tests or SSR) to stay pure.
 */
export function absoluteUrl(
  post: BlogModalPost,
  lang: BlogModalLang,
  origin?: string,
): string {
  const base =
    origin ??
    (typeof window !== 'undefined' && window.location ? window.location.origin : '');
  return `${base}${blogPath(post, lang)}`;
}

/**
 * Looks a slug up against a post list, matching either the `en` or `es`
 * translation slug (Req 12.1, 12.4 — the address bar path round-trips to the
 * post it was derived from). Returns `null` when no post matches.
 *
 * Used by Property 3 (URL/slug round-trip).
 */
export function findPostBySlug(
  posts: BlogModalPost[],
  slug: string,
): BlogModalPost | null {
  return (
    posts.find(
      (p) => p.translations.en.slug === slug || p.translations.es?.slug === slug,
    ) ?? null
  );
}

/**
 * Whether the "previous" control is enabled for the given index within a list
 * of the given length. Disabled at the first post / empty list (Req 15.4).
 */
export function canGoPrev(index: number, length: number): boolean {
  return length > 0 && index > 0;
}

/**
 * Whether the "next" control is enabled for the given index within a list of
 * the given length. Disabled at the last post / empty list (Req 15.5).
 */
export function canGoNext(index: number, length: number): boolean {
  return length > 0 && index < length - 1;
}

/**
 * Clamps a requested index into the valid `[0, length-1]` range (Req 15.1).
 * For an empty list the result is 0 (no navigation is possible anyway).
 */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index > length - 1) return length - 1;
  return index;
}

/**
 * Resolves the index reached by pressing "next" from `index`. When "next" is
 * enabled it moves exactly one post forward (`index + 1`); at the last post it
 * stays put (Req 15.2, 15.5). Result is always within bounds (Property 1).
 */
export function nextIndex(index: number, length: number): number {
  return canGoNext(index, length) ? index + 1 : clampIndex(index, length);
}

/**
 * Resolves the index reached by pressing "previous" from `index`. When
 * "previous" is enabled it moves exactly one post back (`index - 1`); at the
 * first post it stays put (Req 15.3, 15.4). Result is always within bounds.
 */
export function prevIndex(index: number, length: number): number {
  return canGoPrev(index, length) ? index - 1 : clampIndex(index, length);
}
