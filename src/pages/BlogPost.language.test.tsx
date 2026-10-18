import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import BlogPost from './BlogPost';
const fixture = vi.hoisted(() => ({ slug: '2026-10-15-18-00-00-shared-slug', i18n: { language: 'en', changeLanguage: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: fixture.i18n }) }));
vi.mock('wouter', () => ({ useParams: () => ({ slug: fixture.slug }), useSearch: () => window.location.search.slice(1) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('keeps direct-load content, canonical and schema in sync when only the language query changes', async () => {
  const post = { slug: fixture.slug, date: '2026-10-15', editorId: 1, categories: [], keywords: [], sources: [], translations: {
    en: { slug: fixture.slug, title: 'English article', excerpt: 'English summary', content: [{ heading: 'Results', body: 'English body' }] },
    es: { slug: fixture.slug, title: 'Artículo en español', excerpt: 'Resumen español', content: [{ heading: 'Resultados', body: 'Contenido español' }] },
  } };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => url === '/api/editors' ? { editors: [] } : post })));
  window.history.replaceState(null, '', `/blog/${fixture.slug}?lang=en`);
  const { rerender } = render(<BlogPost />);
  expect(await screen.findByRole('heading', { level: 1, name: 'English article' })).toBeInTheDocument();
  await waitFor(() => expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', `https://robles.ai/blog/${fixture.slug}?lang=en`));
  expect(screen.getByText('English body')).toBeInTheDocument();
  window.history.replaceState(null, '', `/blog/${fixture.slug}`);
  rerender(<BlogPost />);
  expect(screen.getByRole('heading', { level: 1, name: 'Artículo en español' })).toBeInTheDocument();
  await waitFor(() => expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', `https://robles.ai/blog/${fixture.slug}`));
  const schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(node => JSON.parse(node.textContent!)).find(data => data['@type'] === 'BlogPosting');
  expect(schema.inLanguage).toBe('es');
  expect(schema.mainEntityOfPage['@id']).toBe(`https://robles.ai/blog/${fixture.slug}`);
  expect(fixture.i18n.changeLanguage).toHaveBeenCalledWith('es');
});
