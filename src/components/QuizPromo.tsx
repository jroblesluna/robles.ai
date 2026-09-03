import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Sparkles, ArrowRight } from "lucide-react";
import { fadeIn } from "@/utils/animations";

const QuizPromo = () => {
  const { t } = useTranslation();

  return (
    <section className="py-14 bg-gradient-to-r from-blue-600 to-indigo-700">
      <motion.div
        className="container mx-auto px-6"
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              {t("quizPromo.badge")}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {t("quizPromo.title")}
            </h2>
            <p className="text-blue-100">{t("quizPromo.subtitle")}</p>
          </div>

          <Link
            href="/diagnostico-ia"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3.5 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            {t("quizPromo.cta")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default QuizPromo;
