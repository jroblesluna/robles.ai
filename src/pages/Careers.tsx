import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter"; // ✅ Importa Link

const Careers = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const jobs = t("careers.jobs", { returnObjects: true }) as Array<{
    id: string;
    title: string;
    description: string;
    location: string;
  }>;

  return (
    <section id="careers" className="py-16 bg-gray-50">
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
            {t("careers.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {t("careers.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              variants={fadeIn}
              custom={0.2 + index * 0.2}
              className="bg-white rounded-xl shadow-md overflow-hidden p-8 hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">{job.title}</h3>
              <p className="text-gray-600 mb-4">{job.description}</p>
              <div className="text-gray-500 text-sm mb-6">{job.location}</div>
              
              {/* CAMBIO: aquí ahora sí usando el ID */}
              <Link
                href={`/apply?job=${job.id}`}
                className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 transition-all duration-300 hover:translate-x-1"
              >
                {t("careers.apply")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </section>
  );
};

export default Careers;