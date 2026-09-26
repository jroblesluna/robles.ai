import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Loader2,
  Send,
  RotateCcw,
  Globe,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  MessagesSquare,
  AlertCircle,
  Cpu,
  Workflow,
  Database,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { InfoTip } from "@/components/demo/InfoTip";
import { HowItWorks, StatusPill, TechCard, type StatusTone } from "@/components/demo/DemoKit";

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

// Acento de marca (violeta/índigo), igual que la tarjeta del catálogo (sitechatbot).
const ACCENT_GRADIENT = "from-violet-500 to-indigo-600";
const ACCENT_TEXT = "text-violet-600";
const BADGE_BG = "bg-violet-100";
const BADGE_TEXT = "text-violet-700";
const BADGE_DOT = "bg-violet-500";
const TIP_HOVER = "hover:text-violet-600 focus:text-violet-600";

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

/** Extrae el mensaje de error legible del cuerpo estructurado del backend. */
function errorMessage(json: any, status: number | undefined, fallback: string): string {
  if (json?.error?.message) return json.error.message;
  if (typeof json?.detail === "string") return json.detail;
  if (json?.detail?.error?.message) return json.detail.error.message;
  return status ? `HTTP ${status}` : fallback;
}

export default function TryChatbot() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("sitechatbot");

  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [url, setUrl] = useState("");
  const [thread, setThread] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [crawling, setCrawling] = useState(false);
  // Una vez rastreado con éxito, el chat se habilita.
  const [trained, setTrained] = useState<{ url: string; pages: number } | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "warm" | "warming" | "cold">("checking");

  const threadRef = useRef<HTMLDivElement>(null);

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
  const callActive = busy || crawling;
  const callFailed = logCalls.length > 0 && !logCalls[0].ok;

  // Health check al montar (warm vs cold por latencia).
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

  // Mantener el último mensaje a la vista.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thread]);

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

  /** POST/GET a la API registrando la llamada (request, response, status, latencia). */
  async function callApi(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ ok: boolean; status?: number; json: any }> {
    const id = uuidv4();
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      status = res.status;
      json = await res.json().catch(() => null);
      return { ok: res.ok && !json?.error, status, json };
    } catch {
      json = { error: { code: "network", message: t("try-chatbot.network_error") } };
      return { ok: false, status, json };
    } finally {
      setCalls((prev) => [
        {
          id,
          method,
          path,
          request: body,
          response: json,
          status,
          ms: Math.round(performance.now() - started),
          at: new Date(),
        },
        ...prev,
      ]);
    }
  }

  function resetSession() {
    setSessionId(uuidv4());
    setThread([]);
    setInput("");
    setUrl("");
    setTrained(null);
    setCrawlError(null);
    setCalls([]);
  }

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  async function crawl() {
    const target = normalizeUrl(url);
    if (!target || crawling) return;
    setCrawling(true);
    setCrawlError(null);
    setTrained(null);
    setThread([]);
    trackStart();
    try {
      if (!(await ensureWarm())) {
        setCrawlError(t("try-chatbot.service_warm_failed"));
        return;
      }
      const { ok, status, json } = await callApi("POST", "/crawl", {
        url: target,
        session_id: sessionId,
      });
      if (!ok) {
        setCrawlError(errorMessage(json, status, t("try-chatbot.crawl_error")));
        return;
      }
      // 0 chunks / code no_text: sitio sin texto legible (100% JS, vacío o bloqueado).
      if (!json?.chunks_indexed || json?.code === "no_text") {
        setCrawlError(t("try-chatbot.no_text"));
        return;
      }
      setTrained({ url: target, pages: json.pages_crawled ?? 0 });
    } finally {
      setCrawling(false);
    }
  }

  async function ask(question: string, retryId?: string) {
    const q = question.trim();
    if (!q || busy || !trained) return;
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

    try {
      const { ok, status, json } = await callApi("POST", "/chat", {
        session_id: sessionId,
        question: q,
      });
      if (!ok) {
        patch({ state: "error", text: errorMessage(json, status, t("try-chatbot.network_error")) });
        return;
      }
      patch({ state: "done", text: json?.answer ?? "" });
      trackComplete();
    } finally {
      setBusy(false);
    }
  }

  const suggestions: string[] = [1, 2, 3].map((n) => t(`try-chatbot.suggest_${n}`));

  const pillStatus: { tone: StatusTone; label: string; spinning?: boolean } =
    serviceStatus === "warming"
      ? { tone: "busy", label: t("try-chatbot.status_warming"), spinning: true }
      : serviceStatus === "checking"
        ? { tone: "idle", label: t("try-chatbot.status_checking"), spinning: true }
        : serviceStatus === "cold"
          ? { tone: "busy", label: t("try-chatbot.status_cold") }
          : { tone: "ready", label: t("try-chatbot.status_ready") };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-[max(72rem,70vw)] px-6">
        <DemoNav tone="violet" className="mb-8" />

        {/* Header: pitch (left) + business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <Bot className="h-6 w-6" />
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full ${BADGE_BG} px-3 py-1 text-xs font-semibold ${BADGE_TEXT}`}>
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${BADGE_DOT}`} />
                {t("try-chatbot.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-chatbot.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-chatbot.description")}
            </p>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-chatbot.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-chatbot.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-chatbot.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
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
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="sitechatbot" variant="aside" />
          </div>
        </div>

        {/* Workspace: playground (left) · API inspector (right) */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Sparkles className={`h-4 w-4 ${ACCENT_TEXT}`} />
                {t("try-chatbot.workspace_title")}
              </h2>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                {t("try-chatbot.session_label")}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-600 ring-1 ring-gray-200" title={sessionId}>
                  {sessionId.slice(0, 8)}
                </code>
                <InfoTip text={t("try-chatbot.tip_session")} hoverColor={TIP_HOVER} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetSession}
                disabled={callActive}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("try-chatbot.new_session")}
              </button>
              <StatusPill tone={pillStatus.tone} spinning={pillStatus.spinning} label={pillStatus.label} />
            </div>
          </div>

          {(serviceStatus === "cold" || serviceStatus === "warming") && (
            <div className="flex items-start gap-2 border-b border-violet-100 bg-violet-50/70 px-5 py-2.5 text-xs text-violet-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
              <span>{serviceStatus === "warming" ? t("try-chatbot.service_warming") : t("try-chatbot.service_cold_hint")}</span>
            </div>
          )}

          {/* URL bar: pega tu web y entrena el bot */}
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <label htmlFor="chatbot-url" className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              {t("try-chatbot.url_label")}
              <InfoTip text={t("try-chatbot.tip_url")} hoverColor={TIP_HOVER} />
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="chatbot-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && crawl()}
                  placeholder={t("try-chatbot.url_placeholder")}
                  disabled={crawling}
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                />
              </div>
              <button
                type="button"
                onClick={crawl}
                disabled={crawling || !url.trim()}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50`}
              >
                {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {crawling ? t("try-chatbot.crawling") : t("try-chatbot.crawl_cta")}
              </button>
            </div>
            {trained && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                <MessagesSquare className="h-3.5 w-3.5" />
                {t("try-chatbot.trained", { count: trained.pages })}
              </p>
            )}
            {crawlError && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {crawlError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Left: conversación */}
            <div className="flex h-[520px] min-w-0 flex-col lg:col-span-3 lg:h-[600px] lg:border-r lg:border-gray-100">
              <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {thread.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-3 h-24 w-24 opacity-60" />
                    <p className="text-sm font-semibold text-gray-700">
                      {trained ? t("try-chatbot.empty_ready_title") : t("try-chatbot.empty_locked_title")}
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">
                      {trained ? t("try-chatbot.empty_ready_subtitle") : t("try-chatbot.empty_locked_subtitle")}
                    </p>
                    {trained && (
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
                    )}
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
                                <button
                                  type="button"
                                  onClick={() => ask(msg.question!, msg.id)}
                                  className="self-start text-xs font-semibold underline"
                                >
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

              {/* Composer */}
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
                    placeholder={trained ? t("try-chatbot.composer_placeholder") : t("try-chatbot.composer_locked")}
                    disabled={!trained || busy}
                    className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => ask(input)}
                    disabled={!trained || busy || !input.trim()}
                    aria-label={t("try-chatbot.send")}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: API inspector */}
            <div className="flex h-[520px] flex-col overflow-y-auto p-4 lg:col-span-2 lg:h-[600px]">
              <ApiCallLog
                calls={logCalls}
                active={callActive}
                failed={callFailed}
                activeDescription={crawling ? t("try-chatbot.crawling") : t("try-chatbot.thinking")}
                empty={{
                  title: t("try-chatbot.log_empty_title"),
                  description: t("try-chatbot.log_empty"),
                }}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
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

        {/* Savings calculator + CTA */}
        <div className="mt-8">
          <SavingsCalculator demoId="sitechatbot" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
    </div>
  );
}
