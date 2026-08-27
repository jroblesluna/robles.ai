import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";
import { ChevronRight, MapPin, Code2, Brain, Sparkles, Eye, Briefcase } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter"; // ✅ Importa Link

const JOB_STYLE: Record<string, { icon: typeof Code2; iconBg: string; iconColor: string }> = {
  fullstack: { icon: Code2, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  ml: { icon: Brain, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  genai: { icon: Sparkles, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  cv: { icon: Eye, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
};
const DEFAULT_JOB_STYLE = { icon: Briefcase, iconBg: "bg-blue-100", iconColor: "text-blue-600" };

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
    <section id="careers" className="py-20 bg-gray-50">
      <motion.div
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="text-center mb-16">
          <motion.span
            variants={fadeIn}
            custom={0}
            className="inline-block text-xs font-semibold tracking-wide text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-4"
          >
            {t("careers.eyebrow")}
          </motion.span>
          <motion.h2
            variants={fadeIn}
            custom={0.05}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {jobs.map((job, index) => {
            const { icon: Icon, iconBg, iconColor } = JOB_STYLE[job.id] ?? DEFAULT_JOB_STYLE;
            return (
              <motion.div
                key={job.id}
                variants={fadeIn}
                custom={0.2 + index * 0.1}
                className="group bg-white rounded-2xl shadow-sm p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 hover:border-blue-200"
              >
                <div className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className={`h-7 w-7 ${iconColor}`} />
                </div>

                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                <p className="text-gray-600 mb-5">{job.description}</p>

                <div className="inline-flex items-center gap-1.5 text-gray-500 text-sm bg-gray-50 border border-gray-100 rounded-full px-3 py-1 mb-6">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </div>

                <div>
                  <Link
                    href={`/apply?job=${job.id}`}
                    className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 transition-all duration-300 group-hover:gap-2"
                  >
                    {t("careers.apply")}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default Careers;