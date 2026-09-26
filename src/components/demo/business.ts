import { useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trackDemoEvent } from "@/lib/analytics";

/**
 * Business framing for the live demos (DEMOS_PLAN.md §2–§3).
 *
 * Copy lives in i18n under `demoBusiness.<id>`. The numbers below are only the
 * *example* inputs the savings calculator starts with — the visitor edits them
 * with their own data. They are never presented as results or claims.
 */
export type DemoBusinessId =
  | "identity"
  | "rag"
  | "langchain"
  | "speech"
  | "objectdetection"
  | "emotion"
  | "sitechatbot";

export interface CalculatorDefaults {
  /** Units per month (sign-ups, queries, meetings, counts…). */
  volume: number;
  /** Minutes a person spends per unit today. */
  minutes: number;
  /** Share of that work the visitor assumes AI takes over, 0–100. */
  automation: number;
  /** Loaded cost of one hour of that person's time. */
  hourlyCost: number;
}

/** Demos without an entry get the CTA panel only. */
export const CALCULATOR_DEFAULTS: Partial<Record<DemoBusinessId, CalculatorDefaults>> = {
  identity: { volume: 500, minutes: 12, automation: 80, hourlyCost: 15 },
  rag: { volume: 1000, minutes: 8, automation: 60, hourlyCost: 20 },
  langchain: { volume: 300, minutes: 15, automation: 50, hourlyCost: 20 },
  speech: { volume: 80, minutes: 25, automation: 80, hourlyCost: 25 },
  objectdetection: { volume: 40, minutes: 90, automation: 70, hourlyCost: 12 },
  // Framed as aggregate customer-experience insight replacing surveys, never HR/education (§4.3).
  emotion: { volume: 600, minutes: 5, automation: 60, hourlyCost: 10 },
  // "Tu chatbot en 60 segundos" (D1): consultas/mes que hoy atiende una persona,
  // minutos por consulta, % que el bot resuelve solo. Referencia citable: caso telco
  // 78% de resolución autónoma (DEMOS_PLAN.md §4.1).
  sitechatbot: { volume: 800, minutes: 6, automation: 70, hourlyCost: 15 },
};

/**
 * Hours freed and money saved per month for the given inputs, plus the
 * process's current monthly cost (`baseline`) for the today-vs-AI comparison.
 */
export function computeSavings(i: CalculatorDefaults) {
  const baseline = ((i.volume * i.minutes) / 60) * i.hourlyCost;
  const hours = (i.volume * i.minutes * (i.automation / 100)) / 60;
  const monthly = hours * i.hourlyCost;
  return { hours, monthly, yearly: monthly * 12, baseline };
}

/**
 * Funnel tracking for a demo page. Both events fire at most once per page view,
 * so they can be called from loops (camera frames) without flooding analytics:
 * `start()` on the visitor's first real action, `complete()` when the demo
 * produces its first result.
 */
export function useDemoTracking(demoId: DemoBusinessId) {
  const started = useRef(false);
  const completed = useRef(false);
  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    trackDemoEvent("demo_start", demoId);
  }, [demoId]);
  const complete = useCallback(
    (params?: Record<string, string | number>) => {
      if (completed.current) return;
      completed.current = true;
      trackDemoEvent("demo_complete", demoId, params);
    },
    [demoId],
  );
  return { start, complete };
}

/**
 * Navigate to a section of the home page (e.g. "contact", "case-studies").
 * Same approach as the Header: route to "/" and scroll once the section exists
 * (polls briefly, since Home renders its sections lazily).
 */
export function useGoToHomeSection() {
  const [, setLocation] = useLocation();
  return useCallback(
    (sectionId: string) => {
      setLocation("/");
      let tries = 0;
      const tick = () => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (tries++ < 20) setTimeout(tick, 150);
      };
      setTimeout(tick, 150);
    },
    [setLocation],
  );
}
