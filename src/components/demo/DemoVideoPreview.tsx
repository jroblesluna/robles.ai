import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clips from '@/data/demoClips.json';

const HOVER = '(hover: hover) and (pointer: fine)';
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/**
 * Shorts-style card media: plays in a loop while hovered (desktop) or held
 * (touch), and returns to the poster on release. It has no controls because the
 * whole card is a link to the demo. No video URL is attached until first use.
 * Holding is deliberate, so it plays even with reduced motion or data saver.
 */
export function DemoVideoPreview({ id, hovered, pressed, reducedMotion }: {
  id: string; hovered: boolean; pressed: boolean; reducedMotion: boolean;
}) {
  const { t } = useTranslation();
  const media = clips[id as keyof typeof clips];
  const target = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const intent = useRef(false);
  const [visible, setVisible] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [requested, setRequested] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const stop = useCallback(() => {
    intent.current = false;
    video.current?.pause();
    setWanted(false);
    setPlaying(false);
  }, []);

  useEffect(() => {
    const query = typeof window.matchMedia === 'function' ? window.matchMedia(HOVER) : null;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const sync = () => {
      setCanHover(Boolean(query?.matches));
      setSaveData(Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')));
    };
    sync();
    query?.addEventListener?.('change', sync);
    connection?.addEventListener('change', sync);
    return () => {
      query?.removeEventListener?.('change', sync);
      connection?.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!target.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25));
    }, { threshold: [0, .25] });
    observer.observe(target.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      intent.current = false;
      video.current?.pause();
    };
  }, [stop]);

  const active = Boolean(media) && visible && (pressed || (hovered && canHover && !reducedMotion && !saveData));

  // Runs on each change of `active`, so a failure retries only on the next hover or hold.
  useEffect(() => {
    if (!active) { stop(); return; }
    if (document.hidden) return;
    if (video.current?.error) video.current.load();
    intent.current = true;
    setFailed(false);
    setRequested(true);
    setWanted(true);
  }, [active, stop]);

  useEffect(() => {
    const element = video.current;
    if (!element || !requested || !wanted) return;
    element.muted = true;
    try { element.currentTime = 0; } catch { /* Metadata may not be available yet. */ }
    if (bar.current) bar.current.style.transform = 'scaleX(0)';
    element.play()?.catch(error => {
      if (intent.current && error?.name !== 'AbortError') stop();
    });
    return () => { element.pause(); };
  }, [requested, wanted, stop]);

  const onTimeUpdate = () => {
    const element = video.current;
    if (bar.current && element?.duration) bar.current.style.transform = `scaleX(${element.currentTime / element.duration})`;
  };
  const onError = () => { stop(); setFailed(true); };
  return <div ref={target} data-demo-video={id} data-state={failed ? 'error' : playing ? 'playing' : wanted ? 'loading' : 'idle'}
    className="relative aspect-video overflow-hidden bg-slate-950">
    <img src={media.poster} srcSet={`${media.poster} 480w, ${media.posterLarge} 960w`}
      sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
      width={media.width} height={media.height} alt="" loading="lazy" decoding="async" draggable={false}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
    <video ref={video} src={requested ? media.src : undefined} preload="none" muted loop playsInline
      width={media.width} height={media.height} aria-hidden="true" tabIndex={-1}
      onPlaying={() => { if (!intent.current) { video.current?.pause(); return; } setPlaying(true); }}
      onTimeUpdate={onTimeUpdate} onError={onError}
      className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${playing ? 'opacity-100' : 'opacity-0'}`} />
    <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
      {t('demosCatalog.videoPreview.illustrative')}
    </span>
    {wanted && !playing && <LoaderCircle aria-hidden="true" className="absolute left-2 top-2 h-4 w-4 animate-spin text-white motion-reduce:animate-none" />}
    {playing && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25">
      <span ref={bar} className="block h-full origin-left bg-cyan-300" style={{ transform: 'scaleX(0)' }} />
    </span>}
    {failed && <p role="status" className="absolute inset-x-0 top-0 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200">{t('demosCatalog.videoPreview.error')}</p>}
  </div>;
}
