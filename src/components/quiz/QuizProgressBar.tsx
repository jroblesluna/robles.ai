import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface QuizProgressBarProps {
  current: number;
  total: number;
}

/** One segment per question; the current one fills in as the visitor arrives. */
const QuizProgressBar = ({ current, total }: QuizProgressBarProps) => {
  const { t } = useTranslation();
  const pct = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-900">{t("quiz.progress.question", { current, total })}</span>
        <span className="tabular-nums text-gray-500">{pct}%</span>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={t("quiz.progress.question", { current, total })}
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            {i < current && (
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                initial={{ width: i === current - 1 ? "0%" : "100%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuizProgressBar;
