// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { load } from 'cheerio';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { mountPublicSite } from '../../publicServing.js';
import { mountSitemapRoutes } from '../sitemapRoutes.js';

let root: string;
let app: ReturnType<typeof express>;
const enSlug = '2026-10-16-23-00-00-test-post';
const esSlug = '2026-10-16-23-00-00-articulo-de-prueba';
const post = { slug: enSlug, date: '2026-10-16-23-00-00', editorId: 1, categories: [], keywords: [], sources: [], translations: {
  en: { slug: enSlug, title: 'A useful engineering article', excerpt: 'Evidence from an isolated fixture.', content: [{ heading: 'Results', body: 'Measured results.' }] },
  es: { slug: esSlug, title: 'Un artículo útil de ingeniería', excerpt: 'Evidencia de una prueba aislada.', content: [{ heading: 'Resultados', body: 'Resultados medidos.' }] },
} };
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'robles-public-site-'));
  const dist = join(root, 'dist');
  for (const directory of ['assets', 'public/images', 'data/posts', 'src/i18n/locales/en', 'src/i18n/locales/es']) await mkdir(join(dist, directory), { recursive: true });
  await writeFile(join(dist, 'index.html'), await readFile(resolve('index.html'), 'utf8'));
  await writeFile(join(dist, 'data/posts/post.json'), JSON.stringify(post));
  await writeFile(join(dist, 'data/dominical.db'), 'private fixture, never public');
  await writeFile(join(dist, 'index.js'), 'private server bundle');
  await writeFile(join(dist, 'assets/index-Ab123456.js'), 'console.log("public")');
  await writeFile(join(dist, 'assets/unversioned.js'), 'console.log("public")');
  await writeFile(join(dist, 'public/images/logo.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  await writeFile(join(dist, 'public/robots.txt'), await readFile(resolve('public/robots.txt'), 'utf8'));
  for (const lang of ['en', 'es']) await writeFile(join(dist, `src/i18n/locales/${lang}/translation.json`), await readFile(resolve(`src/i18n/locales/${lang}/translation.json`), 'utf8'));
  app = express();
  app.get('/api/fixture', (_req, res) => res.json({ ok: true }));
  let index: ReturnType<typeof mountPublicSite> | null = null;
  mountSitemapRoutes(app, () => index);
  index = mountPublicSite(app, dist);
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });

describe('actual production-layout public middleware', () => {
  it.each(['/', '/blog', '/careers', '/apply', '/get-started', '/diagnostico-ia', '/demos', '/try-rag', '/try-identity', '/try-langchain', '/try-docextract'])('delivers nonempty metadata and revalidating HTML at %s', async path => {
    const res = await request(app).get(path).expect(200);
    const $ = load(res.text);
    expect($('title').text().length).toBeGreaterThan(5);
    expect($('meta[name="description"]').attr('content')!.length).toBeGreaterThan(20);
    expect($('link[rel="canonical"]')).toHaveLength(1);
    expect($('link[hreflang="es"]')).toHaveLength(1);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect($('html').attr('lang')).toBe('en');
  });
  it('reads Spanish resources from the built layout and emits Spanish lang/canonical', async () => {
    const res = await request(app).get('/get-started?lang=es').expect(200);
    const $ = load(res.text);
    expect($('title').text()).toContain('Empieza');
    expect($('html').attr('lang')).toBe('es');
    expect($('link[rel="canonical"]').attr('href')).toBe('https://robles.ai/get-started?lang=es');
  });
  it('uses clean translated article URLs, truthful dates and organization attribution', async () => {
    const res = await request(app).get(`/blog/${esSlug}`).expect(200);
    const $ = load(res.text);
    expect($('html').attr('lang')).toBe('es');
    expect($('title').text()).toBe(post.translations.es.title);
    expect($('link[rel="canonical"]').attr('href')).toBe(`https://robles.ai/blog/${esSlug}`);
    const graphs = $('script[type="application/ld+json"]').toArray().map(e => JSON.parse($(e).text()));
    const article = graphs.find(e => e['@type'] === 'BlogPosting');
    expect(article.datePublished).toBe('2026-10-16T23:00:00Z');
    expect(article).not.toHaveProperty('dateModified');
    expect(article.author['@type']).toBe('Organization');
    expect(article.image).toBe('https://robles.ai/images/logo.png');
  });
  it('permanently redirects legacy query-language URLs while retaining campaign parameters', async () => {
    await request(app).get(`/blog/${enSlug}?lang=es&utm_source=test`).expect(308).expect('Location', `/blog/${esSlug}?utm_source=test`);
    await request(app).get(`/blog/${enSlug}?lang=en`).expect(308).expect('Location', `/blog/${enSlug}`);
  });
  it('normalizes trailing slashes and retains archive page canonicals', async () => {
    await request(app).get('/blog/?lang=es&page=2').expect(308).expect('Location', '/blog?lang=es&page=2');
    const res = await request(app).get('/blog?lang=es&page=2').expect(200);
    expect(load(res.text)('link[rel="canonical"]').attr('href')).toBe('https://robles.ai/blog?lang=es&page=2');
    expect(load(res.text)('title').text()).toContain('Página 2');
  });
  it.each(['/not-a-route', '/blog/missing-post', `/blog/${enSlug}-invented`, '/assets/missing.js', '/logo.png', '/og-image.png', '/index.js', '/src/i18n/locales/en/translation.json', '/data/dominical.db', '/data/posts/post.json', '/api/missing'])('returns a real 404 without exposing private artifacts: %s', async path => {
    const res = await request(app).get(path).expect(404);
    expect(res.text).not.toContain('private fixture');
    expect(res.text).not.toContain('private server bundle');
  });
  it('retains API precedence and sensible asset cache policies', async () => {
    await request(app).get('/api/fixture').expect(200, { ok: true });
    const asset = await request(app).get('/assets/index-Ab123456.js').expect(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const unversioned = await request(app).get('/assets/unversioned.js').expect(200);
    expect(unversioned.headers['cache-control']).not.toContain('immutable');
    await request(app).get('/images/logo.png').expect(200).expect('Content-Type', /image\/png/);
    await request(app).head('/get-started').expect(200).expect('Cache-Control', 'no-cache');
  });
  it('keeps utility shells available while excluding them from indexing', async () => {
    await request(app).get('/admin/backends').expect(200).expect('X-Robots-Tag', 'noindex, nofollow');
    const res = await request(app).get('/try-medical').expect(200);
    expect(load(res.text)('meta[name="robots"]').attr('content')).toBe('noindex,follow');
  });
  it('serves a correct robots target and complete bilingual sitemap inventory', async () => {
    const robots = await request(app).get('/robots.txt').expect(200);
    expect(robots.text).toContain('Sitemap: https://robles.ai/sitemap.xml\n');
    const index = await request(app).get('/sitemap.xml').expect(200).expect('Content-Type', /xml/);
    expect(index.text).toContain('/sitemaps/2026-10.xml');
    const map = await request(app).get('/sitemaps/2026-10.xml').expect(200);
    expect(map.text).toContain(`<loc>https://robles.ai/blog/${enSlug}</loc>`);
    expect(map.text).toContain(`<loc>https://robles.ai/blog/${esSlug}</loc>`);
    await request(app).get('/sitemaps/2026-10-es.xml').expect(200);
    await request(app).get('/sitemaps/2024-01.xml').expect(404);
    const statics = await request(app).get('/static-pages.xml').expect(200);
    expect(statics.text).toContain('/get-started');
    expect(statics.text).toContain('/diagnostico-ia');
    expect(statics.text).not.toContain('/admin');
  });
});
