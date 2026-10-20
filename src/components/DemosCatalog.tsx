import { normalizeLanguage, staticPagePath } from '@shared/seoPolicy';
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useDemoPreviewMotion } from "@/hooks/useDemoPreviewMotion";
import { DemoVisualPreview } from "@/components/demo/DemoVisualPreview";
import { EmotionPreview } from "@/components/demo/EmotionPreview";
import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Play,
  Pause,
  Fingerprint,
  Database,
  Link2,
  AudioLines,
  Volume2,
  MessagesSquare,
  TrendingUp,
  ScanEye,
  Smile,
  FileText,
  Sparkles,
  Wand2,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
  Search,
  Bot,
  PhoneCall,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";

/** Icon name (from i18n) → lucide component. */
const ICONS: Record<string, LucideIcon> = {
  Fingerprint,
  Database,
  Link2,
  AudioLines,
  Volume2,
  MessagesSquare,
  TrendingUp,
  ScanEye,
  Smile,
  FileText,
  Sparkles,
  Wand2,
  ShieldAlert,
  Bot,
  PhoneCall,
};

type DemoItem = {
  id: string;
  href?: string;
  status: "live" | "soon";
  icon: string;
  from: string;
  to: string;
  modelType: string;
  title: string;
  description: string;
  /** One line on the money it saves or earns (DEMOS_PLAN.md §2). */
  benefit?: string;
};

type Category = "all" | "vision" | "language" | "audio" | "predictive" | "generative";

/** Demo id → filter category (kept in code so it's locale-independent). */
const CATEGORY_BY_ID: Record<string, Exclude<Category, "all">> = {
  identity: "vision",
  objectdetection: "vision",
  emotion: "vision",
  rag: "language",
  langchain: "language",
  sitechatbot: "language",
  docextract: "language",
  speech: "audio",
  tts: "audio",
  voiceagent: "audio",
  forecast: "predictive",
  anomaly: "predictive",
  imagegen: "generative",
};
const CATEGORIES: Category[] = ["all", "vision", "language", "audio", "predictive", "generative"];

/** The money angle of a demo, shown on every card. */
function BenefitLine({ text }: { text: string }) {
  return (
    <p className="mt-3 inline-flex items-start gap-1.5 text-[13px] font-medium leading-snug text-emerald-700">
      <CircleDollarSign className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {text}
    </p>
  );
}

// A single card anatomy and poster are shared by home and the lab.
function DemoCard({ item, index, reducedMotion }: { item: DemoItem; index: number; reducedMotion: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const [photoReady, setPhotoReady] = useState(false);
  const onPhotoLoad = useCallback(() => setPhotoReady(true), []);
  const motionPreview = useDemoPreviewMotion(photoReady, reducedMotion);
  const Icon = ICONS[item.icon] || Sparkles;
  const isLive = item.status === "live";
  const [family] = item.modelType.split("·").map(value => value.trim());
  const playbackLabel = item.id === "emotion"
    ? t(motionPreview.playing ? "demosCatalog.emotionPreview.stop" : "demosCatalog.emotionPreview.replay")
    : `${t(motionPreview.playing ? "demosCatalog.photoPreview.stop" : "demosCatalog.photoPreview.replay")}: ${item.title}`;
  return (
    <motion.div data-preview-id={item.id} ref={motionPreview.target}
      onMouseEnter={motionPreview.onMouseEnter} onMouseLeave={motionPreview.onMouseLeave} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
      <Link href={isLive && item.href ? staticPagePath(item.href, lang) : staticPagePath("/", lang) + "#contact"}
        className="group flex flex-1 flex-col overflow-hidden bg-white transition-shadow hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
          {item.id === "emotion" ? <EmotionPreview playing={motionPreview.playing} run={motionPreview.run} onLoad={onPhotoLoad} /> : <DemoVisualPreview id={item.id} playing={motionPreview.playing} run={motionPreview.run} onLoad={onPhotoLoad} />}
          {!isLive && <span data-demo-status="soon" className="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
            {t("demosCatalog.badge_soon")}
          </span>}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="flex items-center gap-2 text-xs font-medium text-slate-600"><Icon aria-hidden="true" className="h-4 w-4" />{family}</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>
          {item.benefit && <BenefitLine text={item.benefit} />}
          <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-slate-900">
            {t(isLive ? "demosCatalog.cta_try" : "demosCatalog.cta_soon")}<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </Link>
      {!reducedMotion && <button type="button"
        aria-label={playbackLabel}
        title={playbackLabel}
        aria-pressed={motionPreview.playing} disabled={!photoReady}
        onClick={motionPreview.playing ? motionPreview.stop : motionPreview.replay}
        className="tap-target absolute left-3 top-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/30 bg-slate-950/90 px-2.5 text-[11px] font-semibold text-white shadow-lg disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
        {motionPreview.playing ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
        {t(motionPreview.playing ? "demosCatalog.photoPreview.pauseLabel" : "demosCatalog.photoPreview.playLabel")}
      </button>}
    </motion.div>
  );
}

/**
 * AI Demos catalog.
 * - Full page (/demos): hero, search + category filters, live grid, roadmap.
 * - Home: all available demos + "view all" card; the lab also shows the roadmap.
 * @param variant Layout only; available demo membership is identical on both surfaces.
 * @param showViewAll  Whether to show the "view all demos" link (home page).
 */
export default function DemosCatalog({
  variant = "lab",
  showViewAll = false,
}: {
  variant?: "home" | "lab";
  showViewAll?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
  const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const allItems = (t("demosCatalog.items", { returnObjects: true }) as DemoItem[]) || [];
  const compact = variant === "home";

  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const liveAll = allItems.filter((i) => i.status === "live");
  const soonAll = allItems.filter((i) => i.status === "soon");

  const matches = (i: DemoItem) => {
    if (category !== "all" && CATEGORY_BY_ID[i.id] !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [i.title, i.description, i.modelType, i.benefit ?? ""].some((s) => s.toLowerCase().includes(q));
  };

  const live = liveAll.filter(matches);
  const soon = soonAll.filter(matches);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { all: allItems.length, vision: 0, language: 0, audio: 0, predictive: 0, generative: 0 };
    allItems.forEach((i) => { const k = CATEGORY_BY_ID[i.id]; if (k) c[k]++; });
    return c;
  }, [allItems]);

  // ── Compact variant (home page) ─────────────────────────────────────────────
  // Shared, illustrative media — not a screenshot or measured result.
  if (compact) {
    const cards = liveAll;
    return (
      <section id="demos" className="scroll-mt-20 bg-gradient-to-b from-white to-gray-50/70 py-24">
        <motion.div
          className="container mx-auto max-w-[max(80rem,70vw)] px-6"
          variants={staggerContainer}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              variants={fadeIn}
              custom={0}
              className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 ring-1 ring-violet-100"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {t("demosCatalog.eyebrow")}
            </motion.span>
            <motion.h2 variants={fadeIn} custom={0.1} className="mt-5 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
              {t("demosCatalog.title")}
            </motion.h2>
            <motion.p variants={fadeIn} custom={0.2} className="mt-5 text-lg leading-relaxed text-gray-500">
              {t("demosCatalog.subtitle")}
            </motion.p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item, i) => <DemoCard key={item.id} item={item} index={i} reducedMotion={reducedMotion} />)}

          {showViewAll && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(cards.length * 0.06, 0.3) }}
              className="h-full sm:col-span-2 lg:col-span-4"
            >
              <Link
                href={staticPagePath("/demos", lang)}
                className="group relative grid h-full items-center gap-8 overflow-hidden rounded-3xl bg-gray-950 p-6 text-white sm:grid-cols-2 sm:p-8 lg:gap-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <div className="relative rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-3">
                    <span className="text-xs font-medium text-slate-300">{t("demosCatalog.catalogPreview.label")}</span>
                    <Search aria-hidden="true" className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    {[{ key: "documents", icon: FileText }, { key: "vision", icon: ScanEye }, { key: "voice", icon: AudioLines }].map(({ key, icon: Icon }) => (
                      <div key={key} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3">
                        <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300" />
                        <span className="flex-1 text-xs font-medium leading-5 text-slate-100">{t(`demosCatalog.catalogPreview.${key}`)}</span>
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                <h3 className="relative text-2xl font-semibold tracking-tight">{t("demosCatalog.view_all")}</h3>
                <p className="relative mt-3 text-sm leading-6 text-slate-300">{t("demosCatalog.catalogPreview.description")}</p>
                <p className="relative mt-2 text-sm text-slate-400">
                  {t("demosCatalog.view_all_meta", { live: liveAll.length, soon: soonAll.length })}
                </p>
                <span className="relative mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </span>
                </div>
              </Link>
            </motion.div>
          )}
          </div>
        </motion.div>
      </section>
    );
  }

  // ── Full page (/demos) ──────────────────────────────────────────────────────
  return (
    <section id="demos" className="relative scroll-mt-20 overflow-hidden bg-white">
      {/* hero */}
      <div className="relative border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-200/50 via-blue-200/40 to-emerald-200/40 blur-3xl" />

        <motion.div
          className="container relative mx-auto max-w-[max(80rem,70vw)] px-6 pb-14 pt-20 md:pt-24"
          variants={staggerContainer}
          initial={false}
          animate="visible"
        >
          <motion.span
            variants={fadeIn}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 ring-1 ring-violet-100"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {t("demosCatalog.eyebrow")}
          </motion.span>
          <motion.h1 variants={fadeIn} custom={0.1} className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">
            {t("demosCatalog.title")}
          </motion.h1>
          <motion.p variants={fadeIn} custom={0.2} className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-500">
            {t("demosCatalog.subtitle")}
          </motion.p>

          {/* stats */}
          <motion.dl variants={fadeIn} custom={0.3} className="mt-10 grid max-w-2xl grid-cols-3 divide-x divide-gray-200 rounded-2xl bg-white/80 ring-1 ring-gray-200/80 backdrop-blur">
            {[
              { v: liveAll.length, k: t("demosCatalog.stat_live") },
              { v: soonAll.length, k: t("demosCatalog.stat_soon") },
              { v: "0", k: t("demosCatalog.stat_signup") },
            ].map((s) => (
              <div key={s.k} className="px-5 py-4">
                <dd className="text-2xl font-semibold tracking-tight text-gray-900">{s.v}</dd>
                <dt className="mt-0.5 text-xs text-gray-500">{s.k}</dt>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>

      {/* toolbar */}
      <div className="sticky top-[68px] z-20 border-b border-gray-100 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto flex max-w-[max(80rem,70vw)] flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(c)}
                  className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {active && (
                    <motion.span layoutId="demo-cat-pill" className="absolute inset-0 rounded-full bg-gray-900" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  )}
                  <span className="relative">{t(`demosCatalog.categories.${c}`)}</span>
                  <span className={`relative text-xs ${active ? "text-white/60" : "text-gray-400"}`}>{counts[c]}</span>
                </button>
              );
            })}
          </div>
          <label className="relative block md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              aria-label={t("demosCatalog.search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("demosCatalog.search_placeholder")}
              className="w-full rounded-full bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </label>
        </div>
      </div>

      <div className="container mx-auto max-w-[max(80rem,70vw)] px-6 py-14">
        {/* live */}
        {live.length > 0 && (
          <div>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">{t("demosCatalog.live_title")}</h2>
              <span className="text-sm text-gray-400">{live.length}</span>
            </div>
            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {live.map((item, i) => <DemoCard key={item.id} item={item} index={i} reducedMotion={reducedMotion} />)}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* roadmap */}
        {soon.length > 0 && (
          <div className={live.length ? "mt-16" : ""}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">{t("demosCatalog.soon_title")}</h2>
                <p className="mt-1 text-sm text-gray-500">{t("demosCatalog.soon_subtitle")}</p>
              </div>
              <span className="text-sm text-gray-400">{soon.length}</span>
            </div>
            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {soon.map((item, i) => <DemoCard key={item.id} item={item} index={i} reducedMotion={reducedMotion} />)}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* empty state */}
        {live.length === 0 && soon.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <Search className="h-6 w-6 text-gray-300" />
            <p className="mt-3 font-semibold text-gray-900">{t("demosCatalog.empty_title")}</p>
            <button
              type="button"
              onClick={() => { setQuery(""); setCategory("all"); }}
              className="mt-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              {t("demosCatalog.empty_reset")}
            </button>
          </div>
        )}

        {/* subtle footer note */}
        <div className="mt-16 flex items-center gap-4">
          <span className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 sm:block" />
          <p className="text-center text-sm text-gray-500">
            {t("demosCatalog.footer_note")}{" "}
            <a
              href={staticPagePath("/", lang) + "#contact"}
              className="group inline-flex items-center gap-1 font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-violet-600 hover:decoration-violet-400"
            >
              {t("demosCatalog.footer_cta")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </p>
          <span className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 sm:block" />
        </div>
      </div>
    </section>
  );
}
