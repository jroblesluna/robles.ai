import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Video, ChevronRight, ArrowRight, X, BookOpen, Sparkles } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";

// --- Toast ---
const handleEnrollClick = (status: any, message: any) => {
  toast({
    title: status,
    description: message,
    variant: "destructive",
  });
};

// --- Tipos ---
interface CourseCardProps {
  image: string;
  level: string;
  title: string;
  description: string;
  duration: string;
  format: string;
  regularPrice: string;
  price: string;
  category: string;
  buttonBg: string;
  buttonHoverBg: string;
  index: number;
  enrollText: string;
  courseStatus: string;
  courseMessage: string;
  details?: any; // opcional
}

/* =========================================================
   Modal de Detalles — más color + micro-animaciones
   ========================================================= */
const CourseDetailsModal = ({ details, onClose }: { details: any; onClose: () => void }) => {
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);

  if (!details) return null;

  // Utilidades
  const getSectionTitle = (s: any) => (typeof s === "string" ? s : s?.section ?? "");
  const hasSubsections = (s: any) =>
    typeof s !== "string" && Array.isArray(s?.subsections) && s.subsections.length > 0;

  // Paletas alternas para capítulos
  const chapterSkins = [
    { ring: "ring-emerald-300/60", bg: "bg-emerald-50 dark:bg-emerald-900/20", accent: "text-emerald-700 dark:text-emerald-300" },
    { ring: "ring-violet-300/60", bg: "bg-violet-50 dark:bg-violet-900/20", accent: "text-violet-700 dark:text-violet-300" },
    { ring: "ring-amber-300/60", bg: "bg-amber-50 dark:bg-amber-900/20", accent: "text-amber-700 dark:text-amber-300" },
    { ring: "ring-sky-300/60", bg: "bg-sky-50 dark:bg-sky-900/20", accent: "text-sky-700 dark:text-sky-300" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative z-[101] w-[min(1040px,95vw)] max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-neutral-900"
      >
        {/* Header con gradiente */}
        <div className="relative border-b border-neutral-200 dark:border-neutral-800">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-violet-500/15 to-sky-500/15" />
          <div className="relative p-6">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-1 h-6 w-6 text-emerald-600" />
              <div>
                <h2 className="text-2xl font-bold leading-tight text-neutral-900 dark:text-neutral-50">
                  {details.book?.title ?? "Course details"}
                </h2>
                {details.book?.subtitle && (
                  <p className="text-neutral-600 dark:text-neutral-300">
                    {details.book.subtitle}
                  </p>
                )}
                {(details.book?.author || details.book?.editorial || details.book?.date) && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {details.book?.author}
                    {details.book?.editorial ? ` — ${details.book.editorial}` : ""}
                    {details.book?.date ? ` (${details.book.date})` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de capítulos */}
        <div className="max-h-[calc(88vh-120px)] overflow-y-auto p-5">
          <div className="space-y-3">
            {details.chapters?.map((chapter: any, cIdx: number) => {
              const skin = chapterSkins[cIdx % chapterSkins.length];
              const isOpen = openChapter === cIdx;

              return (
                <div
                  key={cIdx}
                  className={`rounded-xl border border-neutral-200 ring-2 ${skin.ring} ${isOpen ? skin.bg : "bg-white"} transition-colors dark:border-neutral-800 dark:bg-neutral-900`}
                >
                  {/* Header capítulo */}
                  <button
                    className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    onClick={() => {
                      setOpenChapter(isOpen ? null : cIdx);
                      setOpenSection(null);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700 ${skin.accent}`}>
                        {cIdx + 1}
                      </span>
                      <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {chapter.title}
                      </span>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 text-neutral-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Secciones */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4"
                      >
                        <div className="space-y-2">
                          {chapter.sections?.map((section: any, sIdx: number) => {
                            const title = getSectionTitle(section);

                            // Sección simple (string)
                            if (!hasSubsections(section)) {
                              return (
                                <div
                                  key={sIdx}
                                  className="ml-9 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800/50 dark:text-neutral-300 dark:ring-neutral-700"
                                >
                                  • {title}
                                </div>
                              );
                            }

                            // Sección con subsecciones (acordeón — solo una abierta por capítulo)
                            const secId = `${cIdx}-${sIdx}`;
                            const secOpen = openSection === secId;

                            return (
                              <div
                                key={sIdx}
                                className="ml-7 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                              >
                                <button
                                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                  onClick={() => setOpenSection(secOpen ? null : secId)}
                                >
                                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                    {title}
                                  </span>
                                  <ChevronRight
                                    className={`h-4 w-4 text-neutral-500 transition-transform ${secOpen ? "rotate-90" : ""}`}
                                  />
                                </button>

                                <AnimatePresence initial={false}>
                                  {secOpen && (
                                    <motion.ul
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="space-y-1 px-5 pb-3"
                                    >
                                      {section.subsections.map((sub: string, k: number) => (
                                        <li
                                          key={k}
                                          className="relative rounded-md bg-gradient-to-r from-transparent via-transparent to-transparent px-3 py-2 text-sm text-neutral-700 hover:from-emerald-50 hover:to-sky-50 dark:text-neutral-300 dark:hover:from-neutral-800/60 dark:hover:to-neutral-800/60"
                                        >
                                          <span className="mr-2 text-emerald-600">•</span>
                                          {sub}
                                        </li>
                                      ))}
                                    </motion.ul>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* =========================================================
   Tarjeta de Curso (agrega botón “Detalles” vistoso)
   ========================================================= */
const CourseCard = ({
  image,
  level,
  title,
  description,
  duration,
  format,
  regularPrice,
  price,
  category,
  buttonBg,
  buttonHoverBg,
  index,
  enrollText,
  courseStatus,
  courseMessage,
  details,
}: CourseCardProps) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  // label con fallback a la nueva key view_details
  const detailsLabel =
    (t as any)("courses.view_details", { defaultValue: (t as any)("courses.details") });

  return (
    <>
      <motion.div
        variants={fadeIn}
        custom={0.3 + index * 0.1}
        className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Imagen */}
        <div className="relative h-48 overflow-hidden bg-neutral-100">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-neutral-800 shadow-sm backdrop-blur">
              {level}
            </span>
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white shadow-sm">
              {category}
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-1 flex-col p-6">
          <h3 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <p className="mb-4 flex-grow text-sm text-neutral-600 dark:text-neutral-300">
            {description}
          </p>

          <div className="mb-5 grid grid-cols-3 gap-2">
            <div className="flex items-center justify-center">
              <Clock className="mr-2 h-4 w-4 text-neutral-500" />
              <span className="text-sm text-neutral-600">{duration}</span>
            </div>
            <div className="flex items-center justify-center">
              <Video className="mr-2 h-4 w-4 text-neutral-500" />
              <span className="text-sm text-neutral-600">{format}</span>
            </div>

            {details && (
              <button
                onClick={() => setShowModal(true)}
                className="flex justify-center items-center gap-1 rounded-md bg-white text-sm  text-neutral-500 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700 dark:hover:bg-neutral-800"
              >
                <Sparkles className="h-4 w-4 text-emerald-600" />
                {detailsLabel}
              </button>
            )}

          </div>

          {/* Precios + botones */}
          <div className="flex items-center justify-between">
            <div>
              {price ? (
                <div className="flex flex-col">
                  <span className="text-sm text-neutral-500 line-through">{regularPrice}</span>
                  <span className="font-semibold text-rose-600">{price}</span>
                </div>
              ) : (
                <span className="font-semibold text-emerald-600">{regularPrice}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEnrollClick(courseStatus, courseMessage)}
                className={`flex items-center rounded-md px-4 py-2 text-white ${buttonBg} ${buttonHoverBg} transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                {enrollText}
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>{showModal && <CourseDetailsModal details={details} onClose={() => setShowModal(false)} />}</AnimatePresence>
    </>
  );
};

/* =========================================================
   Contenedor de Cursos
   ========================================================= */
const Courses = () => {
  const { t } = useTranslation();
  const coursesData = t("courses.items", { returnObjects: true }) as CourseCardProps[];

  return (
    <section id="courses" className="scroll-mt-10 bg-gray-50 py-16">
      <motion.div
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Encabezado */}
        <div className="mb-16 text-center">
          <motion.h2
            variants={fadeIn}
            custom={0}
            className="mb-4 bg-gradient-to-r from-emerald-600 via-violet-600 to-sky-600 bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl"
          >
            {t("courses.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="mx-auto max-w-3xl text-xl text-neutral-600"
          >
            {t("courses.subtitle")}
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {coursesData.map((course, index) => (
            <CourseCard
              key={index}
              {...course}
              index={index}
              enrollText={t("courses.enroll")}
              courseStatus={t("courses.status")}
              courseMessage={t("courses.statusMessage")}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Courses;