import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Cpu, Lightbulb, Code2, ArrowRight, ShieldCheck, Loader2, type LucideIcon } from "lucide-react";

/**
 * Shared building blocks for the live-API demo pages (workspace status pill,
 * technical cards and the collapsible "How it works" section with an
 * overview / technical-architecture audience switch).
 *
 * Colors come in as full Tailwind class strings (not fragments) so the JIT
 * compiler can see them.
 */

// ── Status pill ──────────────────────────────────────────────────────────────
export type StatusTone = "ready" | "live" | "busy" | "error" | "idle";

const TONE_PILL: Record<StatusTone, string> = {
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  live: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  busy: "bg-amber-50 text-amber-800 ring-amber-200",
  error: "bg-red-50 text-red-700 ring-red-200",
  idle: "bg-gray-100 text-gray-600 ring-gray-200",
};
const TONE_DOT: Record<StatusTone, string> = {
  ready: "bg-emerald-500",
  live: "animate-pulse bg-emerald-500",
  busy: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-gray-400",
};

/** Service status shown at the right of a workspace toolbar. */
export function StatusPill({ tone, label, spinning }: { tone: StatusTone; label: string; spinning?: boolean }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${TONE_PILL[tone]}`}>
      {spinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />}
      {label}
    </span>
  );
}

// ── Technical card ───────────────────────────────────────────────────────────
/** White card for each column of a technical-architecture panel. */
export function TechCard({
  icon: Icon,
  title,
  iconClass,
  children,
}: {
  icon: LucideIcon;
  title: string;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        {title}
      </h4>
      {children}
    </div>
  );
}

// ── How it works ─────────────────────────────────────────────────────────────
export interface HowItWorksTheme {
  /** Gradient for active icons, e.g. "from-cyan-500 to-blue-600". */
  gradient: string;
  /** Icon/text accent, e.g. "text-cyan-600". */
  text: string;
  /** Soft icon background, e.g. "bg-cyan-100". */
  soft: string;
  /** Active audience tab, e.g. "border-cyan-400 bg-cyan-50/60 ring-2 ring-cyan-100". */
  activeTab: string;
  /** Privacy/notice strip, e.g. "bg-cyan-50/70 text-cyan-900". */
  notice: string;
}

export interface HowItWorksLabels {
  title: string;
  subtitle: string;
  overviewTitle: string;
  overviewSubtitle: string;
  techTitle: string;
  techSubtitle: string;
}

/**
 * Collapsible "How it works" section with two audiences, one visible at a
 * time: an overview for business teams (numbered visual flow + a notice) and a
 * technical architecture for engineers (arbitrary content, usually TechCards).
 */
export function HowItWorks({
  theme,
  labels,
  steps,
  notice,
  technical,
}: {
  theme: HowItWorksTheme;
  labels: HowItWorksLabels;
  steps: { icon: LucideIcon; title: string; desc: string }[];
  notice: string;
  technical: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"overview" | "tech">("overview");

  const tabs = [
    { id: "overview" as const, icon: Lightbulb, title: labels.overviewTitle, subtitle: labels.overviewSubtitle },
    { id: "tech" as const, icon: Code2, title: labels.techTitle, subtitle: labels.techSubtitle },
  ];

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.soft}`}>
            <Cpu className={`h-4 w-4 ${theme.text}`} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-900">{labels.title}</span>
            <span className="block text-xs text-gray-400">{labels.subtitle}</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-6 py-6">
              <div role="tablist" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tabs.map(({ id, icon: Icon, title, subtitle }) => {
                  const active = view === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setView(id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        active ? theme.activeTab : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active ? `bg-gradient-to-br ${theme.gradient} text-white` : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{title}</span>
                        <span className="block text-xs text-gray-500">{subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  role="tabpanel"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="mt-6"
                >
                  {view === "overview" ? (
                    <>
                      <ol className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                        {steps.map(({ icon: Icon, title, desc }, i) => (
                          <li key={title} className="relative rounded-xl border border-gray-200/80 bg-white p-4 transition-shadow hover:shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.soft}`}>
                                <Icon className={`h-4 w-4 ${theme.text}`} />
                              </span>
                              <span className="text-xs font-semibold tabular-nums text-gray-300">0{i + 1}</span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
                            <p className="mt-1 text-sm leading-snug text-gray-600">{desc}</p>
                            {i < steps.length - 1 && (
                              <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white lg:flex">
                                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                      <p className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${theme.notice}`}>
                        <ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${theme.text}`} />
                        {notice}
                      </p>
                    </>
                  ) : (
                    technical
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
