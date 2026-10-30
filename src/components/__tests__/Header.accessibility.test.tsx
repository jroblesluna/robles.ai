import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Header from '../Header';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', resolvedLanguage: 'en' } }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
beforeEach(() => { window.history.replaceState(null, '', '/blog?page=2'); });
afterEach(cleanup);
it('opens disclosures on keyboard activation, removes closed links from focus, and restores focus on Escape', () => {
  render(<Header isMobileMenuOpen={false} setIsMobileMenuOpen={vi.fn()} />);
  const company = screen.getByRole('button', { name: 'nav.company' });
  expect(company).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'nav.careers' })).not.toBeInTheDocument();
  fireEvent.click(company);
  expect(company).toHaveAttribute('aria-expanded', 'true');
  const careers = screen.getByRole('link', { name: 'nav.careers' });
  careers.focus(); fireEvent.keyDown(careers, { key: 'Escape' });
  expect(company).toHaveFocus(); expect(company).toHaveAttribute('aria-expanded', 'false');
});
it('uses actual link destinations and preserves static pagination during language switching', () => {
  render(<Header isMobileMenuOpen={false} setIsMobileMenuOpen={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'nav.language' }));
  expect(screen.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/blog?page=2&lang=es');
  expect(screen.getByRole('link', { name: 'nav.demos' })).toHaveAttribute('href', '/demos');
  expect(screen.getByRole('button', { name: 'nav.toggleMenu' })).toHaveAttribute('aria-controls', 'mobile-navigation');
});

it('updates language links after modal metadata changes and restores them on close', async () => {
  const { applyPageMetadata, snapshotPageMetadata } = await import('@/lib/pageMetadata');
  const { buildStaticMeta } = await import('@shared/seoMetadata');
  applyPageMetadata(buildStaticMeta('/blog', 'en', {}, { page: 2 }));
  const restore = snapshotPageMetadata();
  render(<Header isMobileMenuOpen={false} setIsMobileMenuOpen={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'nav.language' }));
  window.history.replaceState({ blogModal: true }, '', '/blog/shared-slug?lang=en');
  applyPageMetadata({ ...buildStaticMeta('/blog', 'en', {}), hreflangLinks: [
    { hreflang: 'en', href: 'https://robles.ai/blog/shared-slug?lang=en' },
    { hreflang: 'es', href: 'https://robles.ai/blog/shared-slug' },
  ] });
  await waitFor(() => expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/blog/shared-slug?lang=en'));
  expect(screen.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/blog/shared-slug');
  window.history.replaceState(null, '', '/blog?page=2');
  restore();
  await waitFor(() => expect(screen.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/blog?page=2&lang=es'));
});
