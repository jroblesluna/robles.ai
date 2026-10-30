import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, PlayCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicDialog } from "@/hooks/usePublicDialog";
import { trackDemoEvent } from "@/lib/analytics";

/**
 * Narrated tutorial videos per demo and language, served from public/videos/tutorials/.
 * A language without an entry hides the button: a visitor never gets a video in another language.
 */
type TutorialMedia = { src: string; poster: string; seconds: number };

const TUTORIALS: Record<string, Partial<Record<"en" | "es", TutorialMedia>>> = {
  sitechatbot: {
    en: {
      src: "/videos/tutorials/try-chatbot-tutorial-en.mp4",
      poster: "/videos/tutorials/try-chatbot-tutorial-poster-en.jpg",
      seconds: 58,
    },
    es: {
      src: "/videos/tutorials/try-chatbot-tutorial-es.mp4",
      poster: "/videos/tutorials/try-chatbot-tutorial-poster-es.jpg",
      seconds: 59,
    },
  },
  objectdetection: {
    en: {
      src: "/videos/tutorials/try-object-detection-tutorial-en.mp4",
      poster: "/videos/tutorials/try-object-detection-tutorial-poster-en.jpg",
      seconds: 45,
    },
    es: {
      src: "/videos/tutorials/try-object-detection-tutorial-es.mp4",
      poster: "/videos/tutorials/try-object-detection-tutorial-poster-es.jpg",
      seconds: 45,
    },
  },
  speech: {
    en: {
      src: "/videos/tutorials/try-transcription-tutorial-en.mp4",
      poster: "/videos/tutorials/try-transcription-tutorial-poster-en.jpg",
      seconds: 57,
    },
    es: {
      src: "/videos/tutorials/try-transcription-tutorial-es.mp4",
      poster: "/videos/tutorials/try-transcription-tutorial-poster-es.jpg",
      seconds: 60,
    },
  },
  emotion: {
    en: {
      src: "/videos/tutorials/try-emotion-tutorial-en.mp4",
      poster: "/videos/tutorials/try-emotion-tutorial-poster-en.jpg",
      seconds: 59,
    },
    es: {
      src: "/videos/tutorials/try-emotion-tutorial-es.mp4",
      poster: "/videos/tutorials/try-emotion-tutorial-poster-es.jpg",
      seconds: 56,
    },
  },
  langchain: {
    en: {
      src: "/videos/tutorials/try-langchain-tutorial-en.mp4",
      poster: "/videos/tutorials/try-langchain-tutorial-poster-en.jpg",
      seconds: 58,
    },
    es: {
      src: "/videos/tutorials/try-langchain-tutorial-es.mp4",
      poster: "/videos/tutorials/try-langchain-tutorial-poster-es.jpg",
      seconds: 59,
    },
  },
};

type Props = {
  demoId: string;
  /** Element scrolled into view after closing, so the visitor can try the demo right away. */
  returnToId?: string;
  className?: string;
  /** "button" is the secondary pill; "featured" is a large poster card for the page's main tutorial. */
  variant?: "button" | "featured";
  /** Supporting line under the featured card's title. */
  description?: string;
};

/** "Watch how it works" button or poster card + modal player. The video never plays by itself. */
export function DemoTutorial({ demoId, returnToId, className = "", variant = "button", description }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("es") ? "es" : "en";
  const media = TUTORIALS[demoId]?.[lang];
  if (!media) return null;

  const showDemo = () => {
    if (!returnToId) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(returnToId)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  };

  const trigger =
    variant === "featured" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("demoTutorial.cta", { seconds: media.seconds })}
        className={`group grid w-full grid-cols-1 items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 p-3 text-left shadow-xl shadow-indigo-900/20 ring-1 ring-white/10 sm:p-4 md:grid-cols-[minmax(0,400px)_1fr] md:gap-8 ${className}`}
      >
        <span className="relative block overflow-hidden rounded-2xl ring-1 ring-white/15">
          <img
            src={media.poster}
            alt=""
            loading="lazy"
            className="block aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20 transition-colors group-hover:bg-slate-950/10">
            <span className="relative flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16">
              <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white/40 motion-safe:animate-ping" />
              <span className="relative flex h-full w-full items-center justify-center rounded-full bg-white text-indigo-700 shadow-2xl transition-transform group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7" aria-hidden="true" />
              </span>
            </span>
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">
            {media.seconds} s
          </span>
        </span>
        <span className="block min-w-0 px-1 pb-2 md:px-0 md:pb-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-200 ring-1 ring-white/15">
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t("demoTutorial.featuredBadge")}
          </span>
          <span className="mt-3 block text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t("demoTutorial.featuredTitle", { seconds: media.seconds })}
          </span>
          {description && <span className="mt-2 block max-w-xl text-sm leading-relaxed text-indigo-100/85 sm:text-base">{description}</span>}
          <span className="tap-target mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-md transition-colors group-hover:bg-violet-50">
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {t("demoTutorial.featuredCta")}
          </span>
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`tap-target inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 ${className}`}
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {t("demoTutorial.cta", { seconds: media.seconds })}
      </button>
    );

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <TutorialDialog demoId={demoId} media={media} lang={lang} onClose={() => setOpen(false)} onClosed={showDemo} />
        )}
      </AnimatePresence>
    </>
  );
}

function TutorialDialog({
  demoId,
  media,
  lang,
  onClose,
  onClosed,
}: {
  demoId: string;
  media: TutorialMedia;
  lang: string;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { t } = useTranslation();
  const panel = usePublicDialog(onClose);
  const played = useRef(false);
  // Cleanups run in declaration order, so this fires after usePublicDialog restores scroll and focus.
  const closed = useRef(onClosed);
  closed.current = onClosed;
  useEffect(() => () => closed.current(), []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t("demoTutorial.dialogLabel")}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl outline-none ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <p className="truncate text-sm font-medium text-slate-200">
            {t("demoTutorial.dialogLabel")} · {media.seconds} s
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("demoTutorial.close")}
            className="tap-target -mr-2 inline-flex items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <video
          className="block aspect-video w-full bg-black"
          src={media.src}
          poster={media.poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          lang={lang}
          onPlay={() => {
            if (played.current) return;
            played.current = true;
            trackDemoEvent("tutorial_play", demoId);
          }}
          onEnded={() => trackDemoEvent("tutorial_complete", demoId)}
        />
      </motion.div>
    </motion.div>
  );
}
