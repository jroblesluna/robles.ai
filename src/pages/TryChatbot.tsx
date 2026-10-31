import { useEffect, useRef, useState, type FormEvent } from "react";
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
  Clock,
  Languages,
  UserRoundCheck,
  BookOpenCheck,
  FileText,
  Activity,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { DemoTutorial } from "@/components/demo/DemoTutorial";
import { HowItWorks, StatusPill, TechCard } from "@/components/demo/DemoKit";
import { GuideCue } from "@/components/demo/DemoGuide";
import { RunnerTrack, linearRunner, useRunnerElapsed, type RunnerTheme } from "@/components/demo/RunnerTrack";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
const RUNNER_THEME: RunnerTheme = { gradient: ACCENT_GRADIENT, surface: "from-violet-50/50", activeTick: "bg-violet-500" };

/** Tope de páginas del crawler (lo impone el backend; aquí solo escala la barra de progreso). */
const MAX_PAGES = 20;
/** Sitio de ejemplo: su servidor entrega HTML legible a crawlers (server/seo/publicContent.ts). */
const EXAMPLE_SITE = "robles.ai";

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

/** URL http(s) con un host que al menos parezca un dominio (`algo.tld`). */
function isValidSiteUrl(target: string): boolean {
  try {
    const u = new URL(target);
    return /^https?:$/.test(u.protocol) && /\.[a-z]{2,}$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function hostOf(target: string): string {
  try {
    return new URL(target).hostname.replace(/^www\./, "");
  } catch {
    return target;
  }
}

/** Ruta legible de una página rastreada ("/" para la portada). */
function pathOf(target: string): string {
  try {
    const u = new URL(target);
    return decodeURI(u.pathname + u.search) || "/";
  } catch {
    return target;
  }
}

function errorMessage(json: any, status: number | undefined, fallback: string): string {
  if (json?.error?.message) return json.error.message;
  if (typeof json?.detail === "string") return json.detail;
  return status ? `HTTP ${status}` : fallback;
}

/** Avatar del asistente (también en la vista de ejemplo del hero). */
function BotAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : "h-10 w-10 rounded-xl";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className={`flex shrink-0 items-center justify-center bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm ${box}`}>
      <Bot className={icon} />
    </span>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Vista de ejemplo del hero: una web genérica con el widget de chat abierto y una
 * conversación que se escribe sola en bucle. Es ilustrativa (lo dice la etiqueta);
 * con reduced-motion se muestra completa y estática.
 */
function ChatPreview() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // 0 vacío · 1 p1 · 2 escribiendo · 3 r1 · 4 p2 · 5 escribiendo · 6 r2 (y pausa antes de reiniciar).
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setStep((s) => (s >= 9 ? 0 : s + 1)), 1300);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const shown = reduceMotion ? 6 : step;
  const bubbles = [
    { at: 1, role: "user", text: t("try-chatbot.preview_q1") },
    { at: 3, role: "assistant", text: t("try-chatbot.preview_a1") },
    { at: 4, role: "user", text: t("try-chatbot.preview_q2") },
    { at: 6, role: "assistant", text: t("try-chatbot.preview_a2") },
  ] as const;
  const typing = shown === 2 || shown === 5;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      <span className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-violet-300/30 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-indigo-300/30 blur-3xl" />

      {/* Ventana del navegador */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-violet-900/5">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </span>
          <span className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] text-gray-500 ring-1 ring-gray-200">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{t("try-chatbot.preview_site")}</span>
          </span>
        </div>

        {/* Web genérica (esqueleto) */}
        <div className="relative h-[380px] p-5 sm:h-[400px]">
          <div className="flex items-center justify-between">
            <span className="h-3 w-20 rounded bg-gray-200" />
            <span className="flex gap-2">
              <span className="h-2 w-10 rounded bg-gray-100" />
              <span className="h-2 w-10 rounded bg-gray-100" />
              <span className="h-2 w-10 rounded bg-gray-100" />
            </span>
          </div>
          <div className="mt-6 h-4 w-3/4 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
          <div className="mt-4 space-y-1.5">
            <div className="h-2 w-2/3 rounded bg-gray-100" />
            <div className="h-2 w-1/2 rounded bg-gray-100" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-50 ring-1 ring-gray-100" />
            ))}
          </div>

          {/* Widget de chat */}
          <div className="absolute bottom-4 right-4 flex w-[82%] max-w-[300px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-violet-900/10">
            <div className={`flex items-center gap-2.5 bg-gradient-to-br ${ACCENT_GRADIENT} px-3.5 py-2.5 text-white`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Bot className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{t("try-chatbot.preview_bot_name")}</span>
                <span className="flex items-center gap-1 text-[10px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {t("try-chatbot.preview_online")}
                </span>
              </span>
            </div>
            <div className="flex h-[220px] flex-col justify-end gap-2 bg-gray-50/60 p-3">
              <AnimatePresence initial={false}>
                {bubbles
                  .filter((b) => shown >= b.at)
                  .map((b) => (
                    <motion.div
                      key={b.at}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-[11px] leading-snug ${
                        b.role === "user"
                          ? `self-end rounded-br-md bg-gradient-to-br ${ACCENT_GRADIENT} text-white`
                          : "self-start rounded-bl-md bg-white text-gray-700 ring-1 ring-gray-200"
                      }`}
                    >
                      {b.text}
                    </motion.div>
                  ))}
              </AnimatePresence>
              {typing && (
                <span className="self-start rounded-2xl rounded-bl-md bg-white px-3 py-2 ring-1 ring-gray-200">
                  <TypingDots />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <span className="absolute -top-3 left-4 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-gray-200">
        {t("try-chatbot.preview_label")}
      </span>
    </div>
  );
}

export default function TryChatbot() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("sitechatbot");

  const [phase, setPhase] = useState<Phase>("onboarding");
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [trainedUrl, setTrainedUrl] = useState("");

  // Progreso real de construcción.
  const [buildStep, setBuildStep] = useState<BuildStep>("crawling");
  const [crawledPages, setCrawledPages] = useState<string[]>([]);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Chat (fase ready).
  const [thread, setThread] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"pages" | "api">("pages");

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
  async function crawlFallback(target: string, sid: string): Promise<boolean> {
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, session_id: sid }),
      });
      status = res.status;
      json = await res.json().catch(() => null);
    } catch {
      json = { error: { message: t("try-chatbot.network_error") } };
    }
    recordCall({
      id: uuidv4(), method: "POST", path: "/crawl",
      request: { url: target, session_id: sid }, response: json, status,
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
  async function crawlStream(target: string, sid: string, controller: AbortController): Promise<boolean> {
    const started = performance.now();
    const collected: string[] = [];
    let doneEvent: any = null;
    let errorEvent: any = null;

    try {
      const res = await fetch(`${BASE_API}/crawl/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, session_id: sid }),
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
      if (controller.signal.aborted) return false; // cancelado por el visitante
      recordCall({
        id: uuidv4(), method: "POST", path: "/crawl/stream",
        request: { url: target, session_id: sid },
        response: { error: "stream failed" }, status: undefined,
        ms: Math.round(performance.now() - started), at: new Date(),
      });
      return crawlFallback(target, sid); // SSE no disponible → fallback
    }

    recordCall({
      id: uuidv4(), method: "POST", path: "/crawl/stream",
      request: { url: target, session_id: sid },
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

  async function startBuild(raw = url) {
    const target = normalizeUrl(raw);
    if (!target) return;
    if (!isValidSiteUrl(target)) {
      setUrlError(t("try-chatbot.url_invalid"));
      return;
    }
    trackStart();
    // Sesión nueva por construcción: cada intento tiene su propio índice efímero.
    const sid = uuidv4();
    setSessionId(sid);
    setUrl(raw);
    setUrlError(null);
    setTrainedUrl(target);
    setPhase("building");
    setBuildStep("crawling");
    setCrawledPages([]);
    setBuildError(null);
    setInspectorTab("pages");

    const controller = new AbortController();
    abortRef.current = controller;

    await warmUp();
    if (controller.signal.aborted) return;
    const ok = await crawlStream(target, sid, controller);
    if (controller.signal.aborted) return;

    if (ok) {
      setBuildStep("done");
      // Breve pausa para que se vea el "listo" antes de pasar al chat.
      setTimeout(() => {
        if (!controller.signal.aborted) setPhase("ready");
      }, 900);
    }
    // Si falló, quedamos en 'building' mostrando buildError con opción de reintentar.
  }

  function cancelBuild() {
    abortRef.current?.abort();
    setPhase("onboarding");
    setBuildError(null);
  }

  function resetAll() {
    abortRef.current?.abort();
    setPhase("onboarding");
    setSessionId(uuidv4());
    setUrl("");
    setUrlError(null);
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

  function onSubmitUrl(e: FormEvent) {
    e.preventDefault();
    startBuild();
  }

  const suggestions = [1, 2, 3].map((n) => t(`try-chatbot.suggest_${n}`));
  const domain = hostOf(trainedUrl);

  // Robly avanza con las páginas leídas hasta el paso de indexar, y de ahí a la meta.
  const buildIndex = buildStep === "crawling" ? 0 : buildStep === "indexing" ? 1 : 3;
  const buildRunner = linearRunner(["read", "train", "ready"], buildIndex);
  const buildPosition =
    buildStep === "crawling" ? Math.min(crawledPages.length / MAX_PAGES, 1) / 2 : buildRunner.position;
  const buildElapsed = useRunnerElapsed(buildStep !== "done" && phase === "building");
  const buildSteps = [
    { key: "read", icon: Globe, label: t("try-chatbot.building_step_read"), state: buildStep === "crawling" ? "active" : "done" },
    {
      key: "train",
      icon: Database,
      label: t("try-chatbot.building_step_train"),
      state: buildStep === "crawling" ? "todo" : buildStep === "indexing" ? "active" : "done",
    },
    { key: "ready", icon: MessagesSquare, label: t("try-chatbot.building_step_ready"), state: buildStep === "done" ? "done" : "todo" },
  ] as const;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-white py-12">
      {/* Fondo: retícula suave + halos de color */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[linear-gradient(to_right,rgba(139,92,246,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <span aria-hidden className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="relative mx-auto w-full min-w-0 px-4 sm:w-[85%] sm:px-0">
        <DemoNav tone="violet" className="mb-8" />

        <AnimatePresence mode="wait">
          {/* ── FASE 1: ONBOARDING (hero + vista de ejemplo) ──────────────── */}
          {phase === "onboarding" && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <section id="chatbot-start" className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("try-chatbot.live_badge")}
                    </span>
                    <StatusPill
                      tone={serviceWarm ? "ready" : "idle"}
                      label={serviceWarm ? t("try-chatbot.status_ready") : t("try-chatbot.status_cold")}
                    />
                  </div>

                  <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    {t("try-chatbot.title_lead")}{" "}
                    <span className={`bg-gradient-to-r ${ACCENT_GRADIENT} bg-clip-text text-transparent`}>
                      {t("try-chatbot.title_accent")}
                    </span>
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                    {t("try-chatbot.onboarding_subtitle")}
                  </p>

                  <form onSubmit={onSubmitUrl} className="mt-8" noValidate>
                    <label htmlFor="chatbot-url" className="sr-only">
                      {t("try-chatbot.url_label")}
                    </label>
                    <div
                      className={`relative flex flex-col gap-2 rounded-2xl border bg-white p-2 shadow-lg shadow-violet-900/5 focus-within:ring-4 sm:flex-row sm:items-center ${
                        urlError
                          ? "border-red-300 focus-within:ring-red-100"
                          : "border-gray-200 focus-within:border-violet-400 focus-within:ring-violet-100"
                      }`}
                    >
                      {!url && <GuideCue step={1} label={t("try-chatbot.guide_url")} gradient={ACCENT_GRADIENT} />}
                      <div className="flex min-w-0 flex-1 items-center">
                        <Globe className="ml-2 h-5 w-5 shrink-0 text-gray-400" />
                        <input
                          id="chatbot-url"
                          autoFocus
                          type="url"
                          inputMode="url"
                          autoComplete="url"
                          value={url}
                          onChange={(e) => {
                            setUrl(e.target.value);
                            if (urlError) setUrlError(null);
                          }}
                          placeholder={t("try-chatbot.url_placeholder")}
                          aria-invalid={!!urlError}
                          aria-describedby={urlError ? "chatbot-url-error" : "chatbot-url-hint"}
                          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none placeholder:text-gray-400 focus-visible:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!url.trim()}
                        className={`tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-40`}
                      >
                        <Sparkles className="h-4 w-4" />
                        {t("try-chatbot.crawl_cta")}
                      </button>
                    </div>
                    {urlError ? (
                      <p id="chatbot-url-error" role="alert" className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {urlError}
                      </p>
                    ) : (
                      <p id="chatbot-url-hint" className="mt-3 text-sm text-gray-500">
                        {t("try-chatbot.onboarding_hint")}
                      </p>
                    )}
                  </form>

                  <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    {t("try-chatbot.example_label")}
                    <button
                      type="button"
                      onClick={() => startBuild(EXAMPLE_SITE)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {EXAMPLE_SITE}
                    </button>
                  </p>

                  <DemoTutorial demoId="sitechatbot" returnToId="chatbot-start" className="mt-4" />

                  <ul className="mt-8 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
                    {[
                      { icon: Zap, key: "trust_fast" },
                      { icon: Globe, key: "trust_yoursite" },
                      { icon: ShieldCheck, key: "trust_private" },
                    ].map(({ icon: Icon, key }) => (
                      <li key={key} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50">
                          <Icon className={`h-3.5 w-3.5 ${ACCENT_TEXT}`} />
                        </span>
                        <span className="leading-snug">{t(`try-chatbot.${key}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ChatPreview />
              </section>

              {/* Tutorial en video */}
              <section className="mt-16">
                <DemoTutorial
                  demoId="sitechatbot"
                  variant="featured"
                  returnToId="chatbot-start"
                  description={t("try-chatbot.tutorial_text")}
                />
              </section>

              {/* Tres pasos */}
              <section className="mt-20">
                <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-violet-700">
                  {t("try-chatbot.steps_title")}
                </h2>
                <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {([1, 2, 3] as const).map((n) => {
                    const Icon = [Globe, Database, MessagesSquare][n - 1];
                    return (
                      <li key={n} className="relative rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-3xl font-bold text-violet-200">0{n}</span>
                        </div>
                        <h3 className="mt-4 font-semibold text-gray-900">{t(`try-chatbot.how_step${n}_title`)}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{t(`try-chatbot.how_step${n}_desc`)}</p>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* Lo que reciben tus visitantes */}
              <section className="mt-20">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{t("try-chatbot.features_title")}</h2>
                  <p className="mt-3 text-gray-600">{t("try-chatbot.features_subtitle")}</p>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {([1, 2, 3, 4] as const).map((n) => {
                    const Icon = [Clock, BookOpenCheck, Languages, UserRoundCheck][n - 1];
                    return (
                      <div
                        key={n}
                        className="group rounded-2xl border border-gray-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md motion-reduce:hover:translate-y-0"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="mt-4 font-semibold text-gray-900">{t(`try-chatbot.feature_${n}_title`)}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{t(`try-chatbot.feature_${n}_desc`)}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
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
              className="mx-auto max-w-3xl"
            >
              {!buildError ? (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-violet-900/5">
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg`}>
                          {buildStep === "done" ? <CheckCircle2 className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl" aria-live="polite">
                            {buildStep === "done" ? t("try-chatbot.building_done_title") : t("try-chatbot.building_title")}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600">
                            {buildStep === "crawling" && t("try-chatbot.building_crawling")}
                            {buildStep === "indexing" && t("try-chatbot.building_indexing")}
                            {buildStep === "done" && t("try-chatbot.building_done_subtitle")}
                          </p>
                        </div>
                      </div>
                      {buildStep !== "done" && (
                        <button
                          type="button"
                          onClick={cancelBuild}
                          className="inline-flex items-center gap-1.5 self-start rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("try-chatbot.building_cancel")}
                        </button>
                      )}
                    </div>

                    {/* Progreso con Robly */}
                    <RunnerTrack
                      mode={buildStep === "done" ? "done" : "running"}
                      position={buildPosition}
                      steps={buildSteps.map(({ key, label }, i) => ({ id: key, name: label, status: buildRunner.statuses[i] }))}
                      label={
                        buildStep === "done"
                          ? t("try-chatbot.building_done_title")
                          : t(`try-chatbot.building_${buildStep}`)
                      }
                      elapsed={buildElapsed}
                      theme={RUNNER_THEME}
                      className="mt-7"
                    />

                    {/* Pasos */}
                    <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {buildSteps.map(({ key, icon: Icon, label, state }) => (
                        <li
                          key={key}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 transition ${
                            state === "active"
                              ? "bg-violet-50 font-semibold text-violet-800 ring-violet-200"
                              : state === "done"
                                ? "bg-emerald-50/60 text-emerald-800 ring-emerald-100"
                                : "bg-white text-gray-400 ring-gray-100"
                          }`}
                        >
                          {state === "done" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : state === "active" ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4 shrink-0" />
                          )}
                          {label}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Páginas leídas en vivo */}
                  <div className="border-t border-gray-100 bg-gray-50/60 p-6 sm:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium text-gray-700">
                        <Globe className={`h-3.5 w-3.5 shrink-0 ${ACCENT_TEXT}`} />
                        <span className="truncate">{t("try-chatbot.building_reading_from", { domain })}</span>
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold tabular-nums text-violet-700 ring-1 ring-violet-100">
                        {t("try-chatbot.building_page_count", { count: crawledPages.length })} ·{" "}
                        <span className="font-normal text-gray-500">{t("try-chatbot.building_cap", { max: MAX_PAGES })}</span>
                      </span>
                    </div>
                    <ul className="mt-4 grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                      <AnimatePresence initial={false}>
                        {crawledPages.slice(-12).map((u) => (
                          <motion.li
                            key={u}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-gray-100"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                            <span className="truncate" title={u}>{pathOf(u)}</span>
                            <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                      {crawledPages.length === 0 &&
                        [0, 1, 2, 3].map((i) => (
                          <li key={i} className="h-8 animate-pulse rounded-lg bg-white ring-1 ring-gray-100 motion-reduce:animate-none" />
                        ))}
                    </ul>
                  </div>
                </section>
              ) : (
                /* Error durante la construcción */
                <section className="flex flex-col items-center rounded-3xl border border-red-100 bg-white px-6 py-12 text-center shadow-sm">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{t("try-chatbot.building_error_title")}</h2>
                  <p className="mt-3 max-w-md text-gray-600">{buildError}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhase("onboarding");
                        setBuildError(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-5 py-2.5 text-sm font-semibold text-white`}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t("try-chatbot.building_try_again")}
                    </button>
                    {hostOf(trainedUrl) !== EXAMPLE_SITE && (
                      <button
                        type="button"
                        onClick={() => startBuild(EXAMPLE_SITE)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                      >
                        <Globe className="h-4 w-4" />
                        {EXAMPLE_SITE}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* ── FASE 3: READY (chat entrenado + inspector) ────────────────── */}
          {phase === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-violet-900/5">
                <div className="grid grid-cols-1 lg:grid-cols-5">
                  {/* Chat */}
                  <div className="flex h-[560px] min-w-0 flex-col lg:col-span-3 lg:h-[620px] lg:border-r lg:border-gray-100">
                    {/* Cabecera estilo widget */}
                    <div className={`flex items-center gap-3 bg-gradient-to-br ${ACCENT_GRADIENT} px-4 py-3.5 text-white sm:px-5`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                        <Bot className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base font-semibold">{t("try-chatbot.chat_title", { domain })}</h1>
                        <p className="flex items-center gap-1.5 text-xs text-white/80">
                          <span className="h-2 w-2 rounded-full bg-emerald-300" />
                          {t("try-chatbot.chat_status", { count: crawledPages.length })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetAll}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("try-chatbot.try_another")}</span>
                      </button>
                    </div>

                    <div ref={threadRef} className="flex-1 overflow-y-auto bg-gray-50/50 px-4 py-5 sm:px-6" aria-live="polite">
                      {thread.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-3 h-20 w-20" />
                          <p className="font-semibold text-gray-800">{t("try-chatbot.empty_ready_title")}</p>
                          <p className="mt-1 max-w-xs text-sm text-gray-600">{t("try-chatbot.empty_ready_subtitle")}</p>
                          <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                            {suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => ask(s)}
                                disabled={busy}
                                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {thread.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              {msg.role === "assistant" && <BotAvatar size="sm" />}
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                  msg.role === "user"
                                    ? `rounded-br-md bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`
                                    : msg.state === "error"
                                      ? "rounded-bl-md bg-red-50 text-red-700 ring-1 ring-red-200"
                                      : "rounded-bl-md bg-white text-gray-800 shadow-sm ring-1 ring-gray-200"
                                }`}
                              >
                                {msg.state === "pending" ? (
                                  <span className="flex items-center py-1">
                                    <TypingDots />
                                    <span className="sr-only">{t("try-chatbot.thinking")}</span>
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
                                  <span className="whitespace-pre-wrap break-anywhere">{msg.text}</span>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 bg-white p-3">
                      {thread.length > 0 && (
                        <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-0.5">
                          <span className="shrink-0 text-xs font-medium text-gray-500">{t("try-chatbot.suggestions_label")}</span>
                          {suggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => ask(s)}
                              disabled={busy}
                              className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="relative flex items-end gap-2">
                        {thread.length === 0 && !input && (
                          <GuideCue step={2} label={t("try-chatbot.guide_ask")} gradient={ACCENT_GRADIENT} className="left-3 !-top-4" />
                        )}
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
                          aria-label={t("try-chatbot.composer_placeholder")}
                          placeholder={t("try-chatbot.composer_placeholder")}
                          disabled={busy}
                          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 focus-visible:outline-none px-3 py-2.5 text-sm outline-none transition-colors focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
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
                      <p className="mt-2 text-center text-[11px] text-gray-400">{t("try-chatbot.disclaimer")}</p>
                    </div>
                  </div>

                  {/* Inspector: páginas aprendidas / llamadas a la API */}
                  <div className="flex h-[480px] min-w-0 flex-col lg:col-span-2 lg:h-[620px]">
                    <div role="tablist" className="flex border-b border-gray-100 px-2 pt-2">
                      {([
                        { id: "pages", icon: FileText, label: t("try-chatbot.tab_pages"), count: crawledPages.length },
                        { id: "api", icon: Activity, label: t("try-chatbot.tab_api"), count: calls.length },
                      ] as const).map(({ id, icon: Icon, label, count }) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={inspectorTab === id}
                          onClick={() => setInspectorTab(id)}
                          className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                            inspectorTab === id
                              ? "border-violet-500 text-violet-700"
                              : "border-transparent text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                          <span className="rounded-full bg-gray-100 px-1.5 text-[11px] tabular-nums text-gray-600">{count}</span>
                        </button>
                      ))}
                    </div>
                    <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-4">
                      {inspectorTab === "pages" ? (
                        <>
                          <p className="mb-3 flex items-start gap-2 rounded-xl bg-violet-50/70 p-3 text-xs leading-relaxed text-violet-900">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {t("try-chatbot.pages_hint")}
                          </p>
                          <ul className="space-y-1.5">
                            {crawledPages.map((u) => (
                              <li key={u} className="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-gray-600 ring-1 ring-gray-100">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                                <span className="truncate" title={u}>
                                  <span className="text-gray-400">{hostOf(u)}</span>
                                  {pathOf(u)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <ApiCallLog
                          calls={logCalls}
                          active={busy}
                          failed={logCalls.length > 0 && !logCalls[0].ok}
                          activeDescription={t("try-chatbot.thinking")}
                          empty={{ title: t("try-chatbot.log_empty_title"), description: t("try-chatbot.log_empty") }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secciones comunes: caso de negocio, cómo funciona y calculadora + CTA */}
        <div className="mt-16">
          <BusinessCase demoId="sitechatbot" variant="banner" />
        </div>

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

        <div className="mt-8">
          <SavingsCalculator demoId="sitechatbot" />
        </div>
      </div>
    </div>
  );
}
