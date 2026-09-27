import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  UploadCloud,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  LineChart as LineChartIcon,
  Waypoints,
  Gauge,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { HowItWorks, TechCard } from "@/components/demo/DemoKit";
import {
  forecast,
  samplePreset,
  parseCsvSeries,
  forecastToCsv,
  type PresetId,
} from "@/lib/forecast";

const ACCENT_GRADIENT = "from-sky-500 to-cyan-600";
const ACCENT_TEXT = "text-sky-600";

const PRESETS: PresetId[] = ["standard", "trending", "seasonal", "noisy"];
const HORIZONS = [24, 168] as const;
type Horizon = (typeof HORIZONS)[number];

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function TryForecast() {
  const { t, i18n } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("forecast");

  const [preset, setPreset] = useState<PresetId>("standard");
  const [series, setSeries] = useState<number[]>(() => samplePreset("standard"));
  const [horizon, setHorizon] = useState<Horizon>(24);
  const [source, setSource] = useState<"preset" | "upload">("preset");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => forecast(series, horizon), [series, horizon]);

  // Marca demo_complete la primera vez que hay un pronóstico visible.
  useMemo(() => {
    if (result.points.some((p) => p.forecast != null && p.history == null)) {
      trackComplete({ horizon, season: result.season });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const fmt = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }), [i18n.language]);
  const fmt2 = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }), [i18n.language]);

  function pickPreset(p: PresetId) {
    trackStart();
    setPreset(p);
    setSource("preset");
    setUploadError(null);
    setSeries(samplePreset(p));
  }

  function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    trackStart();
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsvSeries(String(reader.result ?? ""));
        setSeries(parsed);
        setSource("upload");
      } catch {
        setUploadError(t("try-forecast.upload_error"));
      }
    };
    reader.onerror = () => setUploadError(t("try-forecast.upload_error"));
    reader.readAsText(file);
  }

  function reset() {
    setPreset("standard");
    setSource("preset");
    setUploadError(null);
    setSeries(samplePreset("standard"));
    setHorizon(24);
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadCsv() {
    triggerDownload(new Blob([forecastToCsv(result)], { type: "text/csv;charset=utf-8" }), "forecast.csv");
  }

  const boundary = result.historyLength - 1;

  // Datos para recharts: la banda se dibuja como un Area apilado (base q10 + rango).
  const chartData = result.points.map((p) => ({
    t: p.t,
    history: p.history,
    forecast: p.forecast,
    trend: p.trend,
    bandBase: p.q10,
    bandRange: p.q10 != null && p.q90 != null ? p.q90 - p.q10 : null,
  }));

  const stats = [
    { icon: Activity, label: t("try-forecast.stat_points"), value: fmt.format(result.historyLength) },
    { icon: Waypoints, label: t("try-forecast.stat_horizon"), value: fmt.format(result.horizon) },
    { icon: LineChartIcon, label: t("try-forecast.stat_season"), value: result.season > 1 ? fmt.format(result.season) : "—" },
    { icon: Gauge, label: t("try-forecast.stat_trend"), value: `${result.slope >= 0 ? "+" : ""}${fmt2.format(result.slope)}` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-[max(64rem,64vw)] px-6">
        <DemoNav tone="cyan" className="mb-8" />

        {/* Header */}
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg`}>
            <TrendingUp className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t("try-forecast.onboarding_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            {t("try-forecast.onboarding_subtitle")}
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {[
              { icon: ShieldCheck, key: "trust_private" as const, text: t("try-forecast.tech_note") },
            ].map(({ icon: Icon, key, text }) => (
              <li key={key} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Controles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            {/* Presets */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t("try-forecast.preset_label")}
              </p>
              <div className="inline-flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => pickPreset(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      source === "preset" && preset === p
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t(`try-forecast.preset_${p}`)}
                  </button>
                ))}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-sky-400 hover:text-sky-700">
                  <UploadCloud className="h-4 w-4" />
                  {source === "upload" ? t("try-forecast.upload_cta") + " ✓" : t("try-forecast.upload_cta")}
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files)}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">{t("try-forecast.upload_hint")}</p>
              {uploadError && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {uploadError}
                </p>
              )}
            </div>

            {/* Horizonte + acciones */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t("try-forecast.horizon_label")}
                </p>
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                  {HORIZONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorizon(h)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        horizon === h ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {h === 24 ? t("try-forecast.horizon_short") : t("try-forecast.horizon_long")}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={downloadCsv}
                className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br ${ACCENT_GRADIENT} px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90`}
              >
                <Download className="h-4 w-4" />
                {t("try-forecast.download_csv")}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("try-forecast.reset")}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Gráfica */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value: number, name: string) => [value == null ? "—" : fmt.format(value), name]}
                  labelFormatter={(l) => `t = ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine x={boundary} stroke="#cbd5e1" strokeDasharray="4 4" />
                {/* Banda q10–q90: base invisible + rango relleno */}
                <Area
                  type="monotone"
                  dataKey="bandBase"
                  stackId="band"
                  stroke="none"
                  fill="none"
                  isAnimationActive={false}
                  legendType="none"
                  name=" "
                />
                <Area
                  type="monotone"
                  dataKey="bandRange"
                  stackId="band"
                  stroke="none"
                  fill="url(#fc-band)"
                  isAnimationActive={false}
                  name={t("try-forecast.chart_band")}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                  name={t("try-forecast.chart_trend")}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="history"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  name={t("try-forecast.chart_history")}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                  name={t("try-forecast.chart_forecast")}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  <Icon className={`h-3.5 w-3.5 ${ACCENT_TEXT}`} />
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Caso de negocio */}
        <div className="mt-8">
          <BusinessCase demoId="forecast" variant="banner" />
        </div>

        {/* Cómo funciona */}
        <HowItWorks
          theme={{
            gradient: ACCENT_GRADIENT,
            text: ACCENT_TEXT,
            soft: "bg-sky-100",
            activeTab: "border-sky-400 bg-sky-50/60 ring-2 ring-sky-100",
            notice: "bg-sky-50/70 text-sky-900",
          }}
          labels={{
            title: t("try-forecast.how_simple_title"),
            subtitle: t("try-forecast.how_simple_subtitle"),
            overviewTitle: t("try-forecast.how_overview_title"),
            overviewSubtitle: t("try-forecast.how_overview_subtitle"),
            techTitle: t("try-forecast.how_tech_title"),
            techSubtitle: t("try-forecast.how_tech_subtitle"),
          }}
          steps={([1, 2, 3, 4] as const).map((n) => ({
            icon: [UploadCloud, LineChartIcon, TrendingUp, Gauge][n - 1],
            title: t(`try-forecast.flow_step${n}_title`),
            desc: t(`try-forecast.flow_step${n}_desc`),
          }))}
          notice={t("try-forecast.tech_note")}
          technical={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TechCard icon={LineChartIcon} title={t("try-forecast.tech_model_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-forecast.tech_model_desc")}</p>
              </TechCard>
              <TechCard icon={Activity} title={t("try-forecast.tech_bands_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-forecast.tech_bands_desc")}</p>
              </TechCard>
              <TechCard icon={Zap} title={t("try-forecast.tech_local_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-forecast.tech_local_desc")}</p>
              </TechCard>
            </div>
          }
        />

        {/* Calculadora de ahorro + CTA */}
        <div className="mt-8">
          <SavingsCalculator demoId="forecast" />
        </div>
      </div>
    </div>
  );
}
