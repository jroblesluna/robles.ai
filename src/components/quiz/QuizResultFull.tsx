import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Brain,
  ClipboardCheck,
  MessageSquare,
  Link2,
  BookOpen,
  TrendingUp,
  Phone,
  Mail,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { getReportServiceTags, type QuizResult, type ServiceTag } from "@/lib/quizData";

const SERVICE_ICONS: Record<ServiceTag, LucideIcon> = {
  diagnosis: Brain,
  audit: ClipboardCheck,
  chatbots: MessageSquare,
  llm: Link2,
  rag: BookOpen,
  ml: TrendingUp,
};

interface QuizResultFullProps {
  result: QuizResult;
  leadName: string;
  resultMessage?: string | null;
}

const QuizResultFull = ({ result, leadName, resultMessage }: QuizResultFullProps) => {
  const { t } = useTranslation();

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
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {t("quiz.results.fullTitle", { name: leadName })}
        </h2>
        {resultMessage ? (
          <p className="text-gray-600 max-w-lg mx-auto border-l-2 border-gray-200 pl-4 text-left italic">
            {resultMessage}
          </p>
        ) : (
          <p className="text-gray-600 max-w-lg mx-auto">
            {t(`quiz.results.profiles.${result.profile}.desc`)}
          </p>
        )}
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 text-center mb-4">
        {t("quiz.results.servicesHeading")}
      </h3>

      <div className="space-y-4 mb-10">
        {services.map((service, i) => {
          const Icon = SERVICE_ICONS[service];
          return (
            <motion.div
              key={service}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 * i }}
              className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {t(`quiz.services.${service}.title`)}
                </h3>
                <p className="text-gray-500 text-sm">{t(`quiz.services.${service}.why`)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center mb-8">
        <p className="text-gray-700 mb-4">{t("quiz.results.nextStep")}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`https://wa.me/14085900153?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors w-full sm:w-auto"
          >
            <Phone className="h-5 w-5" />
            {t("quiz.results.whatsappCta")}
          </a>
          <a
            href="mailto:info@robles.ai"
            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:border-blue-400 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors w-full sm:w-auto"
          >
            <Mail className="h-5 w-5" />
            {t("quiz.results.emailCta")}
          </a>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/get-started"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          {t("quiz.results.learnMore")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
};

export default QuizResultFull;
