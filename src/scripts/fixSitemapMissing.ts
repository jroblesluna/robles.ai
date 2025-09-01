import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { exit } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV == 'production';
console.log(process.env.NODE_ENV);
console.log(isProd);

async function ensureUrlInSitemap(slug: string, date: string, lang: string) {
  const sitemapFolder = isProd
    ? path.resolve(process.cwd(), 'dist/data/sitemaps')
    : path.resolve(__dirname, '../../server/data/sitemaps');

  console.log(sitemapFolder);
  exit;
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

  // 👉 Verificar si existe
  if (urls.has(url)) {
    console.log(`ℹ️ La URL ya existe en ${sitemapFile}`);
    return;
  }

  // 👉 Si no existe, agregarla
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
        lastmod: new Date().toISOString(), // opcional: fecha de última modificación
      })),
    },
  });

  await fsPromises.mkdir(sitemapFolder, { recursive: true });
  await fsPromises.writeFile(sitemapFile, xml, 'utf-8');
  console.log(`✅ URL agregada y sitemap actualizado: ${sitemapFile}`);
}

const URL_BASE = 'https://robles.ai/blog/';

const folderPostPath = isProd
  ? path.resolve(process.cwd(), 'dist/data/posts')
  : path.resolve(__dirname, '../../server/data/posts');

async function listFilesRecursive(dir: string, prefix = ''): Promise<void> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // console.log(`📂 ${prefix}${entry.name}/`);
      await listFilesRecursive(fullPath, `${prefix}${entry.name}/`);
    } else {
      const json_name = `${prefix}${entry.name}`;
      const nameNews = path.parse(json_name).name;
      const match = json_name.match(/\d{4}-\d{2}-\d{2}/);
      const dateOnly = match ? match[0] : null;
      const lenguages = ['es', 'en'];
      const fullPathNews = `${URL_BASE}${nameNews}?lang=`;
      for (const l of lenguages) {
        console.log(fullPathNews + l);
        await ensureUrlInSitemap(nameNews, dateOnly || '', l);
      }
    }
  }
}

// listFilesRecursive(folderPostPath).catch((err) => {
//   console.error('❌ Error al recorrer carpetas:', err);
// });
