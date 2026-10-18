import { XMLBuilder } from 'fast-xml-parser';
import { STATIC_PAGES, SITE_URL, staticPagePath, blogAlternates, schemaDate } from '../../shared/seoPolicy.js';
export interface SitemapEntry { enSlug: string; esSlug: string; lastModified?: string }
const xml = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true });
export function buildSitemapXml(entries: SitemapEntry[]): string {
  const unique = Array.from(new Map(entries.map(entry => [entry.enSlug, entry])).values());
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml.build({ urlset: {
    '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9', '@_xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
    url: unique.flatMap(entry => {
      const alternates = blogAlternates(entry.enSlug, entry.esSlug);
      return alternates.filter(link => link.hreflang !== 'x-default').map(link => ({
        loc: link.href,
        ...(schemaDate(entry.lastModified) ? { lastmod: schemaDate(entry.lastModified) } : {}),
        'xhtml:link': alternates.map(alt => ({ '@_rel': 'alternate', '@_hreflang': alt.hreflang, '@_href': alt.href })),
      }));
    }),
  } });
}
export function staticSitemapXml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml.build({ urlset: {
    '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9', '@_xmlns:xhtml': 'http://www.w3.org/1999/xhtml',
    url: Object.keys(STATIC_PAGES).filter(path => path !== '/try-medical').flatMap(path => ['en', 'es'].map(language => {
      const lang = language as 'en' | 'es';
      return { loc: SITE_URL + staticPagePath(path, lang), 'xhtml:link': ['en', 'es', 'x-default'].map(code => ({
        '@_rel': 'alternate', '@_hreflang': code, '@_href': SITE_URL + staticPagePath(path, code === 'es' ? 'es' : 'en'),
      })) };
    })),
  } });
}
/** At most 50,000 URLs per file, counting BOTH translated URLs. */
export function monthlySitemaps(entries: SitemapEntry[]): Record<string, SitemapEntry[]> {
  const groups = new Map<string, SitemapEntry[]>();
  Array.from(new Map(entries.map(entry => [entry.enSlug, entry])).values()).forEach(entry => {
    const month = entry.enSlug.slice(0, 7);
    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) return;
    const group = groups.get(month) ?? [];
    group.push(entry);
    groups.set(month, group);
  });
  const result: Record<string, SitemapEntry[]> = {};
  Array.from(groups.keys()).sort().forEach(month => {
    const sorted = groups.get(month)!.sort((a, b) => a.enSlug.localeCompare(b.enSlug));
    const parts: SitemapEntry[][] = [];
    let current: SitemapEntry[] = [];
    let estimatedBytes = 0;
    sorted.forEach(entry => {
      const alternates = blogAlternates(entry.enSlug, entry.esSlug);
      // Encoded article URLs are ASCII. This upper bound includes both locs,
      // six alternate elements, escaping and XML whitespace, with headroom below 50 MiB.
      const pairBytes = 1000 + 5 * alternates[0].href.length + 3 * alternates[1].href.length;
      if (current.length && (current.length >= 25000 || estimatedBytes + pairBytes > 45 * 1024 * 1024)) {
        parts.push(current); current = []; estimatedBytes = 0;
      }
      current.push(entry); estimatedBytes += pairBytes;
    });
    if (current.length) parts.push(current);
    parts.forEach((part, i) => { result[`${month}${parts.length > 1 ? `-${i + 1}` : ''}.xml`] = part; });
  });
  return result;
}
export function sitemapIndexXml(filenames: string[]): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml.build({ sitemapindex: {
    '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    sitemap: [{ loc: SITE_URL + '/static-pages.xml' }, ...filenames.map(name => ({ loc: `${SITE_URL}/sitemaps/${name}` }))],
  } });
}
