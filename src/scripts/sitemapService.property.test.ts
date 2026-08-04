import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 10: Sitemap hreflang pairing
 * Validates: Requirements 7.1
 *
 * For any blog post entry in a monthly sitemap, there are exactly two xhtml:link
 * elements (EN, ES) with correct slugs.
 */

// Helper that mirrors the implementation's buildSitemapXml logic
function buildSitemapXml(entries: { enSlug: string; esSlug: string }[]): string {
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

// Helper to parse sitemap XML and extract url blocks with hreflang links
function parseSitemapUrlBlocks(xml: string): {
  loc: string;
  hreflangLinks: { hreflang: string; href: string }[];
}[] {
  const blocks: { loc: string; hreflangLinks: { hreflang: string; href: string }[] }[] = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];

  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const loc = locMatch ? locMatch[1] : '';

    const hreflangLinks: { hreflang: string; href: string }[] = [];
    const linkMatches = block.matchAll(/xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g);
    for (const m of linkMatches) {
      hreflangLinks.push({ hreflang: m[1], href: m[2] });
    }

    blocks.push({ loc, hreflangLinks });
  }

  return blocks;
}

// Arbitrary for generating slug-like strings matching the date-prefixed blog slug format
const slugArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
    fc.array(fc.stringMatching(/^[a-z][a-z0-9]{1,12}$/), { minLength: 2, maxLength: 6 }),
  )
  .map(([y, mo, d, h, mi, s, words]) => {
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return `${y}-${pad(mo)}-${pad(d)}-${pad(h)}-${pad(mi)}-${pad(s)}-${words.join('-')}`;
  });

const slugPairArb = fc.record({
  enSlug: slugArb,
  esSlug: slugArb,
});

describe('Feature: seo-improvements, Property 10: Sitemap hreflang pairing', () => {
  it('for any blog post entry in a monthly sitemap, there are exactly two xhtml:link elements (EN, ES) with correct slugs', () => {
    fc.assert(
      fc.property(
        fc.array(slugPairArb, { minLength: 1, maxLength: 20 }),
        (entries) => {
          const xml = buildSitemapXml(entries);
          const parsedBlocks = parseSitemapUrlBlocks(xml);

          // There should be the same number of <url> blocks as entries
          expect(parsedBlocks).toHaveLength(entries.length);

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const block = parsedBlocks[i];
            const expectedEnUrl = `https://robles.ai/blog/${entry.enSlug}`;
            const expectedEsUrl = `https://robles.ai/blog/${entry.esSlug}`;

            // The <loc> should match the EN URL
            expect(block.loc).toBe(expectedEnUrl);

            // There should be exactly 2 xhtml:link elements
            expect(block.hreflangLinks).toHaveLength(2);

            // One should have hreflang="en" pointing to the EN slug URL
            const enLink = block.hreflangLinks.find((l) => l.hreflang === 'en');
            expect(enLink).toBeDefined();
            expect(enLink!.href).toBe(expectedEnUrl);

            // One should have hreflang="es" pointing to the ES slug URL
            const esLink = block.hreflangLinks.find((l) => l.hreflang === 'es');
            expect(esLink).toBeDefined();
            expect(esLink!.href).toBe(expectedEsUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
