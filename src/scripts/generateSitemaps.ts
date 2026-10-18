/** Read-only by default. Writing snapshots requires BOTH --write and an explicit --output directory. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSlugIndex } from '../../server/seo/slugIndex.js';
import { buildSitemapXml, monthlySitemaps, sitemapIndexXml, staticSitemapXml } from '../../server/seo/sitemap.js';
import { atomicWrite } from './sitemapService.js';
export async function generateSitemaps(args = process.argv.slice(2)) {
  const option = (key: string) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : undefined; };
  const postsDir = path.resolve(option('--posts') ?? path.join(process.cwd(), 'server/data/posts'));
  const index = createSlugIndex(postsDir);
  await index.ready();
  const maps = monthlySitemaps(index.entries());
  const report = { posts: index.entries().length, articleUrls: index.entries().length * 2, files: Object.keys(maps), write: args.includes('--write') };
  if (report.write) {
    const output = option('--output');
    if (!output || output.startsWith('--')) throw new Error('An explicit --output directory is required with --write.');
    const root = path.resolve(output);
    for (const [filename, entries] of Object.entries(maps)) await atomicWrite(path.join(root, 'sitemaps', filename), buildSitemapXml(entries));
    await atomicWrite(path.join(root, 'static-pages.xml'), staticSitemapXml());
    await atomicWrite(path.join(root, 'sitemap.xml'), sitemapIndexXml(Object.keys(maps)));
  }
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateSitemaps().then(report => console.log(JSON.stringify(report, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
