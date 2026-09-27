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
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { HowItWorks, TechCard } from "@/components/demo/DemoKit";
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

const MAX_FILE_BYTES = 8 * 1024 * 1024; // paridad con el backend
const SUPPORTED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

type Phase = "onboarding" | "extracting" | "ready";

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

export default function TryDocExtract() {
  const { t, i18n } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("docextract");

  const [phase, setPhase] = useState<Phase>("onboarding");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "json">("table");

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

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
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
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsImage(mime.startsWith("image/"));
    setFileName(file.name);
    setMimeType(mime);
    void extract(file, mime);
  }

  async function extract(file: File, mime: string) {
    trackStart();
    setPhase("extracting");
    setResult(null);
    setError(null);

    await warmUp();

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
      const res = await fetch(`${BASE_API}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_base64: b64, mime_type: mime, filename: file.name }),
      });
      status = res.status;
      json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        setError(errorMessage(json, status, t("try-docextract.error_generic")));
        setPhase("onboarding");
      } else {
        setResult(json as ExtractResult);
        setPhase("ready");
        setView("table");
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

  function resetAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhase("onboarding");
    setFileName("");
    setMimeType("");
    setPreviewUrl(null);
    setIsImage(false);
    setResult(null);
    setError(null);
    setHoveredKey(null);
    setCalls([]);
    if (inputRef.current) inputRef.current.value = "";
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
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");
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

  const boxable = result?.fields.filter((f) => f.bbox && f.bbox.length === 4) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/60 via-white to-white py-12">
      <div className="container mx-auto max-w-[max(64rem,64vw)] px-6">
        <DemoNav tone="indigo" className="mb-8" />

        <AnimatePresence mode="wait">
          {/* ── FASE 1: ONBOARDING (subir documento) ──────────────────────── */}
          {phase === "onboarding" && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mx-auto flex min-h-[52vh] max-w-2xl flex-col items-center justify-center text-center"
            >
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg`}>
                <ScanText className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {t("try-docextract.onboarding_title")}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                {t("try-docextract.onboarding_subtitle")}
              </p>

              <div className="mt-8 w-full">
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors ${
                    dragOver ? "border-slate-500 bg-slate-50" : "border-gray-300 bg-white hover:border-slate-400 hover:bg-gray-50"
                  }`}
                >
                  <UploadCloud className={`h-10 w-10 ${ACCENT_TEXT}`} />
                  <span className="text-sm font-semibold text-gray-800">{t("try-docextract.dropzone_title")}</span>
                  <span className="text-xs text-gray-400">{t("try-docextract.dropzone_hint")}</span>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={SUPPORTED_MIME.join(",")}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
                {error && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}
              </div>

              <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
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
              className="mx-auto flex min-h-[52vh] max-w-2xl flex-col items-center justify-center text-center"
            >
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg`}>
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {t("try-docextract.extracting_title")}
              </h2>
              <p className="mt-3 text-gray-600">{t("try-docextract.extracting_subtitle")}</p>
              {previewUrl && isImage && (
                <img src={previewUrl} alt="" className="mt-8 max-h-64 rounded-xl border border-gray-200 object-contain shadow-sm" />
              )}
              {previewUrl && !isImage && (
                <div className="mt-8 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                  <FileText className="h-5 w-5 text-slate-500" />
                  {fileName}
                </div>
              )}
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
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      {result.doc_type_label || result.doc_type}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                        {result.doc_type}
                      </span>
                    </h1>
                    <p className="flex items-center gap-1.5 text-sm text-gray-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      {t("try-docextract.ready_fields", { count: result.fields.length })}
                      <span className="text-gray-300">·</span>
                      <Languages className="h-3.5 w-3.5" />
                      {result.language}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 self-start rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("try-docextract.try_another")}
                </button>
              </div>

              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-5">
                  {/* Documento con overlay de bounding boxes */}
                  <div className="relative flex min-h-[320px] items-center justify-center border-b border-gray-100 bg-gray-50 p-4 lg:col-span-2 lg:border-b-0 lg:border-r">
                    {previewUrl && isImage ? (
                      <div className="relative inline-block max-h-[520px]">
                        <img src={previewUrl} alt={fileName} className="max-h-[520px] rounded-lg object-contain" />
                        {/* Overlay: cajas normalizadas 0–1 → % del contenedor */}
                        {boxable.map((f) => {
                          const [x0, y0, x1, y1] = f.bbox as number[];
                          const active = hoveredKey === f.key;
                          return (
                            <div
                              key={f.key}
                              className={`pointer-events-none absolute rounded-sm border-2 transition-colors ${
                                active ? "border-slate-700 bg-slate-500/20" : "border-slate-400/70"
                              }`}
                              style={{
                                left: `${x0 * 100}%`,
                                top: `${y0 * 100}%`,
                                width: `${(x1 - x0) * 100}%`,
                                height: `${(y1 - y0) * 100}%`,
                              }}
                            >
                              {active && (
                                <span className="absolute -top-[18px] left-[-2px] whitespace-nowrap rounded-sm bg-slate-700 px-1 font-mono text-[9px] font-semibold text-white">
                                  {f.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileText className="h-12 w-12" />
                        <span className="text-sm">{fileName}</span>
                      </div>
                    )}
                  </div>

                  {/* Datos extraídos */}
                  <div className="flex flex-col lg:col-span-3">
                    {/* Toggle tabla / JSON + descargas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                      <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                        {([
                          { id: "table", icon: Table2, label: t("try-docextract.view_table") },
                          { id: "json", icon: FileJson, label: t("try-docextract.view_json") },
                        ] as const).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
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
                      <div className="flex items-center gap-1.5">
                        {[
                          { fn: downloadJson, icon: FileJson, label: "JSON" },
                          { fn: downloadCsv, icon: Table2, label: "CSV" },
                          { fn: downloadExcel, icon: FileSpreadsheet, label: "Excel" },
                        ].map((d) => (
                          <button
                            key={d.label}
                            type="button"
                            onClick={d.fn}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            <d.icon className="h-3.5 w-3.5 text-slate-500" />
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[520px] flex-1 overflow-y-auto p-4">
                      {view === "table" ? (
                        result.fields.length === 0 ? (
                          <div className="flex h-40 flex-col items-center justify-center text-center text-gray-400">
                            <ScanText className="mb-2 h-8 w-8" />
                            <p className="text-sm">{t("try-docextract.no_fields")}</p>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-gray-100">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-400">
                                  <th className="px-3 py-2 font-semibold">{t("try-docextract.col_field")}</th>
                                  <th className="px-3 py-2 font-semibold">{t("try-docextract.col_value")}</th>
                                  <th className="px-3 py-2 text-right font-semibold">{t("try-docextract.col_conf")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {result.fields.map((f) => (
                                  <tr
                                    key={f.key}
                                    onMouseEnter={() => setHoveredKey(f.key)}
                                    onMouseLeave={() => setHoveredKey(null)}
                                    className={`transition-colors ${
                                      f.bbox ? "cursor-pointer" : ""
                                    } ${hoveredKey === f.key ? "bg-slate-50" : "hover:bg-gray-50"}`}
                                  >
                                    <td className="px-3 py-2 align-top">
                                      <span className="font-medium text-gray-800">{f.label}</span>
                                      {f.bbox && <Eye className="ml-1 inline h-3 w-3 text-slate-400" />}
                                      <span className="block font-mono text-[10px] text-gray-400">{f.key}</span>
                                    </td>
                                    <td className="px-3 py-2 align-top text-gray-700">{f.value}</td>
                                    <td className="px-3 py-2 text-right align-top">
                                      {f.confidence != null ? (
                                        <span
                                          className={`inline-block rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                                            f.confidence >= 0.8
                                              ? "bg-emerald-50 text-emerald-700"
                                              : f.confidence >= 0.5
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-red-50 text-red-700"
                                          }`}
                                        >
                                          {Math.round(f.confidence * 100)}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : (
                        <JsonHighlight data={result} />
                      )}

                      {/* Resumen */}
                      {result.summary && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {t("try-docextract.summary_label")}
                          </span>
                          {result.summary}
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

              {/* Caso de negocio */}
              <div className="mt-8">
                <BusinessCase demoId="docextract" variant="banner" />
              </div>

              {/* Cómo funciona */}
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

              {/* Calculadora de ahorro + CTA */}
              <div className="mt-8">
                <SavingsCalculator demoId="docextract" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
