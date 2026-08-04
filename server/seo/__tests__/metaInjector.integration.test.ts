import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMetaInjector } from '../metaInjector.js';
import type { MetaInjectorConfig } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

/** Project root */
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');

/** Source index.html path */
const SOURCE_PATH = resolve(PROJECT_ROOT, 'index.html');

/** Dist path (not used in dev mode tests, but required by config) */
const DIST_PATH = resolve(PROJECT_ROOT, 'dist');

/**
 * Creates a mock Express Request object.
 */
function createMockReq(path: string, query: Record<string, string> = {}): any {
  const url = path + (Object.keys(query).length > 0
    ? '?' + new URLSearchParams(query).toString()
    : '');
  return {
    originalUrl: url,
    path,
    query,
  };
}

/**
 * Creates a mock Express Response object that captures the response data.
 */
function createMockRes(): any {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    set(headers: Record<string, string>) {
      Object.assign(res.headers, headers);
      return res;
    },
    end(html: string) {
      res.body = html;
      return res;
    },
  };
  return res;
}

/**
 * Helper to invoke the MetaInjector middleware and return the response.
 */
async function invokeMiddleware(
  path: string,
  query: Record<string, string> = {}
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const config: MetaInjectorConfig = {
    mode: 'development',
    distPath: DIST_PATH,
    sourcePath: SOURCE_PATH,
    // No viteTransform in test — we just use raw source HTML
  };

  const { handler: middleware } = createMetaInjector(config);
  const req = createMockReq(path, query);
  const res = createMockRes();
  const next = vi.fn();

  await middleware(req, res, next);

  return { statusCode: res.statusCode, headers: res.headers, body: res.body };
}

describe('MetaInjector integration tests', () => {
  describe('blog post request', () => {
    const SLUG = '2025-03-28-00-00-00-embracing-the-future-edge-ai-and-net-zero-infrastructure';

    it('returns HTML with correct title from the blog post', async () => {
      const { body, statusCode } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(statusCode).toBe(200);
      expect(body).toContain('<title>Embracing the Future: Edge AI and Net-Zero Infrastructure</title>');
    });

    it('returns HTML with correct meta description', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('name="description"');
      expect(body).toContain('Explore how cutting-edge AI and Net-Zero strategies');
    });

    it('returns HTML with Open Graph meta tags', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('property="og:title"');
      expect(body).toContain('Embracing the Future');
      expect(body).toContain('property="og:type"');
      expect(body).toContain('article');
      expect(body).toContain('property="og:url"');
      expect(body).toContain(`https://robles.ai/blog/${SLUG}`);
    });

    it('returns HTML with Twitter Card meta tags', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('name="twitter:card"');
      expect(body).toContain('summary_large_image');
      expect(body).toContain('name="twitter:title"');
      expect(body).toContain('Embracing the Future');
    });

    it('returns HTML with hreflang link tags', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('hreflang="en"');
      expect(body).toContain('hreflang="es"');
      expect(body).toContain('hreflang="x-default"');
      expect(body).toContain(`href="https://robles.ai/blog/${SLUG}"`);
      expect(body).toContain('href="https://robles.ai/blog/2025-03-28-00-00-00-abrazando-el-futuro-ia-en-el-borde-e-infraestructura-net-zero"');
    });

    it('returns HTML with canonical link tag', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain(`<link rel="canonical" href="https://robles.ai/blog/${SLUG}" />`);
    });

    it('returns HTML with JSON-LD BlogPosting schema', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('application/ld+json');
      expect(body).toContain('"@type":"BlogPosting"');
      expect(body).toContain('"headline":"Embracing the Future: Edge AI and Net-Zero Infrastructure"');
    });

    it('preserves existing Organization JSON-LD', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('"@type":"Organization"');
      expect(body).toContain('"name":"Robles.AI"');
    });

    it('preserves body content unchanged', async () => {
      const { body } = await invokeMiddleware(`/blog/${SLUG}`);

      expect(body).toContain('<div id="root"></div>');
      expect(body).toContain('<script type="module" src="/src/main.tsx"></script>');
    });
  });

  describe('blog post with ?lang=es', () => {
    const EN_SLUG = '2025-03-28-00-00-00-embracing-the-future-edge-ai-and-net-zero-infrastructure';

    it('uses Spanish translation for title when ?lang=es', async () => {
      const { body } = await invokeMiddleware(`/blog/${EN_SLUG}`, { lang: 'es' });

      expect(body).toContain('Abrazando el Futuro');
      expect(body).not.toContain('<title>Embracing the Future');
    });

    it('uses Spanish translation for description when ?lang=es', async () => {
      const { body } = await invokeMiddleware(`/blog/${EN_SLUG}`, { lang: 'es' });

      expect(body).toContain('Explora cómo las innovaciones en IA');
    });

    it('uses Spanish slug for canonical URL when ?lang=es', async () => {
      const { body } = await invokeMiddleware(`/blog/${EN_SLUG}`, { lang: 'es' });

      expect(body).toContain('href="https://robles.ai/blog/2025-03-28-00-00-00-abrazando-el-futuro-ia-en-el-borde-e-infraestructura-net-zero"');
    });
  });

  describe('blog post with ES slug (language detection from slug)', () => {
    const ES_SLUG = '2025-03-28-00-00-00-abrazando-el-futuro-ia-en-el-borde-e-infraestructura-net-zero';

    it('resolves language from ES slug and uses Spanish content', async () => {
      const { body } = await invokeMiddleware(`/blog/${ES_SLUG}`);

      expect(body).toContain('Abrazando el Futuro');
    });
  });

  describe('static page request', () => {
    it('returns HTML with correct title for home page', async () => {
      const { body, statusCode } = await invokeMiddleware('/');

      expect(statusCode).toBe(200);
      expect(body).toContain('Robles.AI | AI Diagnosis');
    });

    it('returns HTML with correct description for home page', async () => {
      const { body } = await invokeMiddleware('/');

      expect(body).toContain('AI diagnosis, prioritization, and implementation');
    });

    it('returns HTML with OG tags for home page', async () => {
      const { body } = await invokeMiddleware('/');

      expect(body).toContain('property="og:type"');
      expect(body).toContain('website');
      expect(body).toContain('property="og:url"');
    });

    it('returns HTML with WebSite JSON-LD for home page', async () => {
      const { body } = await invokeMiddleware('/');

      expect(body).toContain('"@type":"WebSite"');
      expect(body).toContain('"name":"Robles.AI"');
    });

    it('returns HTML with hreflang links for static page', async () => {
      const { body } = await invokeMiddleware('/');

      expect(body).toContain('hreflang="en"');
      expect(body).toContain('hreflang="es"');
      expect(body).toContain('hreflang="x-default"');
    });

    it('returns HTML with correct title for /blog listing', async () => {
      const { body } = await invokeMiddleware('/blog');

      expect(body).toContain('Robles.AI | AI News Center');
    });

    it('returns HTML with correct title for /careers', async () => {
      const { body } = await invokeMiddleware('/careers');

      expect(body).toContain('Robles.AI | Careers');
    });
  });

  describe('static page with ?lang=es', () => {
    it('uses Spanish translations for home page when ?lang=es', async () => {
      const { body } = await invokeMiddleware('/', { lang: 'es' });

      expect(body).toContain('Robles.AI | Diagnóstico y Roadmap de IA para tu negocio');
    });

    it('uses Spanish translations for /blog when ?lang=es', async () => {
      const { body } = await invokeMiddleware('/blog', { lang: 'es' });

      expect(body).toContain('Robles.AI | Centro de Noticias IA');
    });

    it('uses Spanish translations for /careers when ?lang=es', async () => {
      const { body } = await invokeMiddleware('/careers', { lang: 'es' });

      expect(body).toContain('Robles.AI | Empleos');
    });
  });

  describe('unknown route', () => {
    it('serves default HTML unmodified for unknown routes', async () => {
      const { body, statusCode } = await invokeMiddleware('/some/unknown/path');

      expect(statusCode).toBe(200);
      // Default title should remain unchanged
      expect(body).toContain('<title>Robles.AI | Diagnóstico y Roadmap de IA para tu negocio</title>');
      // Body should remain untouched
      expect(body).toContain('<div id="root"></div>');
      expect(body).toContain('<script type="module" src="/src/main.tsx"></script>');
    });

    it('serves unmodified HTML preserving original meta description', async () => {
      const { body } = await invokeMiddleware('/some/other/route');

      // The default description from source index.html
      expect(body).toContain('Diagnóstico, priorización e implementación de Inteligencia Artificial');
    });

    it('serves unmodified HTML preserving original OG tags', async () => {
      const { body } = await invokeMiddleware('/api-docs');

      expect(body).toContain('property="og:title"');
      expect(body).toContain('Diagnóstico y Roadmap de IA para tu negocio');
    });
  });

  describe('unknown blog slug (post not found)', () => {
    it('serves default HTML unmodified when slug does not exist', async () => {
      const { body, statusCode } = await invokeMiddleware('/blog/non-existent-slug-12345');

      expect(statusCode).toBe(200);
      // Default title — served unmodified
      expect(body).toContain('<title>Robles.AI | Diagnóstico y Roadmap de IA para tu negocio</title>');
      expect(body).toContain('<div id="root"></div>');
    });
  });
});
