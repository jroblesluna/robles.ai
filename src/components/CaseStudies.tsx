import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  ChevronRight,
  Info,
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

interface CaseStudyCardProps {
  image: string;
  category: string;
  categoryColor: string;
  categoryBgColor: string;
  title: string;
  description: string;
  stats: {
    icon: React.ReactNode;
    text: string;
    iconColor: string;
  }[];
  ctaColor: string;
  ctaHoverColor: string;
  index: number;
  ctaText: string;
  onCtaClick?: () => void;
}

const CaseStudyCard = ({
  image,
  category,
  categoryColor,
  categoryBgColor,
  title,
  description,
  stats,
  ctaColor,
  ctaHoverColor,
  index,
  ctaText,
  onCtaClick,
}: CaseStudyCardProps) => (
  <motion.div
    variants={fadeIn}
    custom={0.3 + index * 0.2}
    className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 cursor-pointer"
    onClick={onCtaClick}
  >
    <div className="aspect-video bg-gray-200 relative overflow-hidden">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute top-4 left-4">
        <span
          className={`px-3 py-1.5 ${categoryBgColor} ${categoryColor} rounded-full text-sm font-medium shadow-md`}
        >
          {category}
        </span>
      </div>
    </div>
    <div className="p-8">
      <h3 className="text-2xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <div className="flex flex-wrap items-center text-sm text-gray-500 mb-6 gap-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="flex items-center mr-6 mb-2 bg-gray-50 px-3 py-1.5 rounded-full"
          >
            <div className={`h-5 w-5 mr-2 ${stat.iconColor}`}>{stat.icon}</div>
            <span className="font-medium">{stat.text}</span>
          </div>
        ))}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCtaClick?.();
        }}
        className={`inline-flex items-center ${ctaColor} font-medium ${ctaHoverColor} transition-all duration-300 hover:translate-x-1`}
      >
        {ctaText}
        <ChevronRight className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </div>
  </motion.div>
);

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "CheckCircle":
      return <CheckCircle className="w-full h-full" />;
    case "Clock":
      return <Clock className="w-full h-full" />;
    default:
      return <CheckCircle className="w-full h-full" />;
  }
};

const CaseStudies = () => {
  const { t } = useTranslation();
  const caseStudies = t("caseStudies.items", { returnObjects: true }) as any[];
  const [viewerData, setViewerData] = useState<{ id: number; title: string; caseType?: string } | null>(null);

  const processedCaseStudies = caseStudies.map((study) => ({
    ...study,
    stats: study.stats.map((stat: any) => ({
      ...stat,
      icon: getIconComponent(stat.icon),
    })),
  }));

  return (
    <section id="case-studies" className="py-16 bg-gray-50 scroll-mt-10">
      <motion.div
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="text-center mb-16">
          <motion.h2
            variants={fadeIn}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {t("caseStudies.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-4xl mx-auto"
          >
            {t("caseStudies.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {processedCaseStudies.map((study, index) => (
            <CaseStudyCard
              key={study.id}
              {...study}
              index={index}
              onCtaClick={() => setViewerData({ id: study.id, title: study.title, caseType: study.caseType })}
            />
          ))}
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
