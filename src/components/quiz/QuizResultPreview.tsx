import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Lock, ArrowRight } from "lucide-react";
import type { QuizResult } from "@/lib/quizData";
import { QuizProfileScale, QuizScoreRing, SERVICE_ICONS } from "@/components/quiz/QuizScoreRing";

interface QuizResultPreviewProps {
  result: QuizResult;
  onUnlock: () => void;
}

const QuizResultPreview = ({ result, onUnlock }: QuizResultPreviewProps) => {
  const { t } = useTranslation();
  const primaryService = result.recommendedServices[0];
  const PrimaryIcon = SERVICE_ICONS[primaryService];
  const lockedItems = t("quiz.results.lockedItems", { returnObjects: true }) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-2"
    >
      {/* Score */}
      <div className="flex flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-7 text-center sm:p-10 lg:text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">{t("quiz.results.scoreLabel")}</p>
        <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-center">
          <QuizScoreRing score={result.score} tone="dark" className="h-36 w-36" />
          <h2 className="text-2xl font-bold leading-tight text-white md:text-[1.7rem]">
            {t(`quiz.results.profiles.${result.profile}.title`)}
          </h2>
        </div>
        <p className="mt-6 leading-relaxed text-blue-100/80">{t(`quiz.results.profiles.${result.profile}.desc`)}</p>
        <div className="mt-8">
          <QuizProfileScale profile={result.profile} tone="dark" />
        </div>
      </div>

      {/* Recommendation + what unlocks */}
      <div className="flex flex-col p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("quiz.results.previewLabel")}</p>
        <div className="mt-4 flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <PrimaryIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{t(`quiz.services.${primaryService}.title`)}</p>
            <p className="mt-1 text-sm leading-snug text-gray-600">{t(`quiz.services.${primaryService}.why`)}</p>
          </div>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("quiz.results.lockedTitle")}</p>
        <ul className="mt-3 space-y-2.5">
          {lockedItems.map((item) => (
            <li key={item} className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600">
              <Lock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onUnlock}
            className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 sm:text-lg"
          >
            {t("quiz.results.unlockCta")}
            <ArrowRight className="h-5 w-5" />
          </motion.button>
          <p className="mt-3 text-center text-xs text-gray-500">{t("quiz.results.unlockNote")}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default QuizResultPreview;
