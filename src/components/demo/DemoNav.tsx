import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Top navigation row of every demo page: a quiet "back" pill on the left
 * (previous page in history, or home when the demo was opened directly) and
 * a tinted "Demos Lab" button on the right. Both reuse the page's accent hue.
 * Class strings are spelled out in full so Tailwind's JIT picks them up.
 */
const TONES = {
  violet: {
    gradient: "from-violet-500 to-purple-600",
    focus: "focus-visible:ring-violet-400",
    backHover: "hover:ring-violet-300 group-hover:text-violet-700",
    lab: "bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100 hover:ring-violet-300",
  },
  amber: {
    gradient: "from-amber-500 to-orange-600",
    focus: "focus-visible:ring-amber-400",
    backHover: "hover:ring-amber-300 group-hover:text-amber-700",
    lab: "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 hover:ring-amber-300",
  },
  cyan: {
    gradient: "from-cyan-500 to-blue-600",
    focus: "focus-visible:ring-cyan-400",
    backHover: "hover:ring-cyan-300 group-hover:text-cyan-700",
    lab: "bg-cyan-50 text-cyan-700 ring-cyan-200 hover:bg-cyan-100 hover:ring-cyan-300",
  },
  teal: {
    gradient: "from-teal-500 to-emerald-600",
    focus: "focus-visible:ring-teal-400",
    backHover: "hover:ring-teal-300 group-hover:text-teal-700",
    lab: "bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100 hover:ring-teal-300",
  },
  indigo: {
    gradient: "from-indigo-500 to-blue-600",
    focus: "focus-visible:ring-indigo-400",
    backHover: "hover:ring-indigo-300 group-hover:text-indigo-700",
    lab: "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100 hover:ring-indigo-300",
  },
  rose: {
    gradient: "from-rose-500 to-pink-600",
    focus: "focus-visible:ring-rose-400",
    backHover: "hover:ring-rose-300 group-hover:text-rose-700",
    lab: "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100 hover:ring-rose-300",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    focus: "focus-visible:ring-emerald-400",
    backHover: "hover:ring-emerald-300 group-hover:text-emerald-700",
    lab: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 hover:ring-emerald-300",
  },
} as const;

export type DemoTone = keyof typeof TONES;

export function DemoNav({ tone, className = "" }: { tone: DemoTone; className?: string }) {
  const { t } = useTranslation();
  const c = TONES[tone];
  const [, navigate] = useLocation();

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <nav aria-label={t("demoNav.aria")} className={`flex items-center justify-between gap-3 ${className}`}>
      {/* Back to the previous page */}
      <button
        type="button"
        onClick={goBack}
        className={`group inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 backdrop-blur transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 ${c.focus} ${c.backHover}`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${c.gradient} text-white shadow-sm transition-transform duration-200 group-hover:-translate-x-0.5`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </span>
        <span className="transition-colors">{t("demoNav.back")}</span>
      </button>

      {/* Explore the rest of the Demos Lab */}
      <Link
        href="/demos"
        className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-all duration-200 hover:shadow-sm focus:outline-none focus-visible:ring-2 ${c.lab} ${c.focus}`}
      >
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{t("demoNav.lab")}</span>
        <span className="sm:hidden">{t("demoNav.lab_short")}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </nav>
  );
}
