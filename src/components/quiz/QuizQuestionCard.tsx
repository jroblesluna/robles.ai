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
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
            {t(`quiz.questions.${question.id}.title`)}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between gap-2 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <span className={`font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                  {t(`quiz.questions.${question.id}.options.${option.id}`)}
                </span>
                {isSelected && (
                  <span className="flex-shrink-0 bg-blue-600 rounded-full p-1">
                    <Check className="h-3.5 w-3.5 text-white" />
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
