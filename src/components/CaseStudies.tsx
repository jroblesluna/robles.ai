import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";

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
}: CaseStudyCardProps) => (
  <motion.div
    variants={fadeIn}
    custom={0.3 + index * 0.2}
    className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100"
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
      <a
        href="#"
        className={`inline-flex items-center ${ctaColor} font-medium ${ctaHoverColor} transition-all duration-300 hover:translate-x-1`}
      >
        Read full case study
        <ChevronRight className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
      </a>
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

  const processedCaseStudies = caseStudies.map((study) => ({
    ...study,
    stats: study.stats.map((stat: any) => ({
      ...stat,
      icon: getIconComponent(stat.icon),
    })),
  }));

  return (
    <section id="case-studies" className="py-16 bg-gray-50">
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
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("caseStudies.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {processedCaseStudies.map((study, index) => (
            <CaseStudyCard key={study.id} {...study} index={index} />
          ))}
        </div>

        <motion.div
          variants={fadeIn}
          custom={0.7}
          className="text-center mt-12"
        >
          <a
            href="#"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            {t("caseStudies.viewAll")}
            <ChevronRight className="h-5 w-5 ml-2" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default CaseStudies;
