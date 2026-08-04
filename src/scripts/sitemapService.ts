import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SitemapUrlEntry {
  enSlug: string;
  esSlug: string;
}

/**
 * Updates the consolidated monthly sitemap with hreflang annotations.
 * Generates one sitemap file per month combining both EN and ES language versions.
 */
export async function updateSitemap(enSlug: string, esSlug: string, date: string): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const sitemapFolder = isProd
    ? path.resolve(process.cwd(), 'dist/data/sitemaps')
    : path.resolve(__dirname, '../../server/data/sitemaps');

  const yearMonth = date.slice(0, 7); // YYYY-MM
  const sitemapFile = path.join(sitemapFolder, `${yearMonth}.xml`);

  let entries: SitemapUrlEntry[] = [];

  try {
    if (fs.existsSync(sitemapFile)) {
      const content = await fsPromises.readFile(sitemapFile, 'utf-8');
      entries = parseExistingSitemap(content);
    }
  } catch (err) {
    console.error('❌ Error reading existing sitemap:', err);
  }

  // Check if this entry already exists (by EN slug)
  const alreadyExists = entries.some((entry) => entry.enSlug === enSlug);
  if (alreadyExists) {
    return;
  }

  entries.push({ enSlug, esSlug });

  const xml = buildSitemapXml(entries);

  await fsPromises.mkdir(sitemapFolder, { recursive: true });
  await fsPromises.writeFile(sitemapFile, xml, 'utf-8');
  console.log(`✅ Sitemap updated: ${sitemapFile}`);
}

/**
 * Parses an existing sitemap XML to extract URL entries with their hreflang pairings.
 */
function parseExistingSitemap(content: string): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = [];

  // Match each <url>...</url> block
  const urlBlocks = content.match(/<url>[\s\S]*?<\/url>/g) || [];

  for (const block of urlBlocks) {
    let enSlug = '';
    let esSlug = '';

    // Extract hreflang="en" href
    const enMatch = block.match(/hreflang="en"\s+href="https:\/\/robles\.ai\/blog\/([^"]+)"/);
    if (enMatch) {
      enSlug = enMatch[1];
    }

    // Extract hreflang="es" href
    const esMatch = block.match(/hreflang="es"\s+href="https:\/\/robles\.ai\/blog\/([^"]+)"/);
    if (esMatch) {
      esSlug = esMatch[1];
    }

    // Fallback: if no hreflang links found, try to extract from <loc>
    if (!enSlug) {
      const locMatch = block.match(/<loc>https:\/\/robles\.ai\/blog\/([^<]+)<\/loc>/);
      if (locMatch) {
        enSlug = locMatch[1];
      }
    }

    if (enSlug) {
      entries.push({ enSlug, esSlug: esSlug || enSlug });
    }
  }

  return entries;
}

/**
 * Builds the complete sitemap XML string with xhtml namespace and hreflang annotations.
 */
function buildSitemapXml(entries: SitemapUrlEntry[]): string {
  const urlEntries = entries.map((entry) => {
    const enUrl = `https://robles.ai/blog/${entry.enSlug}`;
    const esUrl = `https://robles.ai/blog/${entry.esSlug}`;

    return `  <url>
    <loc>${enUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${esUrl}"/>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;
}
