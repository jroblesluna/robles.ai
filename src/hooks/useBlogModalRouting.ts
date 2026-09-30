import { useCallback, useEffect, useRef, useState } from 'react';
import { type BlogListPost, clampIndex, listPostPath } from '@/lib/blogModal';

/**
 * History-API integration for the blog in-page modal viewer.
 *
 * Owns the modal open/close state plus the address-bar path so `BlogList`
 * stays declarative. Keeps `/blog` mounted while the URL shows `/blog/:slug`
 * by mutating History directly (never routing through wouter), so the
 * `<Switch>` in `App.tsx` does not swap in `BlogPost` while the modal is open.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 15.2, 15.3.
 * Design: Area 2 — 2b Routing hook.
 */

/** History state marker tagged on the pushed `/blog/:slug` entry. */
export interface BlogModalHistoryState {
  blogModal: true;
}

export interface UseBlogModalRouting {
  /** Index of the post shown in the modal, or `null` when closed. */
  openIndex: number | null;
  /** Open the modal at `index`, pushing a `/blog/:slug` history entry. */
  openAt: (index: number) => void;
  /** Move to `index` (prev/next), replacing the `/blog/:slug` history entry. */
  goToIndex: (index: number) => void;
  /** Close the modal and restore the `/blog` list URL. */
  close: () => void;
}

const BASE_PATH = '/blog';

function hasHistory(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.history !== 'undefined' &&
    typeof window.history.pushState === 'function'
  );
}

export function useBlogModalRouting(posts: BlogListPost[]): UseBlogModalRouting {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Track whether the top history entry is one this hook pushed, so `close()`
  // can prefer `history.back()` (which unwinds the entry we added) over a fresh
  // pushState to `/blog`.
  const ownsTopEntryRef = useRef(false);
  // Keep the latest values addressable from the (mount-once) popstate handler.
  const openIndexRef = useRef<number | null>(null);
  const postsRef = useRef<BlogListPost[]>(posts);

  useEffect(() => {
    openIndexRef.current = openIndex;
  }, [openIndex]);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const pathFor = useCallback((index: number): string | null => {
    const list = postsRef.current;
    if (index < 0 || index >= list.length) return null;
    return listPostPath(list[index]);
  }, []);

  const openAt = useCallback(
    (index: number) => {
      const list = postsRef.current;
      if (list.length === 0) return;
      const target = clampIndex(index, list.length);
      setOpenIndex(target);

      const path = pathFor(target);
      if (!path || !hasHistory()) {
        // Degrade gracefully: modal state is still set; if history is
        // unavailable the URL simply won't update (progressive enhancement
        // over the working cold-load page).
        return;
      }
      try {
        const state: BlogModalHistoryState = { blogModal: true };
        window.history.pushState(state, '', path);
        ownsTopEntryRef.current = true;
      } catch {
        // pushState can throw (e.g. cross-origin/sandbox). Leave the modal open
        // without a URL change rather than breaking the interaction.
        ownsTopEntryRef.current = false;
      }
    },
    [pathFor],
  );

  const goToIndex = useCallback(
    (index: number) => {
      const list = postsRef.current;
      if (list.length === 0) return;
      const target = clampIndex(index, list.length);
      setOpenIndex(target);

      const path = pathFor(target);
      if (!path || !hasHistory()) return;
      try {
        // Replace (not push) so browser Back closes the whole modal in one step
        // instead of stepping through every article visited (Req 12.4).
        const state: BlogModalHistoryState = { blogModal: true };
        window.history.replaceState(state, '', path);
      } catch {
        /* no-op: keep the modal usable even if the URL can't update */
      }
    },
    [pathFor],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
    const owned = ownsTopEntryRef.current;
    ownsTopEntryRef.current = false;
    if (!hasHistory()) return;
    try {
      if (owned) {
        window.history.back();
      } else {
        window.history.pushState(null, '', BASE_PATH);
      }
    } catch {
      /* no-op */
    }
  }, []);

  // Browser Back while the modal is open closes it and lands on /blog (Req 12.3).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      if (openIndexRef.current !== null) {
        // The entry we pushed was popped (or the user navigated back): close
        // the modal. The URL is now whatever the previous entry was (/blog).
        ownsTopEntryRef.current = false;
        setOpenIndex(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return { openIndex, openAt, goToIndex, close };
}

export default useBlogModalRouting;
