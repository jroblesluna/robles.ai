// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { load } from 'cheerio';
import { renderHome } from '../../../src/entry-server';
import en from '../../../src/i18n/locales/en/translation.json';
import es from '../../../src/i18n/locales/es/translation.json';

describe('real React home renderer', () => {
  it('isolates concurrent EN/ES requests, exposes public content and never starts browser services', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    try {
      const [english, spanish] = await Promise.all([renderHome('/', en), renderHome('/?lang=es', es)]);
      const a = load(english), b = load(spanish);
      expect(a('h1').text()).toBe(en.hero.title);
      expect(b('h1').text()).toBe(es.hero.title);
      expect(a('#about').text()).toContain('Antonio Robles');
      expect(a('#about').text()).not.toContain('Sophia Martinez');
      expect(b('a[href="/blog?lang=es"]')).not.toHaveLength(0);
      expect(b('a[href="/diagnostico-ia?lang=es"]')).not.toHaveLength(0);
      expect(a('img[src="/robly-avatar/robly-dominical.svg"]').attr('fetchPriority') ?? a('img[src="/robly-avatar/robly-dominical.svg"]').attr('fetchpriority')).toBe('high');
      expect(a('#contact form')).toHaveLength(1);
      expect(a('#contact form').attr('method')).toBe('post');
      expect(a('#contact button[type="submit"]').attr('disabled')).toBeDefined();
      expect(a('#contact a[href="mailto:info@robles.ai"]')).toHaveLength(1);
      expect(a('[role="tablist"]')).toHaveLength(0);
      expect(english).not.toContain('Open chat');
      expect(fetcher).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it('keeps the same English fallback as the client for an incomplete translation', async () => {
    const { subtitle: _omitted, ...hero } = es.hero;
    const html = await renderHome('/?lang=es', { ...es, hero });
    expect(load(html)('main').text()).toContain(en.hero.subtitle);
  });
  it('cannot render private or arbitrary routes', async () => {
    await expect(renderHome('/admin', en)).rejects.toThrow('public home');
  });
});
