import type { Express, Request, Response } from 'express';
import type { SlugIndex } from './slugIndex.js';
import { buildSitemapXml, staticSitemapXml, monthlySitemaps, sitemapIndexXml } from './sitemap.js';

export function mountSitemapRoutes(app: Express, getIndex: () => SlugIndex | null) {
  // Serve complete sitemap inventories from the same exact-slug index as public articles.
  // No migrations or destructive backfill is performed when these URLs are requested.
  const sitemapInventory = async () => {
    const index = getIndex();
    if (!index) throw new Error('Content index unavailable');
    await index.ready();
    return monthlySitemaps(index.entries());
  };
  app.get('/static-pages.xml', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-cache').type('application/xml').send(staticSitemapXml());
  });
  app.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const maps = await sitemapInventory();
      res.set('Cache-Control', 'no-cache').type('application/xml').send(sitemapIndexXml(Object.keys(maps)));
    } catch {
      res.status(503).set('Cache-Control', 'no-store').type('text').send('Sitemap temporarily unavailable');
    }
  });
  app.get('/sitemaps/:filename', async (req: Request, res: Response) => {
    const filename = req.params.filename;
    if (typeof filename !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])(?:-(?:en|es|[1-9]\d*))?\.xml$/.test(filename)) {
      res.status(404).type('text').send('Sitemap not found'); return;
    }
    try {
      const maps = await sitemapInventory();
      const entries = maps[filename];
      if (entries) { res.set('Cache-Control', 'no-cache').type('application/xml').send(buildSitemapXml(entries)); return; }
      // Keep previously submitted language-specific URLs functional, using complete current pairs.
      const legacyMonth = filename.replace(/-(?:en|es)\.xml$/, '.xml');
      const legacyEntries = filename !== legacyMonth ? maps[legacyMonth] : undefined;
      if (legacyEntries) { res.set('Cache-Control', 'no-cache').type('application/xml').send(buildSitemapXml(legacyEntries)); return; }
      res.status(404).type('text').send('Sitemap not found');
    } catch {
      res.status(503).set('Cache-Control', 'no-store').type('text').send('Sitemap temporarily unavailable');
    }
  });

}
