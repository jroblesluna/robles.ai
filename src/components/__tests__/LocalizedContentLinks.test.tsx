import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import en from '@/i18n/locales/en/translation.json';
import es from '@/i18n/locales/es/translation.json';
import Hero from '../Hero';
import Landing from '@/pages/Landing';
import DemosCatalog from '../DemosCatalog';
import { DemoNav } from '../demo/DemoNav';
const locale = vi.hoisted(() => ({ language: 'es' as 'en' | 'es' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  i18n: { language: locale.language, resolvedLanguage: locale.language },
  t: (key: string) => key.split('.').reduce<any>((value, part) => value?.[part], locale.language === 'es' ? es : en) ?? key,
}) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('../ParticleBackground', () => ({ default: () => null }));
// Animation/layout is outside these link-contract tests; retain native interactive elements.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const tags = new Map();
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!tags.has(tag)) tags.set(tag, React.forwardRef(({ children, ...props }: any, ref) => {
        const domProps = Object.fromEntries(Object.entries(props).filter(([key]) => !['variants', 'initial', 'animate', 'exit', 'transition', 'custom', 'whileInView', 'whileHover', 'whileTap', 'viewport', 'layout'].includes(key)));
        return React.createElement(tag, { ...domProps, ref }, children);
      }));
      return tags.get(tag);
    } }),
  };
});
afterEach(cleanup);
it.each(['en', 'es'] as const)('preserves %s across every Hero slide and landing diagnosis CTA', language => {
  locale.language = language;
  const suffix = language === 'es' ? '?lang=es' : '';
  const { unmount } = render(<Hero />);
  expect(screen.getByRole('link', { name: language === 'es' ? es.hero.cta2 : en.hero.cta2 })).toHaveAttribute('href', '/blog' + suffix);
  expect(screen.getByRole('link', { name: language === 'es' ? es.hero.cta3 : en.hero.cta3 })).toHaveAttribute('href', '/get-started' + suffix);
  fireEvent.click(screen.getByRole('button', { name: 'Slide 2' }));
  expect(screen.getByRole('link', { name: language === 'es' ? es.quizPromo.cta : en.quizPromo.cta })).toHaveAttribute('href', '/diagnostico-ia' + suffix);
  fireEvent.click(screen.getByRole('button', { name: 'Slide 3' }));
  const links = screen.getAllByRole('link').map(link => link.getAttribute('href'));
  for (const path of ['/demos', '/try-identity', '/try-rag', '/try-transcription', '/try-langchain']) expect(links).toContain(path + suffix);
  unmount();
  const landing = render(<Landing />);
  expect(landing.container.querySelector('a[href^="/diagnostico-ia"]')).toHaveAttribute('href', '/diagnostico-ia' + suffix);
  // Same-document and external actions retain their original targets.
  expect(landing.container.querySelector('a[href="#contacto"]')).toBeInTheDocument();
  expect(landing.container.querySelector('a[href="mailto:info@robles.ai"]')).toBeInTheDocument();
});
it.each(['en', 'es'] as const)('keeps %s on catalog cards, roadmap contact and demo navigation', language => {
  locale.language = language;
  const suffix = language === 'es' ? '?lang=es' : '';
  const catalog = render(<DemosCatalog />);
  const links = Array.from(catalog.container.querySelectorAll<HTMLAnchorElement>('a[href]'));
  expect(links.some(link => link.getAttribute('href') === '/try-rag' + suffix)).toBe(true);
  expect(links.some(link => link.getAttribute('href') === '/' + suffix + '#contact')).toBe(true);
  for (const link of links.filter(link => link.pathname.startsWith('/try-'))) expect(new URL(link.href).searchParams.get('lang')).toBe(language === 'es' ? 'es' : null);
  catalog.unmount();
  const nav = render(<DemoNav tone="cyan" />);
  expect(nav.container.querySelector('a')).toHaveAttribute('href', '/demos' + suffix);
});
