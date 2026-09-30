import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Volume2,
  Play,
  Pause,
  Loader2,
  Sparkles,
  Download,
  FileText,
  Gauge,
  Mic,
  Cpu,
  Scissors,
  Captions,
  AlertCircle,
  ShieldCheck,
  Type,
  ListOrdered,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { HowItWorks, TechCard, StatusPill, type StatusTone } from "@/components/demo/DemoKit";
import { InfoTip } from "@/components/demo/InfoTip";

// El backend vive en su propio Cloud Run (repo robles.ai-tts-api). VITE_TTS_API
// permite apuntar el dev local a prod o a un backend local en :8080.
const getBaseApi = () => {
  const override: string | undefined = import.meta.env.VITE_TTS_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://tts-api.robles.ai";
};

const BASE_API = getBaseApi();

const ACCENT_GRADIENT = "from-rose-500 to-pink-600";
const ACCENT_TEXT = "text-rose-600";
const ACCENT_SOFT = "bg-rose-100";
const TIP_HOVER = "hover:text-rose-600 focus:text-rose-600";

type Mode = "studio" | "narrator";

/** Voces del catálogo (GET /voices). */
type Voice = {
  id: string;
  label: string;
  gender?: string;
  quality?: string;
  recommended?: boolean;
  sample_text?: string;
};

/** Vibes → instrucciones para el modelo (R2.3). Las etiquetas van por i18n. */
const VIBES = [
  { id: "neutral", instructions: "Speak in a neutral, natural, professional tone." },
  { id: "enthusiastic", instructions: "Speak with energy and enthusiasm, upbeat and lively, like an exciting promo." },
  { id: "warm", instructions: "Speak in a warm, close and friendly tone, calm and reassuring." },
  { id: "announcer", instructions: "Speak like a polished radio announcer: confident, clear diction, broadcast quality." },
  { id: "instructive", instructions: "Speak in a clear, calm and instructive tone, patient, like a teacher explaining a lesson." },
  { id: "confident", instructions: "Speak in a confident, assertive and persuasive tone." },
] as const;
type VibeId = (typeof VIBES)[number]["id"];

const vibeInstructions = (id: VibeId) => VIBES.find((v) => v.id === id)?.instructions ?? VIBES[0].instructions;

/** Casos de uso del Narrador que precargan texto + voz + vibe (R4). */
type UseCaseId = "marketing" | "article" | "tutorial" | "elearning" | "ivr";
const USE_CASES: { id: UseCaseId; voice: string; vibe: VibeId }[] = [
  { id: "marketing", voice: "coral", vibe: "enthusiastic" },
  { id: "article", voice: "marin", vibe: "neutral" },
  { id: "tutorial", voice: "cedar", vibe: "instructive" },
  { id: "elearning", voice: "sage", vibe: "instructive" },
  { id: "ivr", voice: "onyx", vibe: "confident" },
];

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

type Segment = {
  index: number;
  text: string;
  start_ms: number;
  end_ms: number;
  paragraph_break?: boolean;
};

type SynthResult = {
  audioUri: string;
  durationMs: number;
  charactersBilled: number;
  voice: string;
  format: string;
  cache?: string;
};

type NarrateResult = SynthResult & {
  subtitles: Record<string, string>;
  segments: Segment[];
};

function errorMessage(json: any, status: number | undefined, fallback: string): string {
  if (json?.error?.message) return json.error.message;
  if (typeof json?.detail === "string") return json.detail;
  return status ? `HTTP ${status}` : fallback;
}

/** base64 crudo del backend → data URI reproducible/descargable. */
function audioDataUri(base64: string, format: string): string {
  const mime =
    format === "wav" ? "audio/wav" : format === "opus" ? "audio/ogg" : format === "aac" ? "audio/aac" : "audio/mpeg";
  return `data:${mime};base64,${base64}`;
}

function formatMs(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Descarga un string (subtítulos) o data URI (audio) como archivo. */
function downloadFile(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function TryTTS() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("tts");

  const [mode, setMode] = useState<Mode>("studio");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [serviceWarm, setServiceWarm] = useState(false);
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [hasResult, setHasResult] = useState(false);

  // Estudio
  const [studioText, setStudioText] = useState(() => t("try-tts.studio_example"));
  const [studioVoice, setStudioVoice] = useState("marin");
  const [studioVibe, setStudioVibe] = useState<VibeId>("neutral");
  const [rate, setRate] = useState(1);
  const [studioBusy, setStudioBusy] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioResult, setStudioResult] = useState<SynthResult | null>(null);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);
  // Voz cuya muestra se esta cargando (fetch en curso): bloquea los demas previews.
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Narrador
  const [narrateText, setNarrateText] = useState(() => t("try-tts.narrator_example"));
  const [narrateVoice, setNarrateVoice] = useState("marin");
  const [narrateVibe, setNarrateVibe] = useState<VibeId>("neutral");
  const [wantSrt, setWantSrt] = useState(true);
  const [wantVtt, setWantVtt] = useState(false);
  const [narrateBusy, setNarrateBusy] = useState(false);
  const [narrateError, setNarrateError] = useState<string | null>(null);
  const [narrateResult, setNarrateResult] = useState<NarrateResult | null>(null);
  const [useCase, setUseCase] = useState<UseCaseId | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  // Ref al <audio> del resultado de narracion, para iniciar el play automaticamente.
  const narrateAudioRef = useRef<HTMLAudioElement | null>(null);

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

  const anyBusy = studioBusy || narrateBusy;
  const anyError = studioError || narrateError;
  const statusTone: StatusTone = anyBusy ? "busy" : anyError ? "error" : serviceWarm ? "ready" : "idle";
  const statusLabel = anyBusy
    ? t("try-tts.status_working")
    : anyError
      ? t("try-tts.status_error")
      : serviceWarm
        ? t("try-tts.status_ready")
        : t("try-tts.status_waking");

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

  // Cargar el catálogo de voces al montar (para poblar los chips).
  useEffect(() => {
    const controller = new AbortController();
    const started = performance.now();
    fetch(`${BASE_API}/voices`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        recordCall({
          id: uuidv4(),
          method: "GET",
          path: "/voices",
          request: undefined,
          response: json,
          status: res.status,
          ms: Math.round(performance.now() - started),
          at: new Date(),
        });
        if (json?.voices?.length) setVoices(json.voices as Voice[]);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detener el preview al desmontar.
  useEffect(
    () => () => {
      previewAudioRef.current?.pause();
    },
    [],
  );

  // Al llegar un resultado de narracion, iniciar el play automaticamente. Algunos
  // navegadores bloquean el autoplay con sonido; el .catch evita un error no manejado
  // y el usuario siempre puede darle play a los controles.
  useEffect(() => {
    if (!narrateResult) return;
    const el = narrateAudioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  }, [narrateResult]);

  function recordCall(call: ApiCall) {
    setCalls((prev) => [call, ...prev]);
  }

  /** Reproduce la muestra de una voz (GET /voices/{id}/sample). */
  async function playSample(id: string) {
    // Si ya suena esta voz, alternar a pausa.
    if (previewVoiceId === id) {
      previewAudioRef.current?.pause();
      setPreviewVoiceId(null);
      return;
    }
    // Si ya hay una muestra cargando, ignora el click (evita que se acoplen voces).
    if (previewLoadingId) return;
    previewAudioRef.current?.pause();
    setPreviewVoiceId(null);
    setPreviewLoadingId(id);
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}/voices/${encodeURIComponent(id)}/sample`);
      status = res.status;
      json = await res.json().catch(() => null);
      if (res.ok && json?.audio_base64) {
        const audio = new Audio(audioDataUri(json.audio_base64, json.format ?? "mp3"));
        previewAudioRef.current = audio;
        audio.onended = () => setPreviewVoiceId((cur) => (cur === id ? null : cur));
        setPreviewVoiceId(id);
        await audio.play().catch(() => setPreviewVoiceId(null));
      } else {
        setPreviewVoiceId(null);
      }
    } catch {
      json = { error: { message: t("try-tts.network_error") } };
      setPreviewVoiceId(null);
    } finally {
      setPreviewLoadingId(null);
      recordCall({
        id: uuidv4(),
        method: "GET",
        path: `/voices/${id}/sample`,
        request: undefined,
        response: json,
        status,
        ms: Math.round(performance.now() - started),
        at: new Date(),
      });
    }
  }

  /** Modo Estudio: POST /synthesize. */
  async function synthesize() {
    const text = studioText.trim();
    if (!text || studioBusy) return;
    trackStart();
    setStudioBusy(true);
    setStudioError(null);

    const body = {
      text,
      voice: studioVoice,
      instructions: vibeInstructions(studioVibe),
      rate,
      format: "mp3",
    };
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      status = res.status;
      json = await res.json().catch(() => null);
      if (!res.ok || json?.error || !json?.audio_base64) {
        setStudioError(errorMessage(json, status, t("try-tts.synth_error")));
      } else {
        setStudioResult({
          audioUri: audioDataUri(json.audio_base64, json.format ?? "mp3"),
          durationMs: json.duration_ms ?? 0,
          charactersBilled: json.characters_billed ?? text.length,
          voice: json.voice ?? studioVoice,
          format: json.format ?? "mp3",
          cache: json.cache,
        });
        setHasResult(true);
        trackComplete();
      }
    } catch {
      json = { error: { message: t("try-tts.network_error") } };
      setStudioError(t("try-tts.network_error"));
    } finally {
      // No registramos el audio_base64 completo en el log (pesado); se recorta.
      const logResponse = json?.audio_base64
        ? { ...json, audio_base64: `${String(json.audio_base64).slice(0, 24)}… (${json.audio_base64.length} chars)` }
        : json;
      recordCall({
        id: uuidv4(),
        method: "POST",
        path: "/synthesize",
        request: body,
        response: logResponse,
        status,
        ms: Math.round(performance.now() - started),
        at: new Date(),
      });
      setStudioBusy(false);
    }
  }

  /** Modo Narrador: POST /narrate. */
  async function narrate() {
    const text = narrateText.trim();
    if (!text || narrateBusy) return;
    trackStart();
    setNarrateBusy(true);
    setNarrateError(null);

    const subtitles = [wantSrt ? "srt" : null, wantVtt ? "vtt" : null].filter(Boolean) as string[];
    const body = {
      text,
      voice: narrateVoice,
      instructions: vibeInstructions(narrateVibe),
      rate,
      subtitles,
    };
    const started = performance.now();
    let status: number | undefined;
    let json: any = null;
    try {
      const res = await fetch(`${BASE_API}/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      status = res.status;
      json = await res.json().catch(() => null);
      if (!res.ok || json?.error || !json?.audio_base64) {
        setNarrateError(errorMessage(json, status, t("try-tts.narrate_error")));
      } else {
        setNarrateResult({
          audioUri: audioDataUri(json.audio_base64, "mp3"),
          durationMs: json.duration_ms ?? 0,
          charactersBilled: json.characters_billed ?? text.length,
          voice: json.voice ?? narrateVoice,
          format: "mp3",
          cache: json.cache,
          subtitles: json.subtitles ?? {},
          segments: json.segments ?? [],
        });
        setHasResult(true);
        trackComplete();
      }
    } catch {
      json = { error: { message: t("try-tts.network_error") } };
      setNarrateError(t("try-tts.network_error"));
    } finally {
      const logResponse = json?.audio_base64
        ? { ...json, audio_base64: `${String(json.audio_base64).slice(0, 24)}… (${json.audio_base64.length} chars)` }
        : json;
      recordCall({
        id: uuidv4(),
        method: "POST",
        path: "/narrate",
        request: body,
        response: logResponse,
        status,
        ms: Math.round(performance.now() - started),
        at: new Date(),
      });
      setNarrateBusy(false);
    }
  }

  function applyUseCase(id: UseCaseId) {
    const uc = USE_CASES.find((u) => u.id === id);
    if (!uc) return;
    setUseCase(id);
    setNarrateText(t(`try-tts.usecase_${id}_text`));
    setNarrateVoice(uc.voice);
    setNarrateVibe(uc.vibe);
  }

  const sortedVoices = useMemo(
    () => [...voices].sort((a, b) => Number(b.recommended) - Number(a.recommended)),
    [voices],
  );

  // ── Chips de voz reutilizables (con preview) ───────────────────────────────
  const VoiceChips = ({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {sortedVoices.length === 0 && (
        <span className="text-sm text-gray-400">{t("try-tts.voices_loading")}</span>
      )}
      {sortedVoices.map((v) => {
        const active = selected === v.id;
        const playing = previewVoiceId === v.id;
        const loading = previewLoadingId === v.id;
        // Mientras una muestra carga, se bloquean TODOS los previews (evita acoplar voces).
        const previewDisabled = previewLoadingId !== null;
        return (
          <div
            key={v.id}
            className={`inline-flex items-center overflow-hidden rounded-full border text-sm transition-colors ${
              active ? "border-rose-400 bg-rose-50 text-rose-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(v.id)}
              className="flex items-center gap-1.5 py-1.5 pl-3 pr-2 font-medium"
            >
              {v.label}
              {v.recommended && <Sparkles className="h-3.5 w-3.5 text-rose-500" />}
            </button>
            <button
              type="button"
              onClick={() => playSample(v.id)}
              disabled={previewDisabled}
              aria-label={t("try-tts.preview_voice", { voice: v.label })}
              aria-busy={loading}
              className="flex h-8 w-8 items-center justify-center border-l border-gray-200/70 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  // ── Chips de vibe ──────────────────────────────────────────────────────────
  const VibeChips = ({ selected, onSelect }: { selected: VibeId; onSelect: (id: VibeId) => void }) => (
    <div className="flex flex-wrap gap-2">
      {VIBES.map((v) => {
        const active = selected === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "border-rose-400 bg-rose-50 text-rose-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {t(`try-tts.vibe_${v.id}`)}
          </button>
        );
      })}
    </div>
  );

  // ── Aviso de IA (R8) ───────────────────────────────────────────────────────
  const AiDisclosure = ({ className = "" }: { className?: string }) => (
    <div
      className={`flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-100 ${className}`}
    >
      <Volume2 className="h-4 w-4 shrink-0" />
      {t("try-tts.ai_disclosure")}
    </div>
  );

  // ── Reproductor + descargas ────────────────────────────────────────────────
  const AudioResult = ({
    result,
    filename,
    subtitles,
    audioRef,
  }: {
    result: SynthResult;
    filename: string;
    subtitles?: Record<string, string>;
    audioRef?: React.Ref<HTMLAudioElement>;
  }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <AudioLines className={`h-4 w-4 ${ACCENT_TEXT}`} />
          {t("try-tts.result_title")}
        </span>
        <span className="text-xs text-gray-400">
          {formatMs(result.durationMs)} · {t("try-tts.chars_billed", { count: result.charactersBilled })}
          {result.cache === "hit" && ` · ${t("try-tts.cache_hit")}`}
        </span>
      </div>
      <audio ref={audioRef} src={result.audioUri} controls className="w-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadFile(result.audioUri, filename)}
          className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90`}
        >
          <Download className="h-4 w-4" />
          {t("try-tts.download_mp3")}
        </button>
        {subtitles?.srt && (
          <button
            type="button"
            onClick={() => downloadText(subtitles.srt, `${filename.replace(/\.\w+$/, "")}.srt`, "text/plain")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300"
          >
            <Captions className="h-4 w-4" />
            {t("try-tts.download_srt")}
          </button>
        )}
        {subtitles?.vtt && (
          <button
            type="button"
            onClick={() => downloadText(subtitles.vtt, `${filename.replace(/\.\w+$/, "")}.vtt`, "text/vtt")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300"
          >
            <Captions className="h-4 w-4" />
            {t("try-tts.download_vtt")}
          </button>
        )}
      </div>
      <AiDisclosure className="mt-4" />
    </div>
  );

  const rateLabel =
    rate === 1 ? t("try-tts.rate_normal") : `${rate.toFixed(2).replace(/\.?0+$/, "")}×`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-[max(64rem,64vw)] px-6">
        <DemoNav tone="rose" className="mb-8" />

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
              <AudioLines className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t("try-tts.title")}</h1>
              <p className="text-sm text-gray-500">{t("try-tts.subtitle")}</p>
            </div>
          </div>
          <StatusPill tone={statusTone} label={statusLabel} spinning={anyBusy} />
        </div>

        {/* Caso de negocio desde el inicio */}
        <BusinessCase demoId="tts" variant="banner" />

        {/* Aviso de IA global (ambos modos) */}
        <AiDisclosure className="mb-6" />

        {/* Tabs de modo */}
        <div className="mb-6 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {(["studio", "narrator"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === m ? `bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm` : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {m === "studio" ? <Mic className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {t(`try-tts.mode_${m}`)}
            </button>
          ))}
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Panel principal */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* ── MODO ESTUDIO ─────────────────────────────────────────── */}
              {mode === "studio" && (
                <motion.div
                  key="studio"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Type className="h-4 w-4 text-gray-400" />
                      {t("try-tts.studio_text_label")}
                      <InfoTip text={t("try-tts.studio_text_tip")} hoverColor={TIP_HOVER} />
                    </label>
                    <textarea
                      value={studioText}
                      onChange={(e) => setStudioText(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder={t("try-tts.studio_placeholder")}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Mic className="h-4 w-4 text-gray-400" />
                      {t("try-tts.voice_label")}
                      <InfoTip text={t("try-tts.voice_tip")} hoverColor={TIP_HOVER} />
                    </p>
                    <VoiceChips selected={studioVoice} onSelect={setStudioVoice} />
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Sparkles className="h-4 w-4 text-gray-400" />
                      {t("try-tts.vibe_label")}
                      <InfoTip text={t("try-tts.vibe_tip")} hoverColor={TIP_HOVER} />
                    </p>
                    <VibeChips selected={studioVibe} onSelect={setStudioVibe} />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <Gauge className="h-4 w-4 text-gray-400" />
                        {t("try-tts.rate_label")}
                        <InfoTip text={t("try-tts.rate_tip")} hoverColor={TIP_HOVER} />
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-rose-600">{rateLabel}</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 outline-none accent-rose-500"
                    />
                  </div>

                  {studioError && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {studioError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={synthesize}
                    disabled={studioBusy || !studioText.trim()}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40`}
                  >
                    {studioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                    {t("try-tts.generate_cta")}
                  </button>

                  {studioResult && (
                    <AudioResult result={studioResult} filename="robles-tts-studio.mp3" />
                  )}
                </motion.div>
              )}

              {/* ── MODO NARRADOR ────────────────────────────────────────── */}
              {mode === "narrator" && (
                <motion.div
                  key="narrator"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Sparkles className="h-4 w-4 text-gray-400" />
                      {t("try-tts.usecase_label")}
                      <InfoTip text={t("try-tts.usecase_tip")} hoverColor={TIP_HOVER} />
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {USE_CASES.map((uc) => {
                        const active = useCase === uc.id;
                        return (
                          <button
                            key={uc.id}
                            type="button"
                            onClick={() => applyUseCase(uc.id)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                              active ? "border-rose-400 bg-rose-50 text-rose-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            {t(`try-tts.usecase_${uc.id}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {t("try-tts.narrator_text_label")}
                      <InfoTip text={t("try-tts.narrator_text_tip")} hoverColor={TIP_HOVER} />
                    </label>
                    <textarea
                      value={narrateText}
                      onChange={(e) => setNarrateText(e.target.value)}
                      rows={8}
                      maxLength={20000}
                      placeholder={t("try-tts.narrator_placeholder")}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">
                      {t("try-tts.char_count", { count: narrateText.length, max: 20000 })}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Mic className="h-4 w-4 text-gray-400" />
                      {t("try-tts.voice_label")}
                    </p>
                    <VoiceChips selected={narrateVoice} onSelect={setNarrateVoice} />
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Sparkles className="h-4 w-4 text-gray-400" />
                      {t("try-tts.vibe_label")}
                    </p>
                    <VibeChips selected={narrateVibe} onSelect={setNarrateVibe} />
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Captions className="h-4 w-4 text-gray-400" />
                      {t("try-tts.subtitles_label")}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={wantSrt}
                          onChange={(e) => setWantSrt(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400"
                        />
                        {t("try-tts.subtitles_srt")}
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={wantVtt}
                          onChange={(e) => setWantVtt(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400"
                        />
                        {t("try-tts.subtitles_vtt")}
                      </label>
                    </div>
                  </div>

                  {narrateError && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {narrateError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={narrate}
                    disabled={narrateBusy || !narrateText.trim()}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40`}
                  >
                    {narrateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
                    {t("try-tts.narrate_cta")}
                  </button>

                  {narrateBusy && (
                    <p className="text-center text-xs text-gray-400">{t("try-tts.narrate_working")}</p>
                  )}

                  {narrateResult && (
                    <>
                      <AudioResult
                        result={narrateResult}
                        filename="robles-tts-narration.mp3"
                        subtitles={narrateResult.subtitles}
                        audioRef={narrateAudioRef}
                      />
                      {narrateResult.segments.length > 0 && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <ListOrdered className={`h-4 w-4 ${ACCENT_TEXT}`} />
                            {t("try-tts.segments_title", { count: narrateResult.segments.length })}
                          </p>
                          <ol className="max-h-72 space-y-1.5 overflow-y-auto">
                            {narrateResult.segments.map((seg) => (
                              <li
                                key={seg.index}
                                className="flex gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 ring-1 ring-gray-100"
                              >
                                <span className="shrink-0 font-mono tabular-nums text-gray-400">
                                  {formatMs(seg.start_ms)}
                                </span>
                                <span className="min-w-0 flex-1">{seg.text}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Inspector de API */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
              <ApiCallLog
                calls={logCalls}
                active={anyBusy}
                failed={logCalls.length > 0 && !logCalls[0].ok}
                activeDescription={t("try-tts.log_active")}
                empty={{ title: t("try-tts.log_empty_title"), description: t("try-tts.log_empty") }}
              />
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <HowItWorks
          theme={{
            gradient: ACCENT_GRADIENT,
            text: ACCENT_TEXT,
            soft: ACCENT_SOFT,
            activeTab: "border-rose-400 bg-rose-50/60 ring-2 ring-rose-100",
            notice: "bg-rose-50/70 text-rose-900",
          }}
          labels={{
            title: t("try-tts.how_simple_title"),
            subtitle: t("try-tts.how_simple_subtitle"),
            overviewTitle: t("try-tts.how_overview_title"),
            overviewSubtitle: t("try-tts.how_overview_subtitle"),
            techTitle: t("try-tts.how_tech_title"),
            techSubtitle: t("try-tts.how_tech_subtitle"),
          }}
          steps={([1, 2, 3, 4] as const).map((n) => ({
            icon: [Type, Mic, AudioLines, Download][n - 1],
            title: t(`try-tts.flow_step${n}_title`),
            desc: t(`try-tts.flow_step${n}_desc`),
          }))}
          notice={t("try-tts.tech_note")}
          technical={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TechCard icon={Cpu} title={t("try-tts.tech_engine_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-tts.tech_engine_desc")}</p>
              </TechCard>
              <TechCard icon={Scissors} title={t("try-tts.tech_chunk_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-tts.tech_chunk_desc")}</p>
              </TechCard>
              <TechCard icon={Captions} title={t("try-tts.tech_subs_title")} iconClass={ACCENT_TEXT}>
                <p className="text-sm leading-relaxed text-gray-600">{t("try-tts.tech_subs_desc")}</p>
              </TechCard>
            </div>
          }
        />

        {/* Calculadora de ahorro + CTA (aparece tras el primer resultado) */}
        {hasResult && (
          <div className="mt-2">
            <SavingsCalculator demoId="tts" />
          </div>
        )}
      </div>
    </div>
  );
}
