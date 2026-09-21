import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Calculator, ClipboardCheck, ArrowRight, Info } from "lucide-react";
import { trackDemoEvent } from "@/lib/analytics";
import {
  CALCULATOR_DEFAULTS,
  computeSavings,
  useGoToHomeSection,
  type CalculatorDefaults,
  type DemoBusinessId,
} from "./business";

type Field = keyof CalculatorDefaults;

/** Hours in a full-time month, used for the "full-time equivalent" figure. */
const FTE_HOURS = 160;

/**
 * Slider range for each input, scaled from the demo's example value. The top
 * end grows to fit any larger number typed in the box, so the slider never
 * sits pinned at its end.
 */
function sliderRange(field: Field, example: number, typedCeil = 0) {
  const grow = (base: number) => Math.max(base, typedCeil);
  switch (field) {
    case "volume":
      // Volumes span orders of magnitude (a clinic vs a call center): log scale.
      return { min: 10, max: grow(Math.max(10_000, niceCeil(example * 1000))), log: true };
    case "minutes":
      return { min: 1, max: grow(Math.max(60, niceCeil(example * 4))) };
    case "automation":
      return { min: 0, max: 100 };
    case "hourlyCost":
      return { min: 1, max: grow(Math.max(100, niceCeil(example * 4))) };
  }
}

/** Sliders run on a fixed 0…SLIDER_STEPS track that maps onto each range. */
const SLIDER_STEPS = 1000;

function toPosition(value: number, min: number, max: number, log?: boolean) {
  const v = Math.min(max, Math.max(min, value));
  const share = log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  return Math.round(share * SLIDER_STEPS);
}

function fromPosition(pos: number, min: number, max: number, step: number, log?: boolean) {
  const share = pos / SLIDER_STEPS;
  if (log) return roundSignificant(min * (max / min) ** share);
  return Math.min(max, Math.max(min, Math.round((min + share * (max - min)) / step) * step));
}

/** Two significant digits above 100 (1,187 → 1,200), so log values read cleanly. */
function roundSignificant(n: number) {
  if (n < 100) return Math.round(n);
  const p = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

/** Round up to 1, 2 or 5 × a power of ten, so slider ends read cleanly. */
function niceCeil(n: number) {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= n) ?? n;
}

/** Counts from the previous value to the new one, so results feel live. */
function useAnimatedNumber(value: number) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (v) => {
        from.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value]);
  return display;
}

/**
 * "How much would you save?" panel shown at the end of a demo.
 *
 * The visitor enters their own volume, minutes per unit, share automated and
 * hourly cost; the panel shows yearly/monthly savings, hours freed and a
 * today-vs-with-AI cost bar. The starting values are editable examples, never
 * claims (DEMOS_PLAN.md §2). Demos without calculator defaults (e.g. emotion)
 * get the CTA panel only.
 */
export function SavingsCalculator({ demoId }: { demoId: DemoBusinessId }) {
  const { t, i18n } = useTranslation();
  const defaults = CALCULATOR_DEFAULTS[demoId];
  const [inputs, setInputs] = useState<CalculatorDefaults | null>(defaults ?? null);
  // Raw text while the visitor types in a box, so it can be cleared or hold a
  // partial number; the numeric value updates as soon as the text is valid.
  const [drafts, setDrafts] = useState<Partial<Record<Field, string>>>({});
  // Slider top end reached by typing; only grows, so dragging never rescales it.
  const [typedCeil, setTypedCeil] = useState<Partial<Record<Field, number>>>({});
  const tracked = useRef(false);

  const result = useMemo(() => (inputs ? computeSavings(inputs) : null), [inputs]);
  const fmt = useMemo(
    () => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }),
    [i18n.language],
  );
  const fmt1 = useMemo(
    () => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }),
    [i18n.language],
  );

  const yearly = useAnimatedNumber(result?.yearly ?? 0);
  const monthly = useAnimatedNumber(result?.monthly ?? 0);
  const hours = useAnimatedNumber(result?.hours ?? 0);

  const typeIn = (field: Field, raw: string) => {
    setDrafts((d) => ({ ...d, [field]: raw }));
    if (raw.trim() === "" || !Number.isFinite(Number(raw))) return;
    update(field, raw);
    const ceil = niceCeil(Number(raw));
    setTypedCeil((c) => ((c[field] ?? 0) >= ceil ? c : { ...c, [field]: ceil }));
  };
  const endTyping = (field: Field) =>
    setDrafts(({ [field]: _done, ...rest }) => rest);

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

  if (!inputs || !result || !defaults) {
    return (
      <section className="relative mt-10 overflow-hidden rounded-2xl bg-gray-950 p-6 text-white shadow-sm sm:p-8">
        <Glow />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-lg font-semibold">{t("demoBusiness.labels.cta_lead")}</p>
          <Ctas demoId={demoId} />
        </div>
      </section>
    );
  }

  const fields: { field: Field; label: string; suffix?: string; prefix?: string; step: number }[] = [
    { field: "volume", label: t(`demoBusiness.${demoId}.calc_volume`, ""), step: 10 },
    { field: "minutes", label: t(`demoBusiness.${demoId}.calc_minutes`, ""), suffix: "min", step: 1 },
    { field: "automation", label: t("demoBusiness.labels.calc_automation"), suffix: "%", step: 5 },
    { field: "hourlyCost", label: t("demoBusiness.labels.calc_hourly_cost"), prefix: "$", step: 1 },
  ];

  const withAiShare = result.baseline > 0 ? Math.max(0, 1 - result.monthly / result.baseline) : 1;

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12">

        {/* ── Inputs ───────────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-8 lg:col-span-7">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <Calculator className="h-4 w-4" />
            {t("demoBusiness.labels.calc_eyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {t("demoBusiness.labels.calc_title")}
          </h2>
          <p className="mt-2 max-w-lg text-sm text-gray-500">{t("demoBusiness.labels.calc_subtitle")}</p>

          <div className="mt-8 space-y-7">
            {fields.map(({ field, label, suffix, prefix, step }) => {
              const { min, max, log } = sliderRange(field, defaults[field], typedCeil[field]);
              const position = toPosition(inputs[field], min, max, log);
              const pct = (position / SLIDER_STEPS) * 100;
              const id = `calc-${demoId}-${field}`;
              return (
                <div key={field}>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor={id} className="text-sm font-medium text-gray-700">
                      {label}
                    </label>
                    <span className="flex w-32 shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
                      {prefix && <span className="pl-2.5 text-sm text-gray-400">{prefix}</span>}
                      <input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={field === "automation" ? 100 : undefined}
                        step={step}
                        value={drafts[field] ?? String(inputs[field])}
                        onChange={(e) => typeIn(field, e.target.value)}
                        onBlur={() => endTyping(field)}
                        className="w-full min-w-0 bg-transparent px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-gray-900 outline-none"
                      />
                      {suffix && <span className="pr-2.5 text-sm text-gray-400">{suffix}</span>}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={label}
                    min={0}
                    max={SLIDER_STEPS}
                    step={1}
                    value={position}
                    aria-valuetext={String(inputs[field])}
                    onChange={(e) => {
                      endTyping(field);
                      update(field, String(fromPosition(Number(e.target.value), min, max, step, log)));
                    }}
                    style={{ background: `linear-gradient(to right, #10b981 ${pct}%, #e5e7eb ${pct}%)` }}
                    className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
                      [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-emerald-100
                      [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md"
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-gray-400">
                    <span>{prefix}{fmt.format(min)}{suffix === "%" ? "%" : ""}</span>
                    <span>{prefix}{fmt.format(max)}{suffix === "%" ? "%" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Result ───────────────────────────────────────────────────────── */}
        <div className="relative flex flex-col overflow-hidden bg-gray-950 p-6 text-white sm:p-8 lg:col-span-5">
          <Glow />
          <div className="relative flex flex-1 flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              {t("demoBusiness.labels.calc_yearly_title")}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              ${fmt.format(yearly)}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {t("demoBusiness.labels.calc_per_month", { amount: `$${fmt.format(monthly)}` })}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {t("demoBusiness.labels.calc_hours")}
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums">{fmt.format(hours)} h</dd>
              </div>
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {t("demoBusiness.labels.calc_fte")}
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums">{fmt1.format(hours / FTE_HOURS)}</dd>
              </div>
            </dl>

            {/* Today vs with AI: monthly cost of the process */}
            <div className="mt-6">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                {t("demoBusiness.labels.calc_compare_title")}
              </p>
              <div className="mt-3 space-y-2.5">
                {[
                  { label: t("demoBusiness.labels.calc_cost_today"), value: result.baseline, share: 1, bar: "bg-gray-500" },
                  { label: t("demoBusiness.labels.calc_cost_ai"), value: result.baseline - result.monthly, share: withAiShare, bar: "bg-emerald-400" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 text-gray-400">{row.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className={`block h-full rounded-full ${row.bar} transition-[width] duration-500 ease-out`}
                        style={{ width: `${Math.max(2, row.share * 100)}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right font-semibold tabular-nums">${fmt.format(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-8">
              <p className="mb-3 text-sm font-medium text-gray-200">{t("demoBusiness.labels.cta_lead")}</p>
              <Ctas demoId={demoId} stacked />
              <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-gray-500">
                <Info className="mt-px h-3 w-3 shrink-0" />
                {t("demoBusiness.labels.calc_disclaimer")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Soft brand glow behind the dark result panel. */
function Glow() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
    </>
  );
}

/** Primary (diagnostic) + secondary (contact) calls to action, on a dark background. */
function Ctas({ demoId, stacked }: { demoId: DemoBusinessId; stacked?: boolean }) {
  const { t } = useTranslation();
  const goToSection = useGoToHomeSection();
  return (
    <div className={`flex flex-col gap-2 ${stacked ? "" : "sm:flex-row sm:items-center"}`}>
      <Link
        href="/diagnostico-ia"
        onClick={() => trackDemoEvent("demo_cta_click", demoId, { cta: "diagnostic" })}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-emerald-50"
      >
        <ClipboardCheck className="h-4 w-4 text-emerald-600" />
        {t("demoBusiness.labels.cta_diagnostic")}
      </Link>
      <button
        type="button"
        onClick={() => {
          trackDemoEvent("demo_cta_click", demoId, { cta: "contact" });
          goToSection("contact");
        }}
        className="group inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold text-white/80 ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
      >
        {t("demoBusiness.labels.cta_contact")}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
