import { afterEach, beforeEach, expect, it } from 'vitest';
import { applyPageMetadata, snapshotPageMetadata } from '../pageMetadata';
import { buildBlogMeta, buildBlogJsonLd, buildStaticMeta } from '@shared/seoMetadata';
import en from '@/i18n/locales/en/translation.json';
let restoreHead: string;
beforeEach(() => { restoreHead = document.head.innerHTML; document.head.innerHTML = '<title>Original</title><script type="application/ld+json">{"@type":"Organization","name":"Robles.AI"}</script>'; });
afterEach(() => { document.head.innerHTML = restoreHead; });
it('uses the same metadata for raw-builder input and the DOM, without duplicate canonical/alternates', () => {
  const meta = buildStaticMeta('/get-started', 'en', en);
  applyPageMetadata(meta); applyPageMetadata(meta);
  expect(document.title).toBe(meta.title);
  expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  expect(document.querySelectorAll('link[hreflang="es"]')).toHaveLength(1);
  expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(meta.title);
});
it('restores list metadata and language when a modal closes', () => {
  const list = buildStaticMeta('/blog', 'es', en, { page: 2 });
  applyPageMetadata(list);
  const restore = snapshotPageMetadata();
  const article = buildStaticMeta('/try-rag', 'en', en);
  applyPageMetadata(article);
  restore();
  expect(document.title).toBe(list.title);
  expect(document.documentElement.lang).toBe('es');
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(list.canonicalUrl);
});
it('replaces stale schema with the current article and preserves only the organization', () => {
  const make = (slug: string) => ({ slug, date: '2026-10-16', editorId: 1, sources: [], keywords: [], categories: [], translations: {
    en: { slug, title: slug, excerpt: 'description', content: [] }, es: { slug: `${slug}-es`, title: slug, excerpt: 'description', content: [] },
  } });
  for (const slug of ['first', 'second']) {
    const post = make(slug); const input = { post, lang: 'en' as const, slug };
    const meta = buildBlogMeta(input); meta.jsonLd = buildBlogJsonLd(input, 'Robles.AI'); applyPageMetadata(meta);
  }
  const graphs = Array.from(document.querySelectorAll('script[type="application/ld+json"]'), node => JSON.parse(node.textContent!));
  expect(graphs).toHaveLength(3);
  expect(graphs.find(g => g['@type'] === 'BlogPosting').headline).toBe('second');
});
