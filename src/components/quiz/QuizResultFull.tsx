import { normalizeLanguage, staticPagePath } from "@shared/seoPolicy";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Phone, Mail, ArrowRight, Download, Quote, CalendarClock } from "lucide-react";
import { getReportServiceTags, type QuizResult } from "@/lib/quizData";
import { QuizProfileScale, QuizScoreRing, SERVICE_ICONS } from "@/components/quiz/QuizScoreRing";

interface QuizResultFullProps {
  result: QuizResult;
  leadName: string;
  leadId: number | null;
  resultMessage?: string | null;
}

const QuizResultFull = ({ result, leadName, leadId, resultMessage }: QuizResultFullProps) => {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const services = getReportServiceTags(result);

  const whatsappMessage = encodeURIComponent(
    t("quiz.results.whatsappMessage", {
      profile: t(`quiz.results.profiles.${result.profile}.title`),
      services: services.map((s) => t(`quiz.services.${s}.title`)).join(", "),
    })
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-5xl"
    >
      {/* Header: score + profile */}
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-7 shadow-2xl shadow-slate-900/20 sm:p-10">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
          <QuizScoreRing score={result.score} tone="dark" className="h-36 w-36" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">{t("quiz.results.reportLabel")}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-white md:text-3xl">
              {t("quiz.results.fullTitle", { name: leadName })}
            </h1>
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-blue-50 ring-1 ring-white/15">
              {t(`quiz.results.profiles.${result.profile}.title`)}
            </p>
            <div className="mx-auto mt-6 max-w-md md:mx-0">
              <QuizProfileScale profile={result.profile} tone="dark" />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <Quote className="h-4 w-4 text-blue-600" aria-hidden="true" />
              {t("quiz.results.messageLabel")}
            </p>
            <p className="mt-3 text-lg leading-relaxed text-gray-700">
              {resultMessage || t(`quiz.results.profiles.${result.profile}.desc`)}
            </p>
          </section>

          <h2 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t("quiz.results.servicesHeading")}
          </h2>
          <ol className="space-y-4">
            {services.map((service, i) => {
              const Icon = SERVICE_ICONS[service];
              return (
                <motion.li
                  key={service}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 * i }}
                  className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">{t(`quiz.services.${service}.title`)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{t(`quiz.services.${service}.why`)}</p>
                  </div>
                  <span className="hidden text-2xl font-bold text-gray-200 sm:block" aria-hidden="true">
                    0{i + 1}
                  </span>
                </motion.li>
              );
            })}
          </ol>
        </div>

        {/* Next steps */}
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-slate-900/5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-semibold text-gray-900">{t("quiz.results.nextStepTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{t("quiz.results.nextStep")}</p>
            <div className="mt-5 space-y-3">
              <a
                href={`https://wa.me/14085900153?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                <Phone className="h-5 w-5" />
                {t("quiz.results.whatsappCta")}
              </a>
              <a
                href="mailto:info@robles.ai"
                className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-700"
              >
                <Mail className="h-5 w-5" />
                {t("quiz.results.emailCta")}
              </a>
            </div>
            {leadId && (
              <a
                href={`/api/quiz-lead/pdf?leadId=${leadId}`}
                className="tap-target mt-5 flex w-full items-center justify-center gap-2 border-t border-gray-100 pt-5 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                <Download className="h-4 w-4" />
                {t("quiz.results.downloadPdf")}
              </a>
            )}
          </div>

          <Link
            href={staticPagePath("/get-started", lang)}
            className="mt-5 inline-flex items-center gap-2 px-1 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            {t("quiz.results.learnMore")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </motion.div>
  );
};

export default QuizResultFull;
