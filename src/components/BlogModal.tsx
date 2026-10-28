import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, ExternalLink, Link2, X } from 'lucide-react';
import { BlogArticle, type BlogArticleBlock } from '@/components/BlogArticle';
import { applyPageMetadata, snapshotPageMetadata } from '@/lib/pageMetadata';
import { buildBlogMeta, buildBlogJsonLd } from '@shared/seoMetadata';
import type { BlogPostData } from '../../server/seo/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  type BlogListPost,
  type BlogModalLang,
  canGoNext,
  canGoPrev,
  listPostAbsoluteUrl,
  blogPath,
  absoluteUrl,
  type BlogModalPost,
  listPostPath,
} from '@/lib/blogModal';

export interface BlogModalProps {
  posts: BlogListPost[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  fetchArticle?: (slug: string) => Promise<FullPost | null>;
  editors?: BlogModalEditor[];
}

export interface BlogModalEditor {
  id: number;
  name: string;
  signature: string;
}

export interface FullPost {
  slug: string;
  editorId?: number;
  date?: string;
  image?: string;
  dateModified?: string;
  categories?: string[];
  keywords?: string[];
  sources?: { title: string; url: string; source: string }[];
  stats?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  translations: {
    en: { slug?: string; title: string; excerpt: string; content: BlogArticleBlock[] };
    es: { slug?: string; title: string; excerpt: string; content: BlogArticleBlock[] };
  };
}

const HEADING_ID = 'blog-modal-title';

function extractDateTimeFromSlug(slug: string): Date {
  const s = slug
    .slice(0, 19)
    .replace(/-/g, ':')
    .replace(/^(\d{4}):(\d{2}):(\d{2}):/, '$1-$2-$3T')
    .replace(/:(\d{2}):(\d{2})$/, ':$1:$2Z');
  return new Date(s);
}

function formatDateWithTimeZone(date: Date, language: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
}

async function defaultFetchArticle(slug: string): Promise<FullPost | null> {
  const res = await fetch(`/api/blog/${slug}`);
  if (!res.ok) return null;
  return (await res.json()) as FullPost;
}

export function BlogModal({
  posts, index, onIndexChange, onClose,
  fetchArticle = defaultFetchArticle,
  editors = [],
}: BlogModalProps) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const lang = (i18n.language === 'es' ? 'es' : 'en') as BlogModalLang;

  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef   = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  // In-memory post cache: slug → FullPost. Persists for the modal's lifetime,
  // no re-render on write. This is the key to eliminating the height blink:
  // if the target post is already cached we render it immediately.
  const cacheRef = useRef<Map<string, FullPost>>(new Map());

  // Navigation direction: +1 = going forward (swipe left), -1 = going back.
  const directionRef = useRef<number>(0);
  // Expose direction as state only for the animation key — avoids extra renders.
  const [direction, setDirection] = useState<number>(0);

  const [full,         setFull        ] = useState<FullPost | null>(() => null);
  const [loading,      setLoading     ] = useState(false);
  const [articleError, setArticleError] = useState(false);

  // Touch-swipe tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartTRef = useRef<number>(0);

  // Reading progress is written straight to the bar's style (no re-render per
  // scroll event); only the "title in toolbar" threshold is state.
  const progressRef = useRef<HTMLDivElement>(null);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);

  const [copied,    setCopied   ] = useState(false);
  const [copyFailed,setCopyFailed] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const post = posts[index];

  const prevEnabled = canGoPrev(index, posts.length);
  const nextEnabled = canGoNext(index, posts.length);

  // If we already have this post cached, use it immediately; else null (shows
  // previous content fading while the new one loads).
  const cachedFull = post ? (cacheRef.current.get(post.slug) ?? null) : null;
  const displayFull = full ?? cachedFull;

  const listTitle      = post ? (post.translations[lang] ?? post.translations.en).title : '';
  const listExcerpt    = post ? (post.translations[lang] ?? post.translations.en).excerpt : '';
  const fullTranslation = displayFull ? (displayFull.translations[lang] ?? displayFull.translations.en) : undefined;
  const title    = fullTranslation?.title ?? listTitle;
  const excerpt  = fullTranslation?.excerpt || listExcerpt;
  const content: BlogArticleBlock[] = fullTranslation?.content ?? [];

  // Metadata
  const editorId = displayFull?.editorId ?? post?.editorId;
  const editor   = editorId != null ? editors.find((e) => e.id === editorId) : undefined;
  const categories = displayFull?.categories ?? [];
  const keywords   = displayFull?.keywords   ?? [];
  const sources    = displayFull?.sources    ?? [];
  const metaReady  = displayFull !== null;
  const postDate   = post ? extractDateTimeFromSlug(post.slug) : null;
  const formattedDate = postDate ? formatDateWithTimeZone(postDate, lang) : '';
  const wordCount = content.reduce(
    (s, b) => s + b.body.split(/\s+/).filter(Boolean).length, 0,
  );
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  useEffect(() => snapshotPageMetadata(), []);
  useEffect(() => {
    if (!displayFull || displayFull.slug !== post?.slug || !displayFull.translations[lang]?.slug) return;
    const article = displayFull as BlogPostData;
    const input = { post: article, lang, slug: article.translations[lang].slug };
    const meta = buildBlogMeta(input);
    meta.jsonLd = buildBlogJsonLd(input, 'Robles.AI');
    applyPageMetadata(meta);
    // A translated modal and a direct article load have the same shareable URL.
    if (window.history.state?.blogModal) {
      const url = new URL(meta.canonicalUrl);
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }
  }, [displayFull, post?.slug, lang]);

  // Prefetch a single slug, storing into the cache (no state update).
  const prefetch = useCallback((slug: string) => {
    if (!slug || cacheRef.current.has(slug)) return;
    // Mark as in-flight to avoid double-fetching (use a sentinel).
    cacheRef.current.set(slug, null as unknown as FullPost);
    fetchArticle(slug).then((data) => {
      if (data) cacheRef.current.set(slug, data);
      else cacheRef.current.delete(slug); // allow retry later
    }).catch(() => cacheRef.current.delete(slug));
  }, [fetchArticle]);

  // Fetch + cache the active post, then adaptively prefetch neighbors.
  useEffect(() => {
    if (!post) return;
    let cancelled = false;

    const slug = post.slug;
    const cached = cacheRef.current.get(slug);

    if (cached && (cached as FullPost).translations) {
      // Already fully cached: render immediately, no loading state.
      setFull(cached);
      setLoading(false);
      setArticleError(false);
    } else {
      // Not cached (or a stale sentinel): fetch it.
      setLoading(true);
      // Don't clear full immediately — keep previous content visible during
      // the fetch so the modal height doesn't jump to the loading skeleton.
      setArticleError(false);
      fetchArticle(slug).then((data) => {
        if (cancelled) return;
        if (data) {
          cacheRef.current.set(slug, data);
          setFull(data);
        } else {
          setArticleError(true);
          setFull(null);
        }
        setLoading(false);
      }).catch(() => {
        if (cancelled) return;
        setArticleError(true);
        setFull(null);
        setLoading(false);
      });
    }

    // Adaptive prefetch: primary direction gets 2 posts, opposite gets 1.
    const dir = directionRef.current;
    if (dir >= 0) {
      // Neutral or forward: prefetch next 2, prev 1.
      if (index + 1 < posts.length) prefetch(posts[index + 1].slug);
      if (index + 2 < posts.length) prefetch(posts[index + 2].slug);
      if (index - 1 >= 0)           prefetch(posts[index - 1].slug);
    } else {
      // Going backward: prefetch prev 2, next 1.
      if (index - 1 >= 0)           prefetch(posts[index - 1].slug);
      if (index - 2 >= 0)           prefetch(posts[index - 2].slug);
      if (index + 1 < posts.length) prefetch(posts[index + 1].slug);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.slug, fetchArticle]);

  // Wrap onIndexChange to record direction and fire the animation.
  const navigate = useCallback((nextIndex: number) => {
    const dir = nextIndex > index ? 1 : -1;
    directionRef.current = dir;
    setDirection(dir);
    onIndexChange(nextIndex);
  }, [index, onIndexChange]);

  // Body-scroll lock (Req 16.4)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc closes + Tab focus trap (Req 16.1, 16.5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) { e.preventDefault(); container.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) { e.preventDefault(); last.focus(); }
      } else if (active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initial focus (Req 16.5)
  useEffect(() => { dialogRef.current?.focus(); }, []);

  // Reset scroll + copy state on index change (Req 15.6)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)';
    setScrolledPastHeader(false);
    setCopied(false);
    setCopyFailed(false);
  }, [index]);

  // Copy-link (Req 14.2–14.4)
  const showFallback = useCallback(() => {
    setCopyFailed(true);
    requestAnimationFrame(() => { fallbackInputRef.current?.focus(); fallbackInputRef.current?.select(); });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!post) return;
    const url = displayFull?.slug === post.slug && displayFull.translations[lang]?.slug ? absoluteUrl(displayFull as BlogModalPost, lang) : listPostAbsoluteUrl(post, undefined, lang);
    try {
      if (!navigator?.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(url);
      setCopyFailed(false); setCopied(true);
    } catch { setCopied(false); showFallback(); }
  }, [post, showFallback, displayFull, lang]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, el.scrollTop / max) : 0})`;
    }
    const past = el.scrollTop > 220;
    setScrolledPastHeader((prev) => (prev === past ? prev : past));
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartTRef.current = Date.now();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const dx  = e.changedTouches[0].clientX - touchStartXRef.current;
    const dt  = Date.now() - touchStartTRef.current;
    const vel = Math.abs(dx) / Math.max(dt, 1);
    touchStartXRef.current = null;
    const threshold = 60; // px
    const minVel    = 0.15; // px/ms
    if (Math.abs(dx) < threshold && vel < minVel) return;
    if (dx < 0 && nextEnabled) navigate(index + 1); // swipe left → next
    if (dx > 0 && prevEnabled) navigate(index - 1); // swipe right → prev
  };

  if (!post) return null;

  const shareUrl  = displayFull?.slug === post.slug && displayFull.translations[lang]?.slug ? absoluteUrl(displayFull as BlogModalPost, lang) : listPostAbsoluteUrl(post, undefined, lang);
  const shareHref = displayFull?.slug === post.slug && displayFull.translations[lang]?.slug ? blogPath(displayFull as BlogModalPost, lang) : listPostPath(post, lang);

  // Dialog entrance animation
  const dialogInitial    = reduceMotion ? { opacity: 0 }           : { opacity: 0, y: 24, scale: 0.98 };
  const dialogAnimate    = reduceMotion ? { opacity: 1 }           : { opacity: 1, y: 0, scale: 1 };
  const dialogExit       = reduceMotion ? { opacity: 0 }           : { opacity: 0, y: 24, scale: 0.98 };
  const dialogTransition = reduceMotion ? { duration: 0.12 }       : { type: 'spring' as const, stiffness: 260, damping: 24 };

  // Article slide variants: horizontal swipe. Under reduced-motion: crossfade only.
  const articleVariants = {
    enter: (dir: number) => ({
      x: reduceMotion ? 0 : (dir > 0 ? '100%' : '-100%'),
      opacity: reduceMotion ? 0 : 1,
    }),
    center: { x: 0, opacity: 1 },
    exit:  (dir: number) => ({
      x: reduceMotion ? 0 : (dir > 0 ? '-100%' : '100%'),
      opacity: reduceMotion ? 0 : 1,
    }),
  };
  const articleTransition = reduceMotion
    ? { opacity: { duration: 0.15 } }
    : { x: { type: 'spring' as const, stiffness: 320, damping: 32 }, opacity: { duration: 0.1 } };

  const nextPost = nextEnabled ? posts[index + 1] : undefined;
  const nextTitle = nextPost ? (nextPost.translations[lang] ?? nextPost.translations.en).title : '';
  const navButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:pointer-events-none disabled:opacity-35';
  const toolButtonClass =
    'tap-target rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900';

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          ref={dialogRef}
          role="dialog" aria-modal="true" aria-labelledby={HEADING_ID}
          tabIndex={-1}
          className="relative flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/40 outline-none sm:h-[min(92vh,1000px)] sm:rounded-2xl"
          initial={dialogInitial} animate={dialogAnimate} exit={dialogExit} transition={dialogTransition}
        >
          {/* ── Toolbar (prev/next · title on scroll · share/close) — fixed ── */}
          <div className="relative flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:px-4">
            <div className="flex shrink-0 items-center rounded-full bg-slate-100 p-0.5">
              <button type="button" onClick={() => navigate(index - 1)} disabled={!prevEnabled}
                className={navButtonClass}
                aria-label={t('blogModal.prev')}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="hidden min-w-[3.5rem] px-1 text-center text-xs font-medium tabular-nums text-slate-500 sm:inline">
                {t('blogModal.position', { current: index + 1, total: posts.length })}
              </span>
              <button type="button" onClick={() => navigate(index + 1)} disabled={!nextEnabled}
                className={navButtonClass}
                aria-label={t('blogModal.next')}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Title echo once the article header scrolls away (decorative) */}
            <p aria-hidden
              className={`min-w-0 flex-1 truncate px-2 text-sm font-semibold text-slate-900 transition-opacity duration-200 ${scrolledPastHeader ? 'opacity-100' : 'opacity-0'}`}>
              {title}
            </p>

            <div className="flex shrink-0 items-center gap-0.5">
              <span className="sr-only" aria-live="polite">{copied ? t('blogModal.copied') : ''}</span>
              {copied && (
                <span className="mr-1 hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
                  <Check className="h-3.5 w-3.5" />{t('blogModal.copied')}
                </span>
              )}
              <button type="button" onClick={handleCopy}
                className={toolButtonClass}
                aria-label={t('blogModal.copyLink')}>
                {copied ? <Check className="h-[18px] w-[18px] text-emerald-600" /> : <Link2 className="h-[18px] w-[18px]" />}
              </button>
              <a href={shareHref} target="_blank" rel="noopener"
                className={toolButtonClass}
                aria-label={t('blogModal.openInNewTab')}>
                <ExternalLink className="h-[18px] w-[18px]" />
              </a>
              <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
              <button type="button" onClick={onClose}
                className={toolButtonClass}
                aria-label={t('blogModal.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Reading progress */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5">
              <div ref={progressRef} className="h-full origin-left bg-blue-600 transition-transform duration-100 ease-out"
                style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>

          {/* Clipboard fallback */}
          {copyFailed && (
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <input id="blog-modal-copy-fallback" ref={fallbackInputRef}
                type="text" readOnly value={shareUrl}
                aria-label={t('blogModal.copyFallbackLabel')}
                className="w-full break-anywhere rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                onFocus={(e) => e.currentTarget.select()} />
            </div>
          )}

          {/* ── Scrollable area with swipe gesture ── */}
          <div
            ref={scrollRef}
            className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain"
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* AnimatePresence wraps ONLY the article (not the toolbar) so the
                swipe slide is confined to the reading region. Key on slug so
                AnimatePresence detects the swap. */}
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={post.slug}
                custom={direction}
                variants={articleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={articleTransition}
              >
                {/* ── Article header ── */}
                <header className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 pb-8 pt-8 sm:px-12 sm:pt-12">
                  <div className="mx-auto max-w-[68ch]">
                    {metaReady && categories.length > 0 && (
                      <div className="mb-5 flex flex-wrap gap-2">
                        {categories.map((cat, i) => (
                          <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    <h1 id={HEADING_ID} className="text-[1.75rem] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
                      {title}
                    </h1>

                    {excerpt && (
                      <p className="mt-4 text-lg leading-relaxed text-slate-600">{excerpt}</p>
                    )}

                    {metaReady && (
                      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex shrink-0 -space-x-3">
                            <img src="/avatars/antonio-robles-headshot.png"
                              alt={t('blogModal.authorName')}
                              loading="lazy" decoding="async"
                              className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
                            {editor && (
                              <img src={`/avatars/${editor.id}-headshot.png`}
                                alt={editor.name}
                                loading="lazy" decoding="async"
                                className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
                            )}
                          </div>
                          <div className="min-w-0 text-sm leading-snug">
                            <p className="text-slate-600">
                              <span className="sr-only">{t('blogModal.publishedBy')} </span>
                              <span className="font-semibold text-slate-900">{t('blogModal.authorName')}</span>
                              {editor && (
                                <>
                                  {' '}<span>{t('blogModal.with')}</span>{' '}
                                  <span className="font-semibold text-slate-900">{editor.name}</span>
                                  <span className="ml-1.5 inline-flex -translate-y-px items-center rounded bg-slate-900 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
                                    {t('blogModal.aiAssistant')}
                                  </span>
                                </>
                              )}
                            </p>
                            {formattedDate && (
                              <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                <time dateTime={postDate && !Number.isNaN(postDate.getTime()) ? postDate.toISOString() : undefined}>{formattedDate}</time>
                              </p>
                            )}
                          </div>
                        </div>
                        {wordCount > 0 && (
                          <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {readingTimeMinutes} {t('blogModal.minRead')}
                            <span aria-hidden className="text-slate-300">·</span>
                            {wordCount} {t('blogModal.words')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </header>

                <div className="px-6 py-10 sm:px-12">
                  <div className="mx-auto max-w-[68ch]">
                    {/* ── Article body ── */}
                    {content.length > 0 ? (
                      <div className={loading ? 'opacity-60 transition-opacity' : ''}>
                        <BlogArticle content={content} size="compact" />
                      </div>
                    ) : articleError ? (
                      <p className="py-8 text-center text-sm text-slate-500">{t('state.error')}</p>
                    ) : (
                      <div className="space-y-3 py-2" aria-live="polite">
                        <span className="sr-only">{t('state.loading')}</span>
                        {[100, 94, 97, 70, 0, 96, 91, 60].map((w, i) => (
                          <div key={i} aria-hidden
                            className={`h-3.5 rounded ${w ? 'animate-pulse bg-slate-100' : ''}`}
                            style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    )}

                    {/* ── Keywords (tags) ── */}
                    {keywords.length > 0 && (
                      <div className="mt-10 border-t border-slate-100 pt-6">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('blogModal.keywords')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {keywords.map((kw, i) => (
                            <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                              #{kw.replace(/\s+/g, '')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Sources ── */}
                    {sources.length > 0 && (
                      <div className="mt-10">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('blogModal.sources')}</h3>
                        <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                          {sources.map((src, i) => (
                            <li key={i}>
                              <a href={src.url} target="_blank" rel="noopener noreferrer"
                                className="group flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-500">
                                  {i + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium leading-snug text-slate-800 break-anywhere group-hover:text-blue-700">{src.title}</span>
                                  <span className="mt-0.5 block text-xs text-slate-500">{src.source}</span>
                                </span>
                                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-600" />
                              </a>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* ── Editorial transparency ── */}
                    {metaReady && (
                      <aside className="mt-10 flex gap-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200/70">
                        <img src={editor ? `/avatars/${editor.id}-headshot.png` : '/avatars/antonio-robles-headshot.png'}
                          alt="" loading="lazy" decoding="async"
                          className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('blogModal.aboutEditor')}</p>
                          {editor && (
                            <q className="mt-1.5 block text-sm font-medium italic text-slate-800">{editor.signature}</q>
                          )}
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t('blogModal.aiDisclosure')}</p>
                        </div>
                      </aside>
                    )}

                    {/* ── Up next ── */}
                    {nextPost && (
                      <button type="button" onClick={() => navigate(index + 1)}
                        className="group mt-6 flex w-full items-center gap-4 rounded-2xl bg-slate-950 p-5 text-left text-white transition hover:bg-blue-950 sm:p-6">
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">{t('blogModal.upNext')}</span>
                          <span className="mt-1.5 block text-base font-semibold leading-snug line-clamp-2 sm:text-lg">{nextTitle}</span>
                        </span>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition group-hover:translate-x-0.5 group-hover:bg-blue-600">
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      </button>
                    )}
                    {!nextPost && prevEnabled && (
                      <button type="button" onClick={() => navigate(index - 1)}
                        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700">
                        <ArrowLeft className="h-4 w-4" />{t('blogModal.previousStory')}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BlogModal;
