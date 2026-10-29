import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trackDemoEvent } from "@/lib/analytics";

/**
 * 30-second brand spot (docs/REMOTION_SPOT_30S.md §13), served from public/videos/.
 * A language without an entry renders nothing: the spot has burned-in copy, so a visitor
 * never gets it in another language.
 */
type SpotMedia = { webm: string; mp4: string; poster: string };

const SPOTS: Partial<Record<"en" | "es", SpotMedia>> = {
  es: {
    webm: "/videos/robles-ai-spot-es.webm",
    mp4: "/videos/robles-ai-spot-es.mp4",
    poster: "/videos/robles-ai-spot-poster-es.jpg",
  },
};

type Props = {
  /** Where the spot is shown, sent with the analytics events (`landing_hero`, `home_demos`…). */
  placement: string;
  className?: string;
};

/**
 * Muted, looping spot that loads only near the viewport and pauses off screen.
 * With reduced motion it never autoplays: the poster shows a play button instead.
 * "Sound on" restarts it from the beginning with audio once, then it goes back to the muted loop.
 */
export function BrandSpot({ placement, className = "" }: Props) {
  const { t, i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
  const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("es") ? "es" : "en";
  const media = SPOTS[lang];
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Load the video only when it gets close to the viewport; play only while visible.
  useEffect(() => {
    const el = video.current;
    // Without IntersectionObserver the poster stays until "sound on" loads the video.
    if (!el || typeof IntersectionObserver === "undefined") return;
    const loader = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: "300px" });
    const viewer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    loader.observe(el);
    viewer.observe(el);
    return () => {
      loader.disconnect();
      viewer.disconnect();
    };
  }, [media]);

  useEffect(() => {
    const el = video.current;
    if (!el || !near) return;
    if (!visible) {
      el.pause();
    } else if (!reducedMotion || !muted) {
      el.play().catch(() => undefined);
    }
  }, [near, visible, reducedMotion, muted]);

  if (!media) return null;

  const playWithSound = () => {
    const el = video.current;
    if (!el) return;
    el.currentTime = 0;
    el.muted = false;
    el.loop = false;
    setMuted(false);
    setNear(true);
    el.play().catch(() => undefined);
    trackDemoEvent("spot_sound_on", "brand_spot", { placement });
  };

  const mute = () => {
    const el = video.current;
    if (!el) return;
    el.muted = true;
    el.loop = true;
    setMuted(true);
    if (reducedMotion) el.pause();
  };

  const onEnded = () => {
    trackDemoEvent("spot_complete", "brand_spot", { placement });
    mute();
    const el = video.current;
    if (el && !reducedMotion) {
      el.currentTime = 0;
      el.play().catch(() => undefined);
    }
  };

  const showPlayButton = reducedMotion && !playing;

  return (
    <figure data-brand-spot className={`relative overflow-hidden rounded-2xl bg-slate-950 shadow-2xl ring-1 ring-white/10 ${className}`}>
      <video
        ref={video}
        className="block aspect-video w-full bg-slate-950"
        poster={media.poster}
        muted
        loop
        playsInline
        preload="none"
        lang={lang}
        aria-label={t("brandSpot.ariaLabel")}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
      >
        {near && <source src={media.webm} type="video/webm" />}
        {near && <source src={media.mp4} type="video/mp4" />}
      </video>
      {showPlayButton ? (
        <button
          type="button"
          onClick={playWithSound}
          aria-label={t("brandSpot.play")}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/30 text-white transition-colors hover:bg-slate-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl">
            <Play className="ml-1 h-7 w-7" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={muted ? playWithSound : mute}
          aria-pressed={!muted}
          className="tap-target absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-slate-950/75 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-slate-950/90 sm:bottom-4 sm:right-4"
        >
          {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          {t(muted ? "brandSpot.soundOn" : "brandSpot.soundOff")}
        </button>
      )}
    </figure>
  );
}

/** True when a spot exists for the current language, so callers can skip the surrounding section. */
export function useHasBrandSpot(): boolean {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("es") ? "es" : "en";
  return Boolean(SPOTS[lang]);
}
