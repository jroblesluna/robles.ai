import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { XMLBuilder } from "fast-xml-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.resolve(__dirname, "../../server/data/posts");
const SITEMAP_DIR = path.resolve(__dirname, "../../public/sitemaps");
const BASE_URL = "https://robles.ai";

async function findJsonFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? findJsonFiles(fullPath) : fullPath;
    })
  );
  return files.flat().filter(file => file.endsWith(".json"));
}

function addToSitemapMap(
  map: Map<string, Set<string>>,
  yearMonth: string,
  lang: string,
  slug: string
) {
  const sitemapKey = `${yearMonth}-${lang}`;
  const url = `${BASE_URL}/blog/${slug}?lang=${lang}`;
  if (!map.has(sitemapKey)) {
    map.set(sitemapKey, new Set());
  }
  map.get(sitemapKey)!.add(url);
}

function generateXml(urls: Set<string>): string {
  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  const urlset = {
    urlset: {
      "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      url: Array.from(urls).map(loc => ({
        loc,
        changefreq: "weekly",
        priority: "0.8"
      }))
    }
  };
  return builder.build(urlset);
}

async function writeSitemapFiles(map: Map<string, Set<string>>) {
  await fs.promises.mkdir(SITEMAP_DIR, { recursive: true });

  for (const [filename, urls] of map.entries()) {
    const xml = generateXml(urls);
    const filepath = path.join(SITEMAP_DIR, `${filename}.xml`);
    await fs.promises.writeFile(filepath, xml, "utf-8");
    console.log(`✅ Updated: ${filepath}`);
  }
}

async function generateSitemaps() {
  const sitemapMap = new Map<string, Set<string>>();
  const files = await findJsonFiles(POSTS_DIR);

  for (const file of files) {
    try {
      const data = JSON.parse(await fs.promises.readFile(file, "utf-8"));
      const datePart = data.date.slice(0, 7); // YYYY-MM
      const translations = data.translations;

      for (const lang of Object.keys(translations)) {
        const slug = translations[lang]?.slug;
        if (slug) {
          addToSitemapMap(sitemapMap, datePart, lang, slug);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not process file: ${file}`, err);
    }
  }

  await writeSitemapFiles(sitemapMap);
  console.log("🎉 Sitemaps generation complete.");
}

generateSitemaps().catch(err => {
  console.error("❌ Failed to generate sitemaps:", err);
});