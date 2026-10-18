/** Public URL policy shared by HTTP, React navigation and sitemap publishing. */
export const SITE_URL = 'https://robles.ai';
export type ContentLanguage = 'en' | 'es';
export const STATIC_PAGES: Record<string, string> = {
  '/': 'home', '/blog': 'blog', '/careers': 'careers', '/get-started': 'landing',
  '/apply': 'apply', '/diagnostico-ia': 'quiz', '/demos': 'demos',
  '/try-identity': 'identity', '/try-rag': 'rag', '/try-langchain': 'agents',
  '/try-transcription': 'transcription', '/try-chatbot': 'chatbot',
  '/try-docextract': 'docextract', '/try-forecast': 'forecast', '/try-tts': 'tts',
  '/try-object-detection': 'objectDetection', '/try-emotion': 'emotion', '/try-medical': 'medical',
};
export function normalizeLanguage(value?: string | null): ContentLanguage {
  return value?.toLowerCase().split('-')[0] === 'es' ? 'es' : 'en';
}
export function explicitLanguage(value?: string | null): ContentLanguage | undefined {
  return value === 'en' || value === 'es' ? value : undefined;
}
export function archivePage(value?: string | null): number {
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : 1;
}
export function staticPagePath(path: string, lang: ContentLanguage, page = 1): string {
  const url = new URL(path, SITE_URL);
  if (url.origin !== SITE_URL) return path;
  const query = url.searchParams;
  if (lang === 'es') query.set('lang', 'es'); else query.delete('lang');
  if (url.pathname === '/blog' && page > 1) query.set('page', String(page));
  return url.pathname + (query.size ? `?${query}` : '') + url.hash;
}
export function blogPath(slug: string): string { return `/blog/${encodeURIComponent(slug)}`; }
/** FTS results store the original slug, without its translation pair. The server resolves the language. */
export function blogSearchPath(slug: string, lang: ContentLanguage): string {
  return blogPath(slug) + `?lang=${lang}`;
}
/** Keep the existing Spanish URL when translated slugs collide; EN needs an explicit URL. */
export function blogPagePath(enSlug: string, esSlug: string, lang: ContentLanguage): string {
  return blogPath(lang === 'es' ? esSlug : enSlug) + (enSlug === esSlug && lang === 'en' ? '?lang=en' : '');
}
export function blogAlternates(enSlug: string, esSlug: string) {
  return [
    { hreflang: 'en', href: SITE_URL + blogPagePath(enSlug, esSlug, 'en') },
    { hreflang: 'es', href: SITE_URL + blogPagePath(enSlug, esSlug, 'es') },
    { hreflang: 'x-default', href: SITE_URL + blogPagePath(enSlug, esSlug, 'en') },
  ];
}
/** Slug prefixes were generated with setUTCHours; existing ISO dates retain their timezone. */
export function schemaDate(value?: string): string | undefined {
  if (!value) return undefined;
  const candidate = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(value)
    ? value.slice(0, 10) + 'T' + value.slice(11).replace(/-/g, ':') + 'Z' : value;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(candidate)) return undefined;
  const day = candidate.slice(0, 10);
  const calendarDate = new Date(day + 'T00:00:00Z');
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== day) return undefined;
  const date = new Date(candidate);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== candidate.slice(0, 10) && !/[+-]\d\d:\d\d$/.test(candidate)) return undefined;
  return candidate;
}
