import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Calculator, Clock, PiggyBank, ClipboardCheck, MessageSquare } from "lucide-react";
import { trackDemoEvent } from "@/lib/analytics";
import {
  CALCULATOR_DEFAULTS,
  computeSavings,
  useGoToHomeSection,
  type CalculatorDefaults,
  type DemoBusinessId,
} from "./business";

type Field = keyof CalculatorDefaults;

/**
 * "How much would you save?" panel shown at the end of a demo.
 *
 * The visitor enters their own volume, minutes per unit, share automated and
 * hourly cost; the panel shows hours freed and monthly/yearly savings. The
 * starting values are editable examples, never claims (DEMOS_PLAN.md §2).
 * Demos without calculator defaults (e.g. emotion) get the CTAs only.
 */
export function SavingsCalculator({ demoId }: { demoId: DemoBusinessId }) {
  const { t, i18n } = useTranslation();
  const goToSection = useGoToHomeSection();
  const defaults = CALCULATOR_DEFAULTS[demoId];
  const [inputs, setInputs] = useState<CalculatorDefaults | null>(defaults ?? null);
  const tracked = useRef(false);

  const result = useMemo(() => (inputs ? computeSavings(inputs) : null), [inputs]);
  const fmt = useMemo(
    () => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }),
    [i18n.language],
  );

  const update = (field: Field, raw: string) => {
    if (!inputs) return;
    const max = field === "automation" ? 100 : Number.MAX_SAFE_INTEGER;
    const value = Math.min(max, Math.max(0, Number(raw) || 0));
    const next = { ...inputs, [field]: value };
    setInputs(next);
    // Once per page view: the visitor engaged with the calculator.
    if (!tracked.current) {
      tracked.current = true;
      trackDemoEvent("roi_calculated", demoId, { monthly_savings: Math.round(computeSavings(next).monthly) });
    }
  };

  const fields: { field: Field; label: string; suffix?: string; prefix?: string; step: number }[] = [
    { field: "volume", label: t(`demoBusiness.${demoId}.calc_volume`, ""), step: 10 },
    { field: "minutes", label: t(`demoBusiness.${demoId}.calc_minutes`, ""), suffix: "min", step: 1 },
    { field: "automation", label: t("demoBusiness.labels.calc_automation"), suffix: "%", step: 5 },
    { field: "hourlyCost", label: t("demoBusiness.labels.calc_hourly_cost"), prefix: "$", step: 1 },
  ];

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {inputs && result && (
        <div className="border-b border-gray-100 p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Calculator className="h-5 w-5 text-emerald-600" />
            {t("demoBusiness.labels.calc_title")}
          </h2>
          <p className="mb-5 text-sm text-gray-500">{t("demoBusiness.labels.calc_subtitle")}</p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
              {fields.map(({ field, label, suffix, prefix, step }) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
                  <span className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                    {prefix && <span className="pl-3 text-sm text-gray-400">{prefix}</span>}
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={field === "automation" ? 100 : undefined}
                      step={step}
                      value={inputs[field]}
                      onChange={(e) => update(field, e.target.value)}
                      className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none"
                    />
                    {suffix && <span className="pr-3 text-sm text-gray-400">{suffix}</span>}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-col justify-center gap-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 ring-1 ring-emerald-100">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("demoBusiness.labels.calc_hours")}</p>
                  <p className="text-xl font-bold text-gray-900">{fmt.format(result.hours)} h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PiggyBank className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("demoBusiness.labels.calc_monthly")}</p>
                  <p className="text-2xl font-bold text-emerald-700">${fmt.format(result.monthly)}</p>
                  <p className="text-sm text-gray-600">
                    {t("demoBusiness.labels.calc_yearly", { amount: `$${fmt.format(result.yearly)}` })}
                  </p>
                </div>
              </div>
              <p className="text-[11px] leading-snug text-gray-500">{t("demoBusiness.labels.calc_disclaimer")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 bg-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-gray-700">{t("demoBusiness.labels.cta_lead")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/diagnostico-ia"
            onClick={() => trackDemoEvent("demo_cta_click", demoId, { cta: "diagnostic" })}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <ClipboardCheck className="h-4 w-4" />
            {t("demoBusiness.labels.cta_diagnostic")}
          </Link>
          <button
            type="button"
            onClick={() => {
              trackDemoEvent("demo_cta_click", demoId, { cta: "contact" });
              goToSection("contact");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
          >
            <MessageSquare className="h-4 w-4" />
            {t("demoBusiness.labels.cta_contact")}
          </button>
        </div>
      </div>
    </div>
  );
}
