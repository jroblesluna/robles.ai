import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Database,
  Loader2,
  Search,
  ArrowUpDown,
  Sparkles,
  Upload,
  Info,
  Cpu,
  Workflow,
  FileText,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
  ChevronRight,
  Check,
  ArrowUp,
  Quote,
  Scissors,
  X,
  Activity,
  MessageSquareText,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import CryptoJS from "crypto-js";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { HowItWorks, StatusPill, TechCard, type StatusTone } from "@/components/demo/DemoKit";
import * as pdfjsLib from "pdfjs-dist";
// Vite: load the pdf.js worker as a URL so text extraction runs off the main thread.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ── Brand accent (cyan/blue) ─────────────────────────────────────────────────
const ACCENT_GRADIENT = "from-cyan-500 to-blue-600";
const ACCENT_TEXT = "text-cyan-600";
const TIP_HOVER = "hover:text-cyan-600 focus:text-cyan-600";
const BADGE_BG = "bg-cyan-100";
const BADGE_TEXT = "text-cyan-700";
const BADGE_DOT = "bg-cyan-500";

const getBaseApi = (): string => {
  // VITE_RAG_API overrides the default (e.g. point local dev at prod).
  const override: string | undefined = import.meta.env.VITE_RAG_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://rag-api.robles.ai";
};

const BASE_API = getBaseApi();

/**
 * Extract selectable text from a PDF entirely in the browser (pdf.js).
 * Only the text is sent to the backend, so PDF file size no longer matters
 * (a 60 MB scanned-heavy PDF yields a few KB of text). Note: no OCR — scanned
 * pages without a text layer produce no text (same as the old backend path).
 */
async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<{ text: string; pages: number }> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  const pages: string[] = [];
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    pages.push(pageText);
    onProgress?.(i, total);
    // Yield to the event loop so the progress bar can repaint between pages.
    if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return { text: pages.join("\n").trim(), pages: total };
}

// ── Pipeline model ───────────────────────────────────────────────────────────
// The visitor only uploads a PDF and asks; each backend stage runs on its own
// and is recorded here so the live pipeline timeline can show it live
// and keep it inspectable afterwards.
const STEP_IDS = ["extract", "index", "search", "rerank", "generate"] as const;
type StepId = (typeof STEP_IDS)[number];
type StepStatus = "pending" | "running" | "done" | "error";

interface ApiCall {
  key: string;
  at: number;
  method: string;
  url: string;
  request?: unknown;
  response: unknown;
}

interface StepRun {
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  error?: string;
  calls: ApiCall[];
}

const STEP_ICONS: Record<StepId, LucideIcon> = {
  extract: FileText,
  index: Database,
  search: Search,
  rerank: ArrowUpDown,
  generate: Sparkles,
};

/** Existing i18n tooltip copy explains each stage in the timeline detail. */
const STEP_TIP: Record<StepId, string> = {
  extract: "tip_step1",
  index: "tip_step2",
  search: "tip_step3",
  rerank: "tip_step4",
  generate: "tip_step5",
};

/**
 * Rerank and generate are one long request each, with no progress from the
 * API. While they run, the timeline walks through what the step does inside,
 * paced by elapsed time: `starts` are the seconds at which each message
 * begins (copy: try-rag.<step>_phase_<n>). Past the last one, `loop` rotates
 * a set of explanations every `every` seconds (try-rag.<step>_loop_<n>), so a
 * long cold start never looks frozen.
 */
const PHASES: Partial<Record<StepId, { starts: number[]; loop?: { count: number; every: number } }>> = {
  rerank: { starts: [0, 3, 6, 10, 14, 19, 24, 30], loop: { count: 6, every: 8 } },
  generate: { starts: [0, 2, 6, 12], loop: { count: 3, every: 8 } },
};

/** i18n key of the message to show `elapsedMs` into a running step. */
function phaseKey(id: StepId, elapsedMs: number): string | null {
  const plan = PHASES[id];
  if (!plan) return null;
  const secs = elapsedMs / 1000;
  const last = plan.starts[plan.starts.length - 1];
  if (plan.loop && secs >= last + plan.loop.every) {
    const n = Math.floor((secs - last - plan.loop.every) / plan.loop.every) % plan.loop.count;
    return `${id}_loop_${n + 1}`;
  }
  let i = 0;
  while (i + 1 < plan.starts.length && secs >= plan.starts[i + 1]) i++;
  return `${id}_phase_${i + 1}`;
}

const freshRun = (): StepRun => ({ status: "pending", calls: [] });
const freshRuns = () =>
  Object.fromEntries(STEP_IDS.map((id) => [id, freshRun()])) as Record<StepId, StepRun>;

function formatDuration(ms: number) {
  return ms < 1000 ? `${Math.max(0, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Determinate progress bar with a label and percentage. */
function ProgressBar({ label, current, total }: { label: string; current: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-gray-500">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${ACCENT_GRADIENT}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
    </div>
  );
}

/** Status marker on the timeline rail. */
function StepDot({ status, icon: Icon }: { status: StepStatus; icon: LucideIcon }) {
  const base = "relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ring-4 ring-white";
  if (status === "running")
    return (
      <span className={`${base} bg-cyan-500 text-white`}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  if (status === "done")
    return (
      <span className={`${base} bg-emerald-500 text-white`}>
        <Check className="h-3 w-3" />
      </span>
    );
  if (status === "error")
    return (
      <span className={`${base} bg-red-500 text-white`}>
        <X className="h-3 w-3" />
      </span>
    );
  return (
    <span className={`${base} bg-gray-100 text-gray-400`}>
      <Icon className="h-3 w-3" />
    </span>
  );
}

/** Retrieved / reranked chunk with a relative relevance bar. */
function ChunkRow({ rank, text, score, share }: { rank: number; text: string; score: unknown; share: number }) {
  return (
    <li className="rounded-lg border border-gray-100 bg-white p-2.5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-semibold text-gray-400">#{rank}</span>
        <span className="flex items-center gap-2">
          <span className="h-1 w-14 overflow-hidden rounded-full bg-gray-100">
            <span className={`block h-full rounded-full bg-gradient-to-r ${ACCENT_GRADIENT}`} style={{ width: `${Math.max(4, share * 100)}%` }} />
          </span>
          <span className="font-mono text-[11px] tabular-nums text-gray-500">{formatScore(score)}</span>
        </span>
      </div>
      <p className="line-clamp-3 text-xs leading-relaxed text-gray-700">{text}</p>
    </li>
  );
}

const formatScore = (s: unknown) => (typeof s === "number" ? s.toFixed(3) : String(s ?? "–"));

/** Min–max normalised share of each score, for the relevance bars. */
function scoreShares(rows: any[]): number[] {
  const scores = rows.map((r) => (typeof r.score === "number" ? r.score : 0));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return scores.map((s) => (max > min ? (s - min) / (max - min) : 1));
}

type RunnerMode = "waiting" | "running" | "done" | "error";

const ROBLY_POSES: { mode: Exclude<RunnerMode, "error">; src: string }[] = [
  { mode: "waiting", src: "/robly-avatar/robly-standby.svg" },
  { mode: "running", src: "/robly-avatar/robly-running.svg" },
  { mode: "done", src: "/robly-avatar/robly-idle.svg" },
];

/**
 * Progress track at the top of the live pipeline panel: Robly runs along it to the
 * current step while the pipeline works, waits when it needs the visitor, and
 * rests at the finish once the answer is ready. All poses stay mounted and
 * cross-fade, so switching pose never flashes an image reload.
 */
function RunnerTrack({
  mode,
  position,
  steps,
  label,
  elapsed,
}: {
  mode: RunnerMode;
  position: number;
  steps: { id: string; name: string; status: StepStatus }[];
  label: string;
  elapsed: string;
}) {
  const pose = mode === "error" ? "waiting" : mode;
  const spring = { type: "spring" as const, stiffness: 60, damping: 18 };
  return (
    <div className="mx-3 mb-3 shrink-0 rounded-xl border border-gray-100 bg-gradient-to-b from-cyan-50/50 to-white px-4 pb-3 pt-1">
      <div className="relative mx-5 h-[76px]">
        {/* Track + fill */}
        <div className="absolute inset-x-0 bottom-3 h-1 rounded-full bg-gray-100" />
        <motion.div
          className={`absolute bottom-3 left-0 h-1 rounded-full bg-gradient-to-r ${ACCENT_GRADIENT}`}
          initial={false}
          animate={{ width: `${position * 100}%` }}
          transition={spring}
        />
        {/* One tick per step */}
        {steps.map((s, i) => (
          <span
            key={s.id}
            title={s.name}
            style={{ left: `${(i / (steps.length - 1)) * 100}%` }}
            className={`absolute bottom-[9px] h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-white ${
              s.status === "done"
                ? "bg-emerald-500"
                : s.status === "running"
                  ? "animate-pulse bg-cyan-500"
                  : s.status === "error"
                    ? "bg-red-500"
                    : "bg-gray-200"
            }`}
          />
        ))}
        {/* Robly */}
        <motion.div
          aria-hidden
          className="absolute bottom-1 h-[68px] w-[68px] -translate-x-1/2"
          initial={false}
          animate={{ left: `${position * 100}%` }}
          transition={spring}
        >
          {ROBLY_POSES.map(({ mode: m, src }) => (
            <img
              key={m}
              src={src}
              alt=""
              draggable={false}
              className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${pose === m ? "opacity-100" : "opacity-0"} ${
                mode === "error" ? "grayscale" : ""
              }`}
            />
          ))}
        </motion.div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <p
          key={label}
          aria-live="polite"
          className={`line-clamp-2 animate-in fade-in duration-300 ${mode === "error" ? "text-red-600" : "text-gray-600"}`}
        >
          {label}
        </p>
        {elapsed && <span className="shrink-0 font-mono tabular-nums text-gray-400">{elapsed}</span>}
      </div>
    </div>
  );
}

/** Small label/value tile inside a timeline detail. */
function Stat({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-0.5 truncate text-sm text-gray-900 ${mono ? "font-mono" : "font-semibold tabular-nums"}`}>{value}</p>
    </div>
  );
}

type Progress = { current: number; total: number } | null;
type DocStatus = "idle" | "processing" | "ready" | "error";

export default function TryRAG() {
  const { t, i18n } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("rag");
  const num = new Intl.NumberFormat(i18n.language);

  // Document
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docStatus, setDocStatus] = useState<DocStatus>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [namespace, setNamespace] = useState("");
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [uploadSkipped, setUploadSkipped] = useState(false); // namespace already existed
  const [extractProgress, setExtractProgress] = useState<Progress>(null);
  const [embedProgress, setEmbedProgress] = useState<Progress>(null);
  const [dragging, setDragging] = useState(false);

  // Question & answer
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [asking, setAsking] = useState(false);
  const [answerError, setAnswerError] = useState("");
  const [topResults, setTopResults] = useState<any[]>([]);
  const [rerankedResults, setRerankedResults] = useState<any[]>([]);
  const [hfAnswer, setHfAnswer] = useState("");
  const [gptAnswer, setGptAnswer] = useState("");

  // Live pipeline timeline
  const [runs, setRuns] = useState<Record<StepId, StepRun>>(freshRuns);
  const [selected, setSelected] = useState<StepId | null>(null);
  const [showAllSearch, setShowAllSearch] = useState(false);
  const [panelTab, setPanelTab] = useState<"pipeline" | "log">("pipeline");
  const [now, setNow] = useState(Date.now());
  // Follow the running step until the visitor picks one themselves.
  const followLive = useRef(true);

  const [serviceStatus, setServiceStatus] = useState<"checking" | "warm" | "warming" | "cold">("checking");
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const anyRunning = STEP_IDS.some((id) => runs[id].status === "running");

  // Live clock for the running step's duration.
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [anyRunning]);

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
    return false;
  };

  const ensureWarm = async (): Promise<boolean> => {
    if (serviceStatus === "warm") return true;
    return warmUpService();
  };

  // ── Timeline bookkeeping ───────────────────────────────────────────────────
  const patchRun = (id: StepId, patch: Partial<StepRun>) =>
    setRuns((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const beginStep = (id: StepId) => {
    patchRun(id, { status: "running", startedAt: Date.now(), endedAt: undefined, error: undefined, calls: [] });
    if (followLive.current) setSelected(id);
  };
  const endStep = (id: StepId) => patchRun(id, { status: "done", endedAt: Date.now() });
  const failStep = (id: StepId, error: string) => patchRun(id, { status: "error", endedAt: Date.now(), error });
  const logCall = (id: StepId, method: string, url: string, request: unknown, response: unknown) =>
    setRuns((r) => ({
      ...r,
      [id]: { ...r[id], calls: [...r[id].calls, { key: uuidv4(), at: Date.now(), method, url, request, response }] },
    }));

  const resetAnswer = () => {
    setAnswerError("");
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setShowAllSearch(false);
  };

  // ── 1) Document: extract in the browser, then check / upload / embed ───────
  const processDocument = async (file: File) => {
    trackStart();
    followLive.current = true;
    setPdfFile(file);
    setDocStatus("processing");
    setRuns(freshRuns());
    setSelected(null);
    resetAnswer();
    setAsked("");
    setExtractedText("");
    setPageCount(null);
    setNamespace("");
    setChunkCount(null);
    setUploadSkipped(false);
    setEmbedProgress(null);

    // Extract the text IN THE BROWSER (pdf.js) and hash it. Only the text is
    // sent to the backend, so PDF file size is irrelevant.
    beginStep("extract");
    setExtractProgress({ current: 0, total: 0 });
    let text: string;
    let ns: string;
    try {
      const out = await extractPdfText(file, (page, total) => setExtractProgress({ current: page, total }));
      text = out.text;
      setPageCount(out.pages);
      setExtractProgress(null);
      if (!text) {
        // No selectable text (likely a scanned PDF — no OCR here).
        failStep("extract", t("try-rag.no_text"));
        setDocStatus("error");
        return;
      }
      // Hash the extracted text — matches the backend's own text hash.
      ns = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(text)).toString(CryptoJS.enc.Hex).slice(0, 16);
      setNamespace(ns);
      setExtractedText(text);
      endStep("extract");
    } catch (error) {
      console.error("PDF text extraction error:", error);
      setExtractProgress(null);
      failStep("extract", t("try-rag.hash_error"));
      setDocStatus("error");
      return;
    }

    beginStep("index");
    if (!(await ensureWarm())) {
      failStep("index", t("try-rag.service_warm_failed"));
      setDocStatus("error");
      return;
    }
    // Start loading the rerank models now, fire-and-forget. Loading them on the
    // first /rag/rerank after a cold start took ~46 s; indexing and the first
    // question come first, so this usually finishes in time.
    void fetch(`${BASE_API}/rag/warmup`, { method: "POST" }).catch(() => {});

    try {
      const checkUrl = `${BASE_API}/rag/check-namespace`;
      const checkRes = await fetch(checkUrl, { method: "POST", body: new URLSearchParams({ namespace: ns }) });
      const checkJson = await checkRes.json();
      logCall("index", "POST", checkUrl, { namespace: ns }, checkJson);

      if (checkJson.data.exists) {
        // Already indexed under this hash → reuse it.
        setUploadSkipped(true);
        setChunkCount(checkJson.data.vector_count);
      } else {
        const uploadUrl = `${BASE_API}/rag/upload`;
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, namespace: ns }),
        });
        if (!res.ok) throw new Error(`Upload failed with HTTP ${res.status}`);
        const json = await res.json();
        logCall("index", "POST", uploadUrl, { namespace: ns, text: `${num.format(text.length)} chars` }, json);
        // Adopt the backend's authoritative namespace (it re-hashes the text).
        const nsFinal: string = json.data?.namespace || ns;
        setNamespace(nsFinal);
        const chunks: string[] = json.data.chunks;
        setChunkCount(json.data.n_chunks);

        // Embed in batches so the progress is real (one request per batch).
        // Ids are offset-based on the backend, so batches don't collide.
        const EMBED_BATCH = 200;
        const total = chunks.length;
        setEmbedProgress({ current: 0, total });
        const embedUrl = `${BASE_API}/rag/embed`;
        for (let offset = 0; offset < total; offset += EMBED_BATCH) {
          const batch = chunks.slice(offset, offset + EMBED_BATCH);
          const body = { namespace: nsFinal, chunks: batch, chunk_offset: offset, total_chunks: total };
          const eRes = await fetch(embedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const eJson = await eRes.json();
          logCall("index", "POST", embedUrl, { ...body, chunks: `${batch.length} chunks` }, eJson);
          // Whole document already indexed → the first batch returns done.
          if (offset === 0 && eJson.data?.done && eJson.data?.indexed >= total) break;
          setEmbedProgress({ current: Math.min(offset + batch.length, total), total });
        }
        setEmbedProgress(null);
        setChunkCount(total);
      }
      endStep("index");
      setDocStatus("ready");
      requestAnimationFrame(() => queryInputRef.current?.focus());
    } catch (error) {
      console.error("Indexing error:", error);
      setEmbedProgress(null);
      failStep("index", t("try-rag.process_error"));
      setDocStatus("error");
    }
  };

  const pickFile = (file: File | null | undefined) => {
    if (!file || file.type !== "application/pdf" || docStatus === "processing" || asking) return;
    void processDocument(file);
  };

  // ── 2) Question: search → rerank → generate, automatically ────────────────
  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || docStatus !== "ready" || asking) return;
    followLive.current = true;
    setAsked(question);
    setQuery("");
    resetAnswer();
    setAsking(true);
    setRuns((r) => ({ ...r, search: freshRun(), rerank: freshRun(), generate: freshRun() }));

    let current: StepId = "search";
    try {
      beginStep("search");
      const queryUrl = `${BASE_API}/rag/query`;
      const formData = new FormData();
      formData.append("question", question);
      formData.append("namespace", namespace);
      const qRes = await fetch(queryUrl, { method: "POST", body: formData });
      const qJson = await qRes.json();
      logCall("search", "POST", queryUrl, { question, namespace }, qJson);
      const top: any[] = qJson.data?.results;
      if (!Array.isArray(top)) throw new Error("bad search response");
      setTopResults(top);
      endStep("search");

      current = "rerank";
      beginStep("rerank");
      const rerankUrl = `${BASE_API}/rag/rerank`;
      const rRes = await fetch(rerankUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, top_results: top }),
      });
      const rJson = await rRes.json();
      logCall("rerank", "POST", rerankUrl, { question, top_results: `${top.length} candidates` }, rJson);
      if (rJson.status !== "success" || !rJson.data?.reranked) throw new Error(t("try-rag.rerank_error"));
      const reranked: any[] = rJson.data.reranked;
      setRerankedResults(reranked);
      endStep("rerank");

      current = "generate";
      beginStep("generate");
      const genUrl = `${BASE_API}/rag/generate`;
      const gRes = await fetch(genUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, reranked }),
      });
      const gJson = await gRes.json();
      logCall("generate", "POST", genUrl, { question, reranked: `${reranked.length} passages` }, gJson);
      // Response shape is { gpt: {llm_request, llm_response}, llama: {...} };
      // fall back to the old plain-string shape.
      const pickAnswer = (v: any) => (v && typeof v === "object" ? v.llm_response : v);
      setHfAnswer(pickAnswer(gJson.data?.llama) || "");
      setGptAnswer(pickAnswer(gJson.data?.gpt) || "");
      endStep("generate");
      trackComplete();
    } catch (error) {
      console.error(`RAG ${current} error:`, error);
      const message = error instanceof Error && error.message === t("try-rag.rerank_error")
        ? error.message
        : t("try-rag.process_error");
      failStep(current, message);
      setAnswerError(message);
    } finally {
      setAsking(false);
    }
  };

  // ── Derived view state ─────────────────────────────────────────────────────
  const hasAnswer = !!(gptAnswer || hfAnswer);
  const runningStep = STEP_IDS.find((id) => runs[id].status === "running");

  const status: { tone: StatusTone; label: string; spinning?: boolean } =
    serviceStatus === "warming" ? { tone: "busy", label: t("try-rag.status_warming"), spinning: true }
    : serviceStatus === "checking" ? { tone: "idle", label: t("try-rag.status_checking"), spinning: true }
    : serviceStatus === "cold" ? { tone: "busy", label: t("try-rag.status_cold") }
    : { tone: "ready", label: t("try-rag.status_ready") };

  /** One-line summary under each timeline step. */
  /**
   * One-line summary of a step. The pipeline panel uses the short phase copy
   * (`<key>_short`); the chat passes `long` for the full explanation.
   */
  const stepSummary = (id: StepId, long = false): string => {
    const phase = (key: string | null) => `try-rag.${key}${long ? "" : "_short"}`;
    const run = runs[id];
    if (run.status === "error") return run.error || t("try-rag.process_error");
    if (run.status === "pending") return t(`try-rag.step_${id}_desc`);
    switch (id) {
      case "extract":
        if (run.status === "running")
          return extractProgress?.total
            ? t("try-rag.sum_extract_progress", { current: extractProgress.current, total: extractProgress.total })
            : t("try-rag.progress_extract_start");
        return t("try-rag.sum_extract", { pages: num.format(pageCount ?? 0), chars: num.format(extractedText.length) });
      case "index":
        if (run.status === "running") {
          if (serviceStatus === "warming") return t("try-rag.sum_warming");
          if (embedProgress) return t("try-rag.sum_index_progress", { current: embedProgress.current, total: embedProgress.total });
          return t("try-rag.sum_index_checking");
        }
        return uploadSkipped
          ? t("try-rag.sum_index_reused", { count: chunkCount ?? 0 })
          : t("try-rag.sum_index_new", { count: chunkCount ?? 0 });
      case "search":
        return run.status === "running" ? t("try-rag.thinking_search") : t("try-rag.sum_search", { count: topResults.length });
      case "rerank":
        return run.status === "running"
          ? t(phase(phaseKey("rerank", now - (run.startedAt ?? now))), { count: topResults.length })
          : t("try-rag.sum_rerank", { count: rerankedResults.length });
      case "generate":
        return run.status === "running"
          ? t(phase(phaseKey("generate", now - (run.startedAt ?? now))), { count: rerankedResults.length })
          : t("try-rag.sum_generate");
    }
  };

  const stepDuration = (run: StepRun) =>
    run.startedAt ? formatDuration((run.endedAt ?? now) - run.startedAt) : "";

  // Runner track: where Robly stands, which pose, what it says.
  const doneCount = (() => {
    let n = 0;
    while (n < STEP_IDS.length && runs[STEP_IDS[n]].status === "done") n++;
    return n;
  })();
  const runningIndex = runningStep ? STEP_IDS.indexOf(runningStep) : -1;
  const failedStep = STEP_IDS.find((id) => runs[id].status === "error");
  const runnerMode: RunnerMode = failedStep
    ? "error"
    : runningStep
      ? "running"
      : doneCount === STEP_IDS.length
        ? "done"
        : "waiting";
  // Ticks sit at 0%…100% (first step at the start, last at the end): Robly stands on
  // the running step, or on the next one to run; reaching the last step fills the track.
  const lastIndex = STEP_IDS.length - 1;
  const failedIndex = failedStep ? STEP_IDS.indexOf(failedStep) : -1;
  const runnerPosition =
    (runningIndex >= 0 ? runningIndex : failedIndex >= 0 ? failedIndex : Math.min(doneCount, lastIndex)) / lastIndex;
  // Time of the current run: the question pipeline once asked, else the document one.
  const runGroup: StepId[] = runs.search.startedAt ? ["search", "rerank", "generate"] : ["extract", "index"];
  const runStart = Math.min(...runGroup.map((id) => runs[id].startedAt ?? Infinity));
  const runEnd = runningStep ? now : Math.max(...runGroup.map((id) => runs[id].endedAt ?? 0));
  const runnerElapsed = Number.isFinite(runStart) && runEnd >= runStart ? formatDuration(runEnd - runStart) : "";
  const runnerLabel =
    runnerMode === "error"
      ? runs[failedStep!].error || t("try-rag.process_error")
      : runnerMode === "running"
        ? stepSummary(runningStep!)
        : runnerMode === "done"
          ? t("try-rag.runner_done")
          : docStatus === "ready"
            ? t("try-rag.runner_waiting_question")
            : t("try-rag.runner_waiting_pdf");

  const allCalls = STEP_IDS.flatMap((id) => runs[id].calls.map((c) => ({ ...c, step: id }))).sort((a, b) => b.at - a.at);

  // The panel header shows the full status pill only while tabs + pill fit on
  // one line (the API log counter adds width after the first request); when
  // they don't, the pill collapses to its dot instead of wrapping the tabs.
  const panelHeaderRef = useRef<HTMLDivElement | null>(null);
  const panelTabsRef = useRef<HTMLDivElement | null>(null);
  const pillMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [compactPill, setCompactPill] = useState(false);
  useLayoutEffect(() => {
    const header = panelHeaderRef.current;
    if (!header) return;
    const fit = () => {
      const needed = (panelTabsRef.current?.scrollWidth ?? 0) + (pillMeasureRef.current?.offsetWidth ?? 0) + 40; // paddings + gap
      setCompactPill(header.clientWidth < needed);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(header);
    return () => ro.disconnect();
  }, [allCalls.length, status.label]);

  const selectStep = (id: StepId) => {
    followLive.current = false;
    setSelected((s) => (s === id ? null : id));
  };

  /** Expanded detail of a timeline step: what it did, its data and its API calls. */
  const renderStepDetail = (id: StepId) => {
    const run = runs[id];
    if (run.status === "pending") {
      return <p className="text-xs leading-relaxed text-gray-500">{t("try-rag.step_not_run")}</p>;
    }
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-gray-500">{t(`try-rag.${STEP_TIP[id]}`)}</p>

        {run.status === "error" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{run.error}</p>
        )}

        {id === "extract" && (
          <>
            {extractProgress && extractProgress.total > 0 && (
              <ProgressBar
                label={t("try-rag.sum_extract_progress", { current: extractProgress.current, total: extractProgress.total })}
                current={extractProgress.current}
                total={extractProgress.total}
              />
            )}
            {namespace && (
              <div className="grid grid-cols-3 gap-2">
                <Stat label={t("try-rag.stat_pages")} value={num.format(pageCount ?? 0)} />
                <Stat label={t("try-rag.stat_chars")} value={num.format(extractedText.length)} />
                <Stat label={t("try-rag.stat_namespace")} value={namespace} mono />
              </div>
            )}
            {extractedText && (
              <details className="group rounded-lg ring-1 ring-gray-100">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900">
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                  {t("try-rag.extracted_label")}
                </summary>
                <pre className="mx-3 mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-2.5 font-mono text-[11px] leading-relaxed text-gray-600">
                  {extractedText}
                </pre>
              </details>
            )}
          </>
        )}

        {id === "index" && (
          <>
            {embedProgress && (
              <ProgressBar
                label={t("try-rag.sum_index_progress", { current: embedProgress.current, total: embedProgress.total })}
                current={embedProgress.current}
                total={embedProgress.total || 1}
              />
            )}
            {run.status === "done" && (
              <div className="grid grid-cols-2 gap-2">
                <Stat label={t("try-rag.stat_chunks")} value={num.format(chunkCount ?? 0)} />
                <Stat label={t("try-rag.stat_mode")} value={uploadSkipped ? t("try-rag.mode_reused") : t("try-rag.mode_new")} />
              </div>
            )}
          </>
        )}

        {id === "search" && topResults.length > 0 && (
          <>
            <ol className="space-y-1.5">
              {(() => {
                const shares = scoreShares(topResults);
                const rows = showAllSearch ? topResults : topResults.slice(0, 8);
                return rows.map((r, i) => <ChunkRow key={i} rank={i + 1} text={r.text} score={r.score} share={shares[i]} />);
              })()}
            </ol>
            {topResults.length > 8 && !showAllSearch && (
              <button
                type="button"
                onClick={() => setShowAllSearch(true)}
                className="text-xs font-medium text-cyan-700 hover:underline"
              >
                {t("try-rag.show_all", { count: topResults.length })}
              </button>
            )}
          </>
        )}

        {id === "rerank" && rerankedResults.length > 0 && (
          <ol className="space-y-1.5">
            {(() => {
              const shares = scoreShares(rerankedResults);
              return rerankedResults.map((r, i) => <ChunkRow key={i} rank={i + 1} text={r.text} score={r.score} share={shares[i]} />);
            })()}
          </ol>
        )}

        {run.calls.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {t("try-rag.detail_calls")} · {run.calls.length}
            </p>
            <div className="space-y-1.5">
              {run.calls.map((call) => (
                <details key={call.key} className="group rounded-lg ring-1 ring-gray-100">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{call.method}</span>
                    <span className="truncate font-mono text-cyan-700">{call.url.replace(BASE_API, "")}</span>
                  </summary>
                  <div className="space-y-2 px-3 pb-3">
                    {call.request !== undefined && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("try-rag.detail_request")}</p>
                        <JsonHighlight data={call.request} />
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("try-rag.detail_response")}</p>
                      <JsonHighlight data={call.response} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">

        {/* Header: pitch + how it works (left), business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <Database className="h-6 w-6" />
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full ${BADGE_BG} px-3 py-1 text-xs font-semibold ${BADGE_TEXT}`}>
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${BADGE_DOT}`} />
                {t("try-rag.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-rag.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-rag.description")}
            </p>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-rag.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-rag.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-rag.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {[
                { icon: ShieldCheck, key: "trust_private" },
                { icon: ArrowUpDown, key: "trust_rerank" },
                { icon: Quote, key: "trust_sources" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t(`try-rag.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="rag" variant="aside" />
          </div>
        </div>

        {/* ── Workspace: ask your PDF (left) · live pipeline (right) ─── */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Cold-start notice */}
          {(serviceStatus === "cold" || serviceStatus === "warming") && docStatus !== "ready" && (
            <div className="flex items-start gap-2 rounded-t-2xl border-b border-amber-100 bg-amber-50/70 px-5 py-2.5 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>{serviceStatus === "warming" ? t("try-rag.service_warming") : t("try-rag.service_cold_hint")}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            id="rag-pdf-input"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <div className="grid grid-cols-1 lg:h-[680px] lg:grid-cols-5">

            {/* ── Left: document · conversation · question ─────────────────── */}
            <div
              className="flex min-h-0 min-w-0 flex-col lg:col-span-3 lg:border-r lg:border-gray-100"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              {/* Header: same height as the tab bar on the right, so both columns line up */}
              <div className="flex h-[51px] shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MessageSquareText className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t("try-rag.chat_title")}
                </h2>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="hidden sm:inline">{t("try-rag.chat_models")}</span>
                  <span className="rounded-md bg-gray-900 px-1.5 py-0.5 font-semibold text-white">GPT-4</span>
                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-700">Llama</span>
                </span>
              </div>

              {/* Document bar */}
              <div className="border-b border-gray-100 p-4">
                {!pdfFile ? (
                  <label
                    htmlFor="rag-pdf-input"
                    className={`group flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-all ${
                      dragging ? "border-cyan-400 bg-cyan-50/60" : "border-gray-200 hover:border-cyan-400 hover:bg-cyan-50/40"
                    }`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                      <Upload className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{t("try-rag.dropzone_idle")}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{t("try-rag.dropzone_hint")}</span>
                    </span>
                  </label>
                ) : (
                  <div className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${dragging ? "bg-cyan-50 ring-2 ring-cyan-200" : ""}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-gray-200">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{pdfFile.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
                        {docStatus === "processing" && (
                          <>
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-500" />
                            {runningStep ? stepSummary(runningStep) : t("try-rag.progress_extract_start")}
                          </>
                        )}
                        {docStatus === "ready" &&
                          t("try-rag.doc_meta", { pages: num.format(pageCount ?? 0), chunks: num.format(chunkCount ?? 0) })}
                        {docStatus === "error" && <span className="text-red-600">{runs.index.error || runs.extract.error}</span>}
                      </p>
                    </div>
                    {docStatus === "ready" && (
                      <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 sm:inline-flex">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("try-rag.doc_ready")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={docStatus === "processing" || asking}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50 disabled:opacity-40"
                    >
                      {t("try-rag.doc_change")}
                    </button>
                  </div>
                )}
              </div>

              {/* Conversation */}
              <div className="min-h-[320px] flex-1 overflow-y-auto px-5 py-6 lg:min-h-0">
                {!asked ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${BADGE_BG}`}>
                      {docStatus === "processing" ? (
                        <Loader2 className={`h-6 w-6 animate-spin ${ACCENT_TEXT}`} />
                      ) : (
                        <BookOpen className={`h-6 w-6 ${ACCENT_TEXT}`} />
                      )}
                    </span>
                    <p className="mt-4 text-base font-semibold text-gray-900">{t("try-rag.empty_title")}</p>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      {docStatus === "ready"
                        ? t("try-rag.empty_ready")
                        : docStatus === "processing"
                          ? t("try-rag.empty_processing")
                          : t("try-rag.empty_idle")}
                    </p>
                    {docStatus === "ready" && (
                      <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
                        {[1, 2, 3].map((n) => {
                          const s = t(`try-rag.suggestion_${n}`);
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => ask(s)}
                              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs text-gray-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* The question */}
                    <div className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 px-4 py-2.5 text-sm text-white">{asked}</p>
                    </div>

                    {/* In progress: what is happening right now */}
                    {asking && (
                      <div className="space-y-3">
                        <p className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className={`h-4 w-4 animate-spin ${ACCENT_TEXT}`} />
                          {runningStep ? stepSummary(runningStep, true) : t("try-rag.thinking_search")}
                        </p>
                        <div className="animate-pulse space-y-2 rounded-xl border border-gray-100 p-4">
                          <div className="h-2.5 rounded bg-gray-100" />
                          <div className="h-2.5 rounded bg-gray-100" />
                          <div className="h-2.5 w-2/3 rounded bg-gray-100" />
                        </div>
                      </div>
                    )}

                    {answerError && !asking && (
                      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{answerError}</p>
                    )}

                    {/* The answer: both models + the sources they used */}
                    {hasAnswer && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        {[
                          { model: "GPT-4", answer: gptAnswer, chip: "bg-gray-900 text-white" },
                          { model: "Llama", answer: hfAnswer, chip: "bg-blue-100 text-blue-700" },
                        ].map(({ model, answer, chip }) => (
                          <div key={model} className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${chip}`}>{model}</span>
                            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-800">{answer || "–"}</p>
                          </div>
                        ))}

                        {rerankedResults.length > 0 && (
                          <div className="pt-1">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                <Quote className="h-3.5 w-3.5" />
                                {t("try-rag.sources_title")}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  followLive.current = false;
                                  setSelected("rerank");
                                  setPanelTab("pipeline");
                                }}
                                className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
                              >
                                {t("try-rag.sources_how")}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <ol className="space-y-2">
                              {rerankedResults.slice(0, 3).map((r, i) => (
                                <li key={i} className="flex gap-2.5 rounded-lg bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">
                                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${BADGE_BG} font-mono text-[10px] font-bold ${BADGE_TEXT}`}>
                                    {i + 1}
                                  </span>
                                  <span className="line-clamp-3">{r.text}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Question box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(query);
                }}
                className="border-t border-gray-100 p-4"
              >
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1.5 pl-4 shadow-sm focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                  <input
                    ref={queryInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={docStatus !== "ready"}
                    placeholder={
                      docStatus === "ready"
                        ? t("try-rag.query_placeholder")
                        : docStatus === "processing"
                          ? t("try-rag.input_processing")
                          : t("try-rag.input_idle")
                    }
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={docStatus !== "ready" || asking || !query.trim()}
                    aria-label={t("try-rag.send")}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm transition hover:brightness-105 disabled:opacity-40`}
                  >
                    {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Right: live pipeline ────────────────────────────────────── */}
            <div className="flex min-h-0 min-w-0 flex-col border-t border-gray-100 lg:col-span-2 lg:border-t-0">
              <div ref={panelHeaderRef} className="relative flex items-center justify-between gap-3 border-b border-gray-100 pl-3 pr-4 pt-2">
                <div ref={panelTabsRef} role="tablist" className="flex min-w-0 gap-1">
                  {([
                    { id: "pipeline", icon: Activity, label: t("try-rag.bts_title") },
                    { id: "log", icon: Terminal, label: t("try-rag.tab_log"), count: allCalls.length },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      type="button"
                      aria-selected={panelTab === tab.id}
                      onClick={() => setPanelTab(tab.id)}
                      className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                        panelTab === tab.id ? "border-cyan-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <tab.icon className={`h-4 w-4 ${panelTab === tab.id ? ACCENT_TEXT : ""}`} />
                      {tab.label}
                      {"count" in tab && tab.count > 0 && (
                        <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold tabular-nums text-gray-600">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {/* Invisible copy of the full pill, only to measure its width. */}
                <span ref={pillMeasureRef} aria-hidden className="pointer-events-none invisible absolute">
                  <StatusPill tone={status.tone} spinning={status.spinning} label={status.label} />
                </span>
                {!compactPill ? (
                  <div className="mb-2 shrink-0">
                    <StatusPill tone={status.tone} spinning={status.spinning} label={status.label} />
                  </div>
                ) : (
                <span
                  role="status"
                  title={status.label}
                  aria-label={status.label}
                  className="mb-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200"
                >
                  {status.spinning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  ) : (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        status.tone === "ready" ? "bg-emerald-500" : status.tone === "busy" ? "bg-amber-500" : status.tone === "error" ? "bg-red-500" : "bg-gray-400"
                      }`}
                    />
                  )}
                </span>
                )}
              </div>

              <div className="flex max-h-[640px] flex-col overflow-y-auto px-2 py-3 lg:max-h-none lg:min-h-0 lg:flex-1">
                {panelTab === "pipeline" ? (
                  <>
                    <p className="mb-2 px-3 text-xs text-gray-500">{t("try-rag.bts_subtitle")}</p>
                    <RunnerTrack
                      mode={runnerMode}
                      position={runnerPosition}
                      steps={STEP_IDS.map((id) => ({ id, name: t(`try-rag.step_${id}`), status: runs[id].status }))}
                      label={runnerLabel}
                      elapsed={runnerElapsed}
                    />
                    <ol className="relative flex flex-col before:absolute before:bottom-6 before:left-[23px] before:top-6 before:w-px before:bg-gray-200 lg:gap-4">
                      {STEP_IDS.map((id) => {
                        const run = runs[id];
                        const open = selected === id;
                        return (
                          <li key={id} className="relative">
                            <button
                              type="button"
                              onClick={() => selectStep(id)}
                              aria-expanded={open}
                              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                open ? "bg-gray-50" : "hover:bg-gray-50/70"
                              }`}
                            >
                              <StepDot status={run.status} icon={STEP_ICONS[id]} />
                              <span className="min-w-0 flex-1">
                                <span className={`block text-sm font-medium ${run.status === "pending" ? "text-gray-500" : "text-gray-900"}`}>
                                  {t(`try-rag.step_${id}`)}
                                </span>
                                <span
                                  key={run.status === "running" ? stepSummary(id) : undefined}
                                  className={`mt-0.5 block text-xs ${
                                    run.status === "error"
                                      ? "text-red-600"
                                      : run.status === "running"
                                        ? "animate-in fade-in duration-300 text-cyan-700"
                                        : "truncate text-gray-500"
                                  }`}
                                >
                                  {stepSummary(id)}
                                </span>
                              </span>
                              <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                                <span className="font-mono text-[11px] tabular-nums text-gray-400">{stepDuration(run)}</span>
                                <ChevronRight className={`h-3.5 w-3.5 text-gray-300 transition-transform ${open ? "rotate-90" : ""}`} />
                              </span>
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
                                  <div className="relative z-10 mb-2 ml-[46px] mr-3 mt-1">{renderStepDetail(id)}</div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : allCalls.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-28 w-28 opacity-60" />
                    <p className="text-sm font-semibold text-gray-600">{t("try-rag.log_empty_title")}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-rag.log_empty")}</p>
                  </div>
                ) : (
                  <ol className="space-y-4 px-3">
                    {allCalls.map((call) => (
                      <li key={call.key}>
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                            {t(`try-rag.step_${call.step}`)}
                          </span>
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{call.method}</span>
                          <span className="break-all font-mono text-xs text-cyan-700">{call.url.replace(BASE_API, "")}</span>
                        </div>
                        {call.request !== undefined && (
                          <div className="mb-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("try-rag.detail_request")}</p>
                            <JsonHighlight data={call.request} />
                          </div>
                        )}
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("try-rag.detail_response")}</p>
                        <JsonHighlight data={call.response} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </section>

        <SavingsCalculator demoId="rag" />

        {/* ── How it works: overview (business) and technical architecture ── */}
        <HowItWorks
          theme={{
            gradient: ACCENT_GRADIENT,
            text: ACCENT_TEXT,
            soft: BADGE_BG,
            activeTab: "border-cyan-400 bg-cyan-50/60 ring-2 ring-cyan-100",
            notice: "bg-cyan-50/70 text-cyan-900",
          }}
          labels={{
            title: t("try-rag.tech_title"),
            subtitle: t("try-rag.tech_subtitle"),
            overviewTitle: t("try-rag.how_simple_title"),
            overviewSubtitle: t("try-rag.how_simple_subtitle"),
            techTitle: t("try-rag.how_tech_title"),
            techSubtitle: t("try-rag.how_tech_subtitle"),
          }}
          steps={[
            { icon: Upload, title: t("try-rag.how_simple_1_title"), desc: t("try-rag.how_simple_1_desc") },
            { icon: Scissors, title: t("try-rag.how_simple_2_title"), desc: t("try-rag.how_simple_2_desc") },
            { icon: Search, title: t("try-rag.how_simple_3_title"), desc: t("try-rag.how_simple_3_desc") },
            { icon: Sparkles, title: t("try-rag.how_simple_4_title"), desc: t("try-rag.how_simple_4_desc") },
          ]}
          notice={t("try-rag.how_simple_privacy")}
          technical={
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TechCard icon={Workflow} title={t("try-rag.tech_flow_title")} iconClass={ACCENT_TEXT}>
                <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gray-200">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <li key={n} className="relative flex gap-3">
                      <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-[11px] font-bold text-white ring-4 ring-white`}>
                        {n}
                      </span>
                      <p className="text-sm leading-snug text-gray-600">{t(`try-rag.tech_flow_${n}`)}</p>
                    </li>
                  ))}
                </ol>
              </TechCard>

              <TechCard icon={Cpu} title={t("try-rag.tech_stack_title")} iconClass={ACCENT_TEXT}>
                <dl className="space-y-3">
                  {[
                    ["tech_stack_vectordb_label", "Pinecone"],
                    ["tech_stack_embed_label", "sentence-transformers"],
                    ["tech_stack_rerank_label", "MonoT5 → BGE"],
                    ["tech_stack_llm_label", "Llama + GPT-4"],
                    ["tech_stack_framework_label", "LangChain · FastAPI"],
                  ].map(([labelKey, value]) => (
                    <div key={labelKey} className="rounded-lg bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t(`try-rag.${labelKey}`)}</dt>
                      <dd className="mt-0.5 font-mono text-[13px] leading-snug text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </TechCard>

              <TechCard icon={ShieldCheck} title={t("try-rag.tech_privacy_title")} iconClass={ACCENT_TEXT}>
                <ul className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex gap-2.5 text-sm leading-snug text-gray-600">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${ACCENT_TEXT}`} />
                      {t(`try-rag.tech_privacy_${n}`)}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">{t("try-rag.tech_note")}</p>
              </TechCard>
            </div>
          }
        />
      </div>
    </div>
  );
}
