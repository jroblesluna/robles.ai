import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import en from '@/i18n/locales/en/translation.json';
import es from '@/i18n/locales/es/translation.json';
import Hero from '../Hero';
import Solutions from '../Solutions';
import Landing from '@/pages/Landing';
import DemosCatalog from '../DemosCatalog';
import { DemoNav } from '../demo/DemoNav';
import CaseStudies from '../CaseStudies';
import { SavingsCalculator } from '../demo/SavingsCalculator';
import Careers from '@/pages/Careers';
import Team from '../Team';
import QuizResultFull from '../quiz/QuizResultFull';
import { computeQuizResult } from '@/lib/quizData';
vi.mock('@/lib/analytics', () => ({ trackDemoEvent: vi.fn() }));
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
    useReducedMotion: () => true,
    animate: (_from: number, value: number, options: any) => { options.onUpdate(value); return { stop() {} }; },
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!tags.has(tag)) tags.set(tag, React.forwardRef(({ children, ...props }: any, ref) => {
        const domProps = Object.fromEntries(Object.entries(props).filter(([key]) => !['variants', 'initial', 'animate', 'exit', 'transition', 'custom', 'whileInView', 'whileHover', 'whileTap', 'viewport', 'layout'].includes(key)));
        return React.createElement(tag, { ...domProps, ref }, children);
      }));
      return tags.get(tag);
    } }),
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
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

it.each(['en', 'es'] as const)('localizes %s case-study CTAs in both layouts and the detail viewer', async language => {
  locale.language = language;
  const suffix = language === 'es' ? '?lang=es' : '';
  const copy = language === 'es' ? es : en;
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ 'smart-city': { en: '<h2>Example</h2><h3>Details</h3><p>Fixture detail</p>', es: '<h2>Ejemplo</h2><h3>Detalles</h3><p>Fixture detail</p>' } }) })));
  const { container } = render(<CaseStudies />);
  expect(container.querySelectorAll('a[href^="/diagnostico-ia"]')).toHaveLength(2);
  container.querySelectorAll('a[href^="/diagnostico-ia"]').forEach(link => expect(link).toHaveAttribute('href', '/diagnostico-ia' + suffix));
  fireEvent.click(screen.getByRole('button', { name: copy.caseStudies.readMore }));
  await screen.findByText('Fixture detail');
  expect(container.querySelectorAll('a[href^="/diagnostico-ia"]')).toHaveLength(3);
  container.querySelectorAll('a[href^="/diagnostico-ia"]').forEach(link => expect(link).toHaveAttribute('href', '/diagnostico-ia' + suffix));
});
it.each(['en', 'es'] as const)('localizes %s calculator diagnosis and contact navigation without changing business calculations', async language => {
  locale.language = language;
  const suffix = language === 'es' ? '?lang=es' : '';
  const copy = language === 'es' ? es : en;
  window.history.replaceState(null, '', '/try-forecast' + suffix);
  const target = document.createElement('div'); target.id = 'contact'; target.scrollIntoView = vi.fn(); document.body.appendChild(target);
  const { container } = render(<SavingsCalculator demoId="forecast" />);
  expect(container.querySelector('a[href^="/diagnostico-ia"]')).toHaveAttribute('href', '/diagnostico-ia' + suffix);
  fireEvent.click(screen.getByRole('button', { name: copy.demoBusiness.labels.cta_contact }));
  expect(window.location.pathname + window.location.search + window.location.hash).toBe('/' + suffix + '#contact');
  await new Promise(resolve => setTimeout(resolve, 180));
  expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
  target.remove();
});
it.each(['en', 'es'] as const)('preserves %s through careers, job selection and the quiz report landing link', language => {
  locale.language = language;
  const suffix = language === 'es' ? '?lang=es' : '';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const careers = render(<Careers />);
  const applyLinks = Array.from(careers.container.querySelectorAll<HTMLAnchorElement>('a[href^="/apply"]'));
  expect(applyLinks.length).toBeGreaterThan(0);
  for (const link of applyLinks) {
    expect(new URL(link.href).searchParams.get('lang')).toBe(language === 'es' ? 'es' : null);
    expect(new URL(link.href).searchParams.get('job')).toBeTruthy();
  }
  careers.unmount();
  const team = render(<Team />);
  fireEvent.click(screen.getByRole('button', { name: language === 'es' ? es.team.join : en.team.join }));
  expect(window.location.pathname + window.location.search).toBe('/careers' + suffix);
  team.unmount();
  const quiz = render(<QuizResultFull result={computeQuizResult({})} leadName="Test" leadId={null} />);
  expect(quiz.container.querySelector('a[href^="/get-started"]')).toHaveAttribute('href', '/get-started' + suffix);
});

it('exposes native pressed selector buttons and distinct public profile names', () => {
  locale.language = 'en';
  const solutions = render(<Solutions />);
  const group = screen.getByRole('group', { name: en.solutions.title });
  const option = within(group).getByRole('button', { name: /Computer Vision Systems/ });
  expect(option).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(option);
  expect(option).toHaveAttribute('aria-pressed', 'true');
  expect(within(group).getAllByRole('button', { pressed: true })).toHaveLength(1);
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  solutions.unmount();
  render(<Team />);
  expect(screen.getByRole('link', { name: 'LinkedIn: Antonio Robles' })).toHaveAttribute('href', 'https://www.linkedin.com/in/antonio-robles-luna/');
  expect(screen.getByRole('link', { name: 'GitHub: Jaren Ramos' })).toHaveAttribute('href', 'https://github.com/JarenML');
});
