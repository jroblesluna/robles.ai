import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Router, Route, Switch } from 'wouter';
import BlogRoute from './BlogRoute';
import { applyPageMetadata } from '@/lib/pageMetadata';
import { buildStaticMeta } from '@shared/seoMetadata';
const locale = vi.hoisted(() => ({ language: 'en' as 'en' | 'es' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: locale.language } }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('./BlogPost', () => ({ default: () => <div data-testid="full-post" /> }));
const slug = '2026-10-15-18-00-00-shivoo-studios-reality-reframe-podcast';
const translation = (slug: string, title: string) => ({ slug, title, excerpt: 'Summary', content: [{ heading: 'Details', body: 'Fixture article body' }] });
const posts = [
  { slug, date: '2026-10-15', editorId: 1, translations: { en: translation(slug, 'English collision'), es: translation(slug, 'Colisión española') } },
  { slug: '2026-10-15-17-00-00-normal', date: '2026-10-15', editorId: 1, translations: { en: translation('2026-10-15-17-00-00-normal', 'English normal'), es: translation('2026-10-15-17-00-00-normal-es', 'Normal español') } },
];
function setup(language: 'en' | 'es') {
  locale.language = language;
  window.history.replaceState(null, '', '/blog?' + (language === 'es' ? 'lang=es&' : '') + 'page=2');
  applyPageMetadata(buildStaticMeta('/blog', language, {}, { page: 2 }));
  vi.stubGlobal('fetch', vi.fn(async (input: string) => ({ ok: true, json: async () => input.startsWith('/api/editors') ? { editors: [] } : input.startsWith('/api/blog?') ? { posts, total: 60 } : posts.find(post => input.endsWith(post.slug)) })));
  return render(<Router><Switch><Route path="/blog/:slug?" component={BlogRoute} /></Switch></Router>);
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/blog'); });
it.each(['en', 'es'] as const)('renders the real %s card href, preserving native modified clicks and modal navigation', async language => {
  setup(language);
  const title = language === 'en' ? 'English collision' : 'Colisión española';
  const card = (await screen.findByText(title)).closest('a')!;
  const path = '/blog/' + slug + (language === 'en' ? '?lang=en' : '');
  expect(card).toHaveAttribute('href', path);
  const normal = screen.getByText(language === 'en' ? 'English normal' : 'Normal español').closest('a');
  expect(normal).toHaveAttribute('href', '/blog/' + posts[1].translations[language].slug);
  // Observe cancellation after React's delegated handler, then suppress jsdom's unimplemented navigation.
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
    let wasPrevented = true;
    const stopNavigation = (event: MouseEvent) => { wasPrevented = event.defaultPrevented; event.preventDefault(); };
    document.addEventListener('click', stopNavigation, { once: true });
    fireEvent.click(card, { button: 0, ...modifiers });
    expect(wasPrevented).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }
  fireEvent.click(card, { button: 0 });
  await screen.findByRole('dialog');
  await screen.findByText('Fixture article body');
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe(path));
  expect(screen.getByRole('link', { name: 'blogModal.openInNewTab' })).toHaveAttribute('href', path);
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://robles.ai' + path);
  fireEvent.click(screen.getByRole('button', { name: 'blogModal.close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/blog?' + (language === 'es' ? 'lang=es&' : '') + 'page=2'));
  await waitFor(() => expect(card).toHaveFocus());
  expect(screen.queryByTestId('full-post')).not.toBeInTheDocument();
});
