import { JSX, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Eye, MessageSquare, BarChart3 } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import VideoModal from "@/components/VideoModal";
/*
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

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
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
          className="relative w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl bg-gray-900"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white text-black rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-md"
            aria-label="Close video"
          >
            ✕
          </button>
          <iframe
            src={videoSrc}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="w-full h-[70vh] rounded-xl"
            title="Solution Video"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
*/
type IconName = "Cpu" | "Eye" | "MessageSquare" | "BarChart3";

interface SolutionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  linkColor: string;
  linkHoverColor: string;
  image: string;
  index: number;
  solutionCta: string;
  videoSrc: string;
  onCtaClick?: () => void;
}

const iconAnimation = {
  hidden: { scale: 1 },
  hover: {
    scale: 1.2,
    rotate: 5,
    transition: { duration: 0.3, type: "spring" as const, stiffness: 200 },
  },
};

const SolutionCard = ({
  icon,
  title,
  description,
  color,
  bgColor,
  linkColor,
  linkHoverColor,
  image,
  index,
  solutionCta,
  onCtaClick,
}: SolutionCardProps) => (
  <motion.div
    variants={fadeIn}
    custom={0.3 + index * 0.1}
    className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group cursor-pointer"
    whileHover="hover"
    initial="hidden"
    animate="visible"
    onClick={onCtaClick}
  >
    <div className={`h-48 ${bgColor} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-40 group-hover:opacity-20 transition-opacity duration-300">
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="h-24 w-24 text-white drop-shadow-lg"
          variants={iconAnimation}
        >
          {icon}
        </motion.div>
      </div>
    </div>
    <div className="p-6">
      <h3 className={`text-xl font-semibold ${color} mb-2`}>{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <button
        onClick={onCtaClick}
        className={`${linkColor} font-bold ${linkHoverColor} flex items-center transition-all duration-300 group-hover:translate-x-1`}
      >
        {solutionCta}
        <span className="ml-2 inline-flex items-center px-2 py-1 bg-red-600 text-white rounded-md shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    </div>
  </motion.div>
);

const Solutions = () => {
  const { t } = useTranslation();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const solutions = t("solutions.items", { returnObjects: true }) as Array<
    SolutionCardProps & { icon: IconName; id: number }
  >;

  const iconComponents: Record<IconName, JSX.Element> = {
    Cpu: <Cpu className="w-full h-full" />,
    Eye: <Eye className="w-full h-full" />,
    MessageSquare: <MessageSquare className="w-full h-full" />,
    BarChart3: <BarChart3 className="w-full h-full" />,
  };

  return (
    <section id="solutions" className="py-16 bg-blue-50 scroll-mt-10">
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
            {t("solutions.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("solutions.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {solutions.map((solution, index) => (
            <SolutionCard
              key={solution.id}
              icon={iconComponents[solution.icon as IconName]}
              title={solution.title}
              description={solution.description}
              color={solution.color}
              bgColor={solution.bgColor}
              linkColor={solution.linkColor}
              linkHoverColor={solution.linkHoverColor}
              image={`/images/${solution.image}`}
              index={index}
              solutionCta={solution.solutionCta}
              videoSrc={solution.videoSrc}
              onCtaClick={() => setVideoSrc(solution.videoSrc)}
            />
          ))}
        </div>
      </motion.div>

      {videoSrc && (
        <VideoModal videoSrc={videoSrc} onClose={() => setVideoSrc(null)} />
      )}
    </section>
  );
};

export default Solutions;