import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, Clock3, ArrowRight } from "lucide-react";

interface QuizIntroProps {
  onStart: () => void;
}

const QuizIntro = ({ onStart }: QuizIntroProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
        <Sparkles className="h-4 w-4" />
        {t("quiz.intro.badge")}
      </div>

      <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
        {t("quiz.intro.title")}
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto">
        {t("quiz.intro.subtitle")}
      </p>

      <div className="flex items-center justify-center gap-2 text-gray-500 mb-10">
        <Clock3 className="h-5 w-5" />
        <span>{t("quiz.intro.duration")}</span>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg text-lg shadow-md transition-colors"
      >
        {t("quiz.intro.cta")}
        <ArrowRight className="h-5 w-5" />
      </motion.button>

      <p className="text-sm text-gray-400 mt-6">{t("quiz.intro.disclaimer")}</p>
    </motion.div>
  );
};

export default QuizIntro;
