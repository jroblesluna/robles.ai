import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import type { RequestHandler } from 'express';
import type { MetaInjectorConfig, BlogPostData, PageMeta } from './types.js';
import { STATIC_PAGES, explicitLanguage, archivePage, blogPagePath } from '../../shared/seoPolicy.js';
import enFallback from '../../src/i18n/locales/en/translation.json';
import esFallback from '../../src/i18n/locales/es/translation.json';
import { createSlugIndex, type SlugIndex } from './slugIndex.js';
import { buildBlogMeta, buildBlogJsonLd, buildStaticMeta, buildHomeJsonLd } from './metaBuilders.js';
import { injectMeta } from './htmlInjector.js';
import { injectPublicContent, renderStaticContent, renderArticleContent, renderArchiveContent, publicDocument } from './publicContent.js';

export interface MetaInjectorResult { handler: RequestHandler; slugIndex: SlugIndex }
const utilityRoute = /^(?:\/otp|\/admin(?:\/(?:settings|analytics|backends|quiz-leads|conversations(?:\/[^/]+)?|dominical(?:\/[^/]+)?))?)$/;

export function createMetaInjector(config: MetaInjectorConfig): MetaInjectorResult {
  // Paths are explicit inputs, independent of esbuild's flattened module __dirname.
  const projectRoot = dirname(config.sourcePath);
  const dataDir = config.mode === 'production' ? join(config.distPath, 'data') : join(projectRoot, 'server', 'data');
  const postsDir = config.postsDir ?? join(dataDir, 'posts');
  const translationsDir = config.translationsDir ?? (config.mode === 'production'
    ? join(config.distPath, 'src', 'i18n', 'locales') : join(projectRoot, 'src', 'i18n', 'locales'));
  const slugIndex = createSlugIndex(resolve(postsDir));
  const fallbacks = { en: enFallback, es: esFallback };
  let cachedHtml: string | undefined;
  let warnedTranslations = false;
  const translationCache = new Map<'en' | 'es', Record<string, any>>();

  async function template(url: string) {
    if (config.mode === 'production') {
      cachedHtml ??= await readFile(join(config.distPath, 'index.html'), 'utf8');
      return cachedHtml;
    }
    const html = await readFile(config.sourcePath, 'utf8');
    return config.viteTransform ? config.viteTransform(url, html) : html;
  }
  async function translations(lang: 'en' | 'es') {
    const cached = translationCache.get(lang);
    if (cached) return cached;
    try {
      const data = JSON.parse(await readFile(join(translationsDir, lang, 'translation.json'), 'utf8'));
      if (!data?.seo?.home?.title) throw new Error('Invalid translation resource');
      translationCache.set(lang, data);
      return data;
    }
    catch {
      // Safe compiled fallback, not an indefinitely cached empty object. Retry next request.
      if (!warnedTranslations) { console.warn('[SEO] Translation resource unavailable; using bundled translations.'); warnedTranslations = true; }
      return fallbacks[lang];
    }
  }
  async function send(reqUrl: string, res: Parameters<RequestHandler>[1], status: number, meta: PageMeta, content = '', post?: BlogPostData, hydrate = false) {
    res.status(status).set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      .end(injectPublicContent(injectMeta(await template(reqUrl), meta), content, post, hydrate));
  }
  const handler: RequestHandler = async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const url = new URL(req.originalUrl, 'https://robles.ai');
    const path = url.pathname;
    const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
    const queryLang = explicitLanguage(url.searchParams.get('lang'));
    try {
      if (normalized !== path && (STATIC_PAGES[normalized] || /^\/blog\/[^/]+$/.test(normalized) || utilityRoute.test(normalized))) {
        return void res.redirect(308, normalized + url.search);
      }
      const match = /^\/blog\/([^/]+)$/.exec(path);
      if (match) {
        await slugIndex.ready();
        const slug = decodeURIComponent(match[1]);
        const entry = slugIndex.get(slug);
        if (entry) {
          const post: BlogPostData = JSON.parse(await readFile(entry.filePath, 'utf8'));
          const lang = queryLang ?? (slug === entry.esSlug ? 'es' : 'en');
          const target = new URL(blogPagePath(entry.enSlug, entry.esSlug, lang), url.origin);
          const originalPath = url.pathname + url.search;
          // Retain campaign/filter parameters, and retain lang only when it distinguishes EN.
          const requiredLang = target.searchParams.get('lang');
          if (requiredLang) url.searchParams.set('lang', requiredLang);
          else url.searchParams.delete('lang');
          const targetPath = target.pathname + url.search;
          if (targetPath !== originalPath) return void res.redirect(308, targetPath);
          const targetSlug = lang === 'es' ? entry.esSlug : entry.enSlug;
          const meta = buildBlogMeta({ post, lang, slug: targetSlug });
          meta.jsonLd = buildBlogJsonLd({ post, lang, slug: targetSlug }, 'Robles.AI');
          await send(req.originalUrl, res, 200, meta, renderArticleContent(post, lang, await translations(lang)), post);
          return;
        }
      } else if (STATIC_PAGES[path]) {
        const lang = queryLang ?? 'en';
        const page = path === '/blog' ? archivePage(url.searchParams.get('page')) : 1;
        const locale = await translations(lang);
        const meta = buildStaticMeta(path, lang, locale, {
          page, filtered: path === '/blog' && ['q', 'editorId', 'days'].some(k => url.searchParams.has(k)),
        });
        if (path === '/') meta.jsonLd = buildHomeJsonLd();
        let content: string;
        if (path === '/blog') {
          await slugIndex.ready();
          const entries = slugIndex.entries().sort((a, b) => b.enSlug.localeCompare(a.enSlug));
          // Filter/search results are noindex and remain interactive; do not show
          // unfiltered results as though they matched the requested filter.
          const filtered = ['q', 'editorId', 'days'].some(key => url.searchParams.has(key));
          const selected = filtered ? [] : entries.slice((page - 1) * 30, page * 30);
          const posts: BlogPostData[] = await Promise.all(selected.map(entry => readFile(entry.filePath, 'utf8').then(JSON.parse)));
          content = renderArchiveContent(posts, lang, locale, page, filtered ? 0 : entries.length);
        } else if (path === '/' && config.renderHome) content = await config.renderHome(req.originalUrl, locale);
        else content = renderStaticContent(path, lang, locale, url);
        await send(req.originalUrl, res, 200, meta, content, undefined, path === '/' && !!config.renderHome);
        return;
      } else if (utilityRoute.test(path)) {
        const lang = queryLang ?? 'en';
        const meta = buildStaticMeta('/', lang, await translations(lang));
        meta.canonicalUrl = 'https://robles.ai' + path;
        meta.ogUrl = meta.canonicalUrl;
        meta.hreflangLinks = [];
        meta.title = path === '/otp' ? 'Verification | Robles.AI' : 'Admin | Robles.AI';
        meta.ogTitle = meta.twitterTitle = meta.title;
        meta.robots = 'noindex,nofollow';
        res.set('X-Robots-Tag', 'noindex, nofollow');
        await send(req.originalUrl, res, 200, meta);
        return;
      }
      if (/\.[a-z0-9]{1,8}$/i.test(path) || /^\/(?:api|assets|data|src|shared|server)(?:\/|$)/.test(path)) {
        res.status(404).set({ 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }).type('text').end('Not found');
        return;
      }
      const lang = queryLang ?? 'en';
      const meta = buildStaticMeta('/', lang, await translations(lang));
      meta.title = lang === 'es' ? 'Página no encontrada | Robles.AI' : 'Page not found | Robles.AI';
      meta.ogTitle = meta.twitterTitle = meta.title;
      meta.canonicalUrl = meta.ogUrl = 'https://robles.ai' + path;
      meta.hreflangLinks = [];
      meta.robots = 'noindex,follow';
      await send(req.originalUrl, res, 404, meta, publicDocument(`<h1>${meta.title}</h1>`, lang, await translations(lang)));
    } catch {
      console.error('[SEO] Public HTML could not be generated.');
      res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '60', 'X-Robots-Tag': 'noindex' })
        .type('text').end('Temporarily unavailable');
    }
  };
  return { handler, slugIndex };
}
