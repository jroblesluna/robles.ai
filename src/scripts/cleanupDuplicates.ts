import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

// Directories to clean
const postsDirs = isProd
  ? [
      path.resolve(process.cwd(), 'dist/data/posts'),
      path.resolve(process.cwd(), 'server/data/posts'),
    ]
  : [path.resolve(__dirname, '../../server/data/posts')];

const sitemapDir = isProd
  ? path.resolve(process.cwd(), 'dist/data/sitemaps')
  : path.resolve(__dirname, '../../server/data/sitemaps');

interface PostFile {
  filePath: string;
  filename: string;
  dateEditor: string; // YYYY-MM-DD-HH
  mtime: number;
}

/**
 * Recursively collect all JSON files in a directory.
 */
async function collectJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsonFiles(fullPath)));
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('.') && !entry.name.includes('sitemap')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Remove duplicate posts, keeping only the newest per date-editor.
 */
async function removeDuplicates(postsDir: string): Promise<{ kept: string[]; removed: string[] }> {
  const allFiles = await collectJsonFiles(postsDir);
  const kept: string[] = [];
  const removed: string[] = [];

  // Group by date-editor (first 13 chars of filename)
  const groups = new Map<string, PostFile[]>();

  for (const filePath of allFiles) {
    const filename = path.basename(filePath);
    const dateEditor = filename.slice(0, 13); // YYYY-MM-DD-HH
    
    const stat = await fsPromises.stat(filePath);
    const entry: PostFile = {
      filePath,
      filename,
      dateEditor,
      mtime: stat.mtimeMs,
    };

    if (!groups.has(dateEditor)) {
      groups.set(dateEditor, []);
    }
    groups.get(dateEditor)!.push(entry);
  }

  // For each group, keep the newest, remove the rest
  for (const [dateEditor, files] of groups) {
    if (files.length <= 1) {
      kept.push(files[0].filePath);
      continue;
    }

    // Sort by mtime descending (newest first)
    files.sort((a, b) => b.mtime - a.mtime);

    // Keep the first (newest)
    kept.push(files[0].filePath);

    // Remove the rest
    for (let i = 1; i < files.length; i++) {
      await fsPromises.unlink(files[i].filePath);
      removed.push(files[i].filePath);
    }

    console.log(`🗑️  ${dateEditor}: kept "${path.basename(files[0].filePath)}", removed ${files.length - 1} duplicate(s)`);
  }

  return { kept, removed };
}

/**
 * Regenerate all sitemaps from remaining posts.
 */
async function regenerateSitemaps(postsDir: string): Promise<void> {
  // Clear existing sitemaps
  if (fs.existsSync(sitemapDir)) {
    const existing = await fsPromises.readdir(sitemapDir);
    for (const file of existing) {
      await fsPromises.unlink(path.join(sitemapDir, file));
    }
  }
  await fsPromises.mkdir(sitemapDir, { recursive: true });

  // Collect all remaining posts
  const allFiles = await collectJsonFiles(postsDir);
  
  // Group by year-month for sitemap files
  const monthGroups = new Map<string, { enSlug: string; esSlug: string }[]>();

  for (const filePath of allFiles) {
    try {
      const content = await fsPromises.readFile(filePath, 'utf-8');
      const post = JSON.parse(content);
      
      const enSlug = post.translations?.en?.slug;
      const esSlug = post.translations?.es?.slug;
      
      if (!enSlug) continue;

      // Extract YYYY-MM from the filename
      const filename = path.basename(filePath);
      const yearMonth = filename.slice(0, 7); // YYYY-MM

      if (!monthGroups.has(yearMonth)) {
        monthGroups.set(yearMonth, []);
      }
      
      // Deduplicate by enSlug within the month
      const monthEntries = monthGroups.get(yearMonth)!;
      if (!monthEntries.some(e => e.enSlug === enSlug)) {
        monthEntries.push({ enSlug, esSlug: esSlug || enSlug });
      }
    } catch (err) {
      console.error(`⚠️ Error reading ${filePath}:`, err);
    }
  }

  // Write sitemap files
  for (const [yearMonth, entries] of monthGroups) {
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

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;

    const sitemapPath = path.join(sitemapDir, `${yearMonth}.xml`);
    await fsPromises.writeFile(sitemapPath, xml, 'utf-8');
    console.log(`✅ Sitemap generated: ${sitemapPath} (${entries.length} URLs)`);
  }
}

/**
 * Main
 */
async function main() {
  console.log('🧹 Starting duplicate cleanup...\n');
  
  let totalRemoved = 0;

  for (const postsDir of postsDirs) {
    if (!fs.existsSync(postsDir)) {
      console.log(`⚠️ Directory not found, skipping: ${postsDir}`);
      continue;
    }

    console.log(`📂 Processing: ${postsDir}`);
    const { kept, removed } = await removeDuplicates(postsDir);
    totalRemoved += removed.length;
    console.log(`   ✅ Kept: ${kept.length}, Removed: ${removed.length}\n`);
  }

  console.log(`\n🗑️  Total duplicates removed: ${totalRemoved}`);

  // Regenerate sitemaps from the primary posts directory
  const primaryPostsDir = postsDirs[0];
  console.log(`\n🗺️  Regenerating sitemaps from: ${primaryPostsDir}`);
  await regenerateSitemaps(primaryPostsDir);

  console.log('\n✅ Cleanup complete!');
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
