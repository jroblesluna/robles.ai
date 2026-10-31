import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Full Tailwind class strings, so the JIT compiler can see them. */
export interface GuideTheme {
  gradient: string;
  text: string;
  /** Border + ring of the current step card. */
  current: string;
  hover: string;
  /** Brief highlight on the control a step card sends the visitor to. */
  flash: string;
}

/**
 * Bobbing "do it here" tag pinned to the control for the current step, so the
 * numbered steps at the top lead to the place where the visitor has to act.
 * The parent must be positioned.
 */
export function GuideCue({ step, label, gradient, className = "left-4" }: {
  step: number;
  label: string;
  gradient: string;
  className?: string;
}) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: [0, 5, 0] }}
      transition={{ opacity: { duration: 0.3 }, y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } }}
      className={`pointer-events-none absolute -top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${gradient} py-0.5 pl-0.5 pr-2.5 text-[11px] font-semibold text-white shadow-md ${className}`}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px]">{step}</span>
      {label}
      <ArrowDown className="h-3.5 w-3.5" />
    </motion.span>
  );
}

/**
 * The three "how it works" cards as a live stepper. Copy comes from
 * `<prefix>.how_step<n>_title` / `_desc`. Clicking a card goes to where that
 * step happens, or to the earliest step still to do (`useGuideNavigation`).
 */
export function GuideSteps({ prefix, current, theme, onGo }: {
  prefix: string;
  current: number;
  theme: GuideTheme;
  onGo: (step: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {([1, 2, 3] as const).map((n) => {
        const active = n === current;
        const done = n < current;
        return (
          <li key={n}>
            <button
              type="button"
              onClick={() => onGo(n)}
              aria-current={active ? "step" : undefined}
              className={`flex h-full w-full flex-col justify-start rounded-xl border p-4 text-left transition-all ${theme.hover} hover:bg-white ${
                active ? `bg-white shadow-sm ring-2 ${theme.current}` : "border-gray-200/80 bg-white/70"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                    done ? "bg-emerald-500" : `bg-gradient-to-br ${theme.gradient}`
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                {active && (
                  <span className={`flex items-center gap-1 text-[11px] font-semibold ${theme.text}`}>
                    {t(n === 1 ? "demoGuide.start" : "demoGuide.next")}
                    <motion.span
                      aria-hidden
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </motion.span>
                  </span>
                )}
              </span>
              <span className="mt-3 block text-sm font-semibold text-gray-900">{t(`${prefix}.how_step${n}_title`)}</span>
              <span className="mt-1 block text-sm leading-snug text-gray-600">{t(`${prefix}.how_step${n}_desc`)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Scrolls to the control of a step and flashes it briefly. */
export function useGuideNavigation(current: number, targetFor: (step: number) => HTMLElement | null | undefined) {
  const [flashStep, setFlashStep] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const goTo = (n: number) => {
    const at = Math.min(n, current);
    targetFor(at)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashStep(at);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashStep(null), 1600);
    return at;
  };
  return { flashStep, goTo };
}
