import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Loader2,
  Terminal,
  Cpu,
  Workflow,
  Send,
  RotateCcw,
  Wrench,
  FileJson,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Info,
  Paperclip,
  UploadCloud,
  FileText,
  Wand2,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Braces,
  Eye,
  X,
  Mic,
  Square,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { HowItWorks, StatusPill, TechCard, type StatusTone } from "@/components/demo/DemoKit";
import { useSpeechInput } from "@/hooks/useSpeechInput";

const getBaseApi = () => {
  // VITE_LANGCHAIN_API overrides the default (e.g. point local dev at prod
  // instead of a local langchain-api instance on :8080).
  const override: string | undefined = import.meta.env.VITE_LANGCHAIN_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

// Brand accent (amber/orange), shared with the demo catalog card.
const ACCENT_GRADIENT = "from-amber-500 to-orange-600";
const ACCENT_TEXT = "text-orange-600";
const BADGE_BG = "bg-orange-100";
const BADGE_TEXT = "text-orange-700";
const BADGE_DOT = "bg-orange-500";
const TIP_HOVER = "hover:text-orange-600 focus:text-orange-600";

const ACCEPTED_FILES = ".pdf,.txt,.docx";

type Mode = "rag" | "tools" | "json";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Raw API response (assistant only). */
  data?: any;
  state: "pending" | "done" | "error";
  /** The question that produced this answer, so an error can be retried. */
  question?: string;
};

type ApiCall = {
  id: string;
  method: "POST";
  path: string;
  request: unknown;
  response: unknown;
  /** HTTP status, or undefined when the request never reached the server. */
  status?: number;
  ms: number;
  at: Date;
};

type Doc = {
  id: string;
  name: string;
  state: "uploading" | "ready" | "error";
  file: File;
  sample?: boolean;
  /** Why the document failed, shown on the chip and in the strip (error only). */
  error?: string;
};

/** Dictated text lands after whatever is already typed, with one space between. */
function appendTranscript(current: string, addition: string): string {
  const add = addition.trim();
  if (!add) return current;
  if (!current.trim()) return add;
  return /\s$/.test(current) ? current + add : `${current} ${add}`;
}

/** Text and PDF can be shown in the browser; DOCX cannot, so it gets no eye. */
function isPreviewable(file: File): boolean {
  return file.type.startsWith("text/") || file.type === "application/pdf" || /\.(txt|md|pdf)$/i.test(file.name);
}

const MODE_META: Record<Mode, { icon: LucideIcon; endpoints: string[] }> = {
  rag: { icon: MessageSquare, endpoints: ["/upload", "/ingest", "/chat"] },
  tools: { icon: Wrench, endpoints: ["/agent"] },
  json: { icon: FileJson, endpoints: ["/json"] },
};

const EMPTY_THREADS: Record<Mode, Message[]> = { rag: [], tools: [], json: [] };

function errorMessage(json: any, status: number | undefined, fallback: string): string {
  if (json?.error?.message) return json.error.message;
  if (typeof json?.error === "string") return json.error;
  if (typeof json?.detail === "string") return json.detail;
  if (Array.isArray(json?.detail)) return json.detail.map((d: any) => d?.msg).filter(Boolean).join(" · ");
  return status ? `HTTP ${status}` : fallback;
}

export default function TryLangChain() {
  const { t, i18n } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("langchain");
  const isEs = i18n.language?.startsWith("es");

  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [mode, setMode] = useState<Mode>("rag");
  const [threads, setThreads] = useState<Record<Mode, Message[]>>(EMPTY_THREADS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [dragging, setDragging] = useState(false);

  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [openCall, setOpenCall] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "warm" | "warming" | "cold">("checking");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Dictation: the recognizer speaks the page's language, and each committed
  // phrase is appended to whatever the visitor already typed.
  const speech = useSpeechInput({
    lang: isEs ? "es-ES" : "en-US",
    onResult: (text) => setInput((prev) => appendTranscript(prev, text)),
  });

  const thread = threads[mode];
  const readyDocs = docs.filter((d) => d.state === "ready");
  const usingSample = readyDocs.some((d) => d.sample);
  const uploading = docs.some((d) => d.state === "uploading");
  const failedDocs = docs.filter((d) => d.state === "error");
  const ragLocked = mode === "rag" && readyDocs.length === 0;

  // Health check on mount (warm vs cold from latency).
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const started = Date.now();
    fetch(`${BASE_API}/`, { signal: controller.signal, mode: "no-cors" })
      .then(() => {
        clearTimeout(timer);
        if (cancelled) return;
        setServiceStatus(Date.now() - started < 2500 ? "warm" : "cold");
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled) setServiceStatus("cold");
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // Keep the newest message in view (scrolls the thread, never the page).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thread]);

  // Auto-grow the composer up to its max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const warmUpService = async (): Promise<boolean> => {
    setServiceStatus("warming");
    for (let attempt = 0; attempt < 15; attempt++) {
      const started = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        await fetch(`${BASE_API}/`, { signal: controller.signal, mode: "no-cors" });
        clearTimeout(timer);
        if (Date.now() - started < 2500) {
          setServiceStatus("warm");
          return true;
        }
        await new Promise((r) => setTimeout(r, 2000));
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    setServiceStatus("cold");
    return false;
  };

  const ensureWarm = async (): Promise<boolean> => (serviceStatus === "warm" ? true : warmUpService());

  /** POSTs to the API and records the call (request, response, status, latency) in the inspector. */
  async function callApi(path: string, payload: { json?: unknown; form?: FormData; formSummary?: unknown }) {
    const id = uuidv4();
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}${path}`, {
        method: "POST",
        headers: payload.form ? undefined : { "Content-Type": "application/json" },
        body: payload.form ?? JSON.stringify(payload.json),
      });
      status = res.status;
      json = await res.json().catch(() => null);
      return { ok: res.ok && !json?.error, status, json };
    } catch {
      json = { error: t("try-langchain.network_error") };
      return { ok: false, status, json };
    } finally {
      const call: ApiCall = {
        id,
        method: "POST",
        path,
        request: payload.form ? payload.formSummary : payload.json,
        response: json,
        status,
        ms: Math.round(performance.now() - started),
        at: new Date(),
      };
      setCalls((prev) => [call, ...prev]);
      setOpenCall(id);
    }
  }

  function startNewSession() {
    setSessionId(uuidv4());
    setThreads(EMPTY_THREADS);
    setDocs([]);
    setPreviewDoc(null);
    setCalls([]);
    setOpenCall(null);
    setInput("");
  }

  async function ingestFiles(files: File[], opts: { sample?: boolean; session?: string } = {}) {
    if (!files.length) return;
    const names = files.map((f) => f.name);
    const added: Doc[] = files.map((file) => ({
      id: uuidv4(),
      name: file.name,
      state: "uploading" as const,
      file,
      sample: opts.sample,
    }));
    setDocs((prev) => [...prev, ...added]);
    // A removal that lands mid-upload drops the doc, so only still-present rows are patched.
    const patch = (id: string, fields: Partial<Doc>) =>
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)));
    const failAll = (error: string) => added.forEach((d) => patch(d.id, { state: "error", error }));

    if (!(await ensureWarm())) {
      failAll(t("try-langchain.upload_error"));
      return;
    }
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const upload = await callApi("/upload", { form: fd, formSummary: { files: names } });
    if (!upload.ok) {
      failAll(t("try-langchain.upload_error"));
      return;
    }
    // One /ingest per file: the endpoint only reports a total chunk count, so a
    // batched call cannot say *which* document yielded nothing. `saved` comes
    // back in the order the parts were appended.
    const saved: string[] = upload.json?.saved ?? [];
    for (let i = 0; i < added.length; i++) {
      const doc = added[i];
      const path = saved[i];
      if (!path) {
        patch(doc.id, { state: "error", error: t("try-langchain.upload_error") });
        continue;
      }
      const ingest = await callApi("/ingest", {
        json: { files: [path], session_id: opts.session ?? sessionId },
      });
      if (!ingest.ok) {
        patch(doc.id, { state: "error", error: t("try-langchain.upload_error") });
        continue;
      }
      // A 200 with zero chunks means nothing reached the vector store — almost
      // always a scanned PDF with no text layer (the API has no OCR). Marking
      // it "ready" would show a green check on a file the model cannot read.
      if (!ingest.json?.chunks_indexed) {
        patch(doc.id, { state: "error", error: t("try-langchain.upload_no_text") });
        continue;
      }
      patch(doc.id, { state: "ready", error: undefined });
    }
  }

  /**
   * Removes a document from the knowledge base. The API has no way to delete
   * from a vector store, so the only honest removal is a fresh session with the
   * remaining documents re-ingested into it — otherwise the removed file would
   * keep answering questions.
   */
  async function removeDoc(doc: Doc) {
    if (uploading) return;
    const remaining = docs.filter((d) => d.id !== doc.id && d.state === "ready");
    if (previewDoc?.id === doc.id) setPreviewDoc(null);
    setDocs([]);
    const nextSession = uuidv4();
    setSessionId(nextSession);
    if (remaining.length) {
      await ingestFiles(
        remaining.map((d) => d.file),
        { sample: remaining.some((d) => d.sample), session: nextSession },
      );
    }
  }

  async function sampleFile(): Promise<File> {
    const url = `/demo-samples/langchain-policy-${isEs ? "es" : "en"}.txt`;
    const blob = await fetch(url).then((r) => r.blob());
    const name = isEs ? "politica-viajes-northwind.txt" : "northwind-travel-policy.txt";
    return new File([blob], name, { type: "text/plain" });
  }

  async function loadSampleDoc() {
    await ingestFiles([await sampleFile()], { sample: true });
  }

  async function previewSampleDoc() {
    const file = await sampleFile();
    setPreviewDoc({ id: "sample-preview", name: file.name, state: "ready", file });
  }

  function onFilesPicked(list: FileList | null) {
    if (!list?.length) return;
    ingestFiles(Array.from(list));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const patchMessage = (m: Mode, id: string, patch: Partial<Message>) =>
    setThreads((prev) => ({ ...prev, [m]: prev[m].map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)) }));

  async function ask(question: string, retryId?: string) {
    const q = question.trim();
    if (!q || busy || ragLocked) return;
    speech.stop();
    const m = mode;
    trackStart();
    setBusy(true);
    setInput("");

    const answerId = retryId ?? uuidv4();
    if (retryId) {
      patchMessage(m, retryId, { state: "pending", text: "" });
    } else {
      setThreads((prev) => ({
        ...prev,
        [m]: [
          ...prev[m],
          { id: uuidv4(), role: "user", text: q, state: "done" },
          { id: answerId, role: "assistant", text: "", state: "pending", question: q },
        ],
      }));
    }

    try {
      if (!(await ensureWarm())) {
        patchMessage(m, answerId, { state: "error", text: t("try-langchain.service_warm_failed") });
        return;
      }
      const path = m === "rag" ? "/chat" : m === "tools" ? "/agent" : "/json";
      const body =
        m === "rag" ? { session_id: sessionId, question: q } : m === "tools" ? { mode: "tools", input: q } : { query: q };
      const { ok, status, json } = await callApi(path, { json: body });
      if (!ok) {
        patchMessage(m, answerId, {
          state: "error",
          text: errorMessage(json, status, t("try-langchain.network_error")),
          data: json,
        });
        return;
      }
      patchMessage(m, answerId, {
        state: "done",
        text: m === "json" ? json?.summary ?? "" : json?.answer ?? "",
        data: json,
      });
      trackComplete({ mode: m });
    } finally {
      setBusy(false);
    }
  }

  const modeLabel = (m: Mode) => t(`try-langchain.mode_${m}`);

  const suggestions: string[] =
    mode === "rag"
      ? [1, 2, 3].map((n) => t(`try-langchain.suggest_${usingSample ? "sample" : "rag"}_${n}`))
      : [1, 2, 3].map((n) => t(`try-langchain.suggest_${mode}_${n}`));

  const pillStatus: { tone: StatusTone; label: string; spinning?: boolean } =
    serviceStatus === "warming"
      ? { tone: "busy", label: t("try-langchain.status_warming"), spinning: true }
      : serviceStatus === "checking"
        ? { tone: "idle", label: t("try-langchain.status_checking"), spinning: true }
        : serviceStatus === "cold"
          ? { tone: "busy", label: t("try-langchain.status_cold") }
          : { tone: "ready", label: t("try-langchain.status_ready") };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">

        {/* Header: pitch + how it works (left), business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <Bot className="h-6 w-6" />
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full ${BADGE_BG} px-3 py-1 text-xs font-semibold ${BADGE_TEXT}`}>
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${BADGE_DOT}`} />
                {t("try-langchain.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-langchain.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-langchain.description")}
            </p>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-langchain.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-langchain.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-langchain.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {[
                { icon: ShieldCheck, key: "trust_private" },
                { icon: Zap, key: "trust_realtime" },
                { icon: Workflow, key: "trust_modes" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t(`try-langchain.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="langchain" variant="aside" />
          </div>
        </div>

        {/* ── Workspace: playground (left) · API inspector (right) ─────────── */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Toolbar: title + session + status */}
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Sparkles className={`h-4 w-4 ${ACCENT_TEXT}`} />
                {t("try-langchain.workspace_title")}
              </h2>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                {t("try-langchain.session_label")}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-600 ring-1 ring-gray-200" title={sessionId}>
                  {sessionId.slice(0, 8)}
                </code>
                <InfoTip text={t("try-langchain.tip_session")} hoverColor={TIP_HOVER} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startNewSession}
                disabled={busy || uploading}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("try-langchain.new_session")}
              </button>
              <StatusPill tone={pillStatus.tone} spinning={pillStatus.spinning} label={pillStatus.label} />
            </div>
          </div>

          {/* Cold-start notice */}
          {(serviceStatus === "cold" || serviceStatus === "warming") && (
            <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/70 px-5 py-2.5 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>{serviceStatus === "warming" ? t("try-langchain.service_warming") : t("try-langchain.service_cold_hint")}</span>
            </div>
          )}

          {/* Mode picker: what each mode does and which endpoint it calls */}
          <div role="tablist" aria-label={t("try-langchain.step2_title")} className="grid grid-cols-1 gap-2 border-b border-gray-100 p-3 sm:grid-cols-3 sm:p-4">
            {(Object.keys(MODE_META) as Mode[]).map((id) => {
              const { icon: Icon, endpoints } = MODE_META[id];
              const active = mode === id;
              const count = threads[id].filter((msg) => msg.role === "user").length;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(id)}
                  className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-orange-300 bg-orange-50/60 ring-2 ring-orange-100"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active ? `bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm` : "bg-gray-100 text-gray-500 group-hover:text-gray-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{modeLabel(id)}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold tabular-nums text-gray-600">{count}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500">{t(`try-langchain.mode_${id}_desc`)}</span>
                    <span className="mt-1.5 block truncate font-mono text-[10px] text-gray-400">
                      POST {endpoints[endpoints.length - 1]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5">

            {/* ── Left: conversation ────────────────────────────────────────── */}
            <div
              className="relative flex h-[520px] min-w-0 flex-col lg:col-span-3 lg:h-[640px] lg:border-r lg:border-gray-100"
              onDragOver={(e) => {
                if (mode !== "rag") return;
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
              }}
              onDrop={(e) => {
                if (mode !== "rag") return;
                e.preventDefault();
                setDragging(false);
                onFilesPicked(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILES}
                className="sr-only"
                onChange={(e) => onFilesPicked(e.target.files)}
              />

              {/* Knowledge base strip (RAG only, once there is something in it) */}
              {mode === "rag" && docs.length > 0 && (
                <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
                  {/* The title and the add button take a row of their own so the
                      chips below get the full width instead of competing for it. */}
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-500">
                      {t("try-langchain.kb_title")}
                      <InfoTip text={t("try-langchain.tip_upload")} hoverColor={TIP_HOVER} />
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`shrink-0 text-xs font-medium ${ACCENT_TEXT} hover:text-orange-700 disabled:opacity-50`}
                    >
                      + {t("try-langchain.kb_add")}
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {docs.map((d) => (
                      <span
                        key={d.id}
                        title={d.state === "error" ? (d.error ?? t("try-langchain.upload_error")) : d.name}
                        className={`inline-flex max-w-[14rem] shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ${
                          d.state === "ready"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : d.state === "error"
                              ? "bg-red-50 text-red-700 ring-red-200"
                              : "bg-gray-50 text-gray-600 ring-gray-200"
                        }`}
                      >
                        {d.state === "uploading" ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        ) : d.state === "ready" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{d.name}</span>
                        {d.state !== "uploading" && isPreviewable(d.file) && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            title={t("try-langchain.kb_preview")}
                            aria-label={t("try-langchain.kb_preview")}
                            className="shrink-0 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                        {d.state !== "uploading" && (
                          <button
                            type="button"
                            onClick={() => removeDoc(d)}
                            title={t("try-langchain.kb_remove")}
                            aria-label={t("try-langchain.kb_remove")}
                            className="shrink-0 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* A failed document is easy to miss as a small red chip, so the reason is spelled out. */}
              {mode === "rag" && failedDocs.length > 0 && (
                <div className="flex shrink-0 items-start gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <ul className="min-w-0 space-y-0.5">
                    {failedDocs.map((d) => (
                      <li key={d.id}>
                        <span className="font-medium">{d.name}</span> — {d.error ?? t("try-langchain.upload_error")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Thread */}
              <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {thread.length === 0 ? (
                  ragLocked ? (
                    <RagOnboarding
                      uploading={uploading}
                      onPick={() => fileInputRef.current?.click()}
                      onSample={loadSampleDoc}
                      onPreview={previewSampleDoc}
                    />
                  ) : (
                    <EmptyThread mode={mode} suggestions={suggestions} onPick={(s) => ask(s)} disabled={busy} />
                  )
                ) : (
                  <div className="space-y-5">
                    {thread.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} mode={mode} busy={busy} onRetry={(q) => ask(q, msg.id)} warming={serviceStatus === "warming"} />
                    ))}
                    {!busy && thread[thread.length - 1]?.state === "done" && (
                      <div className="flex flex-wrap gap-1.5 pl-10">
                        {suggestions
                          .filter((s) => !thread.some((msg) => msg.role === "user" && msg.text === s))
                          .slice(0, 2)
                          .map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => ask(s)}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-orange-200 hover:bg-orange-50/60 hover:text-gray-900"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-gray-100 bg-white p-3 sm:p-4">
                <div
                  className={`flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm transition-all focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100 ${
                    ragLocked ? "border-gray-200 bg-gray-50" : "border-gray-200"
                  }`}
                >
                  {mode === "rag" && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      title={t("try-langchain.kb_add")}
                      aria-label={t("try-langchain.kb_add")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </button>
                  )}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    disabled={ragLocked}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        ask(input);
                      }
                    }}
                    placeholder={ragLocked ? t("try-langchain.placeholder_rag_locked") : t(`try-langchain.placeholder_${mode}`)}
                    className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
                  />
                  {speech.supported && (
                    <button
                      type="button"
                      onClick={speech.toggle}
                      disabled={ragLocked || speech.busy}
                      title={t(speech.listening ? "try-langchain.mic_stop" : "try-langchain.mic_start")}
                      aria-label={t(speech.listening ? "try-langchain.mic_stop" : "try-langchain.mic_start")}
                      aria-pressed={speech.listening}
                      aria-busy={speech.busy}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-default ${
                        speech.listening || speech.busy
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      } ${ragLocked ? "opacity-50" : ""}`}
                    >
                      {speech.busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : speech.listening ? (
                        <Square className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => ask(input)}
                    disabled={busy || ragLocked || !input.trim()}
                    aria-label={t("try-langchain.send")}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm transition-all hover:brightness-105 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                {/* The hint line doubles as the dictation status, so listening never goes unannounced. */}
                {speech.listening || speech.busy ? (
                  <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-red-600">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 ${speech.busy ? "opacity-50" : "animate-pulse"}`}
                    />
                    <span className="truncate">
                      {speech.state === "starting"
                        ? t("try-langchain.mic_starting")
                        : speech.state === "stopping"
                          ? t("try-langchain.mic_stopping")
                          : speech.interim || t("try-langchain.mic_listening")}
                    </span>
                  </p>
                ) : speech.state === "denied" || speech.state === "error" ? (
                  <p className="mt-2 px-1 text-[11px] text-red-600">
                    {t(speech.state === "denied" ? "try-langchain.mic_denied" : "try-langchain.mic_error")}
                  </p>
                ) : (
                  <p className="mt-2 hidden px-1 text-[11px] text-gray-400 sm:block">{t("try-langchain.composer_hint")}</p>
                )}
              </div>

              {/* Drag overlay */}
              <AnimatePresence>
                {dragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/90 text-center backdrop-blur-sm"
                  >
                    <UploadCloud className="h-8 w-8 text-orange-500" />
                    <p className="mt-2 text-sm font-semibold text-gray-900">{t("try-langchain.kb_drop_title")}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{t("try-langchain.upload_hint")}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Right: API inspector ──────────────────────────────────────── */}
            <div className="flex h-[400px] min-w-0 flex-col border-t border-gray-100 lg:col-span-2 lg:h-[640px] lg:border-t-0">
              <div className="flex h-[49px] shrink-0 items-center justify-between border-b border-gray-100 px-5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Terminal className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t("try-langchain.inspector_title")}
                  <InfoTip text={t("try-langchain.log_subtitle")} hoverColor={TIP_HOVER} />
                </span>
                {calls.length > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600">
                    {calls.length}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {calls.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-24 w-24 opacity-50" />
                    <p className="text-sm font-semibold text-gray-600">{t("try-langchain.log_empty_title")}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-langchain.log_empty")}</p>
                    <div className="mt-5 w-full max-w-xs rounded-xl border border-dashed border-gray-200 p-3 text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {t("try-langchain.inspector_flow", { mode: modeLabel(mode) })}
                      </p>
                      <ol className="mt-2 space-y-1.5">
                        {MODE_META[mode].endpoints.map((ep, i) => (
                          <li key={ep} className="flex items-center gap-2 font-mono text-xs text-gray-600">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">{i + 1}</span>
                            <span className="rounded bg-orange-50 px-1 text-[10px] font-bold text-orange-700">POST</span>
                            {ep}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {calls.map((call) => (
                        <motion.li
                          key={call.id}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CallRow
                            call={call}
                            open={openCall === call.id}
                            onToggle={() => setOpenCall((cur) => (cur === call.id ? null : call.id))}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <SavingsCalculator demoId="langchain" />

        {/* ── How it works (collapsible): overview and technical architecture ── */}
        <HowItWorks
          theme={{
            gradient: ACCENT_GRADIENT,
            text: ACCENT_TEXT,
            soft: BADGE_BG,
            activeTab: "border-orange-300 bg-orange-50/60 ring-2 ring-orange-100",
            notice: "bg-orange-50/70 text-orange-900",
          }}
          labels={{
            title: t("try-langchain.tech_title"),
            subtitle: t("try-langchain.tech_subtitle"),
            overviewTitle: t("try-langchain.how_simple_title"),
            overviewSubtitle: t("try-langchain.how_simple_subtitle"),
            techTitle: t("try-langchain.how_tech_title"),
            techSubtitle: t("try-langchain.how_tech_subtitle"),
          }}
          steps={[
            { icon: Workflow, title: t("try-langchain.how_step1_title"), desc: t("try-langchain.how_step1_desc") },
            { icon: MessageSquare, title: t("try-langchain.how_step2_title"), desc: t("try-langchain.how_step2_desc") },
            { icon: Terminal, title: t("try-langchain.how_step3_title"), desc: t("try-langchain.how_step3_desc") },
          ]}
          notice={t("try-langchain.instructions")}
          technical={
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TechCard icon={Workflow} title={t("try-langchain.tech_flow_title")} iconClass={ACCENT_TEXT}>
                <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gray-200">
                  {[1, 2, 3, 4].map((n) => (
                    <li key={n} className="relative flex gap-3">
                      <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-[11px] font-bold text-white ring-4 ring-white`}>
                        {n}
                      </span>
                      <p className="text-sm leading-snug text-gray-600">{t(`try-langchain.tech_flow_${n}`)}</p>
                    </li>
                  ))}
                </ol>
              </TechCard>

              <TechCard icon={Cpu} title={t("try-langchain.tech_stack_title")} iconClass={ACCENT_TEXT}>
                <dl className="space-y-3">
                  {[
                    ["tech_stack_framework_label", "LangChain · LangGraph"],
                    ["tech_stack_llm_label", "OpenAI GPT-4"],
                    ["tech_stack_vectordb_label", t("try-langchain.tech_stack_vectordb_value")],
                    ["tech_stack_tools_label", t("try-langchain.tech_stack_tools_value")],
                    ["tech_stack_server_label", "FastAPI · Cloud Run"],
                  ].map(([labelKey, value]) => (
                    <div key={labelKey} className="rounded-lg bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t(`try-langchain.${labelKey}`)}</dt>
                      <dd className="mt-0.5 font-mono text-[13px] leading-snug text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{t("try-langchain.tech_note")}</p>
              </TechCard>

              <TechCard icon={Braces} title={t("try-langchain.tech_endpoints_title")} iconClass={ACCENT_TEXT}>
                <ul className="space-y-2.5">
                  {(["upload", "ingest", "chat", "agent", "json"] as const).map((ep) => (
                    <li key={ep} className="text-sm leading-snug text-gray-600">
                      <span className="flex items-center gap-1.5 font-mono text-xs text-gray-900">
                        <span className="rounded bg-orange-50 px-1 text-[10px] font-bold text-orange-700">POST</span>/{ep}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">{t(`try-langchain.tech_endpoint_${ep}`)}</span>
                    </li>
                  ))}
                </ul>
              </TechCard>
            </div>
          }
        />
      </div>

      <AnimatePresence>
        {previewDoc && <DocPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Document preview ───────────────────────────────────────

/** Shows an ingested file's contents without leaving the page: text inline, PDF in a frame. */
function DocPreview({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const isPdf = doc.file.type === "application/pdf" || /\.pdf$/i.test(doc.file.name);

  useEffect(() => {
    if (isPdf) {
      const url = URL.createObjectURL(doc.file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    let cancelled = false;
    doc.file.text().then((value) => {
      if (!cancelled) setText(value);
    });
    return () => {
      cancelled = true;
    };
  }, [doc, isPdf]);

  // Esc closes, like the other modals on the site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${BADGE_BG}`}>
            <FileText className={`h-4 w-4 ${ACCENT_TEXT}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900">{doc.name}</span>
            <span className="block text-xs text-gray-400">{t("try-langchain.kb_preview_hint")}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("try-langchain.kb_preview_close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {isPdf ? (
          pdfUrl && <iframe src={pdfUrl} title={doc.name} className="h-[70vh] w-full border-0" />
        ) : text === null ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <pre className="overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[13px] leading-relaxed text-gray-700">
            {text}
          </pre>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Empty states ───────────────────────────────────────────────────────────────

/** RAG with no documents yet: the one thing to do is add a document. */
function RagOnboarding({
  uploading,
  onPick,
  onSample,
  onPreview,
}: {
  uploading: boolean;
  onPick: () => void;
  onSample: () => void;
  onPreview: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="group flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 px-6 py-8 text-center transition-colors hover:border-orange-300 hover:bg-orange-50/40 disabled:opacity-60"
      >
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${BADGE_BG} transition-transform group-hover:scale-105`}>
          {uploading ? <Loader2 className={`h-5 w-5 animate-spin ${ACCENT_TEXT}`} /> : <UploadCloud className={`h-5 w-5 ${ACCENT_TEXT}`} />}
        </span>
        <span className="mt-4 text-sm font-semibold text-gray-900">
          {uploading ? t("try-langchain.upload_uploading") : t("try-langchain.kb_drop_title")}
        </span>
        <span className="mt-1 text-xs text-gray-500">{t("try-langchain.kb_drop_hint")}</span>
      </button>

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-gray-400">
        <span className="h-px flex-1 bg-gray-100" />
        {t("try-langchain.kb_or")}
        <span className="h-px flex-1 bg-gray-100" />
      </div>

      <div className="flex w-full items-center gap-1 rounded-xl border border-orange-200 bg-orange-50/40 p-1 transition-colors hover:border-orange-300">
        <button
          type="button"
          onClick={onSample}
          disabled={uploading}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-orange-100">
            <FileText className={`h-5 w-5 ${ACCENT_TEXT}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">{t("try-langchain.kb_sample")}</span>
            <span className="block text-xs text-gray-500">{t("try-langchain.kb_sample_hint")}</span>
          </span>
          <Wand2 className="h-4 w-4 shrink-0 text-orange-500" />
        </button>
        <span className="h-8 w-px shrink-0 bg-orange-200/70" />
        <button
          type="button"
          onClick={onPreview}
          title={t("try-langchain.kb_preview")}
          aria-label={t("try-langchain.kb_preview")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-orange-500 transition-colors hover:bg-orange-100 hover:text-orange-700"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Empty thread with clickable starter prompts. */
function EmptyThread({
  mode,
  suggestions,
  onPick,
  disabled,
}: {
  mode: Mode;
  suggestions: string[];
  onPick: (s: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const Icon = MODE_META[mode].icon;
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">{t(`try-langchain.empty_title_${mode}`)}</h3>
      <p className="mt-1 text-sm text-gray-500">{t("try-langchain.empty_subtitle")}</p>
      <div className="mt-5 space-y-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="group flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50/50 hover:text-gray-900 disabled:opacity-50"
          >
            {s}
            <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-orange-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Messages ───────────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  mode,
  busy,
  warming,
  onRetry,
}: {
  msg: Message;
  mode: Mode;
  busy: boolean;
  warming: boolean;
  onRetry: (question: string) => void;
}) {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  if (msg.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gray-900 px-4 py-2.5 text-sm leading-relaxed text-white">
          {msg.text}
        </div>
      </motion.div>
    );
  }

  const copy = async () => {
    const text = mode === "json" ? JSON.stringify(msg.data, null, 2) : msg.text;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const structured = mode === "json" && msg.state === "done" && msg.data && (msg.data.summary || Array.isArray(msg.data.bullets));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${ACCENT_GRADIENT} text-white`}>
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {msg.state === "pending" ? (
          <div className="flex items-center gap-2 py-1.5 text-sm text-gray-500">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-orange-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
            {warming ? t("try-langchain.service_warming") : t(`try-langchain.thinking_${mode}`)}
          </div>
        ) : msg.state === "error" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">{msg.text}</span>
            </p>
            {msg.question && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRetry(msg.question!)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("try-langchain.retry")}
              </button>
            )}
          </div>
        ) : structured ? (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            {msg.data.summary && (
              <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                <p className="font-mono text-[11px] text-gray-400">summary</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-900">{msg.data.summary}</p>
              </div>
            )}
            {Array.isArray(msg.data.bullets) && msg.data.bullets.length > 0 && (
              <div className="px-4 py-3">
                <p className="font-mono text-[11px] text-gray-400">bullets</p>
                <ul className="mt-2 space-y-1.5">
                  {msg.data.bullets.map((b: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm leading-snug text-gray-700">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${ACCENT_TEXT}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words py-0.5 text-sm leading-relaxed text-gray-800">{msg.text}</p>
        )}

        {msg.state === "done" && (
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("try-langchain.copied") : t("try-langchain.copy")}
            </button>
            {msg.data && (
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700"
              >
                <Braces className="h-3.5 w-3.5" />
                {showRaw ? t("try-langchain.hide_raw") : t("try-langchain.view_raw")}
              </button>
            )}
          </div>
        )}
        {showRaw && msg.data && (
          <div className="mt-2">
            <JsonHighlight data={msg.data} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Inspector row ──────────────────────────────────────────────────────────────

function CallRow({ call, open, onToggle }: { call: ApiCall; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const ok = call.status !== undefined && call.status < 400 && !(call.response as any)?.error;
  const statusLabel = call.status ?? "ERR";
  const duration = call.ms >= 1000 ? `${(call.ms / 1000).toFixed(2)} s` : `${call.ms} ms`;

  const copyCurl = async () => {
    const url = `${BASE_API}${call.path}`;
    const curl =
      call.path === "/upload"
        ? `curl -X POST ${url} \\\n  -F "files=@your-file.pdf"`
        : `curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(call.request)}'`;
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${open ? "border-gray-300 shadow-sm" : "border-gray-200"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className="rounded bg-orange-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-orange-700">{call.method}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-900">{call.path}</span>
        <span className={`font-mono text-[11px] font-semibold tabular-nums ${ok ? "text-emerald-600" : "text-red-600"}`}>{statusLabel}</span>
        <span className="w-14 text-right font-mono text-[11px] tabular-nums text-gray-400">{duration}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-gray-100 bg-gray-50/50 p-3">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>{call.at.toLocaleTimeString()}</span>
                <button type="button" onClick={copyCurl} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900">
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? t("try-langchain.copied") : t("try-langchain.copy_curl")}
                </button>
              </div>
              {call.request !== undefined && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("try-langchain.inspector_request")}</p>
                  <JsonHighlight data={call.request} />
                </div>
              )}
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("try-langchain.inspector_response")}</p>
                <JsonHighlight data={call.response} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
