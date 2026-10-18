import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { buildSitemapXml, type SitemapEntry } from '../../server/seo/sitemap.js';
export { buildSitemapXml } from '../../server/seo/sitemap.js';
const queues = new Map<string, Promise<void>>();

export function parseExistingSitemap(content: string): SitemapEntry[] {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(content);
  const urls = parsed?.urlset?.url;
  const entries: SitemapEntry[] = [];
  for (const url of Array.isArray(urls) ? urls : urls ? [urls] : []) {
    const links = url['xhtml:link'];
    const alternates = Array.isArray(links) ? links : links ? [links] : [];
    const slug = (value: string | undefined) => {
      if (!value) return undefined;
      const u = new URL(value);
      return u.origin === 'https://robles.ai' && /^\/blog\/[^/]+$/.test(u.pathname) ? decodeURIComponent(u.pathname.slice(6)) : undefined;
    };
    const enSlug = slug(alternates.find((a: any) => a['@_hreflang'] === 'en')?.['@_href']);
    const esSlug = slug(alternates.find((a: any) => a['@_hreflang'] === 'es')?.['@_href']);
    // Never manufacture language pairings from a legacy English-only location.
    if (enSlug && esSlug) entries.push({ enSlug, esSlug });
    else throw new Error('Legacy sitemap lacks language pairs; rebuild from the post inventory first.');
  }
  return Array.from(new Map(entries.map(e => [e.enSlug, e])).values());
}
export async function atomicWrite(filename: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temp = `${filename}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp, content, 'utf8'); await fs.rename(temp, filename); }
  finally { await fs.unlink(temp).catch(() => {}); }
}
/** Serialized per file within the publishing process; disk snapshots are optional, HTTP uses the full index. */
export async function updateSitemap(enSlug: string, esSlug: string, date: string, outputDir?: string): Promise<void> {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])-\d{2}/.test(date)) throw new Error('Invalid sitemap month');
  const folder = outputDir ?? path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/data/sitemaps' : 'server/data/sitemaps');
  const filename = path.join(folder, `${date.slice(0, 7)}.xml`);
  const previous = queues.get(filename) ?? Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    let entries: SitemapEntry[] = [];
    try { entries = parseExistingSitemap(await fs.readFile(filename, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const existing = entries.find(e => e.enSlug === enSlug);
    if (existing && existing.esSlug === esSlug) return;
    entries = entries.filter(e => e.enSlug !== enSlug);
    entries.push({ enSlug, esSlug });
    await atomicWrite(filename, buildSitemapXml(entries));
  });
  queues.set(filename, task);
  try { await task; } finally { if (queues.get(filename) === task) queues.delete(filename); }
}
