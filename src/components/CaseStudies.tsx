import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Clock, Info, ArrowRight, Building2, HeartPulse, Landmark, MessageSquare, type LucideIcon } from "lucide-react";
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

interface CaseStudyViewerProps {
  id: number;
  title: string;
  caseType?: string;
  onClose: () => void;
}

const CaseStudyViewer = ({ id, title, caseType, onClose }: CaseStudyViewerProps) => {
  const { t, i18n } = useTranslation();
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const slug = CASE_STUDY_SLUGS[id];
  const langCode = i18n.language === "es" ? "es" : "en";
  const images = CASE_STUDY_IMAGES[slug] || [];

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

    // Extract the header (h2 + meta paragraph)
    const h2Match = htmlContent.match(/<h2>[\s\S]*?<\/h2>/);
    const metaMatch = htmlContent.match(/<p class="meta">[\s\S]*?<\/p>/);
    const disclaimerMatch = htmlContent.match(/<p class="disclaimer">[\s\S]*?<\/p>/);

    const header = (h2Match?.[0] || "") + (metaMatch?.[0] || "");
    const disclaimer = disclaimerMatch?.[0] || "";

    // Remove header and disclaimer from the content to parse sections
    let body = htmlContent;
    if (h2Match) body = body.replace(h2Match[0], "");
    if (metaMatch) body = body.replace(metaMatch[0], "");
    if (disclaimerMatch) body = body.replace(disclaimerMatch[0], "");

    // Split by h3 headings
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

    return { header, sections, disclaimer };
  }, [htmlContent]);

  const illustrativeLabel = langCode === "es"
    ? "Caso ilustrativo — ejemplo representativo de nuestra metodología, no vinculado a un cliente específico."
    : "Illustrative case — representative example of our methodology, not linked to a specific client.";

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
          className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Brand bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
            <img src="/favicon.svg" alt="" className="w-7 h-7" />
            <span className="text-base font-bold text-gray-900">
              Robles<span className="text-blue-500">.AI</span>
            </span>
            <button
              onClick={onClose}
              className="ml-auto flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">{title}</p>
              </div>
            ) : parsedContent ? (
              <div>
                {/* Hero */}
                <div className="px-6 md:px-10 py-8 bg-gradient-to-b from-blue-50/70 to-white border-b border-gray-100">
                  <div className="max-w-4xl mx-auto">
                    {caseType === "illustrative" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 bg-blue-100 rounded-full">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">
                          {langCode === "es" ? "Caso ilustrativo" : "Illustrative case"}
                        </span>
                      </div>
                    )}
                    <div
                      className="prose prose-sm sm:prose-base max-w-none prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:font-bold prose-h2:text-gray-900 prose-h2:mb-3 prose-p:text-gray-500 prose-p:text-sm"
                      dangerouslySetInnerHTML={{ __html: parsedContent.header }}
                    />
                    {caseType === "illustrative" && (
                      <p className="mt-3 text-xs text-gray-400 italic">{illustrativeLabel}</p>
                    )}
                  </div>
                </div>

                {/* Sections — single column, image as banner */}
                <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
                  {parsedContent.sections.map((section, index) => {
                    const imageIndex = index < images.length ? index : null;

                    return (
                      <div key={index} className={index > 0 ? "mt-10 pt-10 border-t border-gray-100" : ""}>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.heading}</h3>
                        {imageIndex !== null && (
                          <img
                            src={`/case-studies/${slug}/${images[imageIndex]}`}
                            alt={`${section.heading} illustration`}
                            className="w-full rounded-xl shadow-md border border-gray-100 mb-5"
                          />
                        )}
                        <div
                          className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </div>
                    );
                  })}

                  {/* Disclaimer */}
                  {parsedContent.disclaimer && (
                    <div
                      className="mt-10 pt-6 border-t border-gray-100 prose prose-sm max-w-none prose-p:text-gray-400 prose-p:italic"
                      dangerouslySetInnerHTML={{ __html: parsedContent.disclaimer }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-16">Content not available.</p>
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

type Accent = "blue" | "emerald" | "violet" | "amber";

/** Full class strings per accent (the Tailwind JIT needs literal names).
 *  `bar` is a softer, lower-contrast tint — the loading bar stays understated. */
const ACCENTS: Record<Accent, { value: string; link: string; dot: string; bar: string }> = {
  blue: { value: "text-blue-600", link: "text-blue-600", dot: "bg-blue-500", bar: "bg-blue-400" },
  emerald: { value: "text-emerald-600", link: "text-emerald-600", dot: "bg-emerald-500", bar: "bg-emerald-400" },
  violet: { value: "text-violet-600", link: "text-violet-600", dot: "bg-violet-500", bar: "bg-violet-400" },
  amber: { value: "text-amber-600", link: "text-amber-600", dot: "bg-amber-500", bar: "bg-amber-400" },
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

function CasePanel({ study, onOpen }: { study: CaseStudy; onOpen: () => void }) {
  const { t } = useTranslation();
  const accent = ACCENTS[study.accent] ?? ACCENTS.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="grid overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm sm:grid-cols-5"
    >
      <div className="relative h-44 overflow-hidden bg-gray-100 sm:col-span-2 sm:h-auto">
        <img src={study.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="flex flex-col p-6 sm:col-span-3 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{study.category}</p>
        <h3 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-gray-900 sm:text-xl">
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
            className={`group inline-flex items-center gap-1 text-sm font-semibold ${accent.link}`}
          >
            {t("caseStudies.readMore")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
  const [viewerData, setViewerData] = useState<{ id: number; title: string; caseType?: string } | null>(null);
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
            className="flex min-w-0 flex-col lg:col-span-7 lg:mt-[51px]"
          >
            <AnimatePresence mode="wait">
              {current && (
                <CasePanel
                  key={current.id}
                  study={current}
                  onOpen={() => setViewerData({ id: current.id, title: current.title, caseType: current.caseType })}
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
      {viewerData && (
        <CaseStudyViewer
          id={viewerData.id}
          title={viewerData.title}
          caseType={viewerData.caseType}
          onClose={() => setViewerData(null)}
        />
      )}
    </section>
  );
};

export default CaseStudies;
