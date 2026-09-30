import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the user's `prefers-reduced-motion` preference.
 *
 * Returns `true` when the user has requested reduced motion, so callers can
 * skip or substantially reduce non-essential entrance/parallax/looping
 * animations (Req 20.1–20.4). Subscribes to `matchMedia` changes and cleans up
 * on unmount. Defaults to `false` (full motion) when `matchMedia` is
 * unavailable (very old/edge environments).
 *
 * Design: Area 3 — 3b useReducedMotion hook.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    // Sync in case the value changed between initial render and effect.
    setReduced(mql.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Legacy Safari fallback.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}

export default useReducedMotion;
