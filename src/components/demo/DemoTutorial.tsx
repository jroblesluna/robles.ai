import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlayCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicDialog } from "@/hooks/usePublicDialog";
import { trackDemoEvent } from "@/lib/analytics";

/**
 * Narrated tutorial videos per demo and language, served from public/videos/tutorials/.
 * A language without an entry hides the button: a visitor never gets a video in another language.
 */
type TutorialMedia = { src: string; poster: string; seconds: number };

const TUTORIALS: Record<string, Partial<Record<"en" | "es", TutorialMedia>>> = {
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
  emotion: {
    es: {
      src: "/videos/tutorials/try-emotion-tutorial-es.mp4",
      poster: "/videos/tutorials/try-emotion-tutorial-poster-es.jpg",
      seconds: 56,
    },
  },
};

type Props = {
  demoId: string;
  /** Element scrolled into view after closing, so the visitor can try the demo right away. */
  returnToId?: string;
  className?: string;
};

/** Secondary "watch how it works" button + modal player. The video never plays by itself. */
export function DemoTutorial({ demoId, returnToId, className = "" }: Props) {
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`tap-target inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 ${className}`}
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {t("demoTutorial.cta", { seconds: media.seconds })}
      </button>
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
