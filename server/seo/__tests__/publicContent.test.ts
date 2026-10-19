// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import en from '../../../src/i18n/locales/en/translation.json';
import es from '../../../src/i18n/locales/es/translation.json';
import { STATIC_PAGES } from '../../../shared/seoPolicy.js';
import { injectPublicContent, renderStaticContent, renderArticleContent, renderArchiveContent } from '../publicContent.js';
import type { BlogPostData } from '../types.js';

const translation = { slug: 'same', title: 'A <script>alert(1)</script> title', excerpt: 'Useful evidence', content: [{ heading: 'Actual heading', body: 'Public body </script><script>bad()</script>' }] };
const post: BlogPostData = { slug: 'same', date: '2026-10-18', editorId: 1, categories: [], keywords: [], translations: { en: translation, es: { ...translation, title: 'Título español' } }, sources: [{ title: 'Bad', url: 'javascript:alert(1)', source: '' }, { title: 'Evidence', url: 'https://example.com/source', source: '' }] };
describe('public response content', () => {
  it.each(['en', 'es'] as const)('renders localized public page types without browser globals: %s', lang => {
    const t = lang === 'en' ? en : es;
    for (const path of Object.keys(STATIC_PAGES).filter(p => p !== '/blog')) {
      const $ = load(renderStaticContent(path, lang, t, new URL('https://robles.ai' + path)));
      expect($('main h1'), path).toHaveLength(1);
      expect($('main').text().length, path).toBeGreaterThan(40);
      expect($('a[href^="javascript:"]'), path).toHaveLength(0);
      if (lang === 'es') expect($('header a').toArray().every(a => $(a).attr('href')?.includes('lang=es'))).toBe(true);
    }
  });
  it('keeps illustrative case labels and excludes nonpublic team profiles consistently', () => {
    const $ = load(renderStaticContent('/', 'en', en, new URL('https://robles.ai/')));
    expect($('#case-studies').text()).toContain(en.caseStudies.footnote);
    expect($('#about').text()).toContain('Antonio Robles');
    expect($('#about').text()).not.toContain('Sophia Martinez');
    expect($('main > img')).toHaveLength(0);
    expect($('main > h1').text()).toBe(en.hero.title);

  });
  it('preserves public text and safe sources while preventing HTML and JSON script injection', () => {
    const html = injectPublicContent('<html><head></head><body><div id="root"></div></body></html>', renderArticleContent(post, 'en', en), { ...post, privateToken: 'never serialize' } as BlogPostData);
    const $ = load(html);
    expect($('main h1').text()).toBe(translation.title);
    expect($('main').text()).toContain(translation.content[0].body);
    expect($('main script')).toHaveLength(0);
    expect($('a[href^="javascript:"]')).toHaveLength(0);
    expect($('a[href="https://example.com/source"]')).toHaveLength(1);
    expect(JSON.parse($('#public-post').text()).translations.en.title).toBe(translation.title);
    expect(html).not.toContain('never serialize');
    expect($('script')).toHaveLength(1);
  });
  it('preserves bilingual collision links and crawlable archive pagination', () => {
    const $ = load(renderArchiveContent([post], 'en', en, 2, 100));
    expect($('article a').attr('href')).toBe('/blog/same?lang=en');
    expect($('main nav a[href="/blog"]')).toHaveLength(1);
    expect($('nav a[href="/blog?page=3"]')).toHaveLength(1);
  });
  it('fails explicitly rather than silently serving an empty root after a template regression', () => {
    expect(() => injectPublicContent('<body></body>', 'content')).toThrow('root');
  });
});
