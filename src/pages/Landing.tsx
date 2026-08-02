import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import {
  Brain,
  ClipboardCheck,
  BarChart3,
  Target,
  Layers,
  MessageSquare,
  Link2,
  BookOpen,
  TrendingUp,
  Globe,
  Database,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function DiagnosticoIA() {
  const { t } = useTranslation();

  const steps = [
    { num: "01", key: "step1", icon: ClipboardCheck },
    { num: "02", key: "step2", icon: Target },
    { num: "03", key: "step3", icon: Layers },
    { num: "04", key: "step4", icon: BarChart3 },
  ];

  const statKeys = ["years", "weeks", "stages"] as const;

  const services = [
    { key: "diagnosis", icon: Brain },
    { key: "audit", icon: ClipboardCheck },
    { key: "chatbots", icon: MessageSquare },
    { key: "llm", icon: Link2 },
    { key: "rag", icon: BookOpen },
    { key: "ml", icon: TrendingUp },
  ];

  const technologies = [
    { key: "erp", icon: Database },
    { key: "llm", icon: MessageSquare },
    { key: "rag", icon: BookOpen },
    { key: "ocr", icon: ClipboardCheck },
    { key: "apis", icon: Link2 },
    { key: "cloud", icon: Globe },
    { key: "bi", icon: BarChart3 },
    { key: "mlPredictive", icon: TrendingUp },
  ];

  const experienceItems = [
    { key: "latam", icon: Globe },
    { key: "data", icon: Database },
    { key: "sector", icon: ShieldCheck },
  ];

  const timelineKeys = ["t1", "t2", "t3", "t4"] as const;

  const principleKeys = ["p1", "p2", "p3", "p4"] as const;

  const whatsappMessage = encodeURIComponent(t("landing.whatsapp.message"));

  return (
    <div className="bg-slate-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500 blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-500 blur-[128px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            {t("landing.hero.title")}{" "}
            <span className="text-blue-400">{t("landing.hero.titleHighlight")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10"
          >
            {t("landing.hero.subtitle")}
          </motion.p>
          <motion.a
            href="#contacto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            {t("landing.hero.cta")} <ArrowRight className="w-5 h-5" />
          </motion.a>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center"
              >
                <div className="text-blue-400 font-mono text-sm mb-2">{step.num}</div>
                <step.icon className="w-8 h-8 mx-auto text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  {t(`landing.steps.${step.key}.title`)}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t(`landing.steps.${step.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {statKeys.map((key, i) => (
              <motion.div
                key={key}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">
                  {t(`landing.stats.${key}.value`)}
                </div>
                <div className="text-lg font-semibold mb-2">
                  {t(`landing.stats.${key}.label`)}
                </div>
                <p className="text-slate-400 text-sm">
                  {t(`landing.stats.${key}.detail`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.howWeWork.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 text-center max-w-3xl mx-auto mb-12"
          >
            {t("landing.howWeWork.subtitle")}
          </motion.p>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-4 bg-slate-800/40 border border-slate-700/40 rounded-xl p-6"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {t(`landing.steps.${step.key}.title`)}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {t(`landing.howWeWork.step${i + 1}Detail`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Quote */}
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 border-l-4 border-blue-500 pl-6 italic text-slate-300 max-w-3xl mx-auto"
          >
            "{t("landing.howWeWork.quote")}"
          </motion.blockquote>
        </div>
      </section>

      {/* Sequencing Principles */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.principles.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-center mb-10"
          >
            {t("landing.principles.subtitle")}
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {principleKeys.map((key, i) => (
              <motion.div
                key={key}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-lg p-5"
              >
                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-sm">{t(`landing.principles.${key}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.services.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-center max-w-3xl mx-auto mb-12"
          >
            {t("landing.services.subtitle")}
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc, i) => (
              <motion.div
                key={svc.key}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/40 transition-colors"
              >
                <svc.icon className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t(`landing.services.items.${svc.key}.title`)}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t(`landing.services.items.${svc.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.technologies.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-center max-w-3xl mx-auto mb-12"
          >
            {t("landing.technologies.subtitle")}
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {technologies.map((tech, i) => (
              <motion.div
                key={tech.key}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5"
              >
                <tech.icon className="w-6 h-6 text-blue-400 mb-3" />
                <h4 className="text-sm font-semibold mb-2">
                  {t(`landing.technologies.items.${tech.key}.title`)}
                </h4>
                <p className="text-slate-500 text-xs">
                  {t(`landing.technologies.items.${tech.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.experience.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 text-center max-w-3xl mx-auto mb-12"
          >
            {t("landing.experience.subtitle")}
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {experienceItems.map((item, i) => (
              <motion.div
                key={item.key}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center"
              >
                <item.icon className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">
                  {t(`landing.experience.${item.key}.title`)}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t(`landing.experience.${item.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnóstico Timeline */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold text-center mb-4"
          >
            {t("landing.diagnostico.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 text-center max-w-3xl mx-auto mb-12"
          >
            {t("landing.diagnostico.subtitle")}
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {timelineKeys.map((key, i) => (
              <motion.div
                key={key}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center"
              >
                <div className="text-blue-400 font-mono text-sm mb-2">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-semibold mb-2">
                  {t(`landing.diagnostico.timeline.${key}.title`)}
                </h3>
                <p className="text-slate-400 text-sm">
                  {t(`landing.diagnostico.timeline.${key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-md mx-auto bg-gradient-to-br from-blue-900/40 to-slate-800/60 border border-blue-500/30 rounded-2xl p-8 text-center"
          >
            <div className="text-sm text-blue-300 uppercase tracking-wider mb-2">
              {t("landing.diagnostico.pricing.label")}
            </div>
            <div className="text-3xl font-bold mb-2">
              {t("landing.diagnostico.pricing.amount")}
            </div>
            <p className="text-slate-400 text-sm mb-4">
              {t("landing.diagnostico.pricing.detail")}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{t("landing.diagnostico.pricing.note")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section id="contacto" className="py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-bold mb-4"
          >
            {t("landing.cta.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 max-w-2xl mx-auto mb-10"
          >
            {t("landing.cta.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <a
              href="mailto:hello@robles.ai"
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl px-6 py-4 transition-colors"
            >
              <Mail className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <div className="text-xs text-slate-400">{t("landing.cta.email")}</div>
                <div className="font-medium">hello@robles.ai</div>
              </div>
            </a>
            <a
              href="https://wa.me/14085900153"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl px-6 py-4 transition-colors"
            >
              <Phone className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <div className="text-xs text-slate-400">{t("landing.cta.phone")}</div>
                <div className="font-medium">+1 (408) 590-0153</div>
              </div>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10"
          >
            <a
              href={`https://wa.me/14085900153?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              {t("landing.cta.whatsappCta")} <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* WhatsApp Floating Widget */}
      <WhatsAppBubble />
    </div>
  );
}
