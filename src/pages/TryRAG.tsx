import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import {
  Database,
  Loader2,
  Search,
  ArrowUpDown,
  Sparkles,
  Upload,
  Info,
  Terminal,
  ChevronDown,
  Cpu,
  Workflow,
  FileText,
  CheckCircle2,
} from "lucide-react";
import CryptoJS from "crypto-js";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import * as pdfjsLib from "pdfjs-dist";
// Vite: load the pdf.js worker as a URL so text extraction runs off the main thread.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const getBaseApi = () => {
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
): Promise<string> {
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
  return pages.join("\n").trim();
}

/** Dependency-free info tooltip (hover + keyboard focus). */
function InfoTip({ text, label }: { text: string; label?: string }) {
  return (
    <span className="group/tip relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-label={label || text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-cyan-600 focus:text-cyan-600 focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-gray-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

/**
 * A numbered pipeline step card. Defined at module scope (NOT inside TryRAG) so
 * it isn't recreated on every render — otherwise React would remount its
 * children on each keystroke, stealing focus from inputs inside it.
 */
function StepCard({
  icon: Icon,
  number,
  title,
  tip,
  children,
}: {
  icon: React.ElementType;
  number: number;
  title: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-md"
    >
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-bold text-white">
          {number}
        </div>
        <Icon className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {tip && <InfoTip text={tip} />}
      </div>
      {children}
    </motion.section>
  );
}

/** Determinate progress bar with a label and percentage. */
function ProgressBar({ label, current, total }: { label: string; current: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" />
          {label}
        </span>
        <span className="font-mono tabular-nums text-gray-500">
          {current}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
    </div>
  );
}

type LogEntry = { url: string; method: string; response: any; key: string };
type Progress = { current: number; total: number } | null;

export default function TryRAG() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("rag");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [chunks, setChunks] = useState<string[]>([]);
  const [query, setQuery] = useState<string>("");
  const [topResults, setTopResults] = useState<any[]>([]);
  const [rerankedResults, setRerankedResults] = useState<any[]>([]);
  const [hfAnswer, setHfAnswer] = useState<string>("");
  const [gptAnswer, setGptAnswer] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<number | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [wasAlreadyIndexed, setWasAlreadyIndexed] = useState<boolean>(false);
  const [showStep2, setShowStep2] = useState<boolean>(false);
  const [namespace, setNamespace] = useState<string>("");
  const [queryHistory, setQueryHistory] = useState<LogEntry[]>([]);
  const [uploadSkipped, setUploadSkipped] = useState(false); // namespace already existed
  const [showTech, setShowTech] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "warm" | "warming" | "cold">("checking");
  const [extractProgress, setExtractProgress] = useState<Progress>(null); // PDF text extraction (pages)
  const [embedProgress, setEmbedProgress] = useState<Progress>(null); // embedding + indexing (chunk batches)

  const logCall = (url: string, method: string, response: any) =>
    setQueryHistory((prev) => [{ url, method, response, key: uuidv4() }, ...prev]);

  // Anchors for each step card, so advancing a step scrolls the next card into
  // view (e.g. "Ir a consulta" → the "Consultar al vector DB" card).
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    // Scroll to the card that becomes visible at the current step. Cards render
    // at step thresholds 4 (query), 6 (rerank), 8 (generate).
    const target = stepRefs.current[step];
    if (target) {
      // rAF: wait for the newly-rendered card to be in the DOM before scrolling.
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // On the query step, also focus the query input so the cursor lands
        // there ready to type (not just scrolled into view).
        if (step === 4) queryInputRef.current?.focus();
      });
    }
  }, [step]);

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

  const handleUpload = async () => {
    trackStart();
    if (!pdfFile) return;

    if (!(await ensureWarm())) {
      alert(t("try-rag.service_warm_failed"));
      return;
    }
    setChunks([]);
    setExtractedText("");
    setQuery("");
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setUploadSkipped(false);
    setExtractProgress({ current: 0, total: 0 });
    setLoading(1);

    // 1) Extract the PDF text IN THE BROWSER (pdf.js) and hash that text.
    //    Only the text is sent to the backend, so PDF file size is irrelevant.
    let text: string;
    let shortNamespace: string;
    try {
      text = await extractPdfText(pdfFile, (page, total) =>
        setExtractProgress({ current: page, total })
      );
      setExtractProgress(null);
      if (!text) {
        // No selectable text (likely a scanned PDF — no OCR here).
        alert(t("try-rag.no_text"));
        setExtractProgress(null);
        setLoading(null);
        return;
      }
      // Hash the extracted text — matches the backend's own text hash.
      shortNamespace = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(text))
        .toString(CryptoJS.enc.Hex)
        .slice(0, 16);
      setNamespace(shortNamespace);
      setExtractedText(text);
    } catch (error) {
      console.error("PDF text extraction error:", error);
      alert(t("try-rag.hash_error"));
      setExtractProgress(null);
      setLoading(null);
      return;
    }

    // Start loading the rerank models now, fire-and-forget. Loading them on the
    // first /rag/rerank after a cold start took ~46 s; the visitor goes through
    // embed + query first, so this usually finishes in time.
    void fetch(`${BASE_API}/rag/warmup`, { method: "POST" }).catch(() => {});

    // 2) Check if already indexed, then send the TEXT if new.
    try {
      const checkRes = await fetch(`${BASE_API}/rag/check-namespace`, {
        method: "POST",
        body: new URLSearchParams({ namespace: shortNamespace }),
      });
      const checkJson = await checkRes.json();
      logCall(`${BASE_API}/rag/check-namespace`, "POST", checkJson);
      setWasAlreadyIndexed(checkJson.data.exists);

      if (checkJson.data.exists) {
        // Already indexed under this hash → skip upload, jump to query step.
        setUploadSkipped(true);
        setChunkCount(checkJson.data.vector_count);
        setShowStep2(true);
        setStep(4);
        setLoading(null);
        return;
      }

      const res = await fetch(`${BASE_API}/rag/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, namespace: shortNamespace }),
      });
      if (!res.ok) {
        throw new Error(`Upload failed with HTTP ${res.status}`);
      }
      const json = await res.json();
      logCall(`${BASE_API}/rag/upload`, "POST", json);
      // Adopt the backend's authoritative namespace (it re-hashes the text).
      if (json.data?.namespace) setNamespace(json.data.namespace);
      // Keep the browser-extracted text shown; use the backend's chunks.
      setChunks(json.data.chunks);
      setChunkCount(json.data.n_chunks);
      setShowStep2(true);
      setStep(2);
      setLoading(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert(t("try-rag.process_error"));
      setLoading(null);
    }
  };

  const handleEmbedAndIndex = async () => {
    if (!namespace) return;
    setQuery("");
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setLoading(3);

    // Send chunks to the backend in batches so we can show REAL progress
    // (each batch is one request). Ids are offset-based on the backend, so the
    // batches don't collide, and the skip/eviction bookkeeping only runs on the
    // first batch (chunk_offset 0).
    const EMBED_BATCH = 200;
    const total = chunks.length;
    setEmbedProgress({ current: 0, total });

    try {
      for (let offset = 0; offset < total; offset += EMBED_BATCH) {
        const batch = chunks.slice(offset, offset + EMBED_BATCH);
        const res = await fetch(`${BASE_API}/rag/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namespace,
            chunks: batch,
            chunk_offset: offset,
            total_chunks: total,
          }),
        });
        const json = await res.json();
        logCall(`${BASE_API}/rag/embed`, "POST", json);

        // If the whole document was already indexed, the first batch returns
        // done=true immediately — stop early.
        if (offset === 0 && json.data?.done && json.data?.indexed >= total) {
          setChunkCount(json.data.indexed);
          break;
        }
        setEmbedProgress({ current: Math.min(offset + batch.length, total), total });
      }
      setChunkCount(total);
    } catch (error) {
      console.error("Embedding error:", error);
      alert(t("try-rag.process_error"));
      setEmbedProgress(null);
      setLoading(null);
      return;
    }

    setEmbedProgress(null);
    setWasAlreadyIndexed(true);
    setStep(4);
    setLoading(null);
  };

  const handleQuery = async () => {
    if (!query || !namespace) return;
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setLoading(5);
    const formData = new FormData();
    formData.append("question", query);
    formData.append("namespace", namespace);
    const res = await fetch(`${BASE_API}/rag/query`, { method: "POST", body: formData });
    const json = await res.json();
    logCall(`${BASE_API}/rag/query`, "POST", json);
    setTopResults(json.data.results);
    setStep(6);
    setLoading(null);
  };

  const handleRerank = async () => {
    if (!namespace) return;
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setLoading(7);
    const res = await fetch(`${BASE_API}/rag/rerank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, top_results: topResults }),
    });
    const json = await res.json();
    logCall(`${BASE_API}/rag/rerank`, "POST", json);
    if (!(json.status == "success") || !json.data?.reranked) {
      alert(t("try-rag.rerank_error"));
      setLoading(null);
      return;
    }
    setRerankedResults(json.data.reranked);
    setStep(8);
    setLoading(null);
  };

  const handleGenerateAnswers = async () => {
    if (!namespace) return;
    setHfAnswer("");
    setGptAnswer("");
    setLoading(9);
    const res = await fetch(`${BASE_API}/rag/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, reranked: rerankedResults }),
    });
    const json = await res.json();
    logCall(`${BASE_API}/rag/generate`, "POST", json);
    // Response shape is now { gpt: {llm_request, llm_response}, llama: {...} }.
    // The full llm_request (model, hyperparameters, messages with roles) shows
    // in the API log above via logCall. Here we surface just the answer text.
    // Fall back to the old string shape for backward compatibility.
    const pickAnswer = (v: any) =>
      v && typeof v === "object" ? v.llm_response : v;
    setHfAnswer(pickAnswer(json.data.llama));
    setGptAnswer(pickAnswer(json.data.gpt));
    setStep(10);
    setLoading(null);
    trackComplete();
  };

  const renderButton = (
    action: () => void,
    label: string,
    stepNumber: number,
    disabled: boolean = false
  ) => (
    <Button
      onClick={action}
      disabled={disabled || loading !== null || serviceStatus === "warming"}
      className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 font-medium text-white shadow-sm hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50"
    >
      {loading === stepNumber || serviceStatus === "warming" ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : null}
      {serviceStatus === "warming" ? t("try-rag.service_warming").slice(0, 24) + "…" : label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 sm:h-24 sm:w-24">
              <Database className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                Live API demo
              </span>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">{t("try-rag.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">{t("try-rag.description")}</p>
            </div>
          </div>

          {/* Instructions / privacy note */}
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-xs text-cyan-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
            <p>{t("try-rag.instructions")}</p>
          </div>
        </div>

        <BusinessCase demoId="rag" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: pipeline steps */}
          <div className="min-w-0 space-y-6">
            {/* Service status banner */}
            {serviceStatus === "warm" && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("try-rag.service_ready")}
              </div>
            )}
            {(serviceStatus === "cold" || serviceStatus === "checking") && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>{t("try-rag.service_cold_hint")}</span>
              </div>
            )}
            {serviceStatus === "warming" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                <span>{t("try-rag.service_warming")}</span>
              </div>
            )}

            <StepCard icon={Upload} number={1} title={t("try-rag.step1_title")} tip={t("try-rag.tip_step1")}>
              <input
                id="rag-pdf-input"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="rag-pdf-input"
                className="group flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 p-4 transition-all hover:border-cyan-400 hover:bg-cyan-50/40"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200">
                  <FileText className="h-6 w-6 text-gray-400 transition-colors group-hover:text-cyan-500" />
                </div>
                <div className="min-w-0 flex-1">
                  {pdfFile ? (
                    <>
                      <p className="truncate text-sm font-medium text-gray-900">{pdfFile.name}</p>
                      <p className="mt-0.5 text-xs text-cyan-600">{t("try-rag.dropzone_change")}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">{t("try-rag.dropzone_idle")}</p>
                      <span className="mt-1 block text-xs text-gray-500">{t("try-rag.dropzone_hint")}</span>
                    </>
                  )}
                </div>
                {pdfFile && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
              </label>
              <div className="mt-3">{renderButton(handleUpload, t("try-rag.step1_button"), 1, !pdfFile)}</div>

              {extractProgress && (
                <ProgressBar
                  label={
                    extractProgress.total > 0
                      ? t("try-rag.progress_extract", {
                          current: extractProgress.current,
                          total: extractProgress.total,
                        })
                      : t("try-rag.progress_extract_start")
                  }
                  current={extractProgress.current}
                  total={extractProgress.total || 1}
                />
              )}

              {/* Hash / namespace info: show the computed hash and whether the
                  document is already indexed (upload skipped) or new. */}
              {namespace && step >= 2 && (
                <div
                  className={`mt-3 rounded-lg border p-3 text-xs ${
                    uploadSkipped ? "border-emerald-200 bg-emerald-50" : "border-cyan-200 bg-cyan-50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-gray-700">
                    <span className="text-gray-500">{t("try-rag.hash_label")}:</span>
                    <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-gray-900">{namespace}</code>
                  </div>
                  {uploadSkipped ? (
                    <p className="flex items-start gap-1.5 text-emerald-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {t("try-rag.hash_exists")}
                    </p>
                  ) : (
                    <p className="text-cyan-700">{t("try-rag.hash_new")}</p>
                  )}
                </div>
              )}

              {step >= 2 && (
                <>
                  {extractedText && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {t("try-rag.extracted_label")}
                        </span>
                        <InfoTip text={t("try-rag.tip_extracted")} />
                      </div>
                      <Textarea className="rounded-lg border-gray-300 text-sm" rows={4} value={extractedText} readOnly />
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-600">
                    {t("try-rag.chunks_extracted")}: <strong className="text-gray-900">{chunkCount ?? "…"}</strong>
                    {wasAlreadyIndexed && ` ${t("try-rag.already_indexed")}`}
                  </p>
                </>
              )}
            </StepCard>

            {showStep2 && (
              <StepCard icon={Database} number={2} title={t("try-rag.step2_title")} tip={t("try-rag.tip_step2")}>
                {!wasAlreadyIndexed ? (
                  <>
                    <p className="text-sm text-gray-600">{t("try-rag.step2_pending", { count: chunkCount ?? "?", namespace })}</p>
                    {renderButton(handleEmbedAndIndex, t("try-rag.step2_button"), 3)}
                    {embedProgress && (
                      <ProgressBar
                        label={t("try-rag.progress_embed", {
                          current: embedProgress.current,
                          total: embedProgress.total,
                        })}
                        current={embedProgress.current}
                        total={embedProgress.total || 1}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">{t("try-rag.step2_done", { count: chunkCount ?? "?" })}</p>
                )}
                {wasAlreadyIndexed && renderButton(() => setStep(4), t("try-rag.go_to_query"), 4)}
              </StepCard>
            )}

            {step >= 4 && (
              <div ref={(el) => (stepRefs.current[4] = el)}>
              <StepCard icon={Search} number={3} title={t("try-rag.step3_title")} tip={t("try-rag.tip_step3")}>
                <Input
                  ref={queryInputRef}
                  placeholder={t("try-rag.query_placeholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="rounded-lg border-gray-300"
                />
                {renderButton(handleQuery, t("try-rag.query_button"), 5, !query)}
                {topResults.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50">
                    <div className="border-b border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500">
                      {topResults.length} {t("try-rag.results_label")}
                    </div>
                    <ul className="max-h-64 list-disc space-y-1 overflow-y-auto p-3 pl-8 text-sm text-gray-700">
                      {topResults.map((r, i) => (
                        <li key={i}>
                          {r.text} ({t("try-rag.score_label")}: {r.score})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </StepCard>
              </div>
            )}

            {step >= 6 && (
              <div ref={(el) => (stepRefs.current[6] = el)}>
              <StepCard icon={ArrowUpDown} number={4} title={t("try-rag.step4_title")} tip={t("try-rag.tip_step4")}>
                {renderButton(handleRerank, t("try-rag.rerank_button"), 7)}
                {rerankedResults.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50">
                    <div className="border-b border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500">
                      {rerankedResults.length} {t("try-rag.results_label")}
                    </div>
                    <ul className="max-h-64 list-decimal space-y-1 overflow-y-auto p-3 pl-8 text-sm text-gray-700">
                      {rerankedResults.map((r, i) => (
                        <li key={i}>
                          {r.text} ({t("try-rag.score_label")}: {r.score})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </StepCard>
              </div>
            )}

            {step >= 8 && (
              <div ref={(el) => (stepRefs.current[8] = el)}>
              <StepCard icon={Sparkles} number={5} title={t("try-rag.step5_title")} tip={t("try-rag.tip_step5")}>
                {renderButton(handleGenerateAnswers, t("try-rag.generate_button"), 9)}
                <div className="space-y-2 text-sm">
                  {hfAnswer && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <strong className="text-blue-700">Llama:</strong> <span className="text-gray-700">{hfAnswer}</span>
                    </div>
                  )}
                  {gptAnswer && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <strong className="text-gray-900">GPT-4:</strong> <span className="text-gray-700">{gptAnswer}</span>
                    </div>
                  )}
                </div>
              </StepCard>
              </div>
            )}
          </div>

          {/* Right: API log */}
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <Terminal className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {t("try-rag.log")}
                  <InfoTip text={t("try-rag.log_subtitle")} />
                </h2>
                <p className="text-xs text-gray-400">{t("try-rag.log_subtitle")}</p>
              </div>
            </div>
            <div className="p-6">
              {queryHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-40 w-40 opacity-50" />
                  <p className="font-semibold text-gray-600 opacity-70">{t("try-rag.log_empty_title")}</p>
                  <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-rag.log_empty")}</p>
                </div>
              )}
              <LayoutGroup>
                <AnimatePresence initial={false}>
                  {queryHistory.map((entry) => (
                    <motion.div
                      key={entry.key}
                      layout
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          {entry.method}
                        </span>
                        <span className="break-all font-mono text-xs text-cyan-600">{entry.url}</span>
                      </div>
                      <JsonHighlight data={entry.response} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </div>
        </div>

        {/* Technical definition — collapsible */}
        <SavingsCalculator demoId="rag" />

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                <Cpu className="h-4 w-4 text-cyan-600" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{t("try-rag.tech_title")}</span>
                <span className="block text-xs text-gray-400">{t("try-rag.tech_subtitle")}</span>
              </span>
            </span>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showTech ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {showTech && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-6 border-t border-gray-100 px-6 py-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Workflow className="h-4 w-4 text-cyan-600" />
                      {t("try-rag.tech_flow_title")}
                    </h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <li key={n} className="flex gap-2">
                          <span className="font-semibold text-cyan-600">{n}.</span>
                          {t(`try-rag.tech_flow_${n}`)}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Cpu className="h-4 w-4 text-cyan-600" />
                      {t("try-rag.tech_stack_title")}
                    </h3>
                    <dl className="space-y-1.5 text-xs">
                      {[
                        ["tech_stack_vectordb_label", "Pinecone"],
                        ["tech_stack_embed_label", "sentence-transformers"],
                        ["tech_stack_rerank_label", "MonoT5 → BGE"],
                        ["tech_stack_llm_label", "Llama + GPT-4"],
                        ["tech_stack_framework_label", "LangChain · FastAPI"],
                      ].map(([labelKey, value], i, arr) => (
                        <div
                          key={labelKey}
                          className={`flex justify-between gap-2 ${i < arr.length - 1 ? "border-b border-gray-100 pb-1.5" : ""}`}
                        >
                          <dt className="text-gray-500">{t(`try-rag.${labelKey}`)}</dt>
                          <dd className="text-right font-medium text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t("try-rag.tech_note")}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
