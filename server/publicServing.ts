import express, { type Express } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createMetaInjector } from './seo/metaInjector.js';

/** Public files only. Never expose the server bundle, source copies or private data in dist. */
export function mountPublicSite(app: Express, distPath: string) {
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    index: false, redirect: false, dotfiles: 'deny',
    setHeaders(res, filename) {
      const hashed = /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(filename);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    },
  }));
  // postbuild already provides a copy containing only the intentionally public tree.
  const publicPath = path.join(distPath, 'public');
  if (!fs.existsSync(publicPath)) throw new Error('Missing dist/public; run the complete build including postbuild.');
  app.use(express.static(publicPath, { index: false, redirect: false, dotfiles: 'deny', maxAge: 0 }));
  const injector = createMetaInjector({ mode: 'production', distPath, sourcePath: path.join(distPath, '..', 'index.html') });
  app.use(injector.handler);
  return injector.slugIndex;
}
