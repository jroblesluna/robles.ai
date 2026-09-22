import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Clock, Info, ArrowRight } from "lucide-react";
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


// ── Cards ────────────────────────────────────────────────────────────────────
// Metric-led layout (customer-stories style): the outcome is the headline and
// the numbers carry the card. The cases are illustrative, so there are no
// client logos or quotes; each card says so and the section ends with a note.

type Accent = "blue" | "emerald" | "violet" | "amber";

/** Full class strings per accent (the Tailwind JIT needs literal names). */
const ACCENTS: Record<Accent, { chip: string; value: string; link: string }> = {
  blue: { chip: "bg-blue-50 text-blue-700 ring-blue-200", value: "text-blue-600", link: "text-blue-600" },
  emerald: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", value: "text-emerald-600", link: "text-emerald-600" },
  violet: { chip: "bg-violet-50 text-violet-700 ring-violet-200", value: "text-violet-600", link: "text-violet-600" },
  amber: { chip: "bg-amber-50 text-amber-700 ring-amber-200", value: "text-amber-600", link: "text-amber-600" },
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
  headline: string;
  description: string;
  image: string;
  category: string;
  accent: Accent;
  timeline: string;
  metrics: Metric[];
}

function MetricBlock({ metric, accent, size }: { metric: Metric; accent: Accent; size: "lg" | "md" }) {
  return (
    <div>
      {metric.qualifier && (
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{metric.qualifier}</p>
      )}
      <p className={`font-bold tracking-tight tabular-nums ${ACCENTS[accent].value} ${size === "lg" ? "text-4xl" : "text-3xl"}`}>
        {metric.value}
      </p>
      <p className="mt-1 text-sm leading-snug text-gray-600">{metric.label}</p>
    </div>
  );
}

function CardImage({ study, badge, className }: { study: CaseStudy; badge: string; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      <img
        src={study.image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ACCENTS[study.accent].chip}`}>
          {study.category}
        </span>
        {study.caseType === "illustrative" && (
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-600 backdrop-blur-sm">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function ReadMore({ label, accent }: { label: string; accent: Accent }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${ACCENTS[accent].link}`}>
      {label}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </span>
  );
}

function Timeline({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <Clock className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

/** Large story: image on one side, outcome and two headline metrics on the other. */
function FeaturedCase({ study, onOpen }: { study: CaseStudy; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.button
      type="button"
      variants={fadeIn}
      custom={0.2}
      onClick={onOpen}
      className="group grid w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm transition-shadow duration-300 hover:shadow-xl lg:grid-cols-2"
    >
      <CardImage study={study} badge={t("caseStudies.illustrativeBadge")} className="min-h-[240px]" />
      <div className="flex flex-col p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{study.title}</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{study.headline}</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">{study.description}</p>
        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-gray-100 pt-6">
          {study.metrics.map((m) => (
            <MetricBlock key={m.label} metric={m} accent={study.accent} size="lg" />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between gap-4">
          <Timeline text={study.timeline} />
          <ReadMore label={t("caseStudies.readMore")} accent={study.accent} />
        </div>
      </div>
    </motion.button>
  );
}

/** Compact story: image, outcome and the lead metric. */
function CaseCard({ study, index, onOpen }: { study: CaseStudy; index: number; onOpen: () => void }) {
  const { t } = useTranslation();
  const lead = study.metrics[0];
  return (
    <motion.button
      type="button"
      variants={fadeIn}
      custom={0.3 + index * 0.1}
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <CardImage study={study} badge={t("caseStudies.illustrativeBadge")} className="aspect-[16/9] w-full" />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{study.title}</p>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-gray-900">{study.headline}</h3>
        {lead && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <MetricBlock metric={lead} accent={study.accent} size="md" />
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <Timeline text={study.timeline} />
          <ReadMore label={t("caseStudies.readMore")} accent={study.accent} />
        </div>
      </div>
    </motion.button>
  );
}

const CaseStudies = () => {
  const { t } = useTranslation();
  const studies = t("caseStudies.items", { returnObjects: true }) as CaseStudy[];
  const [viewerData, setViewerData] = useState<{ id: number; title: string; caseType?: string } | null>(null);
  const open = (s: CaseStudy) => setViewerData({ id: s.id, title: s.title, caseType: s.caseType });
  const [featured, ...rest] = Array.isArray(studies) ? studies : [];

  return (
    <section id="case-studies" className="scroll-mt-10 bg-gray-50 py-20">
      <motion.div
        className="container mx-auto max-w-6xl px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {/* Header: title on the left, next step on the right */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <motion.p variants={fadeIn} custom={0} className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {t("caseStudies.eyebrow")}
            </motion.p>
            <motion.h2 variants={fadeIn} custom={0.05} className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              {t("caseStudies.title")}
            </motion.h2>
            <motion.p variants={fadeIn} custom={0.1} className="mt-3 text-base leading-relaxed text-gray-600 md:text-lg">
              {t("caseStudies.subtitle")}
            </motion.p>
          </div>
          <motion.div variants={fadeIn} custom={0.15} className="shrink-0">
            <p className="mb-2 text-sm text-gray-500">{t("caseStudies.otherIndustry")}</p>
            <Link
              href="/diagnostico-ia"
              className="group inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
            >
              {t("caseStudies.otherIndustryCta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>

        {featured && <FeaturedCase study={featured} onOpen={() => open(featured)} />}

        {rest.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((s, i) => (
              <CaseCard key={s.id} study={s} index={i} onOpen={() => open(s)} />
            ))}
          </div>
        )}

        <motion.p variants={fadeIn} custom={0.5} className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-gray-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("caseStudies.footnote")}
        </motion.p>
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
