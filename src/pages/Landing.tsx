import { useEffect, useState, type ReactNode } from "react";
import { normalizeLanguage, staticPagePath } from "@shared/seoPolicy";
import { PUBLIC_CONTACT, PUBLIC_OFFICES } from "@shared/publicContent";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  ChevronDown,
  Database,
  Factory,
  FileText,
  Gift,
  Hammer,
  HeartPulse,
  KeyRound,
  Landmark,
  Linkedin,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  PlayCircle,
  Plug,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  UserCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useSearch } from "wouter";
import { ContactForm, CONTACT_GOALS } from "@/components/Contact";
import { trackContactClick } from "@/lib/analytics";
import { useBookingUrl } from "@/lib/siteConfig";
import ClientLogos from "@/components/ClientLogos";
import { BrandSpot, useHasBrandSpot } from "@/components/BrandSpot";

/**
 * /get-started — paid-traffic landing page.
 *
 * Structure (CRO + buyer-persona review, 2026-10): outcome-led hero (diagnosis CTA, WhatsApp,
 * links to demos / proposal / 2-minute test) with the offer card; 30-second spot (languages with a
 * video only, see BrandSpot); client logos; live demos; industry starting
 * points (examples, not results); "where AI pays back first"; one merged process; three fixed-fee
 * AI Assessment packages (up to 2/4/6 processes, each with a bonus) plus the direct-project
 * option; commitments; integrations; security & compliance; founder + local presence (US/Peru);
 * FAQ; contact form (+ calendar booking link when `booking_url` is set); sticky mobile CTA. `?s=chatbots|rag|agents|docs` swaps the hero copy,
 * side card, CTA, contact title/submit, pre-selected form goal and WhatsApp message so each
 * Google Ads ad group lands on a matching message.
 */

const WHATSAPP_NUMBER = "14085900153";
const HERO_VARIANTS = ["chatbots", "rag", "agents", "docs"] as const;
type HeroVariant = (typeof HERO_VARIANTS)[number];

/** Ad variant → pre-selected goal in the contact form. */
const VARIANT_GOAL: Record<HeroVariant, (typeof CONTACT_GOALS)[number]> = {
  chatbots: "service",
  rag: "knowledge",
  agents: "automation",
  docs: "documents",
};
const INDUSTRY_ICONS = [Store, Truck, HeartPulse, UtensilsCrossed, Landmark, Factory];
const SECURITY_ICONS = [Lock, KeyRound, UserCheck, Cloud, ScrollText, Archive, Scale, ShieldAlert, ClipboardCheck];
const INTEGRATION_ICONS = [Briefcase, Users, MessageCircle, FileText, Database, Cloud];

/** Service → live demo id in demosCatalog.items. */
const BUILD_ITEMS: Array<{ key: HeroVariant; demoId: string; icon: typeof Bot; image: string }> = [
  { key: "chatbots", demoId: "sitechatbot", icon: MessageSquare, image: "/demo-previews/sitechatbot-photo-v1-480.webp" },
  { key: "rag", demoId: "rag", icon: BookOpen, image: "/demo-previews/rag-photo-v1-480.webp" },
  { key: "agents", demoId: "langchain", icon: Bot, image: "/demo-previews/langchain-photo-v1-480.webp" },
  { key: "docs", demoId: "docextract", icon: FileText, image: "/demo-previews/docextract-photo-v1-480.webp" },
];

type DemoCatalogItem = { id: string; status: string; href?: string; title: string; benefit?: string };
type Step = { when: string; title: string; desc: string };
type Pattern = { title: string; desc: string };
type Faq = { q: string; a: string };
type TeamMember = { name: string; image: string; linkedin?: string };
type Item = { title: string; desc: string };
type Package = { name: string; price: string; scope: string; desc: string; features: string[]; bonus: string };
type IntegrationGroup = { title: string; items: string[] };

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
      className={`tap-target inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-emerald-400/50 text-white font-semibold sm:whitespace-nowrap px-5 py-3.5 rounded-lg text-base transition-colors ${className}`}
    >
      {children} <ArrowRight className="w-5 h-5 text-emerald-400" aria-hidden="true" />
    </a>
  );
}

function WhatsAppMark() {
  return (
    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.884 9.888-9.884 2.64 0 5.122 1.03 6.986 2.895a9.825 9.825 0 0 1 2.893 6.99c-.003 5.45-4.437 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.89c0 2.096.547 4.142 1.588 5.945L.057 24l6.335-1.662a11.93 11.93 0 0 0 5.652 1.438h.005c6.554 0 11.89-5.335 11.893-11.89a11.82 11.82 0 0 0-3.478-8.398z" />
    </svg>
  );
}

function WhatsAppButton({ href, children, location }: { href: string; children: ReactNode; location: string }) {
  return (
    <a
      href={href}
      onClick={() => trackContactClick("whatsapp", location)}
      target="_blank"
      rel="noopener noreferrer"
      className="tap-target inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] border border-[#25D366] text-white font-semibold sm:whitespace-nowrap px-5 py-3.5 rounded-lg text-base transition-colors"
    >
      <WhatsAppMark />
      {children}
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
  const whatsappMessage = encodeURIComponent(t(variant ? `landing.v2.variants.${variant}.whatsapp` : "landing.whatsapp.message"));
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;
  const bookingUrl = useBookingUrl();
  const hasSpot = useHasBrandSpot();

  // Paid traffic stays on the landing: any link that leaves this page (header, footer, Robly…)
  // opens in a new tab. Same-page anchors (#contacto), language switches, mailto: and tel: are kept,
  // and so are links marked `data-same-tab` (the header logo goes home in the same tab).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download") || anchor.hasAttribute("data-same-tab")) return;
      const url = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) return;
      // Prevented in the capture phase so wouter's <Link> skips its in-app navigation.
      event.preventDefault();
      window.open(url.href, "_blank", "noopener,noreferrer");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

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
        {/* Fades the purple into the page background so there is no hard edge with the next section. */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-slate-950" aria-hidden="true" />
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
              {t(variant ? `landing.v2.variants.${variant}.subtitle` : "landing.v2.hero.subtitle")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center lg:justify-start gap-4"
            >
              <PrimaryCta>{t(variant ? `landing.v2.variants.${variant}.cta` : "landing.v2.hero.ctaPrimary")}</PrimaryCta>
              <WhatsAppButton href={whatsappHref} location="landing_hero">{t("landing.v2.hero.ctaWhatsapp")}</WhatsAppButton>
            </motion.div>
            <div className="mt-5 flex flex-wrap justify-center lg:justify-start items-center gap-x-6 gap-y-2 text-sm text-slate-300">
              <a href="#demos" className="inline-flex items-center gap-1.5 font-medium text-emerald-300 hover:text-emerald-200 transition-colors">
                <PlayCircle className="w-4 h-4" aria-hidden="true" />
                {t("landing.v2.hero.ctaDemo")}
              </a>
              {bookingUrl && (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContactClick("calendar", "landing_hero")}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-200 hover:text-white transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  {t("landing.v2.booking.cta")}
                </a>
              )}
              <a href={staticPagePath("/diagnostico-ia", lang)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                {t("landing.v2.hero.quizLink")}
              </a>
            </div>
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
            className="relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-emerald-500/40 rounded-2xl p-6 md:p-8 shadow-2xl shadow-emerald-950/30 ring-1 ring-emerald-500/20"
            aria-label={t(variant ? `landing.v2.variants.${variant}.card.title` : "landing.v2.offerCard.title")}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300 mb-4">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> {t("landing.v2.packages.eyebrow")}
            </div>
            {variant ? (
              <>
                <h2 className="text-xl font-bold mb-5">{t(`landing.v2.variants.${variant}.card.title`)}</h2>
                <ol className="space-y-3 mb-6">
                  {list<string>(`landing.v2.variants.${variant}.card.items`).map((item, i) => (
                    <li key={item} className="flex items-start gap-3 text-slate-200">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
                <p className="border-t border-slate-700/80 pt-5 text-sm text-slate-300">{t("contact.replyNote")}</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-5">{t("landing.v2.offerCard.title")}</h2>
                <ul className="space-y-3 mb-6">
                  {list<string>("landing.v2.offerCard.items").map((item) => (
                    <li key={item} className="flex items-start gap-3 text-slate-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-700/80 pt-5">
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{t("landing.v2.offerCard.price")}</div>
                  <p className="text-sm text-slate-300 mt-1">{t("landing.v2.offerCard.priceNote")}</p>
                </div>
              </>
            )}

            {/* Quick form: the lowest-effort way to leave contact details without scrolling to #contacto */}
            <div id="info-form" className="mt-6 border-t border-slate-700/80 pt-6 scroll-mt-24">
              <ContactForm
                compact
                sendInfo
                tone="dark"
                showNewsletter={false}
                className=""
                titleKey="landing.v2.quickForm.title"
                defaultGoal={variant ? VARIANT_GOAL[variant] : undefined}
                submitLabelKey="landing.v2.quickForm.submit"
                buttonClassName="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 shadow-lg shadow-emerald-950/40"
              />
              <p className="mt-3 text-xs text-slate-400">{t("landing.v2.quickForm.note")}</p>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* 30-second spot — the whole pitch (demos + diagnosis) for visitors who scroll past the offer */}
      {hasSpot && (
        <section aria-labelledby="spot-title" className="py-14 md:py-20 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal className="text-center mb-8 md:mb-10">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-300 mb-3">{t("landing.v2.spot.eyebrow")}</p>
              <h2 id="spot-title" className="text-2xl md:text-4xl font-bold mb-4">{t("landing.v2.spot.title")}</h2>
              <p className="text-slate-300 max-w-3xl mx-auto">{t("landing.v2.spot.subtitle")}</p>
            </Reveal>
            <BrandSpot placement="landing" />
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PrimaryCta>{t(variant ? `landing.v2.variants.${variant}.cta` : "landing.v2.hero.ctaPrimary")}</PrimaryCta>
              <a href="#demos" className="tap-target inline-flex items-center gap-1.5 font-medium text-emerald-300 hover:text-emerald-200 transition-colors">
                <PlayCircle className="w-4 h-4" aria-hidden="true" />
                {t("landing.v2.spot.demosLink")}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Clients — trust right after the offer */}
      <ClientLogos tone="dark" />

      {/* What we build — live demos with visual previews */}
      <section id="demos" className="scroll-mt-20 py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.build.title")} subtitle={t("landing.v2.build.subtitle")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BUILD_ITEMS.map(({ key, demoId, icon: Icon, image }, i) => {
              const demo = demos.find((d) => d.id === demoId && d.status === "live" && d.href);
              return (
                <Reveal key={key} delay={i * 0.05} className="flex">
                  <div className="group flex flex-col w-full bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20 transition-all duration-300">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 border-b border-slate-700/60">
                      <img
                        src={image}
                        alt={t(`landing.v2.build.items.${key}.title`)}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" /> LIVE DEMO
                      </span>
                      <span className="absolute bottom-2.5 left-2.5 p-1.5 rounded-md bg-slate-900/90 border border-slate-700 text-purple-300">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="text-lg font-semibold mb-2">{t(`landing.v2.build.items.${key}.title`)}</h3>
                      <p className="text-slate-300 text-sm mb-4 leading-relaxed">{t(`landing.v2.build.items.${key}.desc`)}</p>
                      {demo && (
                        <div className="mt-auto pt-4 border-t border-slate-700/60">
                          <p className="text-sm font-medium text-white">{demo.title}</p>
                          {demo.benefit && <p className="text-xs text-emerald-300 mt-1">{demo.benefit}</p>}
                          <a
                            href={staticPagePath(demo.href!, lang)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tap-target mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all"
                          >
                            {t("landing.v2.build.tryCta")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="text-center mt-8">
            <a href={staticPagePath("/demos", lang)} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 underline underline-offset-4 hover:text-white">
              {t("landing.v2.build.allDemos")}
            </a>
          </p>
        </div>
      </section>

      {/* Where it fits — industry starting points (examples, not results) */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.industries.title")} subtitle={t("landing.v2.industries.subtitle")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list<Item>("landing.v2.industries.items").map((item, i) => {
              const Icon = INDUSTRY_ICONS.at(i) ?? Store;
              return (
                <Reveal key={item.title} delay={i * 0.04} className="flex gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
                  <Icon className="w-7 h-7 shrink-0 text-purple-300" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-slate-300 text-sm">{item.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Insight — useful on its own, memorable */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.insight.title")} subtitle={t("landing.v2.insight.subtitle")} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {list<Pattern>("landing.v2.insight.patterns").map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6">
                <div className="text-emerald-300 font-mono text-sm mb-2">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                <p className="text-slate-300 text-sm">{p.desc}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-slate-300 mb-4">{t("landing.v2.midCta.text")}</p>
            <PrimaryCta>{t("landing.v2.midCta.button")}</PrimaryCta>
          </div>
        </div>
      </section>

      {/* How we work — one merged process */}
      <section className="py-16 md:py-24">
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

      {/* Pricing — three fixed-fee AI Assessment packages + the direct-project option */}
      <section id="diagnostico" className="scroll-mt-20 py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-10 md:mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">{t("landing.v2.packages.eyebrow")}</p>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">{t("landing.v2.packages.title")}</h2>
            <p className="text-slate-300 max-w-3xl mx-auto">{t("landing.v2.packages.subtitle")}</p>
            <ul className="mt-5 mx-auto flex w-fit flex-col items-start gap-2 text-left text-sm text-slate-200 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5">
              {list<string>("landing.v2.offer.deliverables").map((d) => (
                <li key={d} className="inline-flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 lg:gap-6">
            {list<Package>("landing.v2.packages.items").map((pkg, i) => {
              const featured = i === 1;
              return (
                <Reveal
                  key={pkg.name}
                  delay={i * 0.06}
                  className={`relative flex flex-col rounded-2xl p-6 lg:p-7 border ${
                    featured
                      ? "bg-gradient-to-b from-purple-900/70 to-slate-800/80 border-emerald-400/70 shadow-2xl shadow-emerald-950/40 ring-1 ring-emerald-400/30"
                      : "bg-slate-800/60 border-slate-700/60"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950">
                      <Star className="w-3 h-3" aria-hidden="true" /> {t("landing.v2.packages.popular")}
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{pkg.name}</h3>
                  <p className="text-slate-300 text-sm mt-1 mb-5 md:min-h-[2.5rem]">{pkg.desc}</p>
                  <div className="text-3xl font-bold tracking-tight">{pkg.price}</div>
                  <p className="mt-3 inline-flex w-fit items-center rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-sm font-semibold text-emerald-300">
                    {pkg.scope}
                  </p>
                  <ul className="space-y-2 my-6 text-sm text-slate-200">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 mb-5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200">
                        <Gift className="w-4 h-4" aria-hidden="true" /> {t("landing.v2.packages.bonusLabel")}
                      </p>
                      <p className="mt-1.5 text-sm text-slate-100">{pkg.bonus}</p>
                    </div>
                    <a
                      href="#contacto"
                      className={`tap-target flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold transition-colors ${
                        featured ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border border-slate-500 hover:border-emerald-400 hover:bg-white/5 text-white"
                      }`}
                    >
                      {t("landing.v2.packages.cta")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="text-center text-sm text-slate-300 mt-8">
            {t("landing.v2.packages.note")}
            {bookingUrl && (
              <>
                {" "}
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContactClick("calendar", "landing_packages")}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  <CalendarDays className="w-4 h-4" aria-hidden="true" /> {t("landing.v2.booking.cta")}
                </a>
              </>
            )}
          </p>

          <Reveal className="mt-10 flex flex-col md:flex-row md:items-center gap-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 md:p-8">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">{t("landing.v2.paths.project.eyebrow")}</p>
              <h3 className="flex items-center gap-2 text-xl font-bold mb-2">
                <Hammer className="w-5 h-5 text-purple-300" aria-hidden="true" />
                {t("landing.v2.paths.project.title")}
              </h3>
              <p className="text-slate-300 text-sm mb-2">{t("landing.v2.paths.project.desc")}</p>
              <p className="text-sm text-slate-200">
                <span className="font-semibold">{t("landing.v2.paths.project.price")}</span> · {t("landing.v2.paths.project.priceDetail")}
              </p>
            </div>
            <a
              href="#contacto"
              className="tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-400/60 hover:bg-white/5 px-6 py-3 font-semibold text-white transition-colors"
            >
              {t("landing.v2.paths.project.cta")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* Integrations — the systems buyers ask about first */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-10 md:mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">{t("landing.v2.integrations.eyebrow")}</p>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">{t("landing.v2.integrations.title")}</h2>
            <p className="text-slate-300 max-w-3xl mx-auto">{t("landing.v2.integrations.subtitle")}</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list<IntegrationGroup>("landing.v2.integrations.groups").map((group, i) => {
              const Icon = INTEGRATION_ICONS.at(i) ?? Plug;
              return (
                <Reveal key={group.title} delay={i * 0.04} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6">
                  <h3 className="flex items-center gap-3 font-semibold mb-4">
                    <span className="rounded-lg bg-purple-500/15 border border-purple-400/20 p-2">
                      <Icon className="w-5 h-5 text-purple-300" aria-hidden="true" />
                    </span>
                    {group.title}
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <li key={item} className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs sm:text-sm font-medium text-slate-200 hover:border-emerald-400/40 hover:text-white transition-colors">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              );
            })}
          </div>
          <p className="text-center text-sm text-slate-300 mt-8">{t("landing.v2.integrations.note")}</p>
        </div>
      </section>

      {/* Commitments, Security and Compliance — contractual trust & IT assurance */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.security.title")} subtitle={t("landing.v2.security.subtitle")} />

          {/* 4 Core Guarantees Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {list<Item>("landing.v2.commitments.items").map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04} className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{item.title}</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
              </Reveal>
            ))}
          </div>

          {/* 9 Security & Compliance specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list<Item>("landing.v2.security.items").map((item, i) => {
              const Icon = SECURITY_ICONS.at(i) ?? ShieldCheck;
              return (
                <Reveal key={item.title} delay={i * 0.03} className="flex gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition-colors">
                  <span className="h-fit rounded-lg bg-emerald-500/10 border border-emerald-400/20 p-2 shrink-0">
                    <Icon className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who you'll work with */}
      {founder && (
        <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
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

          {/* Local presence — US and Peru offices */}
          <div className="max-w-5xl mx-auto px-6 mt-16">
            <Reveal className="text-center mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">{t("landing.v2.presence.eyebrow")}</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("landing.v2.presence.title")}</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">{t("landing.v2.presence.subtitle")}</p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PUBLIC_OFFICES.map((office, i) => (
                <Reveal key={office.id} delay={i * 0.05} className="flex gap-4 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6">
                  <span className="h-fit rounded-full bg-purple-500/15 border border-purple-400/20 p-3">
                    <MapPin className="w-5 h-5 text-purple-300" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{t(`landing.v2.presence.offices.${office.id}.label`)}</p>
                    <h3 className="text-lg font-bold mt-1">{t(`landing.v2.presence.offices.${office.id}.country`)}</h3>
                    <address className="not-italic text-slate-300 text-sm mt-1">
                      {office.street}
                      <br />
                      {office.city}
                    </address>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ — objections */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <SectionTitle title={t("landing.v2.faq.title")} />
          <div className="space-y-3">
            {[...list<Faq>("landing.v2.faqExtra"), ...list<Faq>("landing.v2.faq.items")].map((f, i) => (
              <details key={f.q} open={i < 2} className="group bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 open:border-emerald-500/40">
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
      <section id="contacto" className="scroll-mt-20 py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-900/50 to-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">{t(variant ? `landing.v2.variants.${variant}.contactTitle` : "landing.cta.title")}</h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-10">{t("landing.v2.contact.subtitle")}</p>
          </Reveal>

          <Reveal className="max-w-3xl mx-auto mb-10">
            <ContactForm
              className="bg-slate-900/90 border border-slate-700/80 p-6 sm:p-10 rounded-2xl shadow-2xl backdrop-blur-sm"
              tone="dark"
              showNewsletter={false}
              titleKey="landing.v2.contact.formTitle"
              defaultGoal={variant ? VARIANT_GOAL[variant] : undefined}
              showTrustNote
              submitLabelKey={variant ? `landing.v2.variants.${variant}.submit` : "contact.submitDiagnosis"}
              buttonClassName="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base sm:text-lg py-3 sm:py-4 shadow-lg shadow-emerald-950/40"
            />
          </Reveal>

          <p className="text-slate-300 text-sm mb-6">{t("landing.cta.orReachUs")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContactClick("calendar", "landing_contact")}
                className="flex items-center gap-3 bg-emerald-600/15 border border-emerald-500/50 hover:border-emerald-400 rounded-xl px-6 py-4 transition-colors"
              >
                <CalendarDays className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                <span className="text-left">
                  <span className="block text-xs text-slate-300">{t("landing.v2.booking.desc")}</span>
                  <span className="block font-medium">{t("landing.v2.booking.title")}</span>
                </span>
              </a>
            )}
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
              href={PUBLIC_CONTACT.phoneHref}
              onClick={() => trackContactClick("phone", "landing_contact")}
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-xl px-6 py-4 transition-colors"
            >
              <Phone className="w-5 h-5 text-purple-300" aria-hidden="true" />
              <span className="text-left">
                <span className="block text-xs text-slate-300">{t("landing.cta.phone")}</span>
                <span className="block font-medium">{PUBLIC_CONTACT.phone}</span>
              </span>
            </a>
            <a
              href={whatsappHref}
              onClick={() => trackContactClick("whatsapp", "landing_contact")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl px-6 py-4 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-emerald-300" aria-hidden="true" />
              <span className="text-left">
                <span className="block text-xs text-slate-300">{t("landing.cta.whatsapp")}</span>
                <span className="block font-medium">{t("landing.cta.whatsappValue")}</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp bubble (desktop, bottom left; Robly holds the right). Phones use the dock below. */}
      <motion.a
        href={whatsappHref}
        onClick={() => trackContactClick("whatsapp", "landing_floating")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("landing.v2.sticky.whatsapp")}
        title={t("landing.v2.sticky.whatsapp")}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:block fixed bottom-14 left-12 lg:left-20 z-40 print:hidden"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping" aria-hidden="true" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-900/40 ring-4 ring-white/20 transition-transform hover:scale-110 [&_svg]:h-8 [&_svg]:w-8">
          <WhatsAppMark />
        </span>
      </motion.a>

      {/* Phone dock: an opaque bar so nothing floats over the text. Robly sits in the space kept on the right; index.css pads the page by its height. */}
      <div className="landing-dock md:hidden fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-white/10 bg-slate-950 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pl-3 pr-[76px] print:hidden">
        <a
          href={whatsappHref}
          onClick={() => trackContactClick("whatsapp", "landing_floating")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("landing.v2.sticky.whatsapp")}
          className={`tap-target gap-2 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-slate-950 [&_svg]:h-6 [&_svg]:w-6 ${showSticky ? "shrink-0" : "flex-1"}`}
        >
          <WhatsAppMark />
          {!showSticky && "WhatsApp"}
        </a>
        {showSticky && (
          <a
            href="#contacto"
            className="tap-target flex-1 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white"
          >
            {t("landing.v2.sticky.book")}
          </a>
        )}
      </div>
    </div>
  );
}
