import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Lock, ArrowRight } from "lucide-react";
import type { QuizResult } from "@/lib/quizData";

interface QuizResultPreviewProps {
  result: QuizResult;
  onUnlock: () => void;
}

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const QuizResultPreview = ({ result, onUnlock }: QuizResultPreviewProps) => {
  const { t } = useTranslation();
  const primaryService = result.recommendedServices[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-xl mx-auto text-center"
    >
      <p className="text-sm uppercase tracking-wide text-gray-400 mb-3">
        {t("quiz.results.scoreLabel")}
      </p>

      <div className="relative w-40 h-40 mx-auto mb-6">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <motion.circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="#2563eb"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - result.score / 100) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{result.score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        {t(`quiz.results.profiles.${result.profile}.title`)}
      </h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {t(`quiz.results.profiles.${result.profile}.desc`)}
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 relative overflow-hidden">
        <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">
          {t("quiz.results.previewLabel")}
        </p>
        <p className="text-lg font-semibold text-gray-900 mb-1">
          {t(`quiz.services.${primaryService}.title`)}
        </p>
        <div className="mt-3 backdrop-blur-sm bg-white/60 rounded-lg p-3 text-sm text-gray-500 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          {t("quiz.results.lockedHint")}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={onUnlock}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg text-lg shadow-md transition-colors"
      >
        {t("quiz.results.unlockCta")}
        <ArrowRight className="h-5 w-5" />
      </motion.button>
    </motion.div>
  );
};

export default QuizResultPreview;
