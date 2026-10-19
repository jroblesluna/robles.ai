import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
const locale = vi.hoisted(() => ({ language: 'es' as 'en' | 'es', reduced: true }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  i18n: { language: locale.language, resolvedLanguage: locale.language },
  t: (key: string) => key.split('.').reduce<any>((value, part) => value?.[part], locale.language === 'es' ? es : en) ?? key,
}) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => locale.reduced }));
vi.mock('../ParticleBackground', () => ({ default: () => null }));
// Animation/layout is outside these link-contract tests; retain native interactive elements.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const tags = new Map();
  return {
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => locale.reduced,
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
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); locale.reduced = true; vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it.each(['en', 'es'] as const)('preserves %s across the enterprise Hero and landing diagnosis CTA', language => {
  locale.language = language;
  const suffix = language === 'es' ? '?lang=es' : '';
  const { unmount } = render(<Hero />);
  expect(screen.getByRole('link', { name: language === 'es' ? es.hero.cta2 : en.hero.cta2 })).toHaveAttribute('href', '/blog' + suffix);
  expect(screen.getByRole('link', { name: language === 'es' ? es.hero.cta3 : en.hero.cta3 })).toHaveAttribute('href', '/get-started' + suffix);
  expect(screen.getByRole('link', { name: language === 'es' ? es.hero.diagnosisCta : en.hero.diagnosisCta })).toHaveAttribute('href', '/diagnostico-ia' + suffix);
  expect(screen.getByRole('link', { name: language === 'es' ? es.hero.demosCta : en.hero.demosCta })).toHaveAttribute('href', '/demos' + suffix);
  expect(document.querySelector('#hero img')).toBeNull();
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

it('keeps the enterprise headline and actions stable during reading', () => {
  locale.language = 'en'; vi.useFakeTimers();
  const { container } = render(<Hero />);
  const headline = screen.getByRole('heading', { level: 1 });
  act(() => { vi.advanceTimersByTime(30000); });
  expect(screen.getByRole('heading', { level: 1 })).toBe(headline);
  expect(headline).toHaveTextContent(en.hero.title);
  expect(container.querySelector('canvas, img')).toBeNull();
  expect(screen.getByRole('link', { name: en.hero.cta3 })).toHaveAttribute('href', '/get-started');
});

it('keeps a case selected during reading and supports explicit industry selection', () => {
  locale.language = 'en'; vi.useFakeTimers();
  render(<CaseStudies />);
  const group = screen.getByRole('group', { name: en.caseStudies.eyebrow });
  const buttons = within(group).getAllByRole('button');
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  act(() => { vi.advanceTimersByTime(20000); });
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(buttons[1]);
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
  act(() => { vi.advanceTimersByTime(20000); });
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
});

it('advances an explicitly started preview even while the pointer is inside the section, and stops on manual selection', () => {
  locale.language = 'en'; locale.reduced = false; vi.useFakeTimers();
  const { container } = render(<Solutions />);
  const group = screen.getByRole('group', { name: en.solutions.title });
  const options = within(group).getAllByRole('button', { pressed: false });
  fireEvent.mouseEnter(container.querySelector('#solutions')!);
  fireEvent.click(screen.getByRole('button', { name: en.solutions.startPreview }));
  act(() => { vi.advanceTimersByTime(7000); });
  expect(options[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(options[1]);
  act(() => { vi.advanceTimersByTime(21000); });
  expect(options[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: en.solutions.startPreview })).toHaveAttribute('aria-pressed', 'false');
});

it('loads only the requested solution video inline and removes it when selecting another solution', () => {
  locale.language = 'en';
  const { container } = render(<Solutions />);
  expect(container.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: en.solutions.items[0].solutionCta })[0]);
  expect(container.querySelectorAll('iframe')).toHaveLength(1);
  expect(container.querySelector('iframe')).toHaveAttribute('title', en.solutions.items[0].title);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const group = screen.getByRole('group', { name: en.solutions.title });
  fireEvent.click(within(group).getByRole('button', { name: /Computer Vision Systems/ }));
  expect(container.querySelector('iframe')).toBeNull();
});

it('respects reduced motion for automatic solution rotation', () => {
  locale.language = 'en'; locale.reduced = true;
  render(<Solutions />);
  expect(screen.getByRole('button', { name: en.solutions.startPreview })).toBeDisabled();
});

it('decodes case headings and metadata once, keeps escaped markup inert and restores document styles and focus', async () => {
  locale.language = 'en';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  document.documentElement.style.overflow = 'auto'; document.body.style.overflow = 'clip';
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ 'smart-city': { en: '<h2>Data &amp; systems</h2><p class="meta">Client: Research &amp; Development | Duration: Example<br/>Technologies: Python</p><h3>Results &amp; Impact</h3><p>&lt;script&gt;example&lt;/script&gt;</p><h3>Literal &amp;amp;</h3><p>Fixture</p>' } }) })));
  render(<CaseStudies />);
  const opener = screen.getByRole('button', { name: en.caseStudies.readMore });
  opener.focus(); fireEvent.click(opener);
  const dialog = screen.getByRole('dialog');
  await within(dialog).findByRole('heading', { name: 'Results & Impact' });
  expect(within(dialog).getByRole('heading', { name: 'Data & systems' })).toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: 'Literal &amp;' })).toBeInTheDocument();
  expect(within(dialog).getByText('Research & Development')).toBeInTheDocument();
  expect(dialog.querySelector('script')).toBeNull();
  expect(dialog.querySelector('[data-case-scroll]')).toHaveClass('overscroll-contain', 'min-h-0');
  expect(document.body.style.position).toBe('fixed');
  expect(document.documentElement.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.documentElement.style.overflow).toBe('auto');
  expect(document.body.style.overflow).toBe('clip');
  expect(opener).toHaveFocus();
  document.documentElement.style.overflow = ''; document.body.style.overflow = '';
});

it.each(['en', 'es'] as const)('uses the same localized posters on home and lab and loads a %s clip only on request', async language => {
  locale.language = language;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const copy = language === 'es' ? es : en;
  const home = render(<DemosCatalog limit={8} />);
  const posters = Array.from(home.container.querySelectorAll('img')).map(img => img.getAttribute('src'));
  expect(posters).toHaveLength(8);
  expect(document.querySelector('video, source')).toBeNull();
  const trigger = screen.getByRole('button', { name: copy.demosCatalog.watchPreview });
  trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelector('video')).toHaveAttribute('preload', 'none');
  expect(dialog.querySelector('source')).toHaveAttribute('src', `/demo-previews/invoice-preview-${language}.mp4`);
  expect(dialog.querySelector('a button')).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: copy.videoModal.close }));
  expect(trigger).toHaveFocus();
  expect(document.querySelector('video')).toBeNull();
  home.unmount();
  const lab = render(<DemosCatalog />);
  const labPosters = Array.from(lab.container.querySelectorAll('img')).map(img => img.getAttribute('src'));
  posters.forEach(poster => expect(labPosters).toContain(poster));
});

it.each(['en', 'es'] as const)('shows the generated photo with accessible %s playback controls outside its demo link', language => {
  locale.language = language; locale.reduced = false; vi.useFakeTimers();
  const copy = language === 'es' ? es : en;
  const { container } = render(<DemosCatalog limit={8} />);
  const image = container.querySelector('img[src*="emotion-portrait"]')!;
  expect(image).toHaveAttribute('srcset', expect.stringContaining('960.webp 960w'));
  const replay = screen.getByRole('button', { name: copy.demosCatalog.emotionPreview.replay });
  expect(replay).toBeDisabled(); fireEvent.load(image); expect(replay).toBeEnabled();
  expect(replay.closest('a')).toBeNull();
  fireEvent.click(replay);
  expect(container.querySelector('.emotion-preview')).toHaveAttribute('data-playing', 'true');
  act(() => { vi.advanceTimersByTime(4000); });
  expect(container.querySelector('.emotion-preview')).toHaveAttribute('data-playing', 'false');
  expect(container.querySelector('a[href^="/try-emotion"]')).toHaveAttribute('href', '/try-emotion' + (language === 'es' ? '?lang=es' : ''));
});
