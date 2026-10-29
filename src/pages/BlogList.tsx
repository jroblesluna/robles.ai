// AI News Hub: newsroom masthead, sticky section bar, front-page layout
// (lead story + most recent) and a calm latest-news grid.

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearch as useLocationSearch } from 'wouter';
import { archivePage, normalizeLanguage } from '@shared/seoPolicy';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Newspaper, X } from 'lucide-react';
import { listPostPath } from '@/lib/blogModal';
import { BlogSearchInput, BlogSearchResults } from '@/components/BlogSearch';
import BlogModal from '@/components/BlogModal';
import ErrorState from '@/components/state/ErrorState';
import { useBlogModalRouting } from '@/hooks/useBlogModalRouting';
import { useSearch } from '@/hooks/useSearch';
import { recordVisit } from '@/lib/historyTrail';

// Kept small on purpose: page 1 = lead + 5 rail + 6 "more stories".
const PAGE_SIZE = 12;
const DAY_FILTERS = [1, 7, 30] as const;
// Lead story + the "most recent" rail on the front page.
const FEATURED_COUNT = 6;

interface Post {
  slug: string;
  date: string;
  image?: string;
  editorId: number;
  translations: {
    en: { slug?: string; title: string; excerpt: string; content: { heading: string; body: string }[] };
    es: { slug?: string; title: string; excerpt: string; content: { heading: string; body: string }[] };
  };
}

interface Editor {
  id: number;
  name: string;
  signature: string;
  specialty: string;
  colorPalette: string[];
}

function extractDateTimeFromSlug(slug: string): Date {
  const isoString = slug
    .slice(0, 19)
    .replace(/-/g, ':')
    .replace(/^([\d]{4}):([\d]{2}):([\d]{2}):/, '$1-$2-$3T')
    .replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(isoString);
}

function formatDate(date: Date, language: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** "3 h ago" for the last week, a short date after that — the newsroom convention. */
function formatRelative(date: Date, language: 'en' | 'es'): string {
  const diffMs = date.getTime() - Date.now();
  if (Number.isNaN(diffMs)) return '';
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(language === 'es' ? 'es' : 'en', { numeric: 'auto', style: 'short' });
  if (Math.abs(minutes) < 60) return rtf.format(Math.min(minutes, -1), 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return rtf.format(days, 'day');
  return formatDate(date, language);
}

export default function BlogList() {
  const { t, i18n } = useTranslation();
  const search = useLocationSearch();
  const [, navigate] = useLocation();
  const blogSearch = useSearch();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [page, setPage] = useState(() => archivePage(new URLSearchParams(window.location.search).get('page')));
  const [editorFilter, setEditorFilter] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get('editorId')) || null);
  const [dayFilter, setDayFilter] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get('days')) || null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const typeScrollRef = useRef<HTMLDivElement>(null);
  const contentTopRef = useRef<HTMLDivElement>(null);
  const searchActive = blogSearch.isSearchActive;

  // Blog modal: History-owned routing over the currently-fetched posts.
  const { openIndex, openAt, goToIndex, close } = useBlogModalRouting(posts);
  // Scroll position + originating card, captured before opening so we can
  // restore the list scroll and return focus on close (Req 16.6, 24.3).
  const savedScrollRef = useRef(0);
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const openedFromIndexRef = useRef<number | null>(null);

  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    // A modal's article URL must not reset the archive state it overlays.
    if (window.location.pathname !== '/blog') return;
    recordVisit(t('blogHub.title'));
    const query = new URLSearchParams(search);
    setPage(archivePage(query.get('page')));
    setEditorFilter(Number(query.get('editorId')) || null);
    setDayFilter(Number(query.get('days')) || null);
  }, [search]);

  function archiveHref(nextPage: number, editor = editorFilter, days = dayFilter) {
    const query = new URLSearchParams();
    if (lang === 'es') query.set('lang', 'es');
    if (nextPage > 1) query.set('page', String(nextPage));
    if (editor) query.set('editorId', String(editor));
    if (days) query.set('days', String(days));
    return '/blog' + (query.size ? `?${query}` : '');
  }

  function handleCardClick(e: React.MouseEvent<HTMLAnchorElement>, cardIndex: number) {
    // Preserve middle-click / cmd/ctrl/shift-click (open the real page / new tab).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    savedScrollRef.current = window.scrollY;
    openedFromIndexRef.current = cardIndex;
    openAt(cardIndex);
  }

  function handleModalClose() {
    const fromIndex = openedFromIndexRef.current;
    close();
    // Restore the list scroll position and return focus to the originating card.
    window.scrollTo(0, savedScrollRef.current);
    if (fromIndex !== null) {
      requestAnimationFrame(() => cardRefs.current[fromIndex]?.focus());
    }
    openedFromIndexRef.current = null;
  }

  useEffect(() => {
    fetch('/api/editors')
      .then((res) => res.json())
      .then((data) => setEditors(data.editors));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({ page: page.toString(), limit: PAGE_SIZE.toString() });
    if (editorFilter) query.append('editorId', editorFilter.toString());
    if (dayFilter) query.append('days', dayFilter.toString());

    setLoading(true);
    setFetchError(false);
    fetch(`/api/blog?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPosts(data.posts);
        setTotal(data.total);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [page, editorFilter, dayFilter, reloadKey]);

  function handleEditorFilterChange(id: number | null) {
    if (editorFilter === id) return;
    navigate(archiveHref(1, id));
  }

  function handleDayFilterChange(days: number | null) {
    if (dayFilter === days) return;
    navigate(archiveHref(1, editorFilter, days));
  }

  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) return;
    navigate(archiveHref(next));
    // Bring the toolbar back into view (not the page top: the masthead is tall),
    // and only when the reader has scrolled past it.
    const toolbar = contentTopRef.current;
    if (toolbar) {
      const offset = toolbar.getBoundingClientRect().top + window.scrollY - 140;
      if (window.scrollY > offset) window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }

  function onPageLinkClick(event: React.MouseEvent<HTMLAnchorElement>, next: number) {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      goToPage(next);
    }
  }

  function scrollTypeFilter(direction: -1 | 1) {
    typeScrollRef.current?.scrollBy({ left: direction * 240, behavior: 'smooth' });
  }

  const activeEditor = editors.find((e) => e.id === editorFilter);
  const dayFilterLabels: Record<number, string> = {
    1: t('blogHub.day'),
    7: t('blogHub.week'),
    30: t('blogHub.month'),
  };

  // Front-page layout only on the first page, when there's enough to fill it.
  const showFeatured = page === 1 && posts.length >= FEATURED_COUNT;
  const featured = showFeatured ? posts.slice(0, FEATURED_COUNT) : [];
  const gridStart = showFeatured ? FEATURED_COUNT : 0;
  const latestUpdate = page === 1 && !editorFilter && !dayFilter && posts[0]
    ? formatRelative(extractDateTimeFromSlug(posts[0].slug), lang)
    : '';

  function postView(post: Post) {
    const translation = post.translations[lang] || post.translations.en;
    const date = extractDateTimeFromSlug(post.slug);
    const editor = editors.find((e) => e.id === post.editorId);
    return { translation, editor, when: formatRelative(date, lang), iso: Number.isNaN(date.getTime()) ? undefined : date.toISOString() };
  }

  // Every card stays a real anchor so middle/cmd-click opens the full page in
  // a new tab; plain left-click is intercepted to open the in-page modal
  // (Req 11.1, 12.1).
  function cardLinkProps(post: Post, cardIndex: number) {
    return {
      href: listPostPath(post, lang),
      ref: (el: HTMLAnchorElement | null) => {
        cardRefs.current[cardIndex] = el;
      },
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => handleCardClick(e, cardIndex),
    };
  }

  function renderLeadStory(post: Post) {
    const { translation, editor, when, iso } = postView(post);
    return (
      <a
        {...cardLinkProps(post, 0)}
        className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-2xl shadow-blue-950/20 md:p-10 lg:min-h-[560px]"
      >
        {/* Unified navy/blue cover — no per-editor colors */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(147,197,253,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,.35) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />

        <div className="relative">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="rounded-full bg-blue-500 px-3 py-1 text-white">{t('blogHub.topStory')}</span>
            {editor && <span className="text-blue-200">{editor.specialty}</span>}
          </div>
          <h2 className="max-w-3xl text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-[2.75rem]">
            {translation.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 line-clamp-3 md:text-lg">
            {translation.excerpt}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              {editor && (
                <img
                  src={`/avatars/${editor.id}-headshot.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                />
              )}
              {editor && <span className="font-medium text-white">{editor.name}</span>}
              {editor && <span aria-hidden className="h-1 w-1 rounded-full bg-slate-500" />}
              <time dateTime={iso}>{when}</time>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              {t('blogHub.readStory')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </a>
    );
  }

  function renderRailStory(post: Post, cardIndex: number, rank: number) {
    const { translation, editor, when, iso } = postView(post);
    return (
      <li key={post.slug} className="border-t border-slate-200 first:border-t-0">
        <a {...cardLinkProps(post, cardIndex)} className="group flex gap-4 rounded-xl py-5 first:pt-0">
          <span aria-hidden className="w-7 shrink-0 text-2xl font-bold tabular-nums leading-none text-slate-200 transition-colors group-hover:text-blue-600">
            {String(rank).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            {editor && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">{editor.specialty}</p>
            )}
            <h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-3 transition-colors group-hover:text-blue-700">
              {translation.title}
            </h3>
            <time dateTime={iso} className="mt-2 block text-xs text-slate-500">{when}</time>
          </div>
        </a>
      </li>
    );
  }

  function renderGridCard(post: Post, cardIndex: number) {
    const { translation, editor, when, iso } = postView(post);
    return (
      <a
        key={post.slug}
        {...cardLinkProps(post, cardIndex)}
        className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
      >
        <div className="mb-4 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="truncate text-blue-600">{editor?.specialty ?? ''}</span>
          <time dateTime={iso} className="shrink-0 font-medium normal-case tracking-normal text-slate-400">{when}</time>
        </div>
        <h2 className="text-lg font-semibold leading-snug text-slate-900 line-clamp-3 transition-colors group-hover:text-blue-700">
          {translation.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-2">
          {translation.excerpt}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-6">
          {editor && (
            <>
              <img
                src={`/avatars/${editor.id}-headshot.webp`}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-7 w-7 rounded-full object-cover ring-2 ring-white"
              />
              <span className="truncate text-xs font-medium text-slate-600">{editor.name}</span>
            </>
          )}
          <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </div>
      </a>
    );
  }

  // Compact numbered pagination: 1 … p-1 p p+1 … last
  const pageNumbers: Array<number | 'gap'> = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) pageNumbers.push(n);
    else if (pageNumbers[pageNumbers.length - 1] !== 'gap') pageNumbers.push('gap');
  }

  const pagerButtonClass =
    'tap-target inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-40';

  function renderPrevLink(showLabel: boolean) {
    return (
      <a
        href={page > 1 ? archiveHref(page - 1) : undefined}
        aria-disabled={page <= 1}
        aria-label={showLabel ? undefined : t('blogHub.prev')}
        tabIndex={page <= 1 ? -1 : undefined}
        onClick={(e) => onPageLinkClick(e, page - 1)}
        className={pagerButtonClass}
      >
        <ChevronLeft className="h-4 w-4" />
        {showLabel && <span>{t('blogHub.prev')}</span>}
      </a>
    );
  }

  function renderNextLink(showLabel: boolean) {
    return (
      <a
        href={page < totalPages ? archiveHref(page + 1) : undefined}
        aria-disabled={page >= totalPages}
        aria-label={showLabel ? undefined : t('blogHub.next')}
        tabIndex={page >= totalPages ? -1 : undefined}
        onClick={(e) => onPageLinkClick(e, page + 1)}
        className={pagerButtonClass}
      >
        {showLabel && <span>{t('blogHub.next')}</span>}
        <ChevronRight className="h-4 w-4" />
      </a>
    );
  }

  const tabClass = (active: boolean) =>
    `relative flex h-12 flex-shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors ${
      active ? 'text-slate-900 after:bg-blue-600' : 'text-slate-500 after:bg-transparent hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Masthead ── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0b1a3d] to-blue-950" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(147,197,253,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div aria-hidden className="absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-600/25 blur-3xl" />

        <div className="container relative mx-auto px-4 pb-12 pt-12 sm:px-6 md:pb-14 md:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              {t('blogHub.eyebrow')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">{t('blogHub.title')}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
              {t('blogHub.subtitle')}
            </p>

            <BlogSearchInput search={blogSearch} className="mx-auto mt-8 max-w-2xl text-left" />

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              {total > 0 && !editorFilter && !dayFilter && (
                <li className="tabular-nums">{t('blogHub.statArticles', { n: total.toLocaleString(lang) })}</li>
              )}
              <li>{t('blogHub.statEditors')}</li>
              <li>{latestUpdate ? t('blogHub.statUpdated', { time: latestUpdate }) : t('blogHub.statHourly')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Sticky section bar ── */}
      {!searchActive && (
        <nav
          aria-label={t('blogHub.sectionsLabel')}
          className="sticky top-[var(--header-h)] z-30 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75"
        >
          <div className="container mx-auto flex items-center gap-1 px-4 sm:px-6">
            <button
              onClick={() => scrollTypeFilter(-1)}
              className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:flex"
              aria-label={t('blogHub.scrollPrev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative min-w-0 flex-1">
              <div
                ref={typeScrollRef}
                className="flex items-center overflow-x-auto scroll-smooth pr-10 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  onClick={() => handleEditorFilterChange(null)}
                  aria-current={editorFilter === null ? 'true' : undefined}
                  className={tabClass(editorFilter === null)}
                >
                  {t('blogHub.allSections')}
                </button>
                {editors.map((editor) => (
                  <button
                    key={editor.id}
                    onClick={() => handleEditorFilterChange(editor.id)}
                    aria-current={editorFilter === editor.id ? 'true' : undefined}
                    className={tabClass(editorFilter === editor.id)}
                  >
                    {editor.specialty}
                  </button>
                ))}
              </div>
              <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 top-0 w-12 bg-gradient-to-l from-white to-transparent" />
            </div>
            <button
              onClick={() => scrollTypeFilter(1)}
              className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:flex"
              aria-label={t('blogHub.scrollNext')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      <div className="container mx-auto px-4 py-10 sm:px-6 md:py-12">
        {searchActive ? (
          <BlogSearchResults search={blogSearch} />
        ) : (
          <>
            {/* ── Section header ── */}
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {activeEditor && (
                  <img
                    src={`/avatars/${activeEditor.id}-headshot.webp`}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    {activeEditor ? activeEditor.specialty : t('blogHub.latest')}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                    {activeEditor && <span>{t('blogHub.by', { name: activeEditor.name })}</span>}
                    {activeEditor && total > 0 && <span aria-hidden>·</span>}
                    {total > 0 && <span className="tabular-nums">{t('blogHub.storiesCount', { n: total.toLocaleString(lang) })}</span>}
                    {activeEditor && (
                      <button
                        onClick={() => handleEditorFilterChange(null)}
                        className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-300/70 hover:text-slate-900"
                      >
                        <X className="h-3 w-3" />
                        {t('blogHub.clearFilter')}
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Toolbar: date range + pagination, above the stories ── */}
            <div
              ref={contentTopRef}
              className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5"
            >
              <div
                role="group"
                aria-label={t('blogHub.dateRangeLabel')}
                className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
              >
                {([null, ...DAY_FILTERS] as Array<number | null>).map((days) => {
                  const active = dayFilter === days;
                  return (
                    <button
                      key={days ?? 'all'}
                      onClick={() => handleDayFilterChange(days)}
                      aria-pressed={active}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {days === null ? t('blogHub.anyTime') : dayFilterLabels[days]}
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav aria-label={t('blogHub.pagination')} className="flex items-center gap-1.5">
                  {renderPrevLink(false)}
                  {/* Numbered on tablet/desktop, "2 / 67" on phones */}
                  <span className="px-2 text-sm font-medium tabular-nums text-slate-600 sm:hidden">
                    {page} / {totalPages}
                  </span>
                  {/* Wrapper carries the breakpoint: .tap-target sets its own display */}
                  <span className="hidden items-center gap-1.5 sm:flex">
                  {pageNumbers.map((n, i) =>
                    n === 'gap' ? (
                      <span key={`gap-${i}`} aria-hidden className="px-1 text-slate-400">…</span>
                    ) : (
                      <a
                        key={n}
                        href={archiveHref(n)}
                        aria-current={n === page ? 'page' : undefined}
                        aria-label={t('blogHub.pageOf', { page: n, total: totalPages })}
                        onClick={(e) => onPageLinkClick(e, n)}
                        className={`tap-target min-w-[44px] rounded-xl text-sm font-semibold tabular-nums transition ${
                          n === page
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {n}
                      </a>
                    ),
                  )}
                  </span>
                  {renderNextLink(false)}
                </nav>
              )}
            </div>

            {/* Fetch error — offer a retry (Req 19.3) */}
            {!loading && fetchError && (
              <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
            )}

            {/* Loading skeletons (initial load) */}
            {posts.length === 0 && loading && (
              <div aria-hidden>
                <div className="mb-12 grid gap-8 lg:grid-cols-3">
                  <div className="h-[420px] animate-pulse rounded-3xl bg-slate-200 lg:col-span-2 lg:h-[560px]" />
                  <div className="space-y-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex animate-pulse gap-4">
                        <div className="h-6 w-7 rounded bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-20 rounded bg-slate-200" />
                          <div className="h-4 w-full rounded bg-slate-200" />
                          <div className="h-4 w-2/3 rounded bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="mb-5 h-3 w-24 rounded bg-slate-200" />
                      <div className="mb-2 h-5 w-full rounded bg-slate-200" />
                      <div className="mb-5 h-5 w-3/4 rounded bg-slate-200" />
                      <div className="mb-2 h-3 w-full rounded bg-slate-100" />
                      <div className="h-3 w-2/3 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Front page: lead story + most recent rail ── */}
            {showFeatured && (
              <div className={`mb-14 grid gap-8 lg:grid-cols-3 lg:gap-10 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
                <div className="lg:col-span-2">{renderLeadStory(featured[0])}</div>
                <aside aria-labelledby="blog-most-recent">
                  <h2 id="blog-most-recent" className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span className="h-px w-6 bg-blue-600" />
                    {t('blogHub.mustRead')}
                  </h2>
                  <ol>
                    {featured.slice(1).map((post, i) => renderRailStory(post, i + 1, i + 1))}
                  </ol>
                </aside>
              </div>
            )}

            {/* ── Latest grid ── */}
            {posts.length > gridStart && (
              <>
                {showFeatured && (
                  <h2 className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span className="h-px w-6 bg-blue-600" />
                    {t('blogHub.moreStories')}
                    <span className="h-px flex-1 bg-slate-200" />
                  </h2>
                )}
                <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
                  {posts.slice(gridStart).map((post, i) => renderGridCard(post, gridStart + i))}
                </div>
              </>
            )}

            {/* No results for the current filters */}
            {!loading && !fetchError && posts.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center">
                <Newspaper className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-600">{t('blogHub.empty')}</p>
                {(editorFilter || dayFilter) && (
                  <a
                    href="/blog"
                    onClick={(e) => { e.preventDefault(); navigate(lang === 'es' ? '/blog?lang=es' : '/blog'); }}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    {t('blogHub.resetFilters')}
                  </a>
                )}
              </div>
            )}

            {/* ── Compact pager at the end, so a reader can keep going ── */}
            {totalPages > 1 && posts.length > 0 && (
              <nav aria-label={t('blogHub.pagination')} className="mt-12 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
                {renderPrevLink(true)}
                <span className="text-sm tabular-nums text-slate-500">
                  {t('blogHub.pageOf', { page, total: totalPages })}
                </span>
                {renderNextLink(true)}
              </nav>
            )}
          </>
        )}
      </div>

      {openIndex !== null && (
        <BlogModal
          posts={posts}
          index={openIndex}
          onIndexChange={goToIndex}
          onClose={handleModalClose}
          editors={editors}
        />
      )}
    </div>
  );
}
