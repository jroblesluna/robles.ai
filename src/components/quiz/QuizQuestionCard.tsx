import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Users,
  AlertTriangle,
  Target,
  Gauge,
  Clock,
  Wallet,
  TrendingUp,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { QuizQuestion } from "@/lib/quizData";

const QUESTION_ICONS: Record<string, LucideIcon> = {
  industry: Building2,
  teamSize: Users,
  bottleneck: AlertTriangle,
  priority: Target,
  maturity: Gauge,
  urgency: Clock,
  budget: Wallet,
  outcome: TrendingUp,
};

interface QuizQuestionCardProps {
  question: QuizQuestion;
  selected?: string;
  onSelect: (optionId: string) => void;
  direction: 1 | -1;
}

const QuizQuestionCard = ({ question, selected, onSelect, direction }: QuizQuestionCardProps) => {
  const { t } = useTranslation();
  const Icon = QUESTION_ICONS[question.id] ?? Target;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={question.id}
        custom={direction}
        initial={{ opacity: 0, x: direction * 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -40 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full"
      >
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="pt-1.5 text-xl font-semibold leading-snug text-gray-900 md:text-2xl">
            {t(`quiz.questions.${question.id}.title`)}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={t(`quiz.questions.${question.id}.title`)}>
          {question.options.map((option, i) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-quiz-option
                aria-pressed={isSelected}
                onClick={() => onSelect(option.id)}
                className={`group flex min-h-[64px] items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm"
                }`}
              >
                <kbd
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-sans text-xs font-semibold transition-colors ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-500 group-hover:border-blue-200 group-hover:text-blue-700"
                  }`}
                  aria-hidden="true"
                >
                  {i + 1}
                </kbd>
                <span className={`flex-1 font-medium leading-snug ${isSelected ? "text-blue-800" : "text-gray-700"}`}>
                  {t(`quiz.questions.${question.id}.options.${option.id}`)}
                </span>
                {isSelected && (
                  <span className="shrink-0 rounded-full bg-blue-600 p-1">
                    <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuizQuestionCard;
