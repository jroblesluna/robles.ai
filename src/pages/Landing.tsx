import { useEffect, useState, type ReactNode } from "react";
import { normalizeLanguage, staticPagePath } from "@shared/seoPolicy";
import { PUBLIC_CONTACT } from "@shared/publicContent";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  Linkedin,
  Mail,
  MessageSquare,
  Phone,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { ContactForm } from "@/components/Contact";
import CaseStudies from "@/components/CaseStudies";
import { trackContactClick } from "@/lib/analytics";

/**
 * /get-started — paid-traffic landing page.
 *
 * Structure (CRO review 2026-10): outcome-led hero with the offer above the fold, live demos
 * for genuine interest, a useful insight block, one merged process, the priced diagnosis,
 * the founder, illustrative cases, FAQ and the contact form. CTAs repeat down the page and
 * a sticky bar appears on mobile. `?s=chatbots|rag|agents|docs` swaps the hero headline so
 * each Google Ads ad group lands on a matching message.
 */

const WHATSAPP_NUMBER = "14085900153";
const HERO_VARIANTS = ["chatbots", "rag", "agents", "docs"] as const;
type HeroVariant = (typeof HERO_VARIANTS)[number];

/** Service → live demo id in demosCatalog.items. */
const BUILD_ITEMS: Array<{ key: HeroVariant; demoId: string; icon: typeof Bot }> = [
  { key: "chatbots", demoId: "sitechatbot", icon: MessageSquare },
  { key: "rag", demoId: "rag", icon: BookOpen },
  { key: "agents", demoId: "langchain", icon: Bot },
  { key: "docs", demoId: "docextract", icon: FileText },
];

type DemoCatalogItem = { id: string; status: string; href?: string; title: string; benefit?: string };
type Step = { when: string; title: string; desc: string };
type Pattern = { title: string; desc: string };
type Faq = { q: string; a: string };
type TeamMember = { name: string; image: string; linkedin?: string };

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function PrimaryCta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <a
      href="#contacto"
      className={`tap-target inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-7 py-4 rounded-lg text-lg transition-colors ${className}`}
    >
      {children} <ArrowRight className="w-5 h-5" aria-hidden="true" />
    </a>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Reveal className="text-center mb-10 md:mb-12">
      <h2 className="text-2xl md:text-4xl font-bold mb-4">{title}</h2>
      {subtitle && <p className="text-slate-300 max-w-3xl mx-auto">{subtitle}</p>}
    </Reveal>
  );
}

export default function Landing() {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const search = useSearch();

  const requested = new URLSearchParams(search).get("s");
  const variant = HERO_VARIANTS.includes(requested as HeroVariant) ? (requested as HeroVariant) : null;
  const heroKey = variant ? `landing.v2.variants.${variant}` : "landing.v2.hero";

  const list = <T,>(key: string): T[] => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? (value as T[]) : [];
  };
  const demos = list<DemoCatalogItem>("demosCatalog.items");
  const founder = list<TeamMember>("team.members")[0];
  const whatsappMessage = encodeURIComponent(t("landing.whatsapp.message"));
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  // Sticky mobile CTA: visible after the hero, hidden while the contact form is on screen.
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const update = () => {
      const contact = document.getElementById("contacto");
      const contactVisible = contact ? contact.getBoundingClientRect().top < window.innerHeight : false;
      setShowSticky(window.scrollY > 560 && !contactVisible);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="bg-slate-950 text-white">
      {/* Hero — outcome-led headline + the offer above the fold */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900" />
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500 blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-500 blur-[128px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-300 mb-4"
            >
              {t(`${heroKey}.eyebrow`)}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl font-bold leading-tight mb-6"
            >
              {t(`${heroKey}.title`)}{" "}
              <span className="text-emerald-400">{t(`${heroKey}.titleHighlight`)}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8"
            >
              {t("landing.v2.hero.subtitle")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center lg:items-start gap-4"
            >
              <PrimaryCta>{t("landing.v2.hero.ctaPrimary")}</PrimaryCta>
              <a
                href="#demos"
                className="tap-target inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold px-7 py-4 rounded-lg text-lg transition-colors"
              >
                <PlayCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                {t("landing.v2.hero.ctaDemo")}
              </a>
            </motion.div>
            <p className="mt-5 text-sm text-slate-300">
              <Link href={staticPagePath("/diagnostico-ia", lang)} className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-white">
                <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                {t("landing.v2.hero.quizLink")}
              </Link>
            </p>
            <ul className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-slate-300">
              {list<string>("landing.v2.hero.trust").map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 md:p-8 shadow-2xl"
            aria-label={t("landing.v2.offerCard.title")}
          >
            <h2 className="text-xl font-bold mb-5">{t("landing.v2.offerCard.title")}</h2>
            <ul className="space-y-3 mb-6">
              {list<string>("landing.v2.offerCard.items").map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-700 pt-5">
              <div className="text-2xl font-bold">{t("landing.v2.offerCard.price")}</div>
              <p className="text-sm text-slate-300 mt-1">{t("landing.v2.offerCard.priceNote")}</p>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* What we build — live demos, no sign-up */}
      <section id="demos" className="scroll-mt-20 py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.build.title")} subtitle={t("landing.v2.build.subtitle")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BUILD_ITEMS.map(({ key, demoId, icon: Icon }, i) => {
              const demo = demos.find((d) => d.id === demoId && d.status === "live" && d.href);
              return (
                <Reveal key={key} delay={i * 0.05} className="flex">
                  <div className="flex flex-col w-full bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
                    <Icon className="w-8 h-8 text-purple-300 mb-4" aria-hidden="true" />
                    <h3 className="text-lg font-semibold mb-2">{t(`landing.v2.build.items.${key}.title`)}</h3>
                    <p className="text-slate-300 text-sm mb-4">{t(`landing.v2.build.items.${key}.desc`)}</p>
                    {demo && (
                      <div className="mt-auto pt-4 border-t border-slate-700/60">
                        <p className="text-sm font-medium text-white">{demo.title}</p>
                        {demo.benefit && <p className="text-xs text-emerald-300 mt-1">{demo.benefit}</p>}
                        <Link
                          href={staticPagePath(demo.href!, lang)}
                          className="tap-target mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          {t("landing.v2.build.tryCta")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="text-center mt-8">
            <Link href={staticPagePath("/demos", lang)} className="text-sm text-slate-300 underline underline-offset-4 hover:text-white">
              {t("landing.v2.build.allDemos")}
            </Link>
          </p>
        </div>
      </section>

      {/* Insight — useful on its own, memorable */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.insight.title")} subtitle={t("landing.v2.insight.subtitle")} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {list<Pattern>("landing.v2.insight.patterns").map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6">
                <div className="text-emerald-300 font-mono text-sm mb-2">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                <p className="text-slate-300 text-sm">{p.desc}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="max-w-3xl mx-auto bg-gradient-to-br from-purple-900/40 to-slate-800/60 border border-purple-500/30 rounded-2xl p-6 md:p-8">
            <h3 className="flex items-center gap-2 text-lg md:text-xl font-semibold mb-4">
              <HelpCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              {t("landing.v2.insight.questionsTitle")}
            </h3>
            <ol className="space-y-3 list-decimal list-inside text-slate-200">
              {list<string>("landing.v2.insight.questions").map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </Reveal>
          <div className="mt-12 text-center">
            <p className="text-slate-300 mb-4">{t("landing.v2.midCta.text")}</p>
            <PrimaryCta>{t("landing.v2.midCta.button")}</PrimaryCta>
          </div>
        </div>
      </section>

      {/* How we work — one merged process */}
      <section className="py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.process.title")} subtitle={t("landing.v2.process.subtitle")} />
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {list<Step>("landing.v2.process.steps").map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="list-none bg-slate-800/60 border border-slate-700/60 rounded-xl p-6"
              >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-200 font-bold text-sm">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{step.when}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-slate-300 text-sm">{step.desc}</p>
              </motion.li>
            ))}
          </ol>
          <Reveal className="mt-10">
            <blockquote className="border-l-4 border-emerald-500 pl-6 italic text-slate-300 max-w-3xl mx-auto">
              "{t("landing.howWeWork.quote")}"
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* Illustrative cases (same component as the home page, clearly labelled) */}
      <CaseStudies />

      {/* The offer — priced diagnosis */}
      <section id="diagnostico" className="scroll-mt-20 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.offer.title")} subtitle={t("landing.diagnostico.subtitle")} />
          <Reveal className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-semibold mb-4">{t("landing.v2.offer.deliverablesTitle")}</h3>
              <ul className="space-y-3">
                {list<string>("landing.v2.offer.deliverables").map((d) => (
                  <li key={d} className="flex items-start gap-3 text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-900/50 to-slate-800/70 border border-emerald-500/40 rounded-2xl p-6 md:p-8 text-center flex flex-col justify-center">
              <div className="text-sm text-emerald-300 uppercase tracking-wider mb-2">{t("landing.v2.offer.priceLabel")}</div>
              <div className="text-3xl font-bold mb-2">{t("landing.v2.offer.price")}</div>
              <p className="text-slate-300 text-sm mb-3">{t("landing.v2.offer.priceDetail")}</p>
              <p className="text-slate-300 text-sm mb-6">{t("landing.diagnostico.pricing.note")}</p>
              <PrimaryCta className="w-full">{t("landing.v2.offer.cta")}</PrimaryCta>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Who you'll work with */}
      {founder && (
        <section className="py-16 md:py-24 bg-slate-900/50">
          <Reveal className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-8 items-center">
            <img
              src={`/images/${founder.image}`}
              alt={founder.name}
              loading="lazy"
              decoding="async"
              className="w-40 h-40 sm:w-44 sm:h-44 mx-auto rounded-2xl object-cover border border-slate-700"
            />
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">{t("landing.v2.founder.eyebrow")}</p>
              <h2 className="text-2xl md:text-3xl font-bold">{founder.name}</h2>
              <p className="text-purple-200 font-medium mb-4">{t("landing.v2.founder.role")}</p>
              <p className="text-slate-300 mb-4">{t("landing.v2.founder.bio")}</p>
              <ul className="space-y-2 mb-5 text-sm text-slate-200">
                {list<string>("landing.v2.founder.points").map((p) => (
                  <li key={p} className="flex items-start justify-center sm:justify-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
              {founder.linkedin && (
                <a
                  href={founder.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-target inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] px-4 py-2 text-sm font-medium text-white"
                >
                  <Linkedin className="w-4 h-4" aria-hidden="true" /> LinkedIn
                </a>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* FAQ — objections */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.faq.title")} />
          <div className="space-y-3">
            {list<Faq>("landing.v2.faq.items").map((f) => (
              <details key={f.q} className="group bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 open:border-emerald-500/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <ChevronDown className="w-5 h-5 shrink-0 text-slate-300 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-slate-300 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact — form first, direct channels second */}
      <section id="contacto" className="scroll-mt-20 py-16 md:py-24 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">{t("landing.cta.title")}</h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-10">{t("landing.v2.contact.subtitle")}</p>
          </Reveal>

          <Reveal className="max-w-xl mx-auto mb-10">
            <ContactForm
              className="bg-white text-gray-900 p-5 sm:p-8 rounded-xl shadow-lg"
              showNewsletter={false}
              titleKey="landing.v2.contact.formTitle"
              showTrustNote
              submitLabelKey="contact.submitDiagnosis"
              buttonClassName="bg-emerald-600 hover:bg-emerald-500 text-white"
            />
          </Reveal>

          <p className="text-slate-300 text-sm mb-6">{t("landing.cta.orReachUs")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`mailto:${PUBLIC_CONTACT.email}`}
              onClick={() => trackContactClick("email", "landing_contact")}
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-xl px-6 py-4 transition-colors"
            >
              <Mail className="w-5 h-5 text-purple-300" aria-hidden="true" />
              <span className="text-left">
                <span className="block text-xs text-slate-300">{t("landing.cta.email")}</span>
                <span className="block font-medium">{PUBLIC_CONTACT.email}</span>
              </span>
            </a>
            <a
              href={whatsappHref}
              onClick={() => trackContactClick("whatsapp", "landing_contact")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl px-6 py-4 transition-colors"
            >
              <Phone className="w-5 h-5 text-emerald-300" aria-hidden="true" />
              <span className="text-left">
                <span className="block text-xs text-slate-300">{t("landing.cta.phone")}</span>
                <span className="block font-medium">{PUBLIC_CONTACT.phone}</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Sticky mobile CTA — leaves room on the right for the Robly chat button */}
      <div
        className={`md:hidden fixed bottom-3 left-3 right-24 z-40 flex gap-2 transition-all duration-300 ${
          showSticky ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
        aria-hidden={!showSticky}
      >
        <a
          href="#contacto"
          tabIndex={showSticky ? 0 : -1}
          className="tap-target flex-1 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          {t("landing.v2.sticky.book")}
        </a>
        <a
          href={whatsappHref}
          tabIndex={showSticky ? 0 : -1}
          onClick={() => trackContactClick("whatsapp", "landing_sticky")}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target inline-flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          {t("landing.v2.sticky.whatsapp")}
        </a>
      </div>
    </div>
  );
}
