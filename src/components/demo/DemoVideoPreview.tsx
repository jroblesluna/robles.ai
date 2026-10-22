import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clips from '@/data/demoClips.json';

const ACTIVE_PREVIEW = 'robles:demo-preview-play';
const HOVER = '(hover: hover) and (pointer: fine)';
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/** No video URL is attached until hover or explicit activation. All content is inside the MP4. */
export function DemoVideoPreview({ id, title, hovered, reducedMotion }: {
  id: string; title: string; hovered: boolean; reducedMotion: boolean;
}) {
  const { t } = useTranslation();
  const instance = useId();
  const media = clips[id as keyof typeof clips];
  const target = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const intent = useRef(false);
  const automatic = useRef(false);
  const [visible, setVisible] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [requested, setRequested] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState(0);
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
      const inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25);
      setVisible(inView);
      if (!inView) stop();
    }, { threshold: [0, .25] });
    observer.observe(target.current);
    return () => observer.disconnect();
  }, [stop]);

  useEffect(() => {
    const onOtherPreview = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instance) stop();
    };
    const onVisibility = () => { if (document.hidden) stop(); };
    window.addEventListener(ACTIVE_PREVIEW, onOtherPreview);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener(ACTIVE_PREVIEW, onOtherPreview);
      document.removeEventListener('visibilitychange', onVisibility);
      intent.current = false;
      video.current?.pause();
    };
  }, [instance, stop]);

  const start = useCallback((auto: boolean) => {
    if (!media || document.hidden) return;
    if (video.current?.error) video.current.load();
    automatic.current = auto;
    intent.current = true;
    window.dispatchEvent(new CustomEvent(ACTIVE_PREVIEW, { detail: instance }));
    setFailed(false);
    setRequested(true);
    setWanted(true);
    setRun(value => value + 1);
  }, [instance, media]);

  useEffect(() => {
    if (hovered && visible && canHover && !reducedMotion && !saveData && !failed) start(true);
    else if (automatic.current) stop();
    // Failure never retries on its own; a deliberate button press may retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, visible, canHover, reducedMotion, saveData, start, stop]);

  useEffect(() => {
    if (reducedMotion || saveData) stop();
  }, [reducedMotion, saveData, stop]);

  useEffect(() => {
    const element = video.current;
    if (!element || !requested || !wanted) return;
    element.muted = true;
    try { element.currentTime = 0; } catch { /* Metadata may not be available yet. */ }
    const attempt = element.play();
    attempt?.catch(error => {
      if (intent.current && error?.name !== 'AbortError') stop();
    });
    return () => { element.pause(); };
  }, [requested, wanted, run, stop]);

  const onError = () => { stop(); setFailed(true); setHasFrame(false); };
  const label = t(wanted ? 'demosCatalog.videoPreview.pause' : 'demosCatalog.videoPreview.play');
  return <div ref={target} data-demo-video={id} data-state={failed ? 'error' : playing ? 'playing' : wanted ? 'loading' : 'idle'}>
    <button type="button" aria-label={`${label}: ${title}`} aria-pressed={wanted}
      onClick={() => wanted ? stop() : start(false)}
      className="group block w-full bg-slate-950 text-left text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-300">
      <span className="relative block aspect-video overflow-hidden">
        <img src={media.poster} srcSet={`${media.poster} 480w, ${media.posterLarge} 960w`}
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          width={media.width} height={media.height} alt="" loading="lazy" decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        <video ref={video} src={requested ? media.src : undefined} preload="none" muted playsInline
          width={media.width} height={media.height} aria-hidden="true" tabIndex={-1}
          onPlaying={() => { if (!intent.current) { video.current?.pause(); return; } setPlaying(true); setHasFrame(true); }}
          onEnded={stop} onError={onError}
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${hasFrame && !failed ? 'opacity-100' : 'opacity-0'}`} />
      </span>
      <span className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium">
        <span className="inline-flex items-center gap-1.5">
          {wanted && !playing ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : wanted ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className="text-slate-300">{t('demosCatalog.videoPreview.illustrative')}</span>
      </span>
    </button>
    {failed && <p role="status" className="bg-slate-900 px-3 pb-2 text-xs text-slate-200">{t('demosCatalog.videoPreview.error')}</p>}
  </div>;
}
