import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

const VideoModal = ({ videoSrc, onClose }: { videoSrc: string; onClose: () => void }) => {
  const backdropRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Strip autoplay from URL to avoid Error 153 on mobile
  // Also ensure enablejsapi=1 is present for proper embed behavior
  const sanitizeVideoUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete('autoplay');
      if (!parsed.searchParams.has('enablejsapi')) {
        parsed.searchParams.set('enablejsapi', '1');
      }
      if (!parsed.searchParams.has('rel')) {
        parsed.searchParams.set('rel', '0');
      }
      return parsed.toString();
    } catch {
      // If URL parsing fails, just return as-is without autoplay
      return url.replace(/[?&]autoplay=1/, '');
    }
  };

  const safeVideoSrc = sanitizeVideoUrl(videoSrc);

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl bg-gray-900"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-black rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-md transition-colors"
            aria-label="Close video"
          >
            ✕
          </button>
          <div className="aspect-video">
            <iframe
              src={safeVideoSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
              className="w-full h-full"
              title="Video"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoModal;
