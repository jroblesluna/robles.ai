import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Loader2,
  Send,
  RotateCcw,
  Globe,
  Sparkles,
  ShieldCheck,
  Zap,
  MessagesSquare,
  AlertCircle,
  Cpu,
  Workflow,
  Database,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { HowItWorks, TechCard } from "@/components/demo/DemoKit";

// El backend vive en su propio Cloud Run (repo robles.ai-chatbot-api). VITE_CHATBOT_API
// permite apuntar el dev local a prod o a un backend local en :8080.
const getBaseApi = () => {
  const override: string | undefined = import.meta.env.VITE_CHATBOT_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://chatbot-api.robles.ai";
};

const BASE_API = getBaseApi();

const ACCENT_GRADIENT = "from-violet-500 to-indigo-600";
const ACCENT_TEXT = "text-violet-600";

/** Onboarding → building (crawl con progreso real) → ready (chat entrenado). */
type Phase = "onboarding" | "building" | "ready";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  state: "pending" | "done" | "error";
  question?: string;
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

/** Pasos visuales de la fase de construcción, dirigidos por los eventos SSE reales. */
type BuildStep = "crawling" | "indexing" | "done";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function errorMessage(json: any, status: number | undefined, fallback: string): string {
  if (json?.error?.message) return json.error.message;
  if (typeof json?.detail === "string") return json.detail;
  return status ? `HTTP ${status}` : fallback;
}

export default function TryChatbot() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("sitechatbot");

  const [phase, setPhase] = useState<Phase>("onboarding");
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [url, setUrl] = useState("");
  const [trainedUrl, setTrainedUrl] = useState("");

  // Progreso real de construcción.
  const [buildStep, setBuildStep] = useState<BuildStep>("crawling");
  const [crawledPages, setCrawledPages] = useState<string[]>([]);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Chat (fase ready).
  const [thread, setThread] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [serviceWarm, setServiceWarm] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thread]);

  // Cancelar cualquier stream en curso al desmontar.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function warmUp(): Promise<void> {
    if (serviceWarm) return;
    for (let i = 0; i < 12; i++) {
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
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  function recordCall(call: ApiCall) {
    setCalls((prev) => [call, ...prev]);
  }

  /** Fallback no-streaming (POST /crawl) si el navegador o la red no dan SSE. */
  async function crawlFallback(target: string): Promise<boolean> {
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, session_id: sessionId }),
      });
      status = res.status;
      json = await res.json().catch(() => null);
    } catch {
      json = { error: { message: t("try-chatbot.network_error") } };
    }
    recordCall({
      id: uuidv4(), method: "POST", path: "/crawl",
      request: { url: target, session_id: sessionId }, response: json, status,
      ms: Math.round(performance.now() - started), at: new Date(),
    });
    if (!json || json.error || !json.chunks_indexed || json.code === "no_text") {
      setBuildError(
        json?.error ? errorMessage(json, status, t("try-chatbot.crawl_error")) : t("try-chatbot.no_text"),
      );
      return false;
    }
    setCrawledPages(Array.from({ length: json.pages_crawled ?? 0 }, (_, i) => `${target} (${i + 1})`));
    return true;
  }

  /** Camino principal: consume POST /crawl/stream (SSE) mostrando progreso real. */
  async function crawlStream(target: string): Promise<boolean> {
    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    const collected: string[] = [];
    let doneEvent: any = null;
    let errorEvent: any = null;

    try {
      const res = await fetch(`${BASE_API}/crawl/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, session_id: sessionId }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let evt: any;
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (evt.event === "page") {
            collected.push(evt.url);
            setCrawledPages([...collected]);
          } else if (evt.event === "indexing") {
            setBuildStep("indexing");
          } else if (evt.event === "done") {
            doneEvent = evt;
          } else if (evt.event === "error") {
            errorEvent = evt;
          }
        }
      }
    } catch (e) {
      recordCall({
        id: uuidv4(), method: "POST", path: "/crawl/stream",
        request: { url: target, session_id: sessionId },
        response: { error: "stream failed" }, status: undefined,
        ms: Math.round(performance.now() - started), at: new Date(),
      });
      return crawlFallback(target); // SSE no disponible → fallback
    }

    recordCall({
      id: uuidv4(), method: "POST", path: "/crawl/stream",
      request: { url: target, session_id: sessionId },
      response: errorEvent ?? doneEvent ?? { pages: collected.length },
      status: 200, ms: Math.round(performance.now() - started), at: new Date(),
    });

    if (errorEvent) {
      setBuildError(errorEvent.message || t("try-chatbot.crawl_error"));
      return false;
    }
    if (!doneEvent || !doneEvent.chunks_indexed || doneEvent.code === "no_text") {
      setBuildError(t("try-chatbot.no_text"));
      return false;
    }
    return true;
  }

  async function startBuild() {
    const target = normalizeUrl(url);
    if (!target) return;
    trackStart();
    setPhase("building");
    setBuildStep("crawling");
    setCrawledPages([]);
    setBuildError(null);

    await warmUp();
    const ok = await crawlStream(target);

    if (ok) {
      setBuildStep("done");
      setTrainedUrl(target);
      // Breve pausa para que se vea el "listo" antes de pasar al chat.
      setTimeout(() => setPhase("ready"), 900);
    }
    // Si falló, quedamos en 'building' mostrando buildError con opción de reintentar.
  }

  function resetAll() {
    abortRef.current?.abort();
    setPhase("onboarding");
    setSessionId(uuidv4());
    setUrl("");
    setTrainedUrl("");
    setCrawledPages([]);
    setBuildError(null);
    setThread([]);
    setInput("");
    setCalls([]);
  }

  async function ask(question: string, retryId?: string) {
    const q = question.trim();
    if (!q || busy || phase !== "ready") return;
    trackStart();
    setBusy(true);
    setInput("");
    const answerId = retryId ?? uuidv4();
    if (retryId) {
      setThread((prev) => prev.map((m) => (m.id === retryId ? { ...m, state: "pending", text: "" } : m)));
    } else {
      setThread((prev) => [
        ...prev,
        { id: uuidv4(), role: "user", text: q, state: "done" },
        { id: answerId, role: "assistant", text: "", state: "pending", question: q },
      ]);
    }
    const patch = (fields: Partial<Message>) =>
      setThread((prev) => prev.map((m) => (m.id === answerId ? { ...m, ...fields } : m)));

    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question: q }),
      });
      status = res.status;
      json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        patch({ state: "error", text: errorMessage(json, status, t("try-chatbot.network_error")) });
      } else {
        patch({ state: "done", text: json?.answer ?? "" });
        trackComplete();
      }
    } catch {
      json = { error: { message: t("try-chatbot.network_error") } };
      patch({ state: "error", text: t("try-chatbot.network_error") });
    } finally {
      recordCall({
        id: uuidv4(), method: "POST", path: "/chat",
        request: { session_id: sessionId, question: q }, response: json, status,
        ms: Math.round(performance.now() - started), at: new Date(),
      });
      setBusy(false);
    }
  }

  const suggestions = [1, 2, 3].map((n) => t(`try-chatbot.suggest_${n}`));

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-[max(64rem,64vw)] px-6">
        <DemoNav tone="violet" className="mb-8" />

        <AnimatePresence mode="wait">
          {/* ── FASE 1: ONBOARDING (URL centrada, limpio) ─────────────────── */}
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
                <Bot className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {t("try-chatbot.onboarding_title")}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                {t("try-chatbot.onboarding_subtitle")}
              </p>

              <div className="mt-8 w-full">
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                  <Globe className="ml-2 h-5 w-5 shrink-0 text-gray-400" />
                  <input
                    autoFocus
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startBuild()}
                    placeholder={t("try-chatbot.url_placeholder")}
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={startBuild}
                    disabled={!url.trim()}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("try-chatbot.crawl_cta")}
                  </button>
                </div>
                <p className="mt-3 text-sm text-gray-400">{t("try-chatbot.onboarding_hint")}</p>
              </div>

              <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                {[
                  { icon: ShieldCheck, key: "trust_private" },
                  { icon: Zap, key: "trust_fast" },
                  { icon: Globe, key: "trust_yoursite" },
                ].map(({ icon: Icon, key }) => (
                  <li key={key} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                    {t(`try-chatbot.${key}`)}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* ── FASE 2: BUILDING (progreso real del crawl) ────────────────── */}
          {phase === "building" && (
            <motion.div
              key="building"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mx-auto flex min-h-[52vh] max-w-2xl flex-col items-center justify-center text-center"
            >
              {!buildError ? (
                <>
                  <div className="relative mb-6">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg`}>
                      {buildStep === "done" ? <CheckCircle2 className="h-8 w-8" /> : <Loader2 className="h-8 w-8 animate-spin" />}
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    {buildStep === "done" ? t("try-chatbot.building_done_title") : t("try-chatbot.building_title")}
                  </h2>
                  <p className="mt-3 text-gray-600">
                    {buildStep === "crawling" && t("try-chatbot.building_crawling")}
                    {buildStep === "indexing" && t("try-chatbot.building_indexing")}
                    {buildStep === "done" && t("try-chatbot.building_done_subtitle")}
                  </p>

                  {/* Contador de progreso real */}
                  <div className="mt-6 flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 ring-1 ring-violet-100">
                    <Globe className="h-4 w-4" />
                    {t("try-chatbot.building_page_count", { count: crawledPages.length })}
                  </div>

                  {/* Lista en vivo de páginas rastreadas */}
                  <div className="mt-6 w-full max-w-md">
                    <ul className="max-h-48 space-y-1.5 overflow-y-auto text-left">
                      <AnimatePresence initial={false}>
                        {crawledPages.slice(-8).map((u) => (
                          <motion.li
                            key={u}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 truncate rounded-lg bg-white px-3 py-1.5 text-xs text-gray-600 ring-1 ring-gray-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="truncate">{u}</span>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                </>
              ) : (
                /* Error durante la construcción */
                <>
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{t("try-chatbot.building_error_title")}</h2>
                  <p className="mt-3 max-w-md text-gray-600">{buildError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("onboarding");
                      setBuildError(null);
                    }}
                    className={`mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-5 py-2.5 text-sm font-semibold text-white`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t("try-chatbot.building_try_again")}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* ── FASE 3: READY (chat entrenado + negocio) ──────────────────── */}
          {phase === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header con la URL entrenada */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">{t("try-chatbot.ready_title")}</h1>
                    <p className="flex items-center gap-1.5 text-sm text-gray-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      {t("try-chatbot.ready_trained_on", { url: trainedUrl, count: crawledPages.length })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 self-start rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("try-chatbot.try_another")}
                </button>
              </div>

              {/* Workspace: chat + inspector */}
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-5">
                  {/* Chat */}
                  <div className="flex h-[480px] min-w-0 flex-col lg:col-span-3 lg:h-[560px] lg:border-r lg:border-gray-100">
                    <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                      {thread.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-3 h-20 w-20 opacity-60" />
                          <p className="text-sm font-semibold text-gray-700">{t("try-chatbot.empty_ready_title")}</p>
                          <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-chatbot.empty_ready_subtitle")}</p>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => ask(s)}
                                disabled={busy}
                                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {thread.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                  msg.role === "user"
                                    ? `bg-gradient-to-br ${ACCENT_GRADIENT} text-white`
                                    : msg.state === "error"
                                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {msg.state === "pending" ? (
                                  <span className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {t("try-chatbot.thinking")}
                                  </span>
                                ) : msg.state === "error" ? (
                                  <span className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <AlertCircle className="h-3.5 w-3.5" />
                                      {msg.text}
                                    </span>
                                    {msg.question && (
                                      <button type="button" onClick={() => ask(msg.question!, msg.id)} className="self-start text-xs font-semibold underline">
                                        {t("try-chatbot.retry")}
                                      </button>
                                    )}
                                  </span>
                                ) : (
                                  <span className="whitespace-pre-wrap">{msg.text}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 p-3">
                      <div className="flex items-end gap-2">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              ask(input);
                            }
                          }}
                          rows={1}
                          placeholder={t("try-chatbot.composer_placeholder")}
                          disabled={busy}
                          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => ask(input)}
                          disabled={busy || !input.trim()}
                          aria-label={t("try-chatbot.send")}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40`}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inspector de API */}
                  <div className="flex h-[480px] flex-col overflow-y-auto p-4 lg:col-span-2 lg:h-[560px]">
                    <ApiCallLog
                      calls={logCalls}
                      active={busy}
                      failed={logCalls.length > 0 && !logCalls[0].ok}
                      activeDescription={t("try-chatbot.thinking")}
                      empty={{ title: t("try-chatbot.log_empty_title"), description: t("try-chatbot.log_empty") }}
                    />
                  </div>
                </div>
              </section>

              {/* Caso de negocio (aparece con el bot ya funcionando) */}
              <div className="mt-8">
                <BusinessCase demoId="sitechatbot" variant="banner" />
              </div>

              {/* Cómo funciona */}
              <HowItWorks
                theme={{
                  gradient: ACCENT_GRADIENT,
                  text: ACCENT_TEXT,
                  soft: "bg-violet-100",
                  activeTab: "border-violet-400 bg-violet-50/60 ring-2 ring-violet-100",
                  notice: "bg-violet-50/70 text-violet-900",
                }}
                labels={{
                  title: t("try-chatbot.how_simple_title"),
                  subtitle: t("try-chatbot.how_simple_subtitle"),
                  overviewTitle: t("try-chatbot.how_overview_title"),
                  overviewSubtitle: t("try-chatbot.how_overview_subtitle"),
                  techTitle: t("try-chatbot.how_tech_title"),
                  techSubtitle: t("try-chatbot.how_tech_subtitle"),
                }}
                steps={([1, 2, 3, 4] as const).map((n) => ({
                  icon: [Globe, Database, Bot, MessagesSquare][n - 1],
                  title: t(`try-chatbot.flow_step${n}_title`),
                  desc: t(`try-chatbot.flow_step${n}_desc`),
                }))}
                notice={t("try-chatbot.tech_note")}
                technical={
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <TechCard icon={Workflow} title={t("try-chatbot.tech_crawl_title")} iconClass={ACCENT_TEXT}>
                      <p className="text-sm leading-relaxed text-gray-600">{t("try-chatbot.tech_crawl_desc")}</p>
                    </TechCard>
                    <TechCard icon={Database} title={t("try-chatbot.tech_index_title")} iconClass={ACCENT_TEXT}>
                      <p className="text-sm leading-relaxed text-gray-600">{t("try-chatbot.tech_index_desc")}</p>
                    </TechCard>
                    <TechCard icon={Cpu} title={t("try-chatbot.tech_chat_title")} iconClass={ACCENT_TEXT}>
                      <p className="text-sm leading-relaxed text-gray-600">{t("try-chatbot.tech_chat_desc")}</p>
                    </TechCard>
                  </div>
                }
              />

              {/* Calculadora de ahorro + CTA */}
              <div className="mt-8">
                <SavingsCalculator demoId="sitechatbot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
