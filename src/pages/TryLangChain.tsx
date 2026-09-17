import { useEffect, useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import {
  Bot,
  Loader2,
  Info,
  Terminal,
  ChevronDown,
  Cpu,
  Workflow,
  Upload,
  Send,
  RefreshCw,
  Wrench,
  FileJson,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { StepCard } from "@/components/demo/StepCard";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

// Brand accent (amber/orange) — matches the LangChain demo card in the catalog.
const ACCENT_GRADIENT = "from-amber-500 to-orange-600";
const ACCENT_TEXT = "text-orange-600";
const TIP_HOVER = "hover:text-orange-600 focus:text-orange-600";

type Mode = "rag" | "tools" | "json";
type LogEntry = { url: string; method: string; response: any; key: string };

export default function TryLangChain() {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [mode, setMode] = useState<Mode>("rag");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Uploaded/ingested docs for RAG mode.
  const [uploading, setUploading] = useState(false);
  const [ingested, setIngested] = useState<string[]>([]);

  const [queryHistory, setQueryHistory] = useState<LogEntry[]>([]);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "warm" | "warming" | "cold">("checking");
  const [showTech, setShowTech] = useState(false);

  const logCall = (url: string, method: string, response: any) =>
    setQueryHistory((prev) => [{ url, method, response, key: uuidv4() }, ...prev]);

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

  function startNewSession() {
    setSessionId(uuidv4());
    setIngested([]);
    setAnswer("");
    setQueryHistory([]);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    if (!(await ensureWarm())) {
      alert(t("try-langchain.service_warm_failed"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));

      const uploadUrl = `${BASE_API}/upload`;
      const saved = await fetch(uploadUrl, { method: "POST", body: fd }).then((r) => r.json());
      logCall(uploadUrl, "POST", saved);

      const ingestUrl = `${BASE_API}/ingest`;
      const ingestBody = { files: saved.saved, session_id: sessionId };
      const ingestResp = await fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ingestBody),
      }).then((r) => r.json());
      logCall(ingestUrl, "POST", ingestResp);

      setIngested((prev) => [...prev, ...(saved.saved || [])]);
    } catch {
      logCall(`${BASE_API}/upload`, "POST", { error: t("try-langchain.upload_error") });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSend() {
    if (!question.trim() || loading) return;
    if (!(await ensureWarm())) {
      alert(t("try-langchain.service_warm_failed"));
      return;
    }
    setLoading(true);
    setAnswer("");

    const url =
      mode === "rag" ? `${BASE_API}/chat` : mode === "tools" ? `${BASE_API}/agent` : `${BASE_API}/json`;
    const body =
      mode === "rag"
        ? { session_id: sessionId, question }
        : mode === "tools"
          ? { mode: "tools", input: question }
          : { query: question };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);

      // The backend returns { error: { code, message } } on failure. Surface the
      // real reason (bad LLM key, quota, etc.) instead of a generic message.
      if (!res.ok || (json && json.error)) {
        const backendMsg = json?.error?.message || json?.detail || `HTTP ${res.status}`;
        logCall(url, "POST", json ?? { error: backendMsg });
        setAnswer(backendMsg);
        return;
      }

      logCall(url, "POST", json);
      setAnswer(mode === "json" ? JSON.stringify(json, null, 2) : json.answer);
    } catch {
      // Only true network failures land here (service unreachable / cold start).
      logCall(url, "POST", { error: t("try-langchain.network_error") });
      setAnswer(t("try-langchain.network_error"));
    } finally {
      setLoading(false);
    }
  }

  const MODES: { id: Mode; icon: React.ElementType; label: string; tip: string }[] = [
    { id: "rag", icon: MessageSquare, label: t("try-langchain.mode_rag"), tip: t("try-langchain.tip_mode_rag") },
    { id: "tools", icon: Wrench, label: t("try-langchain.mode_tools"), tip: t("try-langchain.tip_mode_tools") },
    { id: "json", icon: FileJson, label: t("try-langchain.mode_json"), tip: t("try-langchain.tip_mode_json") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left sm:gap-5">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm sm:h-24 sm:w-24`}
            >
              <Bot className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="mb-2 inline-flex w-fit items-center gap-1.5 self-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 sm:self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {t("try-langchain.badge")}
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
                {t("try-langchain.title")}
              </h1>
              <p className="text-sm text-gray-600 sm:text-base">{t("try-langchain.description")}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-orange-50/70 px-4 py-3 text-sm text-orange-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <p>{t("try-langchain.instructions")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: interaction */}
          <div className="min-w-0 space-y-6">
            {/* Service status banner */}
            {serviceStatus === "warm" && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("try-langchain.service_ready")}
              </div>
            )}
            {(serviceStatus === "cold" || serviceStatus === "checking") && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>{t("try-langchain.service_cold_hint")}</span>
              </div>
            )}
            {serviceStatus === "warming" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                <span>{t("try-langchain.service_warming")}</span>
              </div>
            )}

            {/* Step 1: session */}
            <StepCard
              icon={RefreshCw}
              number={1}
              title={t("try-langchain.step1_title")}
              tip={t("try-langchain.tip_session")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              <div className="flex items-center gap-3">
                <div className="mr-1 flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 p-2.5 font-mono text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">{t("try-langchain.session_label")}:</span> {sessionId}
                </div>
                <button
                  onClick={startNewSession}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("try-langchain.new_session")}
                </button>
              </div>
            </StepCard>

            {/* Step 2: mode */}
            <StepCard
              icon={Workflow}
              number={2}
              title={t("try-langchain.step2_title")}
              tip={t("try-langchain.tip_mode")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MODES.map(({ id, icon: Icon, label, tip }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setMode(id);
                      setAnswer("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      mode === id
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    <InfoTip text={tip} hoverColor={TIP_HOVER} />
                  </button>
                ))}
              </div>
            </StepCard>

            {/* Step 3 (RAG only): upload docs */}
            {mode === "rag" && (
              <StepCard
                icon={Upload}
                number={3}
                title={t("try-langchain.step_upload_title")}
                tip={t("try-langchain.tip_upload")}
                accent={ACCENT_GRADIENT}
                iconColor={ACCENT_TEXT}
                tipHoverColor={TIP_HOVER}
              >
                <label
                  htmlFor="langchain-file-input"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-orange-300 hover:bg-orange-50/50"
                >
                  <Upload className="mb-2 h-6 w-6 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">{t("try-langchain.upload_cta")}</span>
                  <span className="mt-0.5 text-xs text-gray-400">{t("try-langchain.upload_hint")}</span>
                  <input
                    id="langchain-file-input"
                    type="file"
                    multiple
                    disabled={uploading}
                    className="sr-only"
                    onChange={handleUpload}
                  />
                </label>
                {uploading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                    {t("try-langchain.upload_uploading")}
                  </div>
                )}
                {ingested.length > 0 && !uploading && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ingested.map((f, i) => (
                      <span
                        key={`${f}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </StepCard>
            )}

            {/* Step: ask */}
            <StepCard
              icon={Send}
              number={mode === "rag" ? 4 : 3}
              title={t("try-langchain.step_ask_title")}
              tip={t("try-langchain.tip_ask")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={t(`try-langchain.placeholder_${mode}`)}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || serviceStatus === "warming" || !question.trim()}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r ${ACCENT_GRADIENT} px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50`}
                >
                  {loading || serviceStatus === "warming" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {serviceStatus === "warming" ? t("try-langchain.service_warming").slice(0, 20) + "…" : t("try-langchain.send")}
                </button>
              </div>

              {answer && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    {t("try-langchain.answer_label")}
                    <InfoTip text={t("try-langchain.tip_answer")} hoverColor={TIP_HOVER} />
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    {answer}
                  </pre>
                </div>
              )}
            </StepCard>
          </div>

          {/* Right: API log */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                  <Terminal className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {t("try-langchain.log")}
                    <InfoTip text={t("try-langchain.log_subtitle")} hoverColor={TIP_HOVER} />
                  </h2>
                  <p className="text-xs text-gray-400">{t("try-langchain.log_subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                {queryHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-40 w-40 opacity-50" />
                    <p className="font-semibold text-gray-600 opacity-70">{t("try-langchain.log_empty_title")}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-langchain.log_empty")}</p>
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
                          <span className="break-all font-mono text-xs text-orange-600">{entry.url}</span>
                        </div>
                        <JsonHighlight data={entry.response} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </LayoutGroup>
              </div>
            </div>
          </div>
        </div>

        {/* Technical definition — collapsible */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                <Cpu className="h-4 w-4 text-orange-600" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{t("try-langchain.tech_title")}</span>
                <span className="block text-xs text-gray-400">{t("try-langchain.tech_subtitle")}</span>
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
                      <Workflow className="h-4 w-4 text-orange-600" />
                      {t("try-langchain.tech_flow_title")}
                    </h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      {[1, 2, 3, 4].map((n) => (
                        <li key={n} className="flex gap-2">
                          <span className="font-semibold text-orange-600">{n}.</span>
                          {t(`try-langchain.tech_flow_${n}`)}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Cpu className="h-4 w-4 text-orange-600" />
                      {t("try-langchain.tech_stack_title")}
                    </h3>
                    <dl className="space-y-1.5 text-xs">
                      {[
                        ["tech_stack_framework_label", "LangChain"],
                        ["tech_stack_llm_label", "OpenAI GPT-4"],
                        ["tech_stack_vectordb_label", "Vector store (RAG)"],
                        ["tech_stack_tools_label", "Agent tools"],
                        ["tech_stack_server_label", "FastAPI · Cloud Run"],
                      ].map(([labelKey, value], i, arr) => (
                        <div
                          key={labelKey}
                          className={`flex justify-between gap-2 ${i < arr.length - 1 ? "border-b border-gray-100 pb-1.5" : ""}`}
                        >
                          <dt className="text-gray-500">{t(`try-langchain.${labelKey}`)}</dt>
                          <dd className="text-right font-medium text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t("try-langchain.tech_note")}</p>
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
