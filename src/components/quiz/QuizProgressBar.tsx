import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface QuizProgressBarProps {
  current: number;
  total: number;
}

const QuizProgressBar = ({ current, total }: QuizProgressBarProps) => {
  const { t } = useTranslation();
  const pct = Math.round((current / total) * 100);

  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>{t("quiz.progress.question", { current, total })}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export default QuizProgressBar;
