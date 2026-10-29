import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Scroll behaviour matching Next.js / classic browser navigation
 * (Vercel, Stripe, GitHub):
 *  - New navigation (link click, setLocation) → scroll to top, or to `#hash`.
 *  - Back / forward (popstate)                → restore the saved position.
 *  - Reload                                   → restore the saved position.
 *
 * Positions are keyed by path + query and persisted in sessionStorage so they
 * survive a reload within the same tab.
 */

const STORAGE_KEY = 'scroll-positions';
const RESTORE_TIMEOUT_MS = 1500;

let isPopNavigation = false;

if (typeof window !== 'undefined') {
  // Take over from the browser so it doesn't fight our restore on SPA routes.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Registered at module load, before wouter subscribes, so the flag is set
  // by the time the route change is rendered.
  window.addEventListener('popstate', () => {
    isPopNavigation = true;
  });
}

function loadPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // storage unavailable (private mode, quota) — in-memory only
  }
}

function scrollTop(y: number) {
  // "instant" overrides any CSS scroll-behavior: smooth.
  window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
}

/**
 * Lazy-loaded pages start short, so a single scrollTo would be clamped.
 * Keep retrying each frame until `step` reports done, the timeout expires,
 * or the user scrolls on their own.
 */
function pinScroll(step: () => boolean): () => void {
  const start = performance.now();
  let frame = 0;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', cancel);
  };
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', cancel);

  const tick = () => {
    if (cancelled) return;
    if (step() || performance.now() - start > RESTORE_TIMEOUT_MS) {
      cancel();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  tick();

  return cancel;
}

function restoreScroll(y: number): () => void {
  return pinScroll(() => {
    scrollTop(y);
    return Math.abs(window.scrollY - y) < 2;
  });
}

const HASH_SETTLE_FRAMES = 5;
const HASH_MAX_WAIT_MS = 1000;

/**
 * Links like `/#case-studies` from another page are full loads (or SPA
 * navigations) that land before the section exists or while content above it
 * is still growing. Wait until the section stops moving, then glide to it once
 * (scrollIntoView honours the CSS scroll-margin for the fixed header); if the
 * layout still shifted during the glide, ease into the corrected spot.
 */
function scrollToHash(hash: string): () => void {
  let id = hash.slice(1);
  try { id = decodeURIComponent(id); } catch { /* keep raw */ }
  const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' as ScrollBehavior : 'smooth';
  const start = performance.now();
  let lastTop = NaN;
  let stableFrames = 0;
  let cancelled = false;

  const cancelPin = pinScroll(() => {
    const el = document.getElementById(id);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY;
    stableFrames = Math.abs(top - lastTop) < 1 ? stableFrames + 1 : 0;
    lastTop = top;
    if (stableFrames < HASH_SETTLE_FRAMES && performance.now() - start < HASH_MAX_WAIT_MS) return false;

    el.scrollIntoView({ block: 'start', behavior });
    // One gentle correction if something above resized mid-glide.
    window.addEventListener('scrollend', () => {
      if (cancelled) return;
      const offBy = el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop || '0');
      if (Math.abs(offBy) > 4) el.scrollIntoView({ block: 'start', behavior });
    }, { once: true });
    return true;
  });

  return () => {
    cancelled = true;
    cancelPin();
  };
}

export function useScrollRestoration(location: string) {
  const positions = useRef<Record<string, number>>(loadPositions());
  const currentKey = useRef('');
  const isFirstRender = useRef(true);

  // Continuously record the position of the page currently shown.
  useEffect(() => {
    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        if (!currentKey.current) return;
        positions.current[currentKey.current] = window.scrollY;
        savePositions(positions.current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(pending);
    };
  }, []);

  // Layout effect: switch the key before the browser fires the scroll event
  // caused by the new (possibly shorter) page, so that clamped value is not
  // written over the previous page's saved position.
  useLayoutEffect(() => {
    const key = location + window.location.search;
    currentKey.current = key;

    let shouldRestore = isPopNavigation;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      shouldRestore = nav?.type === 'reload' || nav?.type === 'back_forward';
    }
    isPopNavigation = false;

    const saved = positions.current[key];
    if (shouldRestore && saved) return restoreScroll(saved);
    if (window.location.hash.length > 1) return scrollToHash(window.location.hash);

    scrollTop(0);
  }, [location]);
}
