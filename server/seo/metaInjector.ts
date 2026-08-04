import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RequestHandler } from 'express';
import type { MetaInjectorConfig, BlogPostData, PageMeta } from './types.js';
import { STATIC_PAGES } from './types.js';
import { createSlugIndex, type SlugIndex } from './slugIndex.js';
import { buildBlogMeta, buildBlogJsonLd, buildStaticMeta, buildHomeJsonLd } from './metaBuilders.js';
import { injectMeta } from './htmlInjector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/** Path to the posts directory. */
const POSTS_DIR = resolve(__dirname, 'data', 'posts');

/** Path to the editors JSON file. */
const EDITORS_PATH = resolve(__dirname, '..', 'data', 'editors.json');

/** Path to i18n translations. */
const I18N_DIR = resolve(__dirname, '..', '..', 'src', 'i18n', 'locales');

/** Blog post URL pattern: /blog/:slug */
const BLOG_ROUTE_REGEX = /^\/blog\/([^/?#]+)/;

// --- Cached data (loaded once) ---

let editorsCache: { id: number; name: string }[] | null = null;

async function loadEditors(): Promise<{ id: number; name: string }[]> {
  if (editorsCache) return editorsCache;
  try {
    const data = await readFile(EDITORS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    editorsCache = parsed.editors.map((e: any) => ({ id: e.id, name: e.name }));
    return editorsCache!;
  } catch {
    editorsCache = [];
    return editorsCache;
  }
}

let translationsCache: Record<string, Record<string, any>> | null = null;

async function loadTranslations(): Promise<Record<string, Record<string, any>>> {
  if (translationsCache) return translationsCache;
  try {
    const enData = await readFile(join(I18N_DIR, 'en', 'translation.json'), 'utf-8');
    const esData = await readFile(join(I18N_DIR, 'es', 'translation.json'), 'utf-8');
    translationsCache = {
      en: JSON.parse(enData),
      es: JSON.parse(esData),
    };
    return translationsCache;
  } catch {
    translationsCache = { en: {}, es: {} };
    return translationsCache;
  }
}

/**
 * Resolves the editor name from the editorId.
 */
function getEditorName(editors: { id: number; name: string }[], editorId: number): string {
  const editor = editors.find(e => e.id === editorId);
  return editor?.name ?? 'Robles.AI';
}

/**
 * Creates the MetaInjector Express middleware.
 *
 * This middleware intercepts requests and injects SEO meta tags into the HTML
 * template based on the route type:
 * - /blog/:slug → Blog post meta + JSON-LD
 * - Static pages (/, /blog, /careers, /get-started, /apply) → Static meta
 * - Unknown routes → Default HTML unmodified
 *
 * Requirements: 1.1, 1.5, 1.6, 1.7, 2.1, 2.5, 9.3, 9.5, 9.6
 */
export interface MetaInjectorResult {
  handler: RequestHandler;
  slugIndex: SlugIndex;
}

export function createMetaInjector(config: MetaInjectorConfig): MetaInjectorResult {
  const { mode, distPath, sourcePath, viteTransform } = config;

  // Lazy slug index initialization
  const slugIndex: SlugIndex = createSlugIndex(POSTS_DIR);
  let slugIndexReady = false;
  let slugIndexInitPromise: Promise<void> | null = null;

  async function ensureSlugIndex(): Promise<void> {
    if (slugIndexReady) return;
    if (!slugIndexInitPromise) {
      slugIndexInitPromise = slugIndex.rebuild().then(() => {
        slugIndexReady = true;
      }).catch(() => {
        // If rebuild fails, mark as ready but empty — will serve default HTML
        slugIndexReady = true;
      });
    }
    await slugIndexInitPromise;
  }

  // Production HTML template cache
  let cachedProductionHtml: string | null = null;

  /**
   * Reads the HTML template based on the current mode.
   * - Development: reads source index.html, applies Vite transform
   * - Production: reads dist/index.html (cached after first read)
   */
  async function getHtmlTemplate(url: string): Promise<string> {
    if (mode === 'production') {
      if (cachedProductionHtml) return cachedProductionHtml;
      const htmlPath = join(distPath, 'index.html');
      cachedProductionHtml = await readFile(htmlPath, 'utf-8');
      return cachedProductionHtml;
    }

    // Development mode: read source and apply Vite transform
    let html = await readFile(sourcePath, 'utf-8');
    if (viteTransform) {
      html = await viteTransform(url, html);
    }
    return html;
  }

  /**
   * Determines the language from the slug index entry and request query.
   * Priority: ?lang param (if valid) > slug matching
   */
  function resolveLanguage(
    slug: string,
    queryLang: string | undefined,
    enSlug: string,
    esSlug: string
  ): 'en' | 'es' {
    // If ?lang param is provided and valid, use it
    if (queryLang === 'es') return 'es';
    if (queryLang === 'en') return 'en';

    // Determine language by which slug matched
    if (slug === esSlug) return 'es';
    return 'en';
  }

  // The actual Express middleware handler
  const handler: RequestHandler = async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = req.path;

    try {
      // Check if this is a blog post route
      const blogMatch = BLOG_ROUTE_REGEX.exec(pathname);

      if (blogMatch) {
        // --- Blog Post Route ---
        const slug = blogMatch[1];

        // Ensure slug index is ready
        await ensureSlugIndex();

        const entry = slugIndex.get(slug);

        if (!entry) {
          // Post not found — serve default HTML unmodified
          const html = await getHtmlTemplate(url);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        }

        // Read the blog post JSON
        let postData: BlogPostData;
        try {
          const postContent = await readFile(entry.filePath, 'utf-8');
          postData = JSON.parse(postContent);
        } catch {
          // If we can't read/parse the post, serve default HTML
          const html = await getHtmlTemplate(url);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        }

        // Resolve language
        const queryLang = req.query.lang as string | undefined;
        const lang = resolveLanguage(slug, queryLang, entry.enSlug, entry.esSlug);

        // The slug to use for canonical (the current language's slug)
        const currentSlug = lang === 'en' ? entry.enSlug : entry.esSlug;

        // Build meta tags
        const meta = buildBlogMeta({ post: postData, lang, slug: currentSlug });

        // Build JSON-LD
        const editors = await loadEditors();
        const editorName = getEditorName(editors, postData.editorId);
        const jsonLd = buildBlogJsonLd({ post: postData, lang, slug: currentSlug }, editorName);
        meta.jsonLd = jsonLd;

        // Get HTML template and inject meta
        const html = await getHtmlTemplate(url);
        const injectedHtml = injectMeta(html, meta);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(injectedHtml);
        return;
      }

      // Check if this is a known static page
      if (pathname in STATIC_PAGES) {
        // --- Static Page Route ---
        const queryLang = req.query.lang as string | undefined;
        const lang: 'en' | 'es' = queryLang === 'es' ? 'es' : 'en';

        // Load translations
        const translations = await loadTranslations();
        const langTranslations = translations[lang] ?? translations.en;

        // Build static meta
        const meta = buildStaticMeta(pathname, lang, langTranslations);

        // For home page, add WebSite JSON-LD
        if (pathname === '/') {
          meta.jsonLd = buildHomeJsonLd();
        }

        // Get HTML template and inject meta
        const html = await getHtmlTemplate(url);
        const injectedHtml = injectMeta(html, meta);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(injectedHtml);
        return;
      }

      // --- Unknown Route ---
      // Serve default HTML unmodified (let client-side router handle)
      const html = await getHtmlTemplate(url);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      // On any error, try to serve default template unmodified
      try {
        const html = await getHtmlTemplate(url);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch {
        // If we can't even read the template, pass to next error handler
        next(error);
      }
    }
  };

  return { handler, slugIndex };
}
