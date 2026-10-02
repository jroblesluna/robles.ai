import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, X } from 'lucide-react';
import { BlogArticle, type BlogArticleBlock } from '@/components/BlogArticle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  type BlogListPost,
  type BlogModalLang,
  canGoNext,
  canGoPrev,
  listPostAbsoluteUrl,
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
  const fullTranslation = displayFull ? (displayFull.translations[lang] ?? displayFull.translations.en) : undefined;
  const title    = fullTranslation?.title ?? listTitle;
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
    const url = listPostAbsoluteUrl(post);
    try {
      if (!navigator?.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(url);
      setCopyFailed(false); setCopied(true);
    } catch { setCopied(false); showFallback(); }
  }, [post, showFallback]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

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

  const shareUrl  = listPostAbsoluteUrl(post);
  const shareHref = listPostPath(post);

  // Dialog entrance animation
  const dialogInitial    = reduceMotion ? { opacity: 0 }           : { opacity: 0, scale: 0.95 };
  const dialogAnimate    = reduceMotion ? { opacity: 1 }           : { opacity: 1, scale: 1    };
  const dialogExit       = reduceMotion ? { opacity: 0 }           : { opacity: 0, scale: 0.95 };
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

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          ref={dialogRef}
          role="dialog" aria-modal="true" aria-labelledby={HEADING_ID}
          tabIndex={-1}
          className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none"
          initial={dialogInitial} animate={dialogAnimate} exit={dialogExit} transition={dialogTransition}
        >
          {/* ── Toolbar (prev/next/share/close) — always fixed, no animation ── */}
          <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 px-3 py-2">
            <button type="button" onClick={() => navigate(index - 1)} disabled={!prevEnabled}
              className="tap-target rounded-full text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
              aria-label={t('blogModal.prev')}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => navigate(index + 1)} disabled={!nextEnabled}
              className="tap-target rounded-full text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
              aria-label={t('blogModal.next')}>
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="ml-auto flex items-center gap-1">
              <span className="sr-only" aria-live="polite">{copied ? t('blogModal.copied') : ''}</span>
              {copied && <span className="mr-1 text-xs font-medium text-green-600">{t('blogModal.copied')}</span>}
              <button type="button" onClick={handleCopy}
                className="tap-target rounded-full text-gray-600 hover:bg-gray-100"
                aria-label={t('blogModal.copyLink')}>
                <Copy className="h-5 w-5" />
              </button>
              <a href={shareHref} target="_blank" rel="noopener"
                className="tap-target rounded-full text-gray-600 hover:bg-gray-100"
                aria-label={t('blogModal.openInNewTab')}>
                <ExternalLink className="h-5 w-5" />
              </a>
              <button type="button" onClick={onClose}
                className="tap-target rounded-full text-gray-600 hover:bg-gray-100"
                aria-label={t('blogModal.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Clipboard fallback */}
          {copyFailed && (
            <div className="shrink-0 border-b border-gray-100 px-4 py-2">
              <input id="blog-modal-copy-fallback" ref={fallbackInputRef}
                type="text" readOnly value={shareUrl}
                aria-label={t('blogModal.copyFallbackLabel')}
                className="w-full break-anywhere rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700"
                onFocus={(e) => e.currentTarget.select()} />
            </div>
          )}

          {/* ── Sticky title ── */}
          <div className="sticky top-0 z-10 shrink-0 border-b border-gray-100 bg-white/90 px-6 py-3 backdrop-blur">
            <h1 id={HEADING_ID} className="line-clamp-2 text-lg font-semibold text-gray-900 md:text-xl">
              {title}
            </h1>
          </div>

          {/* ── Scrollable area with swipe gesture ── */}
          <div
            ref={scrollRef}
            className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* AnimatePresence wraps ONLY the article content (not the toolbar/title)
                so the swipe slide is confined to the body region. Key on slug so
                AnimatePresence detects the swap.  */}
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={post.slug}
                custom={direction}
                variants={articleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={articleTransition}
                className="px-6 py-5"
              >
                {/* ── Metadata block — two rows ────────────────────────────── */}
                {metaReady && (
                  <div className="mb-6 space-y-3 border-b border-gray-100 pb-5">

                    {/* ROW 1: badges (left) + date/timezone (right) */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat, i) => (
                          <span key={i} className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {cat}
                          </span>
                        ))}
                        {categories.length === 0 && <span />}
                      </div>
                      {/* Date + timezone — kept as one block so they stay aligned */}
                      {formattedDate && (
                        <p className="text-right text-xs text-gray-500 tabular-nums">
                          {formattedDate}
                        </p>
                      )}
                    </div>

                    {/* ROW 2: author + assistant (left) + words/reading-time (right) */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Author + assistant — horizontal, wrap together */}
                      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2">
                          <img src="/avatars/antonio-robles-headshot.png"
                            alt={t('blogModal.authorName')}
                            loading="lazy" decoding="async"
                            className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800">✍️ {t('blogModal.publishedBy')}</p>
                            <p className="text-sm font-semibold text-gray-800">{t('blogModal.authorName')}</p>
                            <p className="text-xs italic text-gray-600">{t('blogModal.authorTagline')}</p>
                          </div>
                        </div>
                        {editor && (
                          <div className="flex items-center gap-2">
                            <img src={`/avatars/${editor.id}-headshot.png`}
                              alt={editor.name}
                              loading="lazy" decoding="async"
                              className="h-9 w-9 shrink-0 rounded-full object-cover" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800">🤖 {t('blogModal.aiAssistant')}</p>
                              <p className="text-sm font-semibold text-gray-800">{editor.name}</p>
                              <p className="text-xs italic text-gray-600">{editor.signature}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Words + reading time */}
                      {wordCount > 0 && (
                        <p className="text-xs text-gray-500 tabular-nums self-center sm:text-right">
                          {wordCount} {t('blogModal.words')} · {readingTimeMinutes} {t('blogModal.minRead')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Article body ── */}
                {content.length > 0 ? (
                  <div className={loading ? 'opacity-60 transition-opacity' : ''}>
                    <BlogArticle content={content} size="compact" />
                  </div>
                ) : articleError ? (
                  <p className="py-8 text-center text-sm text-gray-500">{t('state.error')}</p>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400" aria-live="polite">
                    {t('state.loading')}
                  </p>
                )}

                {/* ── Keywords (tags) ── */}
                {keywords.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">{t('blogModal.keywords')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw, i) => (
                        <span key={i} className="text-sm text-blue-500">
                          #{kw.replace(/\s+/g, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Sources ── */}
                {sources.length > 0 && (
                  <div className="mt-8 rounded-lg bg-gray-50 p-5">
                    <h3 className="mb-3 text-base font-bold text-gray-800">{t('blogModal.sources')}</h3>
                    <ul className="list-disc list-inside space-y-1.5 text-sm">
                      {sources.map((src, i) => (
                        <li key={i}>
                          <a href={src.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline">
                            {src.title} ({src.source})
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BlogModal;
