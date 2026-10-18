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
  const query = new URLSearchParams();
  if (lang === 'es') query.set('lang', 'es');
  if (path === '/blog' && page > 1) query.set('page', String(page));
  return path + (query.size ? `?${query}` : '');
}
export function blogPath(slug: string): string { return `/blog/${encodeURIComponent(slug)}`; }
export function blogAlternates(enSlug: string, esSlug: string) {
  return [
    { hreflang: 'en', href: SITE_URL + blogPath(enSlug) },
    { hreflang: 'es', href: SITE_URL + blogPath(esSlug) },
    { hreflang: 'x-default', href: SITE_URL + blogPath(enSlug) },
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
