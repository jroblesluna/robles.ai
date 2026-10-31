import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Loader2,
  UploadCloud,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  ScanText,
  AlertCircle,
  Cpu,
  FileJson,
  Table2,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Braces,
  Eye,
  EyeOff,
  Languages,
  Receipt,
  ScrollText,
  IdCard,
  ClipboardList,
  ShoppingCart,
  Lightbulb,
  Copy,
  Check,
  Search,
  Timer,
  Gauge,
  TriangleAlert,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { HowItWorks, TechCard } from "@/components/demo/DemoKit";
import { GuideCue, GuideSteps, useGuideNavigation, type GuideTheme } from "@/components/demo/DemoGuide";
import { RunnerTrack, linearRunner, type RunnerTheme } from "@/components/demo/RunnerTrack";
import { JsonHighlight } from "@/components/demo/JsonHighlight";

// El backend vive en su propio Cloud Run (repo robles.ai-docextract-api).
// VITE_DOCEXTRACT_API permite apuntar el dev local a prod o a un backend local.
const getBaseApi = () => {
  const override: string | undefined = import.meta.env.VITE_DOCEXTRACT_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://docextract-api.robles.ai";
};

const BASE_API = getBaseApi();

const ACCENT_GRADIENT = "from-slate-600 to-gray-800";
const ACCENT_TEXT = "text-slate-600";
const GUIDE_THEME: GuideTheme = {
  gradient: ACCENT_GRADIENT,
  text: ACCENT_TEXT,
  current: "border-slate-300 ring-slate-100",
  hover: "hover:border-slate-300",
  flash: "ring-4 ring-slate-200",
};
const RUNNER_THEME: RunnerTheme = { gradient: ACCENT_GRADIENT, surface: "from-slate-50/50", activeTick: "bg-slate-500" };

const MAX_FILE_BYTES = 8 * 1024 * 1024; // paridad con el backend
const SUPPORTED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

// Documentos ficticios en public/demo-samples (scripts/renderDocExtractSamples.mjs).
type SampleId = "invoice" | "receipt" | "contract";
const SAMPLES: { id: SampleId; icon: LucideIcon }[] = [
  { id: "invoice", icon: FileText },
  { id: "receipt", icon: Receipt },
  { id: "contract", icon: ScrollText },
];
const sampleUrl = (id: SampleId, lang: string, thumb = false) =>
  `/demo-samples/docextract-${id}-${lang}${thumb ? ".thumb.webp" : ".jpg"}`;

const DOC_TYPES: { key: string; icon: LucideIcon }[] = [
  { key: "type_invoice", icon: FileText },
  { key: "type_receipt", icon: Receipt },
  { key: "type_contract", icon: ScrollText },
  { key: "type_id", icon: IdCard },
  { key: "type_form", icon: ClipboardList },
  { key: "type_po", icon: ShoppingCart },
];

type Phase = "onboarding" | "extracting" | "ready";
type Stage = "wake" | "send" | "read";

type ExtractField = {
  key: string;
  label: string;
  value: string;
  confidence?: number | null;
  bbox?: number[] | null;
};

type ExtractResult = {
  doc_type: string;
  doc_type_label: string;
  fields: ExtractField[];
  summary: string;
  language: string;
};

type ApiCall = {
  id: string;
  method: "GET" | "POST";
  path: string;
  request: unknown;
  response: unknown;
  status?: number;
  ms: number;
  at: Date;
};

function errorMessage(json: any, status: number | undefined, fallback: string): string {
  if (json?.error?.message) return json.error.message;
  if (typeof json?.detail === "string") return json.detail;
  return status ? `HTTP ${status}` : fallback;
}

/** Lee un File como base64 puro (sin el prefijo data URL). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Renderiza la primera página de un PDF como imagen para la vista previa (pdfjs se carga bajo demanda). */
async function renderPdfFirstPage(file: File): Promise<{ url: string; pages: number } | null> {
  try {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return { url: canvas.toDataURL("image/jpeg", 0.85), pages: pdf.numPages };
  } catch {
    return null;
  }
}

/** Escapa un valor para CSV (comillas dobles + envoltura si hace falta). */
function csvCell(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Escapa para el XML de SpreadsheetML (Excel abre esto nativamente como .xls). */
function xmlEscape(v: string): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

type ConfLevel = "high" | "mid" | "low";
const confLevel = (c: number): ConfLevel => (c >= 0.8 ? "high" : c >= 0.5 ? "mid" : "low");
const CONF_PILL: Record<ConfLevel, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  mid: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-red-50 text-red-700 ring-red-200",
};
const CONF_DOT: Record<ConfLevel, string> = { high: "bg-emerald-500", mid: "bg-amber-500", low: "bg-red-500" };

export default function TryDocExtract() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("es") ? "es" : "en";
  const { start: trackStart, complete: trackComplete } = useDemoTracking("docextract");

  const [phase, setPhase] = useState<Phase>("onboarding");
  const [stage, setStage] = useState<Stage>("send");
  const [fileName, setFileName] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; pages: number } | null>(null);
  const [activeSample, setActiveSample] = useState<SampleId | null>(null);
  const [loadingSample, setLoadingSample] = useState<SampleId | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "json">("table");
  const [showBoxes, setShowBoxes] = useState(true);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [serviceWarm, setServiceWarm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const logCalls: ApiCallEntry[] = calls.map((c) => ({
    key: c.id,
    method: c.method,
    url: `${BASE_API}${c.path}`,
    status: c.status ?? "ERR",
    ok: c.status !== undefined && c.status < 400 && !(c.response as any)?.error,
    ms: c.ms,
    at: c.at.getTime(),
    request: c.request,
    response: c.response,
  }));

  // Warm-up al montar (best-effort; no bloquea la UI).
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    fetch(`${BASE_API}/`, { signal: controller.signal, mode: "no-cors" })
      .then(() => setServiceWarm(true))
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Contador de segundos mientras se procesa (da contexto si el servicio está despertando).
  useEffect(() => {
    if (phase !== "extracting") return;
    const started = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [phase]);

  async function warmUp(): Promise<void> {
    if (serviceWarm) return;
    for (let i = 0; i < 8; i++) {
      try {
        const c = new AbortController();
        const timer = setTimeout(() => c.abort(), 8000);
        const started = Date.now();
        await fetch(`${BASE_API}/`, { signal: c.signal, mode: "no-cors" });
        clearTimeout(timer);
        if (Date.now() - started < 2500) {
          setServiceWarm(true);
          return;
        }
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  function recordCall(call: ApiCall) {
    setCalls((prev) => [call, ...prev]);
  }

  function handleFile(file: File | undefined, sample: SampleId | null = null) {
    if (!file) return;
    setError(null);

    const mime = file.type || "";
    if (!SUPPORTED_MIME.includes(mime)) {
      setError(t("try-docextract.error_unsupported"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t("try-docextract.error_too_large"));
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setIsImage(mime.startsWith("image/"));
    setPdfPreview(null);
    if (mime === "application/pdf") void renderPdfFirstPage(file).then(setPdfPreview);
    setFileName(file.name);
    setLastFile(file);
    setActiveSample(sample);
    void extract(file, mime);
  }

  async function loadSample(id: SampleId) {
    if (phase === "extracting" || loadingSample) return;
    setLoadingSample(id);
    try {
      const blob = await fetch(sampleUrl(id, lang)).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      });
      const name = `${t(`try-docextract.sample_${id}_file`)}.jpg`;
      handleFile(new File([blob], name, { type: "image/jpeg" }), id);
    } catch {
      setError(t("try-docextract.error_read"));
    } finally {
      setLoadingSample(null);
    }
  }

  async function extract(file: File, mime: string) {
    trackStart();
    setPhase("extracting");
    setResult(null);
    setError(null);
    setHoveredKey(null);
    setPinnedKey(null);
    setFilter("");
    setDurationMs(null);

    if (!serviceWarm) setStage("wake");
    await warmUp();
    setStage("send");

    let b64: string;
    try {
      b64 = await fileToBase64(file);
    } catch {
      setError(t("try-docextract.error_read"));
      setPhase("onboarding");
      return;
    }

    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    // Solo el nombre y el mime van al log (no el base64, que es enorme).
    const loggedRequest = { file_base64: `‹${Math.round(b64.length / 1024)} KB base64›`, mime_type: mime, filename: file.name };
    try {
      const request = fetch(`${BASE_API}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_base64: b64, mime_type: mime, filename: file.name }),
      });
      setStage("read");
      const res = await request;
      status = res.status;
      json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        setError(errorMessage(json, status, t("try-docextract.error_generic")));
        setPhase("onboarding");
      } else {
        setResult(json as ExtractResult);
        setDurationMs(Math.round(performance.now() - started));
        setPhase("ready");
        setView("table");
        setShowBoxes(true);
        trackComplete({ doc_type: json?.doc_type ?? "unknown", fields: json?.fields?.length ?? 0 });
      }
    } catch {
      json = { error: { message: t("try-docextract.network_error") } };
      setError(t("try-docextract.network_error"));
      setPhase("onboarding");
    } finally {
      recordCall({
        id: uuidv4(),
        method: "POST",
        path: "/extract",
        request: loggedRequest,
        response: json,
        status,
        ms: Math.round(performance.now() - started),
        at: new Date(),
      });
    }
  }

  function retry() {
    if (lastFile) handleFile(lastFile, activeSample);
  }

  function resetAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhase("onboarding");
    setFileName("");
    setLastFile(null);
    setPreviewUrl(null);
    setPdfPreview(null);
    setIsImage(false);
    setActiveSample(null);
    setResult(null);
    setError(null);
    setHoveredKey(null);
    setPinnedKey(null);
    setFilter("");
    setCalls([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      /* portapapeles no disponible: no hacemos nada */
    }
  }

  // ── Descargas ────────────────────────────────────────────────────────────
  const baseName = useMemo(() => (fileName || "document").replace(/\.[^.]+$/, "") + "-extract", [fileName]);

  function downloadJson() {
    if (!result) return;
    triggerDownload(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }), `${baseName}.json`);
  }

  function downloadCsv() {
    if (!result) return;
    const header = ["key", "label", "value", "confidence"];
    const rows = result.fields.map((f) =>
      [f.key, f.label, f.value, f.confidence != null ? f.confidence.toFixed(2) : ""].map(csvCell).join(","),
    );
    // BOM para que Excel abra UTF-8 correctamente.
    const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${baseName}.csv`);
  }

  function downloadExcel() {
    if (!result) return;
    // SpreadsheetML 2003 (.xls): un XML que Excel/Sheets abren nativamente, sin
    // añadir una librería. Dos hojas: metadata del documento y la tabla de campos.
    const meta = [
      ["Document type", result.doc_type_label || result.doc_type],
      ["Type id", result.doc_type],
      ["Language", result.language],
      ["Summary", result.summary],
      ["Source file", fileName],
    ];
    const cell = (v: string, type: "String" | "Number" = "String") =>
      `<Cell><Data ss:Type="${type}">${xmlEscape(v)}</Data></Cell>`;
    const row = (cells: string) => `<Row>${cells}</Row>`;

    const metaRows = meta.map(([k, v]) => row(cell(k) + cell(v))).join("");
    const fieldHeader = row(cell("Key") + cell("Label") + cell("Value") + cell("Confidence"));
    const fieldRows = result.fields
      .map((f) =>
        row(
          cell(f.key) +
            cell(f.label) +
            cell(f.value) +
            (f.confidence != null ? cell(f.confidence.toFixed(2), "Number") : cell("")),
        ),
      )
      .join("");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<?mso-application progid="Excel.Sheet"?>` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
      `<Worksheet ss:Name="Document"><Table>${metaRows}</Table></Worksheet>` +
      `<Worksheet ss:Name="Fields"><Table>${fieldHeader}${fieldRows}</Table></Worksheet>` +
      `</Workbook>`;
    triggerDownload(new Blob([xml], { type: "application/vnd.ms-excel" }), `${baseName}.xls`);
  }

  // ── Derivados del resultado ──────────────────────────────────────────────
  const shownPreview = isImage ? previewUrl : pdfPreview?.url ?? null;
  // En PDFs solo dibujamos cajas si es de una página (las coordenadas son de esa página).
  const canBox = isImage || (pdfPreview?.pages ?? 0) === 1;
  const boxable = canBox ? result?.fields.filter((f) => f.bbox && f.bbox.length === 4) ?? [] : [];
  const focusKey = hoveredKey ?? pinnedKey;

  const stats = useMemo(() => {
    const confs = (result?.fields ?? []).map((f) => f.confidence).filter((c): c is number => c != null);
    const avg = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;
    const review = confs.filter((c) => c < 0.8).length;
    return { avg, review };
  }, [result]);

  const visibleFields = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const fields = result?.fields ?? [];
    if (!q) return fields;
    return fields.filter((f) => `${f.label} ${f.key} ${f.value}`.toLowerCase().includes(q));
  }, [result, filter]);

  // ── Piezas reutilizadas ──────────────────────────────────────────────────
  const errorAlert = error && (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-800">{t("try-docextract.error_title")}</p>
        <p className="break-anywhere text-sm text-red-700">{error}</p>
      </div>
      {lastFile && (
        <button
          type="button"
          onClick={retry}
          className="tap-target inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("try-docextract.retry")}
        </button>
      )}
    </div>
  );

  const stageList: { id: Stage; label: string }[] = [
    { id: "wake", label: t("try-docextract.step_wake") },
    { id: "send", label: t("try-docextract.step_send") },
    { id: "read", label: t("try-docextract.step_read") },
  ];
  const stageIndex = stageList.findIndex((s) => s.id === stage);

  const uploadRef = useRef<HTMLLabelElement>(null);
  const { flashStep, goTo } = useGuideNavigation(1, () => uploadRef.current);
  const extractRunner = linearRunner(stageList.map((s) => s.id), stageIndex);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/60 via-white to-white py-12">
      <div className="container mx-auto min-w-0 max-w-[max(64rem,64vw)] px-4 sm:px-6">
        <DemoNav tone="indigo" className="mb-8" />

        <AnimatePresence mode="wait">
          {/* ── FASE 1: ONBOARDING (subir documento o elegir un ejemplo) ──── */}
          {phase === "onboarding" && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <header className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {t("try-docextract.badge")}
                </span>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {t("try-docextract.onboarding_title")}
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                  {t("try-docextract.onboarding_subtitle")}
                </p>
              </header>

              <div className="mx-auto mt-8 max-w-3xl">
                <GuideSteps prefix="try-docextract" current={1} theme={GUIDE_THEME} onGo={goTo} />
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Subir un documento propio */}
                <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <UploadCloud className="h-4 w-4 text-slate-600" />
                    {t("try-docextract.upload_title")}
                  </h2>
                  <label
                    ref={uploadRef}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-slate-400 ${
                      dragOver ? "border-slate-500 bg-slate-50" : "border-gray-300 bg-gray-50/50 hover:border-slate-400 hover:bg-slate-50/60"
                    } ${flashStep ? GUIDE_THEME.flash : ""}`}
                  >
                    <GuideCue step={1} label={t("try-docextract.guide_upload")} gradient={ACCENT_GRADIENT} />
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-transform group-hover:-translate-y-0.5">
                      <UploadCloud className={`h-7 w-7 ${ACCENT_TEXT}`} />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{t("try-docextract.dropzone_title")}</span>
                    <span className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-slate-900">
                      {t("try-docextract.choose_file")}
                    </span>
                    <span className="text-xs text-gray-500">{t("try-docextract.dropzone_hint")}</span>
                    <input
                      ref={inputRef}
                      type="file"
                      accept={SUPPORTED_MIME.join(",")}
                      className="sr-only"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                  </label>

                  {errorAlert}

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("try-docextract.types_title")}</p>
                    <ul className="flex flex-wrap gap-2">
                      {DOC_TYPES.map(({ key, icon: Icon }) => (
                        <li key={key} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                          {t(`try-docextract.${key}`)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-50/60 p-3 ring-1 ring-amber-100">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                      <Lightbulb className="h-3.5 w-3.5" />
                      {t("try-docextract.tips_title")}
                    </p>
                    <ul className="space-y-1 text-xs leading-relaxed text-amber-900/80">
                      {[1, 2, 3].map((n) => (
                        <li key={n} className="flex gap-1.5">
                          <span aria-hidden>·</span>
                          {t(`try-docextract.tip_${n}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Ejemplos ficticios */}
                <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 lg:col-span-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Sparkles className="h-4 w-4 text-slate-600" />
                      {t("try-docextract.samples_title")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">{t("try-docextract.samples_hint")}</p>
                  </div>
                  {SAMPLES.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => loadSample(id)}
                      disabled={loadingSample !== null}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                    >
                      <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200">
                        <img
                          src={sampleUrl(id, lang, true)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <Icon className="h-4 w-4 text-slate-500" />
                          {t(`try-docextract.sample_${id}_title`)}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                          {t(`try-docextract.sample_${id}_desc`)}
                        </span>
                      </span>
                      {loadingSample === id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" />
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition-opacity group-hover:opacity-100">
                          {t("try-docextract.sample_run")}
                        </span>
                      )}
                    </button>
                  ))}
                  <p className="mt-auto pt-1 text-[11px] leading-relaxed text-gray-400">{t("try-docextract.samples_note")}</p>
                </section>
              </div>

              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                {[
                  { icon: ShieldCheck, key: "trust_private" },
                  { icon: Zap, key: "trust_fast" },
                  { icon: Braces, key: "trust_structured" },
                ].map(({ icon: Icon, key }) => (
                  <li key={key} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                    {t(`try-docextract.${key}`)}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* ── FASE 2: EXTRACTING ─────────────────────────────────────────── */}
          {phase === "extracting" && (
            <motion.div
              key="extracting"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mx-auto grid min-h-[52vh] max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-2"
              aria-live="polite"
            >
              <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
                {shownPreview ? (
                  <img src={shownPreview} alt={fileName} className="max-h-[420px] w-full object-contain" />
                ) : (
                  <div className="flex h-72 flex-col items-center justify-center gap-2 text-gray-400">
                    <FileText className="h-12 w-12" />
                    <span className="break-anywhere px-4 text-sm">{fileName}</span>
                  </div>
                )}
                {/* Línea de escaneo */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-slate-500/20 to-transparent"
                  initial={{ top: "-15%" }}
                  animate={{ top: ["-15%", "100%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {t("try-docextract.extracting_title")}
                </h2>
                <p className="mt-2 text-gray-600">{t("try-docextract.extracting_subtitle")}</p>
                <RunnerTrack
                  mode="running"
                  position={extractRunner.position}
                  steps={stageList.map((s, i) => ({ id: s.id, name: s.label, status: extractRunner.statuses[i] }))}
                  label={stageList[stageIndex]?.label ?? ""}
                  theme={RUNNER_THEME}
                  className="mt-6 text-left"
                />
                <ol className="mt-6 space-y-3">
                  {stageList.map((s, i) => {
                    // "Despertar" se marca como hecho si el servicio ya estaba caliente.
                    const done = i < stageIndex;
                    const current = i === stageIndex;
                    return (
                      <li key={s.id} className="flex items-center gap-3 text-sm">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : current ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <span className={current ? "font-semibold text-gray-900" : done ? "text-gray-600" : "text-gray-400"}>
                          {s.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-6 flex items-center gap-1.5 font-mono text-xs text-gray-500">
                  <Timer className="h-3.5 w-3.5" />
                  {t("try-docextract.elapsed", { s: elapsed })}
                </p>
                {elapsed >= 6 && <p className="mt-2 text-xs text-gray-500">{t("try-docextract.cold_note")}</p>}
              </div>
            </motion.div>
          )}

          {/* ── FASE 3: READY (resultado) ──────────────────────────────────── */}
          {phase === "ready" && result && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("try-docextract.detected_as")}</p>
                    <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-gray-900">
                      {result.doc_type_label || result.doc_type}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                        {result.doc_type}
                      </span>
                    </h1>
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      <li className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("try-docextract.ready_fields", { count: result.fields.length })}
                      </li>
                      {stats.avg != null && (
                        <li className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                          <Gauge className="h-3.5 w-3.5" />
                          {t("try-docextract.stat_avg_conf", { pct: Math.round(stats.avg * 100) })}
                        </li>
                      )}
                      {stats.review > 0 && (
                        <li className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">
                          <TriangleAlert className="h-3.5 w-3.5" />
                          {t("try-docextract.stat_review", { count: stats.review })}
                        </li>
                      )}
                      {durationMs != null && (
                        <li className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                          <Timer className="h-3.5 w-3.5" />
                          {t("try-docextract.stat_time", { s: (durationMs / 1000).toFixed(1) })}
                        </li>
                      )}
                      {result.language && (
                        <li className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium uppercase text-gray-700">
                          <Languages className="h-3.5 w-3.5" />
                          {result.language}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="tap-target inline-flex items-center gap-1.5 self-start rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900 lg:self-end"
                  >
                    <UploadCloud className="h-4 w-4" />
                    {t("try-docextract.try_another")}
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <span>{t("try-docextract.try_sample_short")}</span>
                    {SAMPLES.filter((s) => s.id !== activeSample).map(({ id, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => loadSample(id)}
                        disabled={loadingSample !== null}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {loadingSample === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3 text-slate-500" />}
                        {t(`try-docextract.sample_${id}_title`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {result.summary && (
                <div className="mb-5 flex gap-3 rounded-xl bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-gray-200">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("try-docextract.summary_label")}
                    </span>
                    {result.summary}
                  </div>
                </div>
              )}

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-5">
                  {/* Documento con overlay de bounding boxes */}
                  <div className="flex flex-col border-b border-gray-100 bg-gray-50 lg:col-span-2 lg:border-b-0 lg:border-r">
                    <div className="flex min-h-[52px] items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {t("try-docextract.doc_label")}
                        {pdfPreview && pdfPreview.pages > 1 && (
                          <span className="ml-1.5 font-normal text-gray-400">
                            {t("try-docextract.preview_pages", { count: pdfPreview.pages })}
                          </span>
                        )}
                      </span>
                      {boxable.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowBoxes((v) => !v)}
                          aria-pressed={showBoxes}
                          className="tap-target inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        >
                          {showBoxes ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {showBoxes ? t("try-docextract.hide_boxes") : t("try-docextract.show_boxes")}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-1 items-start justify-center p-4">
                      {shownPreview ? (
                        <div className="relative inline-block max-w-full">
                          <img src={shownPreview} alt={fileName} className="max-h-[560px] max-w-full rounded-lg object-contain shadow-sm ring-1 ring-gray-200" />
                          {/* Overlay: cajas normalizadas 0–1 → % del contenedor */}
                          {showBoxes &&
                            boxable.map((f) => {
                              const [x0, y0, x1, y1] = f.bbox as number[];
                              const active = focusKey === f.key;
                              const dim = focusKey !== null && !active;
                              return (
                                <div
                                  key={f.key}
                                  className={`pointer-events-none absolute rounded-sm border-2 transition-all ${
                                    active ? "z-10 border-slate-800 bg-slate-500/20" : dim ? "border-slate-400/30" : "border-slate-500/70 bg-slate-400/5"
                                  }`}
                                  style={{
                                    left: `${x0 * 100}%`,
                                    top: `${y0 * 100}%`,
                                    width: `${(x1 - x0) * 100}%`,
                                    height: `${(y1 - y0) * 100}%`,
                                  }}
                                >
                                  {active && (
                                    <span className="absolute -top-[20px] left-[-2px] whitespace-nowrap rounded-sm bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                      {f.label}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-gray-400">
                          <FileText className="h-12 w-12" />
                          <span className="break-anywhere text-sm">{fileName}</span>
                        </div>
                      )}
                    </div>
                    {boxable.length > 0 && showBoxes && (
                      <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500">{t("try-docextract.boxes_hint")}</p>
                    )}
                  </div>

                  {/* Datos extraídos */}
                  <div className="flex min-w-0 flex-col lg:col-span-3">
                    {/* Toggle tabla / JSON + descargas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                      <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="tablist">
                        {([
                          { id: "table", icon: Table2, label: t("try-docextract.view_table") },
                          { id: "json", icon: Braces, label: t("try-docextract.view_json") },
                        ] as const).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={view === tab.id}
                            onClick={() => setView(tab.id)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              view === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-0.5 hidden text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:inline">
                          {t("try-docextract.export_label")}
                        </span>
                        {[
                          { fn: downloadJson, icon: FileJson, label: "JSON" },
                          { fn: downloadCsv, icon: Table2, label: "CSV" },
                          { fn: downloadExcel, icon: FileSpreadsheet, label: "Excel" },
                        ].map((d) => (
                          <button
                            key={d.label}
                            type="button"
                            onClick={d.fn}
                            className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            <d.icon className="h-3.5 w-3.5 text-slate-500" />
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[600px] flex-1 overflow-y-auto p-4">
                      {view === "table" ? (
                        result.fields.length === 0 ? (
                          <div className="flex h-40 flex-col items-center justify-center text-center text-gray-400">
                            <ScanText className="mb-2 h-8 w-8" />
                            <p className="text-sm">{t("try-docextract.no_fields")}</p>
                          </div>
                        ) : (
                          <>
                            {result.fields.length > 6 && (
                              <div className="relative mb-3">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="search"
                                  value={filter}
                                  onChange={(e) => setFilter(e.target.value)}
                                  placeholder={t("try-docextract.search_placeholder")}
                                  aria-label={t("try-docextract.search_placeholder")}
                                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-slate-400 focus:outline-none"
                                />
                              </div>
                            )}
                            {visibleFields.length === 0 ? (
                              <p className="py-8 text-center text-sm text-gray-400">{t("try-docextract.no_match")}</p>
                            ) : (
                              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                                {visibleFields.map((f) => {
                                  const level = f.confidence != null ? confLevel(f.confidence) : null;
                                  const hasBox = boxable.some((b) => b.key === f.key);
                                  const active = focusKey === f.key;
                                  return (
                                    <li
                                      key={f.key}
                                      onMouseEnter={() => setHoveredKey(f.key)}
                                      onMouseLeave={() => setHoveredKey(null)}
                                      onClick={() => hasBox && setPinnedKey((k) => (k === f.key ? null : f.key))}
                                      className={`group flex items-center gap-3 px-3 py-2 transition-colors ${hasBox ? "cursor-pointer" : ""} ${
                                        active ? "bg-slate-50" : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <div className="w-[38%] min-w-0 shrink-0">
                                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                          {f.label}
                                          {hasBox && <Eye className="h-3 w-3 text-slate-400" aria-hidden />}
                                        </span>
                                        <span className="block truncate font-mono text-[10px] text-gray-400">{f.key}</span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <span className="break-anywhere text-sm font-medium text-gray-900">{f.value || "—"}</span>
                                        {level && level !== "high" && (
                                          <span className="mt-0.5 block text-[11px] text-amber-700">{t("try-docextract.review_badge")}</span>
                                        )}
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1">
                                        {f.confidence != null && level ? (
                                          <span
                                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium ring-1 ${CONF_PILL[level]}`}
                                            title={t(`try-docextract.legend_${level}`)}
                                          >
                                            {Math.round(f.confidence * 100)}%
                                          </span>
                                        ) : (
                                          <span className="text-gray-300">—</span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void copyText(f.key, f.value);
                                          }}
                                          aria-label={t("try-docextract.copy_value", { field: f.label })}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 opacity-100 transition-opacity hover:bg-gray-100 hover:text-gray-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                        >
                                          {copied === f.key ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {/* Leyenda de confianza */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                              {(["high", "mid", "low"] as const).map((l) => (
                                <span key={l} className="inline-flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${CONF_DOT[l]}`} />
                                  {t(`try-docextract.legend_${l}`)}
                                </span>
                              ))}
                            </div>
                            {stats.review > 0 && (
                              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{t("try-docextract.review_note")}</p>
                            )}
                          </>
                        )
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => void copyText("__json", JSON.stringify(result, null, 2))}
                            className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 shadow-sm hover:text-gray-900"
                          >
                            {copied === "__json" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            {copied === "__json" ? t("try-docextract.copied") : t("try-docextract.copy_json")}
                          </button>
                          <JsonHighlight data={result} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Inspector de API */}
              <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <ApiCallLog
                  calls={logCalls}
                  active={false}
                  failed={logCalls.length > 0 && !logCalls[0].ok}
                  empty={{ title: t("try-docextract.log_empty_title"), description: t("try-docextract.log_empty") }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secciones comunes: caso de negocio, cómo funciona y calculadora + CTA */}
        <div className="mt-16">
          <BusinessCase demoId="docextract" variant="banner" />
        </div>

        <HowItWorks
          theme={{
            gradient: ACCENT_GRADIENT,
            text: ACCENT_TEXT,
            soft: "bg-slate-100",
            activeTab: "border-slate-400 bg-slate-50/60 ring-2 ring-slate-100",
            notice: "bg-slate-50/70 text-slate-900",
          }}
          labels={{
            title: t("try-docextract.how_simple_title"),
            subtitle: t("try-docextract.how_simple_subtitle"),
            overviewTitle: t("try-docextract.how_overview_title"),
            overviewSubtitle: t("try-docextract.how_overview_subtitle"),
            techTitle: t("try-docextract.how_tech_title"),
            techSubtitle: t("try-docextract.how_tech_subtitle"),
          }}
          steps={([1, 2, 3, 4] as const).map((n) => ({
            icon: [UploadCloud, ScanText, Braces, Download][n - 1],
            title: t(`try-docextract.flow_step${n}_title`),
            desc: t(`try-docextract.flow_step${n}_desc`),
          }))}
          notice={t("try-docextract.tech_note")}
          technical={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TechCard icon={Eye} title={t("try-docextract.tech_vision_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-docextract.tech_vision_desc")}</p>
              </TechCard>
              <TechCard icon={Braces} title={t("try-docextract.tech_schema_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-docextract.tech_schema_desc")}</p>
              </TechCard>
              <TechCard icon={Cpu} title={t("try-docextract.tech_single_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-docextract.tech_single_desc")}</p>
              </TechCard>
            </div>
          }
        />

        <div className="mt-8">
          <SavingsCalculator demoId="docextract" />
        </div>
      </div>
    </div>
  );
}
