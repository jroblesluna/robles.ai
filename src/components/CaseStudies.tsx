import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Clock,
  Info,
  ArrowRight,
  Building2,
  HeartPulse,
  Landmark,
  MessageSquare,
  FileText,
  Layers,
  ListChecks,
  TrendingUp,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";

const CASE_STUDY_SLUGS: Record<number, string> = {
  1: "smart-city",
  2: "health",
  3: "finance",
  4: "telco",
};

// image4.png is the same Robles.AI logo placeholder in every folder — excluded on purpose
const CASE_STUDY_IMAGES: Record<string, string[]> = {
  "smart-city": ["image1.png", "image2.jpeg", "image3.png"],
  health: ["image1.png", "image2.png", "image3.png"],
  finance: ["image1.png", "image2.jpeg", "image3.jpeg"],
  telco: ["image1.jpeg", "image2.png", "image3.png"],
};

// Every case in content.json follows the same fixed section order, so the
// icon and "highlight the results" treatment can be mapped by index instead
// of matching on language-specific heading text.
const SECTION_ICONS: LucideIcon[] = [FileText, Layers, ListChecks, TrendingUp];
const RESULTS_SECTION_INDEX = 3;

type Accent = "blue" | "emerald" | "violet" | "amber";

/** Full class strings per accent (the Tailwind JIT needs literal names). */
const ACCENTS: Record<
  Accent,
  {
    value: string;
    link: string;
    dot: string;
    bar: string;
    soft: string;
    border: string;
    chipBg: string;
    chipText: string;
    gradient: string;
    hex: string;
  }
> = {
  blue: {
    value: "text-blue-600",
    link: "text-blue-600",
    dot: "bg-blue-500",
    bar: "bg-blue-400",
    soft: "bg-blue-50",
    border: "border-blue-200",
    chipBg: "bg-blue-100",
    chipText: "text-blue-700",
    gradient: "from-blue-50 via-blue-50/40 to-white",
    hex: "#2563eb",
  },
  emerald: {
    value: "text-emerald-600",
    link: "text-emerald-600",
    dot: "bg-emerald-500",
    bar: "bg-emerald-400",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-700",
    gradient: "from-emerald-50 via-emerald-50/40 to-white",
    hex: "#059669",
  },
  violet: {
    value: "text-violet-600",
    link: "text-violet-600",
    dot: "bg-violet-500",
    bar: "bg-violet-400",
    soft: "bg-violet-50",
    border: "border-violet-200",
    chipBg: "bg-violet-100",
    chipText: "text-violet-700",
    gradient: "from-violet-50 via-violet-50/40 to-white",
    hex: "#7c3aed",
  },
  amber: {
    value: "text-amber-600",
    link: "text-amber-600",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
    soft: "bg-amber-50",
    border: "border-amber-200",
    chipBg: "bg-amber-100",
    chipText: "text-amber-700",
    gradient: "from-amber-50 via-amber-50/40 to-white",
    hex: "#b45309",
  },
};

/** One icon per case (by id), a quiet stand-in for the old percentage on the left tabs. */
const CASE_ICONS: Record<number, LucideIcon> = {
  1: Building2,
  2: HeartPulse,
  3: Landmark,
  4: MessageSquare,
};

interface Metric {
  qualifier: string;
  value: string;
  label: string;
}

interface CaseStudy {
  id: number;
  caseType?: string;
  title: string;
  headline?: string;
  description: string;
  image: string;
  category: string;
  accent: Accent;
  timeline: string;
  metrics: Metric[];
}

/** Pulls "Client: X | Duration: Y<br/>Technologies: Z" apart without assuming
 *  a language — it just splits on the punctuation the content always uses,
 *  so it works for both the English and Spanish copy. */
function parseMeta(metaHtml: string) {
  const inner = metaHtml.replace(/<\/?p[^>]*>/g, "");
  const [firstLine = "", techLine = ""] = inner.split(/<br\s*\/?>/i);
  const [clientPart, durationPart] = firstLine.split("|");

  const splitLabel = (part?: string) => {
    if (!part) return null;
    const idx = part.indexOf(":");
    if (idx === -1) return null;
    return { label: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
  };

  const client = splitLabel(clientPart);
  const duration = splitLabel(durationPart);
  const techEntry = splitLabel(techLine);
  const technologies = techEntry ? techEntry.value.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return { client, duration, technologies };
}

interface CaseStudyViewerProps {
  study: CaseStudy;
  onClose: () => void;
}

const CaseStudyViewer = ({ study, onClose }: CaseStudyViewerProps) => {
  const { t, i18n } = useTranslation();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const slug = CASE_STUDY_SLUGS[study.id];
  const langCode = i18n.language === "es" ? "es" : "en";
  const images = CASE_STUDY_IMAGES[slug] || [];
  const accent = ACCENTS[study.accent] ?? ACCENTS.blue;
  const CategoryIcon = CASE_ICONS[study.id];

  useEffect(() => {
    fetch("/case-studies/content.json")
      .then((res) => res.json())
      .then((data) => {
        setHtmlContent(data[slug]?.[langCode] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, langCode]);

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

  // Parse HTML content into sections based on h3 headings
  const parsedContent = useMemo(() => {
    if (!htmlContent) return null;

    const h2Match = htmlContent.match(/<h2>[\s\S]*?<\/h2>/);
    const metaMatch = htmlContent.match(/<p class="meta">[\s\S]*?<\/p>/);
    const disclaimerMatch = htmlContent.match(/<p class="disclaimer">[\s\S]*?<\/p>/);

    const title = h2Match ? h2Match[0].replace(/<\/?h2>/g, "") : study.title;
    const meta = metaMatch ? parseMeta(metaMatch[0]) : { client: null, duration: null, technologies: [] };
    const disclaimer = disclaimerMatch?.[0] || "";

    let body = htmlContent;
    if (h2Match) body = body.replace(h2Match[0], "");
    if (metaMatch) body = body.replace(metaMatch[0], "");
    if (disclaimerMatch) body = body.replace(disclaimerMatch[0], "");

    const sections: { heading: string; content: string }[] = [];
    const h3Regex = /<h3>([\s\S]*?)<\/h3>/g;
    let match;
    const h3Positions: { index: number; heading: string; fullMatch: string }[] = [];

    while ((match = h3Regex.exec(body)) !== null) {
      h3Positions.push({ index: match.index, heading: match[1], fullMatch: match[0] });
    }

    for (let i = 0; i < h3Positions.length; i++) {
      const start = h3Positions[i].index + h3Positions[i].fullMatch.length;
      const end = i + 1 < h3Positions.length ? h3Positions[i + 1].index : body.length;
      const sectionContent = body.slice(start, end).trim();
      sections.push({ heading: h3Positions[i].heading, content: sectionContent });
    }

    return { title, meta, sections, disclaimer };
  }, [htmlContent, study.title]);

  const illustrativeLabel = langCode === "es"
    ? "Caso ilustrativo — ejemplo representativo de nuestra metodología, no vinculado a un cliente específico."
    : "Illustrative case — representative example of our methodology, not linked to a specific client.";

  const handleScroll = () => {
    const container = contentRef.current;
    if (!container) return;
    const scrollPos = container.scrollTop + 140;
    let current = 0;
    sectionRefs.current.forEach((el, i) => {
      if (el && el.offsetTop <= scrollPos) current = i;
    });
    setActiveSection(current);
  };

  const scrollToSection = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative flex w-full max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          {/* Brand bar */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="text-base font-bold text-gray-900">
              Robles<span className="text-blue-500">.AI</span>
            </span>
            <button
              onClick={onClose}
              className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm text-gray-400">{study.title}</p>
              </div>
            ) : parsedContent ? (
              <div>
                {/* Hero */}
                <div className={`bg-gradient-to-b ${accent.gradient} border-b border-gray-100 px-6 py-8 md:px-10 md:py-10`}>
                  <div className="mx-auto max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {CategoryIcon && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${accent.chipBg}`}>
                          <CategoryIcon className={`h-3.5 w-3.5 ${accent.chipText}`} />
                          <span className={`text-xs font-medium ${accent.chipText}`}>{study.category}</span>
                        </span>
                      )}
                      {study.caseType === "illustrative" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1">
                          <Info className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">
                            {langCode === "es" ? "Caso ilustrativo" : "Illustrative case"}
                          </span>
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
                      {parsedContent.title}
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                      {parsedContent.meta.client && (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-500">{parsedContent.meta.client.label}:</span>
                          {parsedContent.meta.client.value}
                        </span>
                      )}
                      {parsedContent.meta.duration && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-500">{parsedContent.meta.duration.label}:</span>
                          {parsedContent.meta.duration.value}
                        </span>
                      )}
                    </div>

                    {/* Stat strip — the headline numbers, pulled up front instead of
                        buried in the Results section bullet list. */}
                    {study.metrics?.length > 0 && (
                      <div className={`mt-6 grid grid-cols-2 gap-4 rounded-2xl border ${accent.border} bg-white/70 p-5 sm:gap-6 sm:p-6`}>
                        {study.metrics.map((m) => (
                          <div key={m.label}>
                            <span className={`block text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${accent.value}`}>
                              {m.qualifier && (
                                <span className="mr-1.5 align-middle text-xs font-semibold uppercase tracking-wider text-gray-400">
                                  {m.qualifier}
                                </span>
                              )}
                              {m.value}
                            </span>
                            <span className="mt-1 block text-sm leading-snug text-gray-600">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {parsedContent.meta.technologies.length > 0 && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {t("caseStudies.techStack")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {parsedContent.meta.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {study.caseType === "illustrative" && (
                      <p className="mt-5 text-xs italic text-gray-400">{illustrativeLabel}</p>
                    )}
                  </div>
                </div>

                {/* Body: section nav (desktop) + sections */}
                <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 lg:grid lg:grid-cols-[190px_1fr] lg:gap-10">
                  <nav className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
                    <ul className="space-y-1 border-l border-gray-100">
                      {parsedContent.sections.map((section, index) => {
                        const Icon = SECTION_ICONS[index];
                        const isActive = index === activeSection;
                        return (
                          <li key={index}>
                            <button
                              type="button"
                              onClick={() => scrollToSection(index)}
                              className={`-ml-px flex w-full items-center gap-2 border-l-2 py-1.5 pl-3 text-left text-sm transition-colors ${
                                isActive
                                  ? `border-current font-semibold ${accent.value}`
                                  : "border-transparent text-gray-500 hover:text-gray-800"
                              }`}
                            >
                              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">{section.heading}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  <div className="min-w-0">
                    {parsedContent.sections.map((section, index) => {
                      const imageIndex = index < images.length ? index : null;
                      const Icon = SECTION_ICONS[index];
                      const isResults = index === RESULTS_SECTION_INDEX;

                      return (
                        <div
                          key={index}
                          ref={(el) => { sectionRefs.current[index] = el; }}
                          className={`scroll-mt-6 ${index > 0 ? "mt-10 border-t border-gray-100 pt-10" : ""} ${
                            isResults ? `-mx-5 rounded-2xl border ${accent.border} ${accent.soft} px-5 py-6 sm:-mx-6 sm:px-6` : ""
                          }`}
                        >
                          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
                            {Icon && (
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent.chipBg}`}>
                                <Icon className={`h-4 w-4 ${accent.chipText}`} />
                              </span>
                            )}
                            {section.heading}
                          </h3>
                          {imageIndex !== null && (
                            <img
                              src={`/case-studies/${slug}/${images[imageIndex]}`}
                              alt={`${section.heading} illustration`}
                              className="mb-5 w-full rounded-xl border border-gray-100 shadow-md"
                            />
                          )}
                          <div
                            className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                            style={isResults ? ({ "--tw-prose-bullets": accent.hex } as React.CSSProperties) : undefined}
                            dangerouslySetInnerHTML={{ __html: section.content }}
                          />
                        </div>
                      );
                    })}

                    {parsedContent.disclaimer && (
                      <div
                        className="prose prose-sm mt-10 max-w-none border-t border-gray-100 pt-6 prose-p:italic prose-p:text-gray-400"
                        dangerouslySetInnerHTML={{ __html: parsedContent.disclaimer }}
                      />
                    )}

                    {/* CTA */}
                    <div className={`mt-10 flex flex-col items-start gap-4 rounded-2xl border ${accent.border} ${accent.soft} p-6 sm:flex-row sm:items-center sm:justify-between`}>
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accent.chipBg}`}>
                          <Sparkles className={`h-4.5 w-4.5 ${accent.chipText}`} />
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{t("caseStudies.ctaTitle")}</p>
                          <p className="mt-1 text-sm text-gray-600">{t("caseStudies.ctaSubtitle")}</p>
                        </div>
                      </div>
                      <Link
                        href="/diagnostico-ia"
                        onClick={onClose}
                        className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                      >
                        {t("caseStudies.ctaButton")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-16 text-center text-gray-500">Content not available.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Cases ────────────────────────────────────────────────────────────────────
// Compact, tabbed layout: one tab per industry and a single panel with the
// selected case (image, summary and its two key figures). The cases are
// illustrative, so there are no client logos or quotes; a note says so.

function CasePanel({ study, onOpen }: { study: CaseStudy; onOpen: () => void }) {
  const { t } = useTranslation();
  const accent = ACCENTS[study.accent] ?? ACCENTS.blue;
  const CategoryIcon = CASE_ICONS[study.id];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group grid overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg sm:grid-cols-5"
    >
      <div className="relative h-44 overflow-hidden bg-gray-100 sm:col-span-2 sm:h-auto">
        <img
          src={study.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
        {CategoryIcon && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
            <CategoryIcon className={`h-3.5 w-3.5 ${accent.value}`} />
            {study.category}
          </span>
        )}
      </div>
      <div className="flex flex-col p-6 sm:col-span-3 sm:p-7">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-gray-900 sm:text-xl">
          {study.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">{study.description}</p>

        {study.metrics?.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-gray-100 pt-5">
            {study.metrics.slice(0, 2).map((m) => (
              <div key={m.label}>
                <dt className="sr-only">{m.label}</dt>
                <dd>
                  <span className={`block text-base font-semibold tracking-tight tabular-nums ${accent.value}`}>
                    {m.qualifier && (
                      <span className="mr-1 align-middle text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        {m.qualifier}
                      </span>
                    )}
                    {m.value}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-gray-500">{m.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {study.timeline}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className={`group/btn inline-flex items-center gap-1 text-sm font-semibold ${accent.link}`}
          >
            {t("caseStudies.readMore")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const CaseStudies = () => {
  const { t } = useTranslation();
  const raw = t("caseStudies.items", { returnObjects: true }) as CaseStudy[];
  const studies = Array.isArray(raw) ? raw : [];
  const [active, setActive] = useState(0);
  const [viewerStudy, setViewerStudy] = useState<CaseStudy | null>(null);
  const current = studies[active] ?? studies[0];

  // Auto-advance to the next case every 5s, matching the loading bar under
  // each tab. Runs continuously — an earlier pause-on-hover made the bar
  // stop every time the cursor rested anywhere over the section, which read
  // as it "getting stuck" rather than as an intentional pause.
  const CASE_DURATION = 5000;

  useEffect(() => {
    if (studies.length <= 1) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % studies.length), CASE_DURATION);
    return () => clearTimeout(id);
  }, [active, studies.length]);

  return (
    <section id="case-studies" className="scroll-mt-10 bg-gray-50 py-16 md:py-20">
      <motion.div
        className="container mx-auto max-w-6xl px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left: heading + industry tabs */}
          <div className="min-w-0 lg:col-span-5">
            <motion.p variants={fadeIn} custom={0} className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {t("caseStudies.eyebrow")}
            </motion.p>
            <motion.h2 variants={fadeIn} custom={0.05} className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              {t("caseStudies.title")}
            </motion.h2>
            <motion.p variants={fadeIn} custom={0.1} className="mt-3 text-base leading-relaxed text-gray-600">
              {t("caseStudies.subtitle")}
            </motion.p>

            <motion.div
              variants={fadeIn}
              custom={0.15}
              role="tablist"
              aria-label={t("caseStudies.eyebrow")}
              className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:mt-8 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
            >
              {studies.map((s, i) => {
                const selected = i === active;
                const accent = ACCENTS[s.accent] ?? ACCENTS.blue;
                const Icon = CASE_ICONS[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActive(i)}
                    className={`relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-left text-sm transition-colors lg:py-3 ${
                      selected
                        ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200"
                        : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${selected ? accent.dot : "bg-gray-300"}`} />
                    <span className="whitespace-nowrap lg:flex-1">{s.category}</span>
                    {Icon && <Icon className={`hidden h-4 w-4 shrink-0 lg:block ${selected ? accent.value : "text-gray-300"}`} />}
                    {/* Loading bar: fills over 5s while this case is showing, then the panel rotates.
                        The ring above is `ring-inset` so its edge lines up with the border box —
                        otherwise the default outer ring sits 1px past it and the bar reads as floating. */}
                    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gray-100">
                      {selected && (
                        <span
                          key={active}
                          className={`block h-full origin-left rounded-full opacity-80 ${accent.bar} ${
                            studies.length > 1 ? "animate-case-bar" : ""
                          }`}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </motion.div>

            <motion.p variants={fadeIn} custom={0.2} className="mt-6 hidden text-sm text-gray-600 lg:block">
              {t("caseStudies.otherIndustry")}{" "}
              <Link
                href="/diagnostico-ia"
                className="group inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
              >
                {t("caseStudies.otherIndustryCta")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.p>
          </div>

          {/* Right: the selected case */}
          <motion.div
            variants={fadeIn}
            custom={0.2}
            className="flex min-w-0 flex-col mt-[5px] lg:col-span-7 lg:mt-[56px]"
          >
            <AnimatePresence mode="wait">
              {current && (
                <CasePanel
                  key={current.id}
                  study={current}
                  onOpen={() => setViewerStudy(current)}
                />
              )}
            </AnimatePresence>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-gray-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("caseStudies.footnote")}
            </p>
            <p className="mt-4 text-sm text-gray-600 lg:hidden">
              {t("caseStudies.otherIndustry")}{" "}
              <Link href="/diagnostico-ia" className="inline-flex items-center gap-1 font-semibold text-blue-600">
                {t("caseStudies.otherIndustryCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
      {viewerStudy && (
        <CaseStudyViewer study={viewerStudy} onClose={() => setViewerStudy(null)} />
      )}
    </section>
  );
};

export default CaseStudies;
