import { motion } from "framer-motion";
import { Clock, Video, ChevronRight, ArrowRight } from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";

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
}

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
}: CourseCardProps) => (
  <motion.div
    variants={fadeIn}
    custom={0.3 + index * 0.1}
    className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
  >
    <div className="h-48 relative overflow-hidden bg-gray-100">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      <div className="absolute top-4 left-4 flex flex-col space-y-2">
        <span className="px-3 py-1 bg-white/90 text-gray-800 rounded-full text-sm font-medium shadow-sm">
          {level}
        </span>
        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium shadow-sm">
          {category}
        </span>
      </div>
    </div>
    <div className="p-6 flex-grow flex flex-col">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 text-sm flex-grow">{description}</p>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-gray-600 text-sm">{duration}</span>
        </div>
        <div className="flex items-center justify-end">
          <Video className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-gray-600 text-sm">{format}</span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div>
          {price ? (
            <div className="flex flex-col">
              <span className="text-gray-500 line-through text-sm">{regularPrice}</span>
              <span className="text-red-600 font-semibold">{price}</span>
            </div>
          ) : (
            <span className="text-blue-600 font-semibold">{regularPrice}</span>
          )}
        </div>
        <a
          href="#"
          className={`px-4 py-2 ${buttonBg} ${buttonHoverBg} text-white rounded-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex items-center`}
        >
          Enroll
          <ArrowRight className="h-4 w-4 ml-1" />
        </a>
      </div>
    </div>
  </motion.div>
);

const Courses = () => {
  const { t } = useTranslation();
  const coursesData = t("courses.items", { returnObjects: true }) as CourseCardProps[];

  return (
    <section id="courses" className="py-16 bg-gray-50 scroll-mt-10">
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
            {t("courses.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("courses.subtitle")}
          </motion.p>
        </div>

        <div className="mb-12"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coursesData.map((course, index) => (
            <CourseCard key={index} {...course} index={index} />
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Courses;
