import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, Clock3, ArrowRight, ListChecks, BadgeCheck, Lock, FileText, Gauge, Target } from "lucide-react";
import { QuizProfileScale, QuizScoreRing } from "@/components/quiz/QuizScoreRing";

interface QuizIntroProps {
  onStart: () => void;
}

const DELIVERABLE_ICONS = [Gauge, Target, FileText];

const QuizIntro = ({ onStart }: QuizIntroProps) => {
  const { t } = useTranslation();
  const deliverables = t("quiz.intro.deliverables", { returnObjects: true }) as { title: string; desc: string }[];
  const steps = t("quiz.intro.steps", { returnObjects: true }) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16"
    >
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200">
          <Sparkles className="h-4 w-4" />
          {t("quiz.intro.badge")}
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:leading-[1.08]">
          {t("quiz.intro.title")}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">{t("quiz.intro.subtitle")}</p>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-700">
          {[
            { icon: ListChecks, label: t("quiz.intro.stats.questions") },
            { icon: Clock3, label: t("quiz.intro.duration") },
            { icon: BadgeCheck, label: t("quiz.intro.stats.cost") },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="tap-target inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition-shadow hover:shadow-xl hover:shadow-blue-600/30"
          >
            {t("quiz.intro.cta")}
            <ArrowRight className="h-5 w-5" />
          </motion.button>
          <p className="max-w-xs text-sm text-gray-500">{t("quiz.intro.disclaimer")}</p>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-3 border-t border-gray-200 pt-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-1 text-sm leading-snug text-gray-600">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Sample of the report, clearly labelled as an example */}
      <div className="relative min-w-0">
        <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-200/50 via-indigo-200/30 to-transparent blur-2xl" />
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-slate-900/10">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">{t("quiz.intro.previewTitle")}</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-blue-100 ring-1 ring-white/15">
                {t("quiz.intro.sampleLabel")}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <QuizScoreRing score={72} tone="dark" className="h-28 w-28" />
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-snug text-white">{t("quiz.results.profiles.ready.title")}</p>
                <p className="mt-1 text-sm text-blue-100/70">{t("quiz.results.scoreLabel")}</p>
              </div>
            </div>
            <div className="mt-6">
              <QuizProfileScale profile="ready" tone="dark" />
            </div>
          </div>

          <ul className="divide-y divide-gray-100">
            {deliverables.map((item, i) => {
              const Icon = DELIVERABLE_ICONS[i] ?? FileText;
              return (
                <li key={item.title} className="flex items-start gap-4 px-6 py-4 sm:px-7">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-gray-500">{item.desc}</p>
                  </div>
                  {i > 0 && <Lock className="ml-auto mt-1 h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default QuizIntro;
