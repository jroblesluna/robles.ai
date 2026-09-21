import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Fingerprint,
  Database,
  HeartPulse,
  Link2,
  AudioLines,
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
  Bell,
  Search,
  ScanFace,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";
import { useTranslation } from "react-i18next";

/** Icon name (from i18n) → lucide component. */
const ICONS: Record<string, LucideIcon> = {
  Fingerprint,
  Database,
  HeartPulse,
  Link2,
  AudioLines,
  MessagesSquare,
  TrendingUp,
  ScanEye,
  Smile,
  FileText,
  Sparkles,
  Wand2,
  ShieldAlert,
};

type DemoItem = {
  id: string;
  href: string;
  status: "live" | "soon";
  icon: string;
  from: string;
  to: string;
  modelType: string;
  title: string;
  description: string;
};

type Category = "all" | "vision" | "language" | "audio" | "predictive" | "generative";

/** Demo id → filter category (kept in code so it's locale-independent). */
const CATEGORY_BY_ID: Record<string, Exclude<Category, "all">> = {
  identity: "vision",
  medical: "vision",
  objectdetection: "vision",
  emotion: "vision",
  rag: "language",
  langchain: "language",
  sentiment: "language",
  docextract: "language",
  speech: "audio",
  forecast: "predictive",
  recommend: "predictive",
  anomaly: "predictive",
  imagegen: "generative",
};
const CATEGORIES: Category[] = ["all", "vision", "language", "audio", "predictive", "generative"];

/** Gradient per demo — written out here because Tailwind doesn't scan the i18n JSON. */
const GRADIENTS: Record<string, string> = {
  identity: "from-violet-500 to-purple-600",
  rag: "from-cyan-500 to-blue-600",
  medical: "from-rose-500 to-pink-600",
  langchain: "from-amber-500 to-orange-600",
  objectdetection: "from-indigo-500 to-blue-600",
  emotion: "from-rose-500 to-pink-600",
  speech: "from-teal-500 to-emerald-600",
  sentiment: "from-indigo-500 to-violet-600",
  forecast: "from-sky-500 to-cyan-600",
  docextract: "from-slate-500 to-gray-700",
  imagegen: "from-purple-500 to-fuchsia-600",
  recommend: "from-lime-500 to-green-600",
  anomaly: "from-red-500 to-rose-600",
};

// ── Demo card (live + roadmap share the same anatomy) ─────────────────────────
function DemoCard({ item, index }: { item: DemoItem; index: number }) {
  const { t } = useTranslation();
  const Icon = ICONS[item.icon] || Sparkles;
  const isLive = item.status === "live";
  const gradient = GRADIENTS[item.id] ?? `${item.from} ${item.to}`;
  const [family, ...rest] = item.modelType.split("·").map((s) => s.trim());
  const task = rest.join(" · ");

  const inner = (
    <>
      {/* media */}
      <div className="relative h-36 overflow-hidden border-b border-gray-100 bg-gray-50">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-opacity duration-500 ${
            isLive ? "opacity-[0.12] group-hover:opacity-20" : "opacity-[0.07] group-hover:opacity-[0.12]"
          }`}
        />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg ring-4 ring-white/70 transition-all duration-500 group-hover:scale-110 ${
              isLive ? "" : "opacity-60 saturate-50 group-hover:opacity-90 group-hover:saturate-100"
            }`}
          >
            <Icon className="h-7 w-7" />
          </span>
        </div>
        {isLive ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {t("demosCatalog.badge_live")}
          </span>
        ) : (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gray-500 ring-1 ring-gray-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            {t("demosCatalog.badge_soon")}
          </span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{family}</p>
        <h3 className="mt-1.5 text-base font-semibold tracking-tight text-gray-900">{item.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-500">{item.description}</p>

        <div className="mt-auto flex items-center justify-between pt-5">
          {task ? (
            <span className="truncate rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-100">
              {task}
            </span>
          ) : <span />}
          {isLive ? (
            <span className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-all duration-300 group-hover:bg-violet-600">
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          ) : (
            <span className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition-colors duration-300 group-hover:bg-gray-900 group-hover:text-white group-hover:ring-gray-900">
              <Bell className="h-3.5 w-3.5" />
              {t("demosCatalog.cta_soon")}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const cardClass =
    "group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(16,24,40,0.25)] hover:ring-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      className="h-full"
    >
      {isLive && item.href ? (
        <Link href={item.href} className={cardClass}>{inner}</Link>
      ) : (
        // Roadmap demos link to contact to register interest.
        <a href="/#contact" className={cardClass}>{inner}</a>
      )}
    </motion.div>
  );
}

// ── Mini previews: what each demo actually outputs (home carousel) ────────────
type TFn = (k: string) => string;

const PreviewIdentity = ({ t }: { t: TFn }) => (
  <div className="relative flex items-center gap-3 pb-8">
    {["selfie", "ID"].map((label, i) => (
      <div key={label} className="flex h-28 w-24 flex-col items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <div className={`relative flex h-14 w-14 items-center justify-center rounded-full ${i ? "bg-violet-100" : "bg-purple-100"}`}>
          <ScanFace className="h-7 w-7 text-violet-600" />
          <span className="absolute -inset-1.5 rounded-lg border-2 border-dashed border-violet-400/70" />
        </div>
        <span className="mt-3 font-mono text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
      </div>
    ))}
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
      {t("demosCatalog.mock.match")} · 98.7%
    </div>
  </div>
);

const PreviewRag = ({ t }: { t: TFn }) => (
  <div className="flex w-[240px] flex-col gap-2">
    {[90, 70, 80].map((w, i) => (
      <div key={i} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-sm ring-1 ring-black/5">
        <span className="font-mono text-[10px] text-blue-500">#{i + 1}</span>
        <span className="h-1.5 rounded-full bg-blue-100" style={{ width: `${w}%` }} />
        <span className="ml-auto font-mono text-[10px] text-gray-400">.{92 - i * 7}</span>
      </div>
    ))}
    <div className="mt-1 rounded-xl rounded-tl-sm bg-blue-600 px-3 py-2 text-[11px] leading-snug text-white shadow-md">
      {t("demosCatalog.mock.answer")} <span className="rounded bg-white/20 px-1 font-mono">[1]</span>{" "}
      <span className="rounded bg-white/20 px-1 font-mono">[3]</span>
    </div>
  </div>
);

const Bars = ({ rows, color }: { rows: { k: string; v: number; c?: string }[]; color: string }) => (
  <div className="w-28 space-y-2.5">
    {rows.map((r) => (
      <div key={r.k}>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{r.k}</span>
          <span className="font-mono">{r.v}%</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white ring-1 ring-black/5">
          <div className={`h-full rounded-full ${r.c ?? color}`} style={{ width: `${r.v}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const PreviewMedical = ({ t }: { t: TFn }) => (
  <div className="flex items-center gap-4">
    <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 shadow-md">
      <div className="absolute inset-x-6 inset-y-4 rounded-[40%] border border-slate-500/40" />
      <div className="absolute bottom-3 left-1/2 top-3 w-px bg-slate-500/40" />
      <div className="absolute left-[58%] top-[42%] h-10 w-10 rounded-full bg-rose-500/50 blur-md" />
      <div className="absolute left-[55%] top-[38%] h-12 w-12 rounded-md border-2 border-rose-400" />
    </div>
    <Bars
      color="bg-rose-500"
      rows={[
        { k: t("demosCatalog.mock.finding"), v: 88 },
        { k: t("demosCatalog.mock.normal"), v: 12, c: "bg-emerald-500" },
      ]}
    />
  </div>
);

const PreviewAgent = () => (
  <div className="relative flex flex-col gap-2 pl-5">
    <span className="absolute bottom-10 left-[5px] top-3 w-px bg-orange-200" />
    {["search_docs()", "calculator()", "format_json()"].map((step, i) => (
      <div key={step} className="relative flex items-center">
        <span className={`absolute -left-5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${i < 2 ? "bg-orange-500" : "bg-emerald-500"}`} />
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] text-gray-700 shadow-sm ring-1 ring-black/5">
          <Wrench className="h-3 w-3 text-orange-500" />
          {step}
        </span>
      </div>
    ))}
    <span className="mt-1 self-start rounded-lg bg-gray-900 px-3 py-1.5 font-mono text-[11px] text-emerald-300 shadow-md">
      {"{ \"status\": \"ok\" }"}
    </span>
  </div>
);

const PreviewDetection = () => (
  <div className="relative h-32 w-[250px] overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 shadow-md">
    <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />
    {[
      { l: "10%", tp: "22%", w: "30%", h: "66%", label: "person 0.96" },
      { l: "50%", tp: "46%", w: "40%", h: "40%", label: "laptop 0.91" },
    ].map((b) => (
      <div key={b.label} className="absolute rounded border-2 border-sky-400" style={{ left: b.l, top: b.tp, width: b.w, height: b.h }}>
        <span className="absolute -top-[18px] left-[-2px] whitespace-nowrap rounded-sm bg-sky-400 px-1 font-mono text-[9px] font-semibold text-slate-900">
          {b.label}
        </span>
      </div>
    ))}
  </div>
);

const PreviewEmotion = ({ t }: { t: TFn }) => (
  <div className="flex items-center gap-4">
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
      <Smile className="h-12 w-12 text-rose-500" strokeWidth={1.5} />
      {[[18, 30], [72, 28], [45, 76], [26, 58], [66, 58]].map(([x, y], i) => (
        <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-rose-400" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </div>
    <Bars
      color="bg-rose-500"
      rows={[
        { k: t("demosCatalog.mock.happy"), v: 72 },
        { k: t("demosCatalog.mock.surprise"), v: 18 },
        { k: t("demosCatalog.mock.neutral"), v: 10 },
      ]}
    />
  </div>
);

const WAVE = [30, 55, 80, 45, 95, 60, 35, 70, 90, 50, 25, 65, 85, 40, 60, 30];
const PreviewSpeech = ({ t }: { t: TFn }) => (
  <div className="flex w-[250px] flex-col gap-3">
    <div className="flex h-10 items-center justify-center gap-[3px]">
      {WAVE.map((h, i) => (
        <span key={i} className="w-1.5 animate-pulse rounded-full bg-teal-500" style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
    {[
      { s: "S1", c: "bg-teal-500", k: "demosCatalog.mock.speaker1" },
      { s: "S2", c: "bg-emerald-600", k: "demosCatalog.mock.speaker2" },
    ].map((m, i) => (
      <div key={m.s} className={`flex items-start gap-2 ${i ? "flex-row-reverse" : ""}`}>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${m.c} text-[9px] font-bold text-white`}>{m.s}</span>
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] leading-snug text-gray-700 shadow-sm ring-1 ring-black/5">{t(m.k)}</span>
      </div>
    ))}
  </div>
);

const PREVIEWS: Record<string, (p: { t: TFn }) => React.ReactElement> = {
  identity: PreviewIdentity,
  rag: PreviewRag,
  medical: PreviewMedical,
  langchain: PreviewAgent,
  objectdetection: PreviewDetection,
  emotion: PreviewEmotion,
  speech: PreviewSpeech,
};

/** Light tint behind each preview (static so Tailwind generates it). */
const TINTS: Record<string, string> = {
  identity: "from-violet-100 via-purple-50 to-white",
  rag: "from-sky-100 via-blue-50 to-white",
  medical: "from-rose-100 via-pink-50 to-white",
  langchain: "from-amber-100 via-orange-50 to-white",
  objectdetection: "from-indigo-100 via-blue-50 to-white",
  emotion: "from-pink-100 via-rose-50 to-white",
  speech: "from-teal-100 via-emerald-50 to-white",
};

/**
 * AI Demos catalog.
 * - Full page (/demos): hero, search + category filters, live grid, roadmap.
 * - Compact (home, when `limit` is set): grid of preview cards + "view all" card.
 * @param limit  Optional cap on how many items to show (used on the home page).
 * @param showViewAll  Whether to show the "view all demos" link (home page).
 */
export default function DemosCatalog({
  limit,
  showViewAll = false,
}: {
  limit?: number;
  showViewAll?: boolean;
}) {
  const { t } = useTranslation();
  const allItems = (t("demosCatalog.items", { returnObjects: true }) as DemoItem[]) || [];
  const compact = !!limit;

  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const liveAll = allItems.filter((i) => i.status === "live");
  const soonAll = allItems.filter((i) => i.status === "soon");

  const matches = (i: DemoItem) => {
    if (category !== "all" && CATEGORY_BY_ID[i.id] !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [i.title, i.description, i.modelType].some((s) => s.toLowerCase().includes(q));
  };

  const live = liveAll.filter(matches);
  const soon = soonAll.filter(matches);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { all: allItems.length, vision: 0, language: 0, audio: 0, predictive: 0, generative: 0 };
    allItems.forEach((i) => { const k = CATEGORY_BY_ID[i.id]; if (k) c[k]++; });
    return c;
  }, [allItems]);

  // ── Compact variant (home page) ─────────────────────────────────────────────
  // 4×2 grid of cards, each with a mini preview of the demo's real output.
  if (compact) {
    const cards = liveAll.slice(0, limit);
    return (
      <section id="demos" className="scroll-mt-20 bg-gradient-to-b from-white to-gray-50/70 py-24">
        <motion.div
          className="container mx-auto max-w-7xl px-6"
          variants={staggerContainer}
          initial="hidden"
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
          {cards.map((item, i) => {
            const Icon = ICONS[item.icon] || Sparkles;
            const Preview = PREVIEWS[item.id];
            const [family] = item.modelType.split("·").map((s) => s.trim());
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3) }}
                className="h-full"
              >
                <Link
                  href={item.href}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(16,24,40,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <div className={`relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-b ${TINTS[item.id] ?? "from-gray-100 to-white"}`}>
                    <div className="scale-90 transition-transform duration-500 ease-out group-hover:scale-95 sm:scale-100 sm:group-hover:scale-[1.04]">
                      {Preview ? <Preview t={t} /> : <Icon className="h-12 w-12 text-gray-400" />}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Icon className="h-3.5 w-3.5" />
                      {family}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-gray-900">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">{item.description}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-gray-900 transition-colors group-hover:text-violet-600">
                      {t("demosCatalog.cta_try")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {showViewAll && (
            <div className="h-full">
              <Link
                href="/demos"
                className="group relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-gray-950 p-7 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/40 blur-3xl" />
                <span className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-blue-600/25 blur-3xl" />
                <div className="relative mb-auto flex -space-x-2">
                  {soonAll.slice(0, 5).map((s) => {
                    const SIcon = ICONS[s.icon] || Sparkles;
                    return (
                      <span key={s.id} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 ring-2 ring-gray-950">
                        <SIcon className="h-4 w-4" />
                      </span>
                    );
                  })}
                </div>
                <p className="relative text-2xl font-semibold tracking-tight">{t("demosCatalog.view_all")}</p>
                <p className="relative mt-2 text-sm text-gray-400">
                  {t("demosCatalog.view_all_meta", { live: liveAll.length, soon: soonAll.length })}
                </p>
                <span className="relative mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            </div>
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
          className="container relative mx-auto max-w-7xl px-6 pb-14 pt-20 md:pt-24"
          variants={staggerContainer}
          initial="hidden"
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
        <div className="container mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("demosCatalog.search_placeholder")}
              className="w-full rounded-full bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 ring-1 ring-gray-200 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </label>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 py-14">
        {/* live */}
        {live.length > 0 && (
          <div>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">{t("demosCatalog.live_title")}</h2>
              <span className="text-sm text-gray-400">{live.length}</span>
            </div>
            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {live.map((item, i) => <DemoCard key={item.id} item={item} index={i} />)}
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
                {soon.map((item, i) => <DemoCard key={item.id} item={item} index={i} />)}
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
              href="/#contact"
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
