import { motion } from "framer-motion";
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
  Bell,
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

function DemoCard({ item, index }: { item: DemoItem; index: number }) {
  const { t } = useTranslation();
  const Icon = ICONS[item.icon] || Sparkles;
  const isLive = item.status === "live";

  const card = (
    <motion.div
      variants={fadeIn}
      custom={0.15 + index * 0.06}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 ${
        isLive
          ? "border-gray-200 shadow-md hover:-translate-y-1 hover:shadow-xl cursor-pointer"
          : "border-dashed border-gray-200"
      }`}
    >
      {/* Status badge */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.from} ${item.to} text-white shadow-sm ${
            isLive ? "" : "opacity-70 grayscale-[35%]"
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t("demosCatalog.badge_live")}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
            {t("demosCatalog.badge_soon")}
          </span>
        )}
      </div>

      {/* Model type */}
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {item.modelType}
      </p>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{item.title}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-600">{item.description}</p>

      {/* CTA */}
      {isLive ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 transition-transform group-hover:translate-x-0.5">
          {t("demosCatalog.cta_try")}
          <ArrowRight className="h-4 w-4" />
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400">
          <Bell className="h-3.5 w-3.5" />
          {t("demosCatalog.cta_soon")}
        </span>
      )}
    </motion.div>
  );

  // Live demos link to their page; "soon" demos link to contact to register interest.
  if (isLive && item.href) {
    return (
      <Link href={item.href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-2xl">
        {card}
      </Link>
    );
  }
  return (
    <a href="/#contact" className="block h-full">
      {card}
    </a>
  );
}

/**
 * AI Demos catalog. Renders the interactive demos grid.
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
  const items = limit ? allItems.slice(0, limit) : allItems;

  return (
    <section id="demos" className="scroll-mt-20 bg-gradient-to-b from-white via-violet-50/30 to-white py-16">
      <motion.div
        className="container mx-auto px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.span
            variants={fadeIn}
            custom={0}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("demosCatalog.eyebrow")}
          </motion.span>
          <motion.h2
            variants={fadeIn}
            custom={0.05}
            className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl"
          >
            {t("demosCatalog.title")}
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.1}
            className="mx-auto max-w-3xl text-lg text-gray-600"
          >
            {t("demosCatalog.subtitle")}
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <DemoCard key={item.id} item={item} index={index} />
          ))}
        </div>

        {/* Footer / CTA */}
        <motion.div variants={fadeIn} custom={0.2} className="mt-12 text-center">
          {showViewAll && (
            <Link
              href="/demos"
              className="mb-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {t("demosCatalog.view_all")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <p className="text-sm text-gray-500">
            {t("demosCatalog.footer_note")}{" "}
            <a href="/#contact" className="font-semibold text-violet-600 hover:text-violet-700">
              {t("demosCatalog.footer_cta")}
            </a>
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
