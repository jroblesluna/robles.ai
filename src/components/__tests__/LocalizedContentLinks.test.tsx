import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import en from '@/i18n/locales/en/translation.json';
import es from '@/i18n/locales/es/translation.json';
import Hero from '../Hero';
import Solutions from '../Solutions';
import Landing from '@/pages/Landing';
import DemosCatalog from '../DemosCatalog';
import clips from '@/data/demoClips.json';
import { DemoNav } from '../demo/DemoNav';
import CaseStudies from '../CaseStudies';
import { SavingsCalculator } from '../demo/SavingsCalculator';
import Careers from '@/pages/Careers';
import Team from '../Team';
import QuizResultFull from '../quiz/QuizResultFull';
import { computeQuizResult } from '@/lib/quizData';
vi.mock('@/lib/analytics', () => ({ trackDemoEvent: vi.fn(), trackContactLead: vi.fn(), trackContactClick: vi.fn(), trackQuizLead: vi.fn() }));
// The landing now embeds the contact form; Radix (checkbox) measures itself with ResizeObserver.
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
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
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: any) {}
    observe() { this.callback([{ isIntersecting: true, intersectionRatio: 1 }]); }
    disconnect() {}
  });
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

it.each(['en', 'es'] as const)('shares %s posters and on-demand videos across home and lab', language => {
  locale.language = language; locale.reduced = false;
  const copy = language === 'es' ? es : en;
  const home = render(<DemosCatalog variant="home" />);
  const posters = Array.from(home.container.querySelectorAll('img')).map(img => img.getAttribute('src'));
  expect(posters).toHaveLength(copy.demosCatalog.items.filter(item => item.status === 'live').length);
  expect(screen.getAllByText(copy.demosCatalog.videoPreview.play)).toHaveLength(posters.length);
  expect(document.querySelector('video[src], source, [role="dialog"]')).toBeNull();
  home.unmount();
  const lab = render(<DemosCatalog />);
  const liveLabPosters = Array.from(lab.container.querySelectorAll('[data-preview-id]')).filter(card => !card.querySelector('[data-demo-status="soon"]')).map(card => card.querySelector('img')!.getAttribute('src'));
  expect(posters).toEqual(liveLabPosters);
  expect(screen.getAllByText(copy.demosCatalog.videoPreview.play)).toHaveLength(13);
  expect(lab.container.querySelectorAll('[data-demo-status="soon"]')).toHaveLength(3);
  expect(Array.from(lab.container.querySelectorAll('[data-demo-status]')).map(badge => badge.textContent)).not.toContain(copy.demosCatalog.badge_live);
  expect(lab.container.textContent).not.toMatch(/AI-generated|generad[oa] con IA|Illustrative overlay|clip ilustrativo|illustrative clip/i);
});

it.each(['en', 'es'] as const)('shows responsive posters and accessible %s playback outside the demo link', language => {
  locale.language = language; locale.reduced = false;
  const copy = language === 'es' ? es : en;
  const { container } = render(<DemosCatalog variant="home" />);
  const card = container.querySelector('[data-preview-id="emotion"]')!;
  const image = card.querySelector('img')!;
  expect(image).toHaveAttribute('srcset', expect.stringContaining('960w'));
  const item = copy.demosCatalog.items.find(item => item.id === 'emotion')!;
  const button = within(card as HTMLElement).getByRole('button', { name: `${copy.demosCatalog.videoPreview.play}: ${item.title}` });
  expect(button).toBeEnabled();expect(button.closest('a')).toBeNull();
  fireEvent.click(button);
  expect(card.querySelector('video')).toHaveAttribute('src', clips.emotion.src);
  expect(button).toHaveAttribute('aria-pressed', 'true');
  fireEvent.ended(card.querySelector('video')!);
  expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(card.querySelector('a')).toHaveAttribute('href', '/try-emotion' + (language === 'es' ? '?lang=es' : ''));
});

it.each(['en', 'es'] as const)('provides on-demand finite video and distinct localized controls for ALL 13 %s cards', language => {
  locale.language = language; locale.reduced = false;
  const copy = language === 'es' ? es : en;
  const { container } = render(<DemosCatalog />);
  const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-preview-id]'));
  expect(cards).toHaveLength(13);
  const sources = new Set<string>();
  for (const card of cards) {
    const id = card.dataset.previewId!;
    const item = copy.demosCatalog.items.find(item => item.id === id)!;
    const media = clips[id as keyof typeof clips];
    const image = card.querySelector('img')!, video = card.querySelector('video')!;
    sources.add(image.getAttribute('src')!);
    expect(image).toHaveAttribute('src', media.poster);
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '960');
    expect(video).not.toHaveAttribute('src');
    const button = within(card).getByRole('button', { name: `${copy.demosCatalog.videoPreview.play}: ${item.title}` });
    expect(button.closest('a')).toBeNull();
    fireEvent.click(button);
    expect(video).toHaveAttribute('src', media.src);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);fireEvent.ended(video);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(video).not.toHaveAttribute('loop');
    expect(card.querySelector('a')!.getAttribute('href')).toContain(language === 'es' ? '?lang=es' : '/');
    expect(card.textContent).not.toContain('demosCatalog.videoPreview.');
    if (item.status === 'soon') expect(card.textContent).toContain(copy.demosCatalog.badge_soon);
    else expect(card.querySelector('[data-demo-status]')).toBeNull();
  }
  expect(sources.size).toBe(13);
});

it('keeps all 13 posters static with explicit opt-in controls for reduced motion', () => {
  locale.language = 'es'; locale.reduced = true;
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  const { container } = render(<DemosCatalog />);
  expect(container.querySelectorAll('[data-preview-id] img')).toHaveLength(13);
  for (const card of container.querySelectorAll('[data-preview-id]')) fireEvent.mouseEnter(card);
  expect(container.querySelector('video[src]')).toBeNull();
  expect(container.querySelectorAll('[data-preview-id] button[aria-pressed="false"]')).toHaveLength(13);
  expect(container.querySelector('.demo-scan, .emotion-scan')).toBeNull();
});

it.each(['en', 'es'] as const)('requests ALL 13 %s card videos on desktop hover without navigating', language => {
  locale.language = language; locale.reduced = false;
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  const { container } = render(<DemosCatalog />);
  for (const card of Array.from(container.querySelectorAll<HTMLElement>('[data-preview-id]'))) {
    const href = card.querySelector('a')!.getAttribute('href');
    fireEvent.mouseEnter(card);
    expect(card.querySelector('button')).toHaveAttribute('aria-pressed', 'true');
    expect(card.querySelector('video')).toHaveAttribute('src');
    fireEvent.mouseLeave(card);
    expect(card.querySelector('button')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.mouseEnter(card);
    expect(card.querySelector('button')).toHaveAttribute('aria-pressed', 'true');
    expect(card.querySelector('a')).toHaveAttribute('href', href!);
  }
});
