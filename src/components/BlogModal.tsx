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
  /** Fetched_Posts (current page + filters) from the /api/blog list endpoint. */
  posts: BlogListPost[];
  /** Index of the post currently shown. */
  index: number;
  /** Prev/next → updates index + URL (owned by the routing hook). */
  onIndexChange: (next: number) => void;
  /** Closes the modal and restores /blog. */
  onClose: () => void;
  /**
   * Optional fetcher for a full post's article body by canonical slug. The
   * list endpoint returns only title/excerpt, so the modal fetches `content`
   * for the active language. Injectable for tests; defaults to `/api/blog/:slug`.
   */
  fetchArticle?: (slug: string) => Promise<FullPost | null>;
}

/** Shape of the full post returned by `/api/blog/:slug`. */
export interface FullPost {
  slug: string;
  translations: {
    en: { slug?: string; title: string; excerpt: string; content: BlogArticleBlock[] };
    es: { slug?: string; title: string; excerpt: string; content: BlogArticleBlock[] };
  };
}

const HEADING_ID = 'blog-modal-title';

async function defaultFetchArticle(slug: string): Promise<FullPost | null> {
  const res = await fetch(`/api/blog/${slug}`);
  if (!res.ok) return null;
  return (await res.json()) as FullPost;
}

/**
 * In-page blog article viewer.
 *
 * Reuses the VideoModal interaction pattern (framer-motion `AnimatePresence` +
 * `motion`, Escape handler, body-overflow lock) and extends it into an
 * accessible dialog with prev/next navigation and share controls.
 *
 * Requirements: 11.1–11.4, 14.1–14.4, 15.1–15.6, 16.1–16.5, 18.3, 20.1, 20.4,
 * 22.3, 25.3, 9.3.
 * Design: Area 2 — 2a BlogModal component, 2d Dialog behaviors.
 */
export function BlogModal({
  posts,
  index,
  onIndexChange,
  onClose,
  fetchArticle = defaultFetchArticle,
}: BlogModalProps) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const lang = (i18n.language === 'es' ? 'es' : 'en') as BlogModalLang;

  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const articleScrollRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const [full, setFull] = useState<FullPost | null>(null);
  const [articleError, setArticleError] = useState(false);

  const post = posts[index];

  const prevEnabled = canGoPrev(index, posts.length);
  const nextEnabled = canGoNext(index, posts.length);

  // Title comes from the full post when loaded, else the list post's title so
  // the header (and aria-labelledby target) is populated immediately.
  const listTitle = post ? (post.translations[lang] ?? post.translations.en).title : '';
  const fullTranslation = full ? (full.translations[lang] ?? full.translations.en) : undefined;
  const title = fullTranslation?.title ?? listTitle;
  const content: BlogArticleBlock[] = fullTranslation?.content ?? [];

  // --- Fetch the full article for the active post (Req 11.2, 11.3) ---------
  useEffect(() => {
    if (!post) return;
    let cancelled = false;
    setFull(null);
    setArticleError(false);
    fetchArticle(post.slug)
      .then((data) => {
        if (cancelled) return;
        if (data) setFull(data);
        else setArticleError(true);
      })
      .catch(() => {
        if (!cancelled) setArticleError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [post, fetchArticle]);

  // --- Body-scroll lock on mount / restore on unmount (Req 16.4) -----------
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // --- Escape closes; Tab is trapped within the modal (Req 16.1, 16.5) -----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = dialogRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        // No focusable child — keep focus on the dialog container.
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // --- Move focus into the modal on open (Req 16.5) ------------------------
  useEffect(() => {
    // Focus the dialog container so the whole modal is the starting point and
    // Tab traversal is trapped from there.
    dialogRef.current?.focus();
  }, []);

  // --- Reset article scroll to top on index change (Req 15.6) --------------
  useEffect(() => {
    if (articleScrollRef.current) {
      articleScrollRef.current.scrollTop = 0;
    }
    // Reset any lingering copy status when the article changes.
    setCopied(false);
    setCopyFailed(false);
  }, [index]);

  // --- Copy-link with transient status + failure fallback (Req 14.2–14.4) --
  const showFallback = useCallback(() => {
    setCopyFailed(true);
    // Render the read-only input then select it as soon as it exists.
    requestAnimationFrame(() => {
      const el = fallbackInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!post) return;
    const url = listPostAbsoluteUrl(post);
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function'
      ) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopied(false);
      showFallback();
    }
  }, [post, showFallback]);

  // Auto-dismiss the "copied" status after ~2s (Req 14.3).
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  if (!post) return null;

  const shareUrl = listPostAbsoluteUrl(post);
  const shareHref = listPostPath(post);

  // Reduced motion: fade only, no scale (Req 20.1, 20.4).
  const dialogInitial = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 };
  const dialogAnimate = reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 };
  const dialogExit = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 };
  const dialogTransition = reduceMotion
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 260, damping: 24 };

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        onClick={handleBackdropClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={HEADING_ID}
          tabIndex={-1}
          className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none"
          initial={dialogInitial}
          animate={dialogAnimate}
          exit={dialogExit}
          transition={dialogTransition}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-1 border-b border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              disabled={!prevEnabled}
              className="tap-target rounded-full text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
              aria-label={t('blogModal.prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              disabled={!nextEnabled}
              className="tap-target rounded-full text-gray-600 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
              aria-label={t('blogModal.next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="ml-auto flex items-center gap-1">
              {/* Transient copied status (aria-live) */}
              <span className="sr-only" aria-live="polite">
                {copied ? t('blogModal.copied') : ''}
              </span>
              {copied && (
                <span className="mr-1 text-xs font-medium text-green-600">
                  {t('blogModal.copied')}
                </span>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="tap-target rounded-full text-gray-600 hover:bg-gray-100"
                aria-label={t('blogModal.copyLink')}
              >
                <Copy className="h-5 w-5" />
              </button>
              <a
                href={shareHref}
                target="_blank"
                rel="noopener"
                className="tap-target rounded-full text-gray-600 hover:bg-gray-100"
                aria-label={t('blogModal.openInNewTab')}
              >
                <ExternalLink className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="tap-target rounded-full text-gray-600 hover:bg-gray-100"
                aria-label={t('blogModal.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Clipboard-failure fallback: read-only link, pre-selected (Req 14.4) */}
          {copyFailed && (
            <div className="border-b border-gray-100 px-4 py-2">
              <label className="sr-only" htmlFor="blog-modal-copy-fallback">
                {t('blogModal.copyFallbackLabel')}
              </label>
              <input
                id="blog-modal-copy-fallback"
                ref={fallbackInputRef}
                type="text"
                readOnly
                value={shareUrl}
                aria-label={t('blogModal.copyFallbackLabel')}
                className="w-full break-anywhere rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}

          {/* Article region (scrollable) */}
          <div
            ref={articleScrollRef}
            className="scrollbar-thin overflow-y-auto overscroll-contain px-6 py-6"
            style={{ maxHeight: '85vh' }}
          >
            <h1 id={HEADING_ID} className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl">
              {title}
            </h1>
            {content.length > 0 ? (
              <BlogArticle content={content} />
            ) : articleError ? (
              <p className="py-8 text-center text-sm text-gray-500">{t('state.error')}</p>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400" aria-live="polite">
                {t('state.loading')}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BlogModal;
