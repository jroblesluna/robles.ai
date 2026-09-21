import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Fingerprint, Database, AudioLines, Link2, FlaskConical } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import ParticleBackground from './ParticleBackground';
import { useTranslation } from 'react-i18next';

const SLIDE_COUNT = 3;
const SLIDE_MS = 7000;

const Hero = () => {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  // +1 = next (incoming from right), -1 = prev (incoming from left)
  const [direction, setDirection] = useState(1);

  // interval keyed on `slide` so any manual nav restarts the 7s clock
  useEffect(() => {
    const id = setInterval(() => {
      setDirection(1);
      setSlide((s) => (s + 1) % SLIDE_COUNT);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [slide]);

  // Jump to a specific slide (dots): infer direction from index order.
  const go = (n: number) => {
    const target = (n + SLIDE_COUNT) % SLIDE_COUNT;
    if (target === slide) return;
    setDirection(target > slide ? 1 : -1);
    setSlide(target);
  };

  // Explicit prev/next (arrows): force direction so wraparound slides correctly.
  const next = () => {
    setDirection(1);
    setSlide((s) => (s + 1) % SLIDE_COUNT);
  };
  const prev = () => {
    setDirection(-1);
    setSlide((s) => (s - 1 + SLIDE_COUNT) % SLIDE_COUNT);
  };

  // Slide variants: enter from the side we're heading to, exit to the opposite.
  // Use full-width (%) so the slide travels the entire container, not a fixed px.
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: "0%", opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const slides = [
    // 0 — main pitch
    {
      mascot: "/robly-avatar/robly-dominical.svg",
      mascotSize: "w-24 h-24 sm:w-32 sm:h-32 md:w-56 md:h-56",
      content: (
        <>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
            {t("hero.title")}
          </h1>
          <p className="text-sm md:text-xl text-white mb-4 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <a
              href="#features"
              className="px-4 py-2 bg-white text-blue-700 font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {t("hero.cta1")}
            </a>
            <Link
              href="/blog"
              className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20"
            >
              {t("hero.cta2")}
            </Link>
            <Link
              href="/get-started"
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {t("hero.cta3")}
            </Link>
          </div>
        </>
      ),
    },

    // 1 — quiz promo
    {
      mascot: "/robly-avatar/robly-thinking.svg",
      mascotSize: "w-24 h-24 sm:w-32 sm:h-32 md:w-56 md:h-56",
      content: (
        <>
          <div className="inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            {t("quizPromo.badge")}
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
            {t("quizPromo.title")}
          </h2>
          <p className="text-sm md:text-xl text-white mb-4 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
            {t("quizPromo.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <Link
              href="/diagnostico-ia"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {t("quizPromo.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      ),
    },

    // 2 — live demos
    {
      mascot: "/robly-avatar/robly-pointing.svg",
      mascotSize: "w-36 h-36 sm:w-44 sm:h-44 md:w-72 md:h-72",
      mascotClass: "md:-ml-6",
      content: (
        <>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
            {t("demosPromo.title")}
          </h2>
          <p className="text-sm md:text-xl text-white mb-4 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
            {t("demosPromo.subtitle")}
          </p>
          <div className="flex justify-center md:justify-start">
            <Link
              href="/demos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <FlaskConical className="h-4 w-4" />
              {t("demosPromo.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 hidden sm:flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-xs md:text-sm font-medium text-white/60 mr-1">
              {t("demosPromo.quickLabel")}
            </span>
            {[
              { href: "/try-identity", key: "identity", icon: Fingerprint, color: "text-violet-300" },
              { href: "/try-rag", key: "rag", icon: Database, color: "text-cyan-300" },
              { href: "/try-transcription", key: "transcription", icon: AudioLines, color: "text-emerald-300" },
              { href: "/try-langchain", key: "langchain", icon: Link2, color: "text-amber-300" },
            ].map(({ href, key, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                title={t(`demosPromo.${key}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs md:text-sm text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-full backdrop-blur-sm transition-colors duration-200"
              >
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {t(`demosPromo.${key}Short`)}
              </Link>
            ))}
          </div>
        </>
      ),
    },
  ];

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="group relative overflow-hidden animated-bg pt-5 pb-9 md:py-8"
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <ParticleBackground />
        <div className="absolute inset-0 z-10 mix-blend-overlay">
          <svg className="w-full h-full opacity-30" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tech-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
            <circle cx="500" cy="500" r="300" fill="none" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="10" />
            <circle cx="500" cy="500" r="200" fill="none" stroke="rgba(59, 130, 246, 0.8)" strokeWidth="10" />
            <circle cx="500" cy="500" r="100" fill="none" stroke="rgba(59, 130, 246, 1)" strokeWidth="10" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          variants={fadeIn}
          className="relative w-full h-[400px] sm:h-[360px] md:h-[300px] overflow-hidden"
        >
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.25 } }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 px-4">
                <div className={`shrink-0 order-1 md:order-2 ${slides[slide].mascotClass ?? ""}`}>
                  <img
                    src={slides[slide].mascot}
                    alt=""
                    className={`${slides[slide].mascotSize} drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]`}
                  />
                </div>
                <div className="text-center md:text-left order-2 md:order-1">{slides[slide].content}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="flex justify-center gap-2 mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === slide}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === slide ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/70 bg-white/5 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-300"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/70 bg-white/5 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-300"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </motion.section>
  );
};

export default Hero;
