// @vitest-environment node
import { expect, it } from 'vitest';
import * as fc from 'fast-check';
import { XMLParser } from 'fast-xml-parser';
import { buildSitemapXml } from './sitemapService';
it('preserves both language URLs and reciprocal alternatives through real XML serialization', () => {
  fc.assert(fc.property(fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/), { minLength: 1, maxLength: 30 }), slugs => {
    const entries = slugs.map(s => ({ enSlug: `2026-10-16-00-00-00-en-${s}`, esSlug: `2026-10-16-00-00-00-es-${s}` }));
    const data = new XMLParser({ ignoreAttributes: false }).parse(buildSitemapXml(entries));
    const urls = data.urlset.url;
    expect(urls).toHaveLength(entries.length * 2);
    urls.forEach((url: any) => {
      expect(url.loc).not.toContain('?lang=');
      expect(url['xhtml:link']).toHaveLength(3);
      expect(url['xhtml:link'].map((l: any) => l['@_href'])).toContain(url.loc);
    });
  }), { numRuns: 100 });
});
