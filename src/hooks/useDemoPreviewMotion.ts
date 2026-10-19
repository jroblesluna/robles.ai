import { useCallback, useEffect, useRef, useState } from 'react';

export const PREVIEW_DURATION_MS = 4000;

/** One brief viewport preview; explicit replay, with no background loops. */
export function useDemoPreviewMotion(enabled: boolean, reducedMotion: boolean) {
  const target = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const replay = useCallback(() => {
    if (!enabled || reducedMotion) return;
    setRun(value => value + 1);
    setPlaying(true);
  }, [enabled, reducedMotion]);

  useEffect(() => {
    if (!enabled || reducedMotion || !target.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.35);
      if (!visible) { setPlaying(false); return; }
      if (!seen.current) { seen.current = true; replay(); }
    }, { threshold: [0, 0.35] });
    observer.observe(target.current);
    return () => observer.disconnect();
  }, [enabled, reducedMotion, replay]);

  useEffect(() => {
    if (reducedMotion || !enabled) setPlaying(false);
  }, [enabled, reducedMotion]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(false), PREVIEW_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [playing, run]);

  return { target, playing: playing && !reducedMotion, run, replay, stop: () => setPlaying(false) };
}
