import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function updateSitemap(slug: string, date: string) {
  const folder = path.resolve(__dirname, `../../server/data/posts`);
  const sitemapPath = path.join(folder, `sitemap.txt`);
  const sitemapEntry = `/blog/${slug}`;
  
  let sitemap = '';
  try {
    sitemap = await fs.readFile(sitemapPath, 'utf-8');
  } catch {}

  if (!sitemap.includes(sitemapEntry)) {
    sitemap += `\n${sitemapEntry}`;
    await fs.writeFile(sitemapPath, sitemap.trim());
  }
}