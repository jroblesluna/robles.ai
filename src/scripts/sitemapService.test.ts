// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { updateSitemap, buildSitemapXml, parseExistingSitemap } from './sitemapService';
import { monthlySitemaps, staticSitemapXml } from '../../server/seo/sitemap';
import { generateSitemaps } from './generateSitemaps';
let root: string;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'robles-sitemap-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
const pair = (id: number) => ({ enSlug: `2026-10-16-23-00-00-english-${id}`, esSlug: `2026-10-16-23-00-00-espanol-${id}` });
const parse = (text: string) => new XMLParser({ ignoreAttributes: false }).parse(text).urlset;
describe('production sitemap implementation', () => {
  it('lists each language with a reciprocal, self-inclusive set of alternates', () => {
    const urls = parse(buildSitemapXml([pair(1)])).url;
    expect(urls).toHaveLength(2);
    urls.forEach((url: any) => {
      const links = url['xhtml:link'];
      expect(links).toHaveLength(3);
      expect(links.map((l: any) => l['@_href'])).toContain(url.loc);
      expect(links.find((l: any) => l['@_hreflang'] === 'es')['@_href']).toContain(pair(1).esSlug);
    });
  });
  it('does not invent modification dates and preserves real ones', () => {
    expect(buildSitemapXml([pair(1)])).not.toContain('lastmod');
    expect(buildSitemapXml([{ ...pair(1), lastModified: '2026-10-17T10:00:00Z' }])).toContain('<lastmod>2026-10-17T10:00:00Z</lastmod>');
  });
  it('updates actual temporary files atomically and idempotently', async () => {
    await updateSitemap(pair(1).enSlug, pair(1).esSlug, '2026-10-16', root);
    const file = path.join(root, '2026-10.xml');
    const before = await readFile(file, 'utf8');
    await updateSitemap(pair(1).enSlug, pair(1).esSlug, '2026-10-16', root);
    expect(await readFile(file, 'utf8')).toBe(before);
    expect(parseExistingSitemap(before)).toEqual([pair(1)]);
    expect(await readdir(root)).toEqual(['2026-10.xml']);
  });
  it('serializes concurrent publisher calls without losing pairs', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => updateSitemap(pair(i).enSlug, pair(i).esSlug, '2026-10-16', root)));
    expect(parse(await readFile(path.join(root, '2026-10.xml'), 'utf8')).url).toHaveLength(40);
  });
  it('refuses to overwrite an unpaired legacy sitemap', async () => {
    const file = path.join(root, '2026-10.xml');
    const legacy = '<urlset><url><loc>https://robles.ai/blog/old?lang=en</loc></url></urlset>';
    await writeFile(file, legacy);
    await expect(updateSitemap(pair(1).enSlug, pair(1).esSlug, '2026-10-16', root)).rejects.toThrow('language pairs');
    expect(await readFile(file, 'utf8')).toBe(legacy);
  });
  it('splits inventories before exceeding the 50,000 URL protocol limit', () => {
    const maps = monthlySitemaps(Array.from({ length: 25001 }, (_, i) => pair(i)));
    expect(Object.keys(maps)).toEqual(['2026-10-1.xml', '2026-10-2.xml']);
    expect(maps['2026-10-1.xml']).toHaveLength(25000);
    expect(maps['2026-10-2.xml']).toHaveLength(1);
  });
  it('includes real public routes and excludes unavailable/private routes', () => {
    const xml = staticSitemapXml();
    expect(xml).toContain('/get-started?lang=es');
    expect(xml).toContain('/demos');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/try-medical');
  });
  it('defaults inventory CLI to a read-only report and requires an explicit write destination', async () => {
    const posts = path.join(root, 'posts'); await mkdir(posts);
    await writeFile(path.join(posts, 'post.json'), JSON.stringify({ date: '2026-10-16', translations: { en: { slug: pair(1).enSlug }, es: { slug: pair(1).esSlug } } }));
    const report = await generateSitemaps(['--posts', posts]);
    expect(report).toMatchObject({ posts: 1, articleUrls: 2, write: false });
    expect(await readdir(root)).toEqual(['posts']);
    await expect(generateSitemaps(['--posts', posts, '--write'])).rejects.toThrow('explicit --output');
  });
});

it('round-trips identical-slug language pairs without duplicate URL locations', () => {
  const slug = '2026-10-15-18-00-00-shivoo-studios-reality-reframe-podcast';
  const xml = buildSitemapXml([{ enSlug: slug, esSlug: slug }]);
  const urls = parse(xml).url;
  expect(urls.map((url: any) => url.loc)).toEqual([`https://robles.ai/blog/${slug}?lang=en`, `https://robles.ai/blog/${slug}`]);
  expect(parseExistingSitemap(xml)).toEqual([{ enSlug: slug, esSlug: slug }]);
  for (const url of urls) expect(url['xhtml:link'].map((link: any) => link['@_href'])).toContain(url.loc);
});
