import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Footer from '../Footer';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es', resolvedLanguage: 'es' } }) }));
afterEach(cleanup);
it('retains Spanish in navigation and removes misleading placeholder destinations', () => {
  render(<Footer />);
  expect(screen.getByRole('link', { name: 'footer.company.about' })).toHaveAttribute('href', '/?lang=es#about');
  expect(screen.getByRole('link', { name: 'footer.company.blog' })).toHaveAttribute('href', '/blog?lang=es');
  expect(screen.queryByRole('link', { name: 'footer.legal.privacy' })).not.toBeInTheDocument();
  expect(document.querySelectorAll('a[href="#"],a[href="/#"]')).toHaveLength(0);
});
