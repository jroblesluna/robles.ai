import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { motion } from "framer-motion";
import {
  Lightbulb, Shield, Zap, Award, Check,
  HeartPulse, Factory, Landmark, ShoppingBag,
} from "lucide-react";
import { fadeIn, staggerContainer } from "@/utils/animations";

type Accent = {
  icon: string;      // icon tile classes
  glow: string;      // rgba used by the hover spotlight
};

const ACCENTS: Record<string, Accent> = {
  blue:    { icon: "bg-blue-50 text-blue-600 ring-blue-100",          glow: "rgba(37,99,235,0.10)" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", glow: "rgba(16,185,129,0.10)" },
  violet:  { icon: "bg-violet-50 text-violet-600 ring-violet-100",    glow: "rgba(124,58,237,0.10)" },
  amber:   { icon: "bg-amber-50 text-amber-600 ring-amber-100",       glow: "rgba(217,119,6,0.10)" },
};

// ── Card shell with cursor-following spotlight ────────────────────────────────
const BentoCard = ({
  index, icon, title, description, accent, className = "", children, delay,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: Accent;
  className?: string;
  children?: React.ReactNode;
  delay: number;
}) => {
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  }, []);

  return (
    <motion.div
      variants={fadeIn}
      custom={delay}
      onMouseMove={onMove}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white p-7 ring-1 ring-gray-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_40px_-12px_rgba(16,24,40,0.18)] ${className}`}
    >
      {/* spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at var(--x) var(--y), ${accent.glow}, transparent 60%)` }}
      />

      <div className="relative flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${accent.icon}`}>
          {icon}
        </div>
        <span className="font-mono text-xs tracking-wider text-gray-300">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <h3 className="relative mt-6 text-lg font-semibold tracking-tight text-gray-900">{title}</h3>
      <p className="relative mt-2 max-w-md text-[15px] leading-relaxed text-gray-500">{description}</p>

      {children && <div className="relative mt-auto pt-7">{children}</div>}
    </motion.div>
  );
};

// ── Visuals ───────────────────────────────────────────────────────────────────
const NODES = [
  { x: 30, y: 60 }, { x: 30, y: 120 },
  { x: 130, y: 30 }, { x: 130, y: 90 }, { x: 130, y: 150 },
  { x: 230, y: 60 }, { x: 230, y: 120 },
  { x: 330, y: 90 },
];
const EDGES: [number, number][] = [
  [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4],
  [2, 5], [2, 6], [3, 5], [3, 6], [4, 5], [4, 6],
  [5, 7], [6, 7],
];

const NeuralVisual = () => (
  <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/60 ring-1 ring-gray-100">
    <svg viewBox="0 0 360 180" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {EDGES.map(([a, b], i) => (
        <line
          key={`l${i}`}
          x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
          className="stroke-blue-200" strokeWidth={1}
        />
      ))}
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={`p${i}`}
          x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
          className="stroke-blue-500" strokeWidth={1.5} strokeLinecap="round"
          strokeDasharray="10 200"
          initial={{ strokeDashoffset: 210 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: (i % 5) * 0.35 }}
        />
      ))}
      {NODES.map((n, i) => (
        <g key={`n${i}`}>
          <circle cx={n.x} cy={n.y} r={9} className="fill-white stroke-blue-200" />
          <motion.circle
            cx={n.x} cy={n.y} r={4} className="fill-blue-600"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          />
        </g>
      ))}
    </svg>
  </div>
);

const PillarsVisual = ({ items }: { items: string[] }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-100">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
        </span>
        {item}
      </li>
    ))}
  </ul>
);

const TimelineVisual = ({ steps }: { steps: string[] }) => (
  <div>
    <div className="relative h-1.5 overflow-hidden rounded-full bg-gray-100">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-violet-600"
        initial={{ width: "0%" }}
        whileInView={{ width: "100%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: "easeInOut", delay: 0.4 }}
      />
    </div>
    <div className="mt-3 flex justify-between text-xs font-medium text-gray-500">
      {steps.map((s, i) => (
        <span key={s} className={i === steps.length - 1 ? "text-violet-600" : ""}>{s}</span>
      ))}
    </div>
  </div>
);

const INDUSTRY_ICONS = [HeartPulse, Factory, Landmark, ShoppingBag];

const IndustriesVisual = ({ items }: { items: string[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {items.map((label, i) => {
      const Icon = INDUSTRY_ICONS[i % INDUSTRY_ICONS.length];
      return (
        <div
          key={label}
          className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 px-3 py-4 text-center ring-1 ring-gray-100 transition-colors duration-300 group-hover:bg-amber-50/50"
        >
          <Icon className="h-5 w-5 text-amber-600" />
          <span className="text-xs font-medium text-gray-700">{label}</span>
        </div>
      );
    })}
  </div>
);

// ── Section ───────────────────────────────────────────────────────────────────
const Features = () => {
  const { t } = useTranslation();
  const list = (key: string) => t(key, { returnObjects: true }) as string[];

  return (
    <section id="features" className="relative scroll-mt-10 overflow-hidden bg-gradient-to-b from-gray-50 via-gray-50/60 to-white py-24">
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      <motion.div
        className="container relative mx-auto max-w-[max(72rem,70vw)] px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <motion.span
            variants={fadeIn}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 ring-1 ring-blue-100"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {t("features.eyebrow")}
          </motion.span>
          <motion.h2
            variants={fadeIn}
            custom={0.1}
            className="mt-5 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl"
          >
            {t("features.title")} Robles
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">.AI</span>?
          </motion.h2>
          <motion.p
            variants={fadeIn}
            custom={0.2}
            className="mt-5 text-lg leading-relaxed text-gray-500"
          >
            {t("features.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <BentoCard
            index={1}
            delay={0.3}
            className="md:col-span-2"
            accent={ACCENTS.blue}
            icon={<Lightbulb className="h-5 w-5" />}
            title={t("features.items.innovation.title")}
            description={t("features.items.innovation.description")}
          >
            <NeuralVisual />
          </BentoCard>

          <BentoCard
            index={2}
            delay={0.4}
            accent={ACCENTS.emerald}
            icon={<Shield className="h-5 w-5" />}
            title={t("features.items.ethics.title")}
            description={t("features.items.ethics.description")}
          >
            <PillarsVisual items={list("features.items.ethics.pillars")} />
          </BentoCard>

          <BentoCard
            index={3}
            delay={0.5}
            accent={ACCENTS.violet}
            icon={<Zap className="h-5 w-5" />}
            title={t("features.items.rapid.title")}
            description={t("features.items.rapid.description")}
          >
            <TimelineVisual steps={list("features.items.rapid.steps")} />
          </BentoCard>

          <BentoCard
            index={4}
            delay={0.6}
            className="md:col-span-2 lg:col-span-2"
            accent={ACCENTS.amber}
            icon={<Award className="h-5 w-5" />}
            title={t("features.items.expertise.title")}
            description={t("features.items.expertise.description")}
          >
            <IndustriesVisual items={list("features.items.expertise.industries")} />
          </BentoCard>
        </div>
      </motion.div>
    </section>
  );
};

export default Features;
