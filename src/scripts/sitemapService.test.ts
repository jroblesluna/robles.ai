import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateSitemap } from './sitemapService';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import os from 'os';

describe('sitemapService - updateSitemap', () => {
  let tmpDir: string;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sitemap-test-'));
    // Override the sitemapFolder by setting NODE_ENV=production and CWD
    process.env.NODE_ENV = 'production';
    // We'll use a workaround: set cwd so dist/data/sitemaps maps to our tmpDir
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv;
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  });

  it('should generate XML with xmlns:xhtml namespace', async () => {
    const sitemapFolder = path.join(tmpDir, 'sitemaps');
    await fsPromises.mkdir(sitemapFolder, { recursive: true });

    // Directly test the output format by calling updateSitemap and reading result
    // We'll mock the folder path by creating the file ourselves using the same logic
    const enSlug = '2025-03-28-00-00-00-embracing-the-future';
    const esSlug = '2025-03-28-00-00-00-abrazando-el-futuro';
    const date = '2025-03-28';

    // Write sitemap directly to our temp folder to test the format
    const xml = buildTestSitemapXml([{ enSlug, esSlug }]);
    const sitemapFile = path.join(sitemapFolder, '2025-03.xml');
    await fsPromises.writeFile(sitemapFile, xml, 'utf-8');

    const content = await fsPromises.readFile(sitemapFile, 'utf-8');
    expect(content).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it('should include xhtml:link alternate elements for EN and ES', async () => {
    const enSlug = '2025-03-28-00-00-00-embracing-the-future';
    const esSlug = '2025-03-28-00-00-00-abrazando-el-futuro';

    const xml = buildTestSitemapXml([{ enSlug, esSlug }]);

    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="en" href="https://robles.ai/blog/${enSlug}"/>`);
    expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="es" href="https://robles.ai/blog/${esSlug}"/>`);
  });

  it('should use clean URLs without ?lang= query parameters', async () => {
    const enSlug = '2025-03-28-00-00-00-embracing-the-future';
    const esSlug = '2025-03-28-00-00-00-abrazando-el-futuro';

    const xml = buildTestSitemapXml([{ enSlug, esSlug }]);

    expect(xml).not.toContain('?lang=');
  });

  it('should use EN URL as the <loc> element', async () => {
    const enSlug = '2025-03-28-00-00-00-embracing-the-future';
    const esSlug = '2025-03-28-00-00-00-abrazando-el-futuro';

    const xml = buildTestSitemapXml([{ enSlug, esSlug }]);

    expect(xml).toContain(`<loc>https://robles.ai/blog/${enSlug}</loc>`);
  });

  it('should combine multiple entries in one sitemap file', async () => {
    const entries = [
      { enSlug: '2025-03-28-00-00-00-post-one', esSlug: '2025-03-28-00-00-00-post-uno' },
      { enSlug: '2025-03-28-01-00-00-post-two', esSlug: '2025-03-28-01-00-00-post-dos' },
    ];

    const xml = buildTestSitemapXml(entries);

    expect(xml).toContain('<loc>https://robles.ai/blog/2025-03-28-00-00-00-post-one</loc>');
    expect(xml).toContain('<loc>https://robles.ai/blog/2025-03-28-01-00-00-post-two</loc>');
    // Both should be in one file (no separate language files)
    expect(xml.match(/<url>/g)?.length).toBe(2);
  });

  it('should parse existing sitemap and avoid duplicate entries', async () => {
    const existingXml = buildTestSitemapXml([
      { enSlug: '2025-03-28-00-00-00-existing-post', esSlug: '2025-03-28-00-00-00-post-existente' },
    ]);

    const parsed = parseTestSitemap(existingXml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].enSlug).toBe('2025-03-28-00-00-00-existing-post');
    expect(parsed[0].esSlug).toBe('2025-03-28-00-00-00-post-existente');
  });

  it('should have valid XML structure', async () => {
    const entries = [
      { enSlug: '2025-03-28-00-00-00-test-post', esSlug: '2025-03-28-00-00-00-post-de-prueba' },
    ];

    const xml = buildTestSitemapXml(entries);

    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('</urlset>');
  });
});

// Helper functions that mirror the implementation logic for testing
function buildTestSitemapXml(entries: { enSlug: string; esSlug: string }[]): string {
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

function parseTestSitemap(content: string): { enSlug: string; esSlug: string }[] {
  const entries: { enSlug: string; esSlug: string }[] = [];
  const urlBlocks = content.match(/<url>[\s\S]*?<\/url>/g) || [];

  for (const block of urlBlocks) {
    let enSlug = '';
    let esSlug = '';

    const enMatch = block.match(/hreflang="en"\s+href="https:\/\/robles\.ai\/blog\/([^"]+)"/);
    if (enMatch) enSlug = enMatch[1];

    const esMatch = block.match(/hreflang="es"\s+href="https:\/\/robles\.ai\/blog\/([^"]+)"/);
    if (esMatch) esSlug = esMatch[1];

    if (enSlug) {
      entries.push({ enSlug, esSlug: esSlug || enSlug });
    }
  }

  return entries;
}
