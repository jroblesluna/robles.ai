import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function updateSitemap(slug: string, date: string, lang: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const sitemapFolder = isProd
    ? path.resolve(process.cwd(), 'dist/data/sitemaps')
    : path.resolve(__dirname, '../../server/data/sitemaps');

  const yearMonth = date.slice(0, 7); // YYYY-MM
  const sitemapFile = path.join(sitemapFolder, `${yearMonth}-${lang}.xml`);

  const url = `https://robles.ai/blog/${slug}?lang=${lang}`;
  let urls: Set<string> = new Set();

  try {
    if (fs.existsSync(sitemapFile)) {
      const content = await fsPromises.readFile(sitemapFile, 'utf-8');
      const matches = Array.from(content.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
      urls = new Set(matches);
    }
  } catch (err) {
    console.error('❌ Error reading existing sitemap:', err);
  }

  if (!urls.has(url)) {
    urls.add(url);
    const builder = new (await import('fast-xml-parser')).XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });
    const xml = builder.build({
      urlset: {
        '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        url: Array.from(urls).map((loc) => ({
          loc,
          changefreq: 'weekly',
          priority: '0.8',
        })),
      },
    });

    await fsPromises.mkdir(sitemapFolder, { recursive: true });
    await fsPromises.writeFile(sitemapFile, xml, 'utf-8');
    console.log(`✅ Sitemap updated: ${sitemapFile}`);
  }
}
