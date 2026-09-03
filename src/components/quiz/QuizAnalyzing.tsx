import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface QuizAnalyzingProps {
  onDone: () => void;
  durationMs?: number;
}

const QuizAnalyzing = ({ onDone, durationMs = 1800 }: QuizAnalyzingProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
  }, [onDone, durationMs]);

  const steps = t("quiz.analyzing.steps", { returnObjects: true }) as string[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-md mx-auto text-center py-12"
    >
      <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-6" />
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("quiz.analyzing.title")}</h2>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.4 }}
            className="text-gray-500 text-sm"
          >
            {step}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
};

export default QuizAnalyzing;
