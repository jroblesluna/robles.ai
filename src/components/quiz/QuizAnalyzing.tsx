import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Sparkles } from "lucide-react";

interface QuizAnalyzingProps {
  onDone: () => void;
  durationMs?: number;
}

const QuizAnalyzing = ({ onDone, durationMs = 2400 }: QuizAnalyzingProps) => {
  const { t } = useTranslation();
  const steps = t("quiz.analyzing.steps", { returnObjects: true }) as string[];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setTimeout(onDone, durationMs);
    const tick = setInterval(() => setActive((i) => i + 1), durationMs / steps.length);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [onDone, durationMs, steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-10"
      role="status"
      aria-live="polite"
    >
      <div className="relative mx-auto mb-6 h-20 w-20">
        <span className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 motion-safe:animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-indigo-600" aria-hidden="true" />
        </span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{t("quiz.analyzing.title")}</h2>

      <ul className="mt-6 space-y-3 text-left">
        {steps.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li
              key={step}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                done
                  ? "border-emerald-100 bg-emerald-50/60 text-gray-700"
                  : current
                    ? "border-blue-100 bg-blue-50/60 text-gray-900"
                    : "border-gray-100 text-gray-400"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : current ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </span>
              {step}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
};

export default QuizAnalyzing;
