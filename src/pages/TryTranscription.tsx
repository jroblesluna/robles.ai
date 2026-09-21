import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import {
  Mic,
  MicOff,
  Loader2,
  Terminal,
  ChevronDown,
  Cpu,
  Workflow,
  ShieldCheck,
  AudioLines,
  RotateCcw,
  Info,
  Sparkles,
  CheckCircle2,
  Languages,
  Zap,
  Building2,
  Users,
  BookOpen,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { Button } from "@/components/ui/button";

// ── Brand accent (teal/emerald) ──────────────────────────────────────────────
const ACCENT_GRADIENT = "from-teal-500 to-emerald-600";
const ACCENT_TEXT = "text-teal-600";
const TIP_HOVER = "hover:text-teal-600 focus:text-teal-600";
const BADGE_BG = "bg-teal-100";
const BADGE_TEXT = "text-teal-700";
const BADGE_DOT = "bg-teal-500";

// ── API base URL ─────────────────────────────────────────────────────────────
const getBaseApi = (): string => {
  // VITE_TRANSCRIPTION_API overrides the default (e.g. point local dev at prod).
  const override: string | undefined = import.meta.env.VITE_TRANSCRIPTION_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://transcription-api.robles.ai";
};
const BASE_API = getBaseApi();
// WebSocket URL (same host, swap protocol)
const WS_BASE = BASE_API.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws"));
const HEALTH_URL = `${BASE_API}/health`;
const ANALYZE_URL = `${BASE_API}/analyze`;
const WS_URL = `${WS_BASE}/ws/transcribe`;

// ── Audio capture (raw PCM linear16 @ 16 kHz mono) ───────────────────────────
// The `start` frame declares `encoding: "linear16"` / 16 kHz mono, and the API
// hands exactly that to Deepgram (it does not forward the declared encoding).
// MediaRecorder would emit a WebM/Opus *container*, which Deepgram would then
// read as raw PCM — noise, so no `partial`/`final` ever comes back. So we
// capture raw PCM ourselves through the Web Audio API instead.
const TARGET_SAMPLE_RATE = 16000;
const FRAME_MS = 128; // ~2048 samples per WS frame at 16 kHz

/** AudioWorklet processor: buffers mono Float32 input into fixed-size frames. */
const PCM_WORKLET_SRC = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._size = (options.processorOptions && options.processorOptions.frameSamples) || 2048;
    this._buffer = new Float32Array(this._size);
    this._offset = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset === this._size) {
        const frame = this._buffer.slice(0);
        this.port.postMessage(frame, [frame.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;

let pcmWorkletUrl: string | null = null;
const getPcmWorkletUrl = () => {
  if (!pcmWorkletUrl) {
    pcmWorkletUrl = URL.createObjectURL(
      new Blob([PCM_WORKLET_SRC], { type: "application/javascript" })
    );
  }
  return pcmWorkletUrl;
};

/** Linear-interpolation resample to 16 kHz (no-op when the context already is). */
function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_SAMPLE_RATE) return input;
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const a = input[idx];
    const b = idx + 1 < input.length ? input[idx + 1] : a;
    out[i] = a + (b - a) * (pos - idx);
  }
  return out;
}

/** Float32 [-1,1] → little-endian signed 16-bit PCM (what Deepgram expects). */
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

// ── Types ────────────────────────────────────────────────────────────────────
type ServiceStatus = "checking" | "warm" | "warming" | "cold";
type WsStatus = "disconnected" | "connecting" | "ready" | "closed" | "error";
type Language = "es" | "en" | "multi";
type Mode = "basic" | "specialized";

interface Turn {
  key: string;       // stable identity for React
  speaker: number;
  text: string;
  ts: number;
  isFinal: boolean;
}

interface LogEntry {
  key: string;
  label: string;   // WS direction/type label shown above the JSON
  data: any;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Speaker colour palette for the transcript bubbles (wraps around). */
const SPEAKER_COLORS = [
  "bg-teal-50 border-teal-200 text-teal-900",
  "bg-emerald-50 border-emerald-200 text-emerald-900",
  "bg-sky-50 border-sky-200 text-sky-900",
  "bg-violet-50 border-violet-200 text-violet-900",
  "bg-amber-50 border-amber-200 text-amber-900",
];
const speakerColor = (idx: number) => SPEAKER_COLORS[idx % SPEAKER_COLORS.length];

/** Render a speaker label using the roles returned by /analyze if available. */
function speakerLabel(
  idx: number,
  speakers: Record<string, string> | null,
  t: (k: string, opts?: any) => string
): string {
  if (speakers) {
    const role = speakers[String(idx)];
    if (role) return role;
  }
  return t("try-transcription.speaker_label", { n: idx + 1 });
}

/** The API answers "unknown" (or nothing) when no industry signal is present. */
function isKnownIndustry(industry: unknown): industry is string {
  return typeof industry === "string" && industry.trim() !== "" && !/^(unknown|none|n\/a|general)$/i.test(industry.trim());
}

function formatElapsed(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Compact segmented control used in the workspace toolbar. */
function Segmented<T extends string>({
  icon: Icon,
  label,
  tip,
  value,
  onChange,
  options,
  disabled,
  fullWidth,
}: {
  icon: LucideIcon;
  label: string;
  tip: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <InfoTip text={tip} hoverColor={TIP_HOVER} />
      </p>
      <div role="radiogroup" aria-label={label} className={`${fullWidth ? "flex w-full" : "inline-flex"} rounded-lg bg-gray-200/60 p-1`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`${fullWidth ? "flex-1" : ""} rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              value === o.value ? "bg-white text-teal-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type StatusTone = "ready" | "live" | "busy" | "error" | "idle";
const TONE_PILL: Record<StatusTone, string> = {
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  live: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  busy: "bg-amber-50 text-amber-800 ring-amber-200",
  error: "bg-red-50 text-red-700 ring-red-200",
  idle: "bg-gray-100 text-gray-600 ring-gray-200",
};
const TONE_DOT: Record<StatusTone, string> = {
  ready: "bg-emerald-500",
  live: "animate-pulse bg-emerald-500",
  busy: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-gray-400",
};

/** Service / WebSocket status shown at the right of the toolbar. */
function StatusPill({ tone, label, spinning }: { tone: StatusTone; label: string; spinning?: boolean }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${TONE_PILL[tone]}`}>
      {spinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />}
      {label}
    </span>
  );
}

/** Labelled block inside the analysis panel. */
function ResultBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      {children}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function TryTranscription() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("speech");

  // Service / WS state
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("checking");
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [recording, setRecording] = useState(false);

  // Session data
  const [language, setLanguage] = useState<Language>("es");
  const [mode, setMode] = useState<Mode>("basic");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [audioSeconds, setAudioSeconds] = useState<number | null>(null);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  // One cached analysis per mode, so switching modes after analyzing is instant
  // the second time (and never shows a result from the other mode as current).
  const [analyses, setAnalyses] = useState<Partial<Record<Mode, any>>>({});

  // Log
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const addLog = useCallback((label: string, data: any) =>
    setLogEntries((p) => [{ key: uuidv4(), label, data }, ...p]), []);

  // UI
  const [showTech, setShowTech] = useState(false);
  const [sidePanel, setSidePanel] = useState<"analysis" | "log">("analysis");
  const [elapsed, setElapsed] = useState(0);

  // Refs (not re-rendered on change)
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureNodeRef = useRef<AudioNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<Turn[]>([]); // shadow of transcript for WS callbacks
  transcriptRef.current = transcript;
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);

  // ── Warm-up on mount ──────────────────────────────────────────────────────
  // transcription-api exposes GET /health (not GET /), so we use it for the
  // latency probe. A fast 200 reply means warm; slow or abort → cold.
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const t0 = Date.now();
    fetch(HEALTH_URL, { signal: ctrl.signal })
      .then(() => {
        clearTimeout(timer);
        if (!cancelled) setServiceStatus(Date.now() - t0 < 2500 ? "warm" : "cold");
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled) setServiceStatus("cold");
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  // Keep the transcript box pinned to the latest turn (scrolls the box, not the page)
  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  // Recording timer
  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  // ── Warm-up loop ──────────────────────────────────────────────────────────
  const warmUpService = async (): Promise<boolean> => {
    setServiceStatus("warming");
    for (let i = 0; i < 15; i++) {
      const t0 = Date.now();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(HEALTH_URL, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok && Date.now() - t0 < 2500) {
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

  const ensureWarm = async () => {
    if (serviceStatus === "warm") return true;
    return warmUpService();
  };

  // ── Session management ─────────────────────────────────────────────────────

  /** Tear down the Web Audio graph and release the microphone. Idempotent. */
  const stopCapture = useCallback(() => {
    try { captureNodeRef.current?.disconnect(); } catch {}
    try { sourceNodeRef.current?.disconnect(); } catch {}
    captureNodeRef.current = null;
    sourceNodeRef.current = null;
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const closeSession = useCallback(() => {
    // Send stop if WS is open
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: "stop" })); } catch {}
    }
    wsRef.current?.close();
    wsRef.current = null;
    stopCapture();
    setRecording(false);
  }, [stopCapture]);

  /**
   * Build the capture graph: mic → (AudioWorklet | ScriptProcessor) → muted sink,
   * pushing linear16 @ 16 kHz mono frames onto the socket. The node is connected
   * through a zero-gain node because a capture node only gets pulled by the
   * renderer when it reaches the destination.
   */
  const startCapture = useCallback(async (stream: MediaStream, ws: WebSocket) => {
    const AudioCtor: typeof AudioContext =
      window.AudioContext ?? (window as any).webkitAudioContext;

    // Asking for a 16 kHz context lets the browser resample the mic for us; if
    // it refuses the hint (older Safari), we resample each frame by hand.
    let ctx: AudioContext;
    try {
      ctx = new AudioCtor({ sampleRate: TARGET_SAMPLE_RATE });
    } catch {
      ctx = new AudioCtor();
    }
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const frameSamples = Math.round((ctx.sampleRate * FRAME_MS) / 1000);
    const source = ctx.createMediaStreamSource(stream);
    sourceNodeRef.current = source;

    const sendFrame = (frame: Float32Array) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(floatTo16BitPCM(resampleTo16k(frame, ctx.sampleRate)));
    };

    let node: AudioNode;
    let usedWorklet = true;
    try {
      await ctx.audioWorklet.addModule(getPcmWorkletUrl());
      const worklet = new AudioWorkletNode(ctx, "pcm-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: "explicit",
        processorOptions: { frameSamples },
      });
      worklet.port.onmessage = (e) => sendFrame(e.data as Float32Array);
      node = worklet;
    } catch {
      // AudioWorklet unavailable (or blocked) → deprecated but widely supported.
      usedWorklet = false;
      const legacy = ctx.createScriptProcessor(4096, 1, 1);
      legacy.onaudioprocess = (e) =>
        sendFrame(new Float32Array(e.inputBuffer.getChannelData(0)));
      node = legacy;
    }
    captureNodeRef.current = node;

    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(ctx.destination);

    addLog("→ WS audio", {
      encoding: "linear16",
      sampleRate: TARGET_SAMPLE_RATE,
      contextSampleRate: ctx.sampleRate,
      frameSamples,
      node: usedWorklet ? "AudioWorkletNode" : "ScriptProcessorNode",
    });
  }, [addLog]);

  const handleReset = () => {
    closeSession();
    setTranscript([]);
    setAnalyses({});
    setLogEntries([]);
    setWsStatus("disconnected");
    setAudioSeconds(null);
    setSidePanel("analysis");
  };

  // ── Start recording ────────────────────────────────────────────────────────
  const handleStartRecording = async () => {
    if (recording || wsStatus === "connecting") return;
    trackStart();

    // Wake the service if cold
    if (!(await ensureWarm())) {
      addLog("error", { message: t("try-transcription.service_warm_failed") });
      return;
    }

    // Reset transcript for new session (keep analysis from last session until new one)
    setTranscript([]);
    setAnalyses({});
    setAudioSeconds(null);

    // 1. Open WebSocket
    setWsStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      // Send start message
      const startMsg = { type: "start", language, sample_rate: 16000, encoding: "linear16" };
      ws.send(JSON.stringify(startMsg));
      addLog("→ WS start", startMsg);
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data as string); } catch { return; }
      addLog(`← WS ${msg.type}`, msg);

      switch (msg.type) {
        case "ready":
          setWsStatus("ready");
          break;

        case "partial":
          setTranscript((prev) => {
            // Upsert: if there's already a provisional turn for this speaker
            // at roughly the same ts, replace it; otherwise append.
            const idx = prev.findLastIndex(
              (t) => !t.isFinal && t.speaker === msg.speaker
            );
            const turn: Turn = {
              key: idx >= 0 ? prev[idx].key : uuidv4(),
              speaker: msg.speaker,
              text: msg.text,
              ts: msg.ts ?? 0,
              isFinal: false,
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = turn;
              return next;
            }
            return [...prev, turn];
          });
          break;

        case "final":
          setTranscript((prev) => {
            // Promote the most-recent provisional turn for this speaker, or append.
            const idx = prev.findLastIndex(
              (t) => !t.isFinal && t.speaker === msg.speaker
            );
            const turn: Turn = {
              key: idx >= 0 ? prev[idx].key : uuidv4(),
              speaker: msg.speaker,
              text: msg.text,
              ts: msg.ts ?? 0,
              isFinal: true,
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = turn;
              return next;
            }
            return [...prev, turn];
          });
          break;

        case "info":
          // session_limit or idle_timeout — session will close after this
          break;

        case "error":
          setWsStatus("error");
          setRecording(false);
          break;

        case "closed":
          setAudioSeconds(msg.audioSeconds ?? null);
          setWsStatus("closed");
          setRecording(false);
          stopCapture();
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      addLog("← WS error", { type: "error", message: "WebSocket connection error" });
      setWsStatus("error");
      setRecording(false);
    };

    ws.onclose = (ev) => {
      if (wsStatus !== "closed") setWsStatus("closed");
      setRecording(false);
    };

    // 2. Get mic
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: TARGET_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch {
      addLog("error", { message: "Microphone access denied" });
      ws.close();
      setWsStatus("error");
      return;
    }
    streamRef.current = stream;

    // 3. Stream raw PCM (linear16 @ 16 kHz mono) — the format declared on start
    try {
      await startCapture(stream, ws);
    } catch (err: any) {
      addLog("error", { message: "Audio capture failed", detail: err?.message });
      stopCapture();
      ws.close();
      setWsStatus("error");
      return;
    }
    setRecording(true);
  };

  // ── Stop recording ─────────────────────────────────────────────────────────
  const handleStopRecording = () => {
    if (!recording) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      addLog("→ WS stop", { type: "stop" });
    }
    stopCapture();
    setRecording(false);
    setSidePanel("analysis");
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async (targetMode: Mode = mode) => {
    const finalTurns = transcript
      .filter((t) => t.isFinal)
      .map((t) => ({ speaker: t.speaker, text: t.text }));

    if (!finalTurns.length) return;
    setAnalyzing(true);

    const payload = { transcript: finalTurns, mode: targetMode, language };
    addLog("→ POST /analyze", payload);
    try {
      const res = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      addLog("← POST /analyze", data);
      if (data.status === "success") {
        setAnalyses((prev) => ({ ...prev, [targetMode]: data.data }));
        setSidePanel("analysis");
        trackComplete({ mode: targetMode });
      }
    } catch (err: any) {
      addLog("← POST /analyze error", { error: err?.message });
    } finally {
      setAnalyzing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => () => closeSession(), [closeSession]);

  const hasFinalTurns = transcript.some((t) => t.isFinal);
  const canAnalyze = hasFinalTurns && wsStatus !== "connecting" && wsStatus !== "ready" && !analyzing;
  const canRecord = serviceStatus !== "checking" && serviceStatus !== "warming" && wsStatus !== "connecting";
  const speakerCount = new Set(transcript.map((turn) => turn.speaker)).size;

  // Result for the selected mode; while re-analyzing in the other mode, keep
  // the previous one on screen (dimmed) instead of flashing an empty panel.
  const currentAnalysis = analyses[mode] ?? null;
  const analysisResult = currentAnalysis ?? (analyzing ? Object.values(analyses)[0] ?? null : null);
  const reanalyzing = analyzing && !currentAnalysis && analysisResult !== null;

  // After a first analysis, the mode acts as a view switch: re-analyze on
  // change (once per mode), then serve the cached result.
  const handleModeChange = (next: Mode) => {
    setMode(next);
    if (Object.keys(analyses).length > 0 && !analyses[next] && canAnalyze) handleAnalyze(next);
  };

  const status: { tone: StatusTone; label: string; spinning?: boolean } =
    wsStatus === "connecting" ? { tone: "busy", label: t("try-transcription.ws_status_connecting"), spinning: true }
    : wsStatus === "ready" ? { tone: "live", label: t("try-transcription.ws_status_ready") }
    : wsStatus === "error" ? { tone: "error", label: t("try-transcription.ws_status_error") }
    : serviceStatus === "warming" ? { tone: "busy", label: t("try-transcription.status_warming"), spinning: true }
    : serviceStatus === "checking" ? { tone: "idle", label: t("try-transcription.status_checking"), spinning: true }
    : serviceStatus === "cold" ? { tone: "busy", label: t("try-transcription.status_cold") }
    : { tone: "ready", label: t("try-transcription.status_ready") };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">

        {/* Header: pitch + how it works (left), business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <AudioLines className="h-6 w-6" />
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full ${BADGE_BG} px-3 py-1 text-xs font-semibold ${BADGE_TEXT}`}>
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${BADGE_DOT}`} />
                {t("try-transcription.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-transcription.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-transcription.description")}
            </p>

            {/* How it works (8.3) */}
            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-transcription.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-transcription.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-transcription.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {[
                { icon: ShieldCheck, key: "trust_private" },
                { icon: Zap, key: "trust_realtime" },
                { icon: Languages, key: "trust_languages" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t(`try-transcription.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="speech" variant="aside" />
          </div>
        </div>

        {/* ── Workspace: toolbar · transcript stage · analysis/log panel ── */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Toolbar: configuration + live status */}
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/70 px-5 py-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <Segmented
                icon={Languages}
                label={t("try-transcription.language_label")}
                tip={t("try-transcription.tip_language")}
                value={language}
                onChange={setLanguage}
                disabled={recording}
                options={(["es", "en", "multi"] as Language[]).map((l) => ({
                  value: l,
                  label: t(`try-transcription.language_${l}`),
                }))}
              />
            </div>
            <StatusPill tone={status.tone} spinning={status.spinning} label={status.label} />
          </div>

          {/* Cold-start notice (only before the first session) */}
          {(serviceStatus === "cold" || serviceStatus === "warming") && !recording && (
            <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/70 px-5 py-2.5 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                {serviceStatus === "warming"
                  ? t("try-transcription.service_warming")
                  : t("try-transcription.service_cold_hint")}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:h-[620px] lg:grid-cols-5">

            {/* ── Stage: live transcript ───────────────────────────────────── */}
            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-3 lg:border-r lg:border-gray-100">
              <div className="flex items-center justify-between px-5 pt-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {t("try-transcription.transcript_label")}
                  <InfoTip text={t("try-transcription.tip_transcript")} hoverColor={TIP_HOVER} />
                </h2>
                {speakerCount > 0 && (
                  <span className="text-xs text-gray-400">
                    {t("try-transcription.speakers_count", { count: speakerCount })}
                  </span>
                )}
              </div>

              <div ref={transcriptBoxRef} className="h-[360px] overflow-y-auto px-5 py-4 lg:h-auto lg:min-h-0 lg:flex-1">
                {transcript.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={!canRecord || recording}
                      aria-label={t("try-transcription.record_start")}
                      className={`group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg shadow-teal-500/25 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100`}
                    >
                      {canRecord && !recording && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-teal-400/30" />
                      )}
                      {wsStatus === "connecting" || serviceStatus === "warming" ? (
                        <Loader2 className="relative h-8 w-8 animate-spin" />
                      ) : (
                        <Mic className="relative h-8 w-8" />
                      )}
                    </button>
                    <p className="mt-5 text-base font-semibold text-gray-900">
                      {recording ? t("try-transcription.recording") : t("try-transcription.stage_empty_title")}
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-gray-500">{t("try-transcription.transcript_empty")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {transcript.map((turn) => (
                        <motion.div
                          key={turn.key}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3"
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${speakerColor(turn.speaker)}`}>
                            {turn.speaker + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500">
                              {speakerLabel(turn.speaker, analysisResult?.speakers ?? null, t)}
                            </p>
                            <p className={`mt-0.5 text-sm leading-relaxed ${turn.isFinal ? "text-gray-800" : "italic text-gray-400"}`}>
                              {turn.text}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Control bar */}
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-4">
                <Button
                  onClick={recording ? handleStopRecording : handleStartRecording}
                  disabled={!canRecord}
                  className={`rounded-xl px-5 text-sm font-semibold text-white shadow-md transition-all disabled:opacity-50 ${
                    recording
                      ? "bg-red-500 shadow-red-500/20 hover:bg-red-600"
                      : `bg-gradient-to-r ${ACCENT_GRADIENT} shadow-teal-500/20 hover:brightness-105`
                  }`}
                >
                  {wsStatus === "connecting" || serviceStatus === "warming" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : recording ? (
                    <MicOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4" />
                  )}
                  {recording ? t("try-transcription.record_stop") : t("try-transcription.record_start")}
                </Button>

                {recording && (
                  <span className="flex items-center gap-2 text-sm font-medium tabular-nums text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    {formatElapsed(elapsed)}
                  </span>
                )}
                {!recording && audioSeconds !== null && wsStatus === "closed" && (
                  <span className="text-xs tabular-nums text-gray-400">
                    {t("try-transcription.audio_duration", { seconds: audioSeconds.toFixed(1) })}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {(transcript.length > 0 || wsStatus !== "disconnected") && !recording && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReset}
                      title={t("try-transcription.reset")}
                      aria-label={t("try-transcription.reset")}
                      className="rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Side panel: AI analysis / raw API log ────────────────────── */}
            <div className="flex min-h-0 min-w-0 flex-col border-t border-gray-100 lg:col-span-2 lg:border-t-0">
              <div role="tablist" className="flex gap-1 border-b border-gray-100 px-3 pt-2">
                {([
                  { id: "analysis", icon: Sparkles, label: t("try-transcription.tab_analysis") },
                  { id: "log", icon: Terminal, label: t("try-transcription.tab_log"), count: logEntries.length },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={sidePanel === tab.id}
                    onClick={() => setSidePanel(tab.id)}
                    className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      sidePanel === tab.id
                        ? "border-teal-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <tab.icon className={`h-4 w-4 ${sidePanel === tab.id ? ACCENT_TEXT : ""}`} />
                    {tab.label}
                    {"count" in tab && tab.count > 0 && (
                      <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold tabular-nums text-gray-600">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="max-h-[560px] overflow-y-auto p-5 lg:max-h-none lg:min-h-0 lg:flex-1">
                {sidePanel === "analysis" ? (
                  <div className="space-y-5">
                    {/* Analysis controls: the mode lives next to the button it affects */}
                    <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4">
                      <Segmented
                        icon={Cpu}
                        label={t("try-transcription.mode_label")}
                        tip={t("try-transcription.tip_mode")}
                        value={mode}
                        onChange={handleModeChange}
                        disabled={recording || analyzing}
                        fullWidth
                        options={(["basic", "specialized"] as Mode[]).map((m) => ({
                          value: m,
                          label: t(`try-transcription.mode_${m}`),
                        }))}
                      />
                      <p className="mt-2 text-xs text-gray-500">{t(`try-transcription.mode_${mode}_desc`)}</p>

                      {hasFinalTurns && !currentAnalysis && !reanalyzing && (
                        <Button
                          onClick={() => handleAnalyze()}
                          disabled={!canAnalyze}
                          className={`mt-4 w-full rounded-xl bg-gradient-to-r ${ACCENT_GRADIENT} text-sm font-semibold text-white shadow-md shadow-teal-500/20 hover:brightness-105 disabled:opacity-50`}
                        >
                          {analyzing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          {analyzing ? t("try-transcription.analyzing") : t("try-transcription.analyze")}
                        </Button>
                      )}
                      {reanalyzing && (
                        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("try-transcription.analysis_reanalyzing", { mode: t(`try-transcription.mode_${mode}`) })}
                        </p>
                      )}
                      {currentAnalysis && !analyzing && (
                        <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                          <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${ACCENT_TEXT}`} />
                          {t("try-transcription.analysis_mode_hint")}
                        </p>
                      )}
                    </div>

                  {analysisResult ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className={`space-y-5 transition-opacity ${reanalyzing ? "pointer-events-none opacity-40" : ""}`}>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl bg-teal-50 p-4`}>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            {t("try-transcription.results_industry")}
                          </p>
                          {isKnownIndustry(analysisResult.industry) ? (
                            <p className={`mt-1 text-lg font-bold ${ACCENT_TEXT}`}>{analysisResult.industry}</p>
                          ) : (
                            <>
                              <p className="mt-1 text-lg font-bold text-gray-700">{t("try-transcription.industry_general")}</p>
                              <p className="mt-0.5 text-xs leading-snug text-gray-500">{t("try-transcription.industry_general_hint")}</p>
                            </>
                          )}
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            {t("try-transcription.results_confidence")}
                          </p>
                          <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">
                            {(analysisResult.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <ResultBlock label={t("try-transcription.results_title_label")}>
                        <p className="text-sm font-semibold text-gray-900">{analysisResult.title}</p>
                      </ResultBlock>

                      {analysisResult.speakers && Object.keys(analysisResult.speakers).length > 0 && (
                        <ResultBlock label={t("try-transcription.results_speakers")}>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(analysisResult.speakers).map(([idx, role]) => (
                              <span
                                key={idx}
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${speakerColor(Number(idx))}`}
                              >
                                {t("try-transcription.speaker_label", { n: Number(idx) + 1 })}: {role as string}
                              </span>
                            ))}
                          </div>
                        </ResultBlock>
                      )}

                      {analysisResult.terms?.length > 0 && (
                        <ResultBlock label={t("try-transcription.results_terms")}>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-100 text-left text-gray-500">
                                  <th className="pb-1.5 font-semibold">{t("try-transcription.results_term_spoken")}</th>
                                  <th className="pb-1.5 pl-3 font-semibold">{t("try-transcription.results_term_basic")}</th>
                                  <th className="pb-1.5 pl-3 font-semibold">{t("try-transcription.results_term_specialized")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisResult.terms.map((term: any, i: number) => (
                                  <tr key={i} className="border-b border-gray-50 last:border-0">
                                    <td className="py-1.5 font-medium text-gray-900">{term.spoken}</td>
                                    <td className={`py-1.5 pl-3 ${mode === "basic" ? "font-medium text-teal-700" : "text-gray-600"}`}>{term.basic}</td>
                                    <td className={`py-1.5 pl-3 ${mode === "specialized" ? "font-medium text-teal-700" : "text-gray-600"}`}>{term.specialized}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </ResultBlock>
                      )}

                      <ResultBlock label={t("try-transcription.results_summary")}>
                        <p className="text-sm leading-relaxed text-gray-700">{analysisResult.summary}</p>
                      </ResultBlock>
                      </div>
                    </motion.div>
                  ) : (
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        {t("try-transcription.analysis_empty_title")}
                        <InfoTip text={t("try-transcription.tip_analyze")} hoverColor={TIP_HOVER} />
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {hasFinalTurns
                          ? t("try-transcription.analysis_ready")
                          : t("try-transcription.analysis_locked")}
                      </p>
                      <ul className="mt-5 space-y-2">
                        {[
                          { icon: Building2, key: "results_industry" },
                          { icon: Users, key: "results_speakers" },
                          { icon: BookOpen, key: "results_terms" },
                          { icon: FileText, key: "results_summary" },
                        ].map(({ icon: Icon, key }) => (
                          <li key={key} className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 px-3 py-2.5 text-sm text-gray-600">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50">
                              <Icon className="h-4 w-4 text-gray-400" />
                            </span>
                            {t(`try-transcription.${key}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </div>
                ) : logEntries.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-24 w-24 opacity-50" />
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                      {t("try-transcription.log_empty_title")}
                      <InfoTip text={t("try-transcription.tip_log")} hoverColor={TIP_HOVER} />
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-transcription.log_empty")}</p>
                  </div>
                ) : (
                  <LayoutGroup>
                    <AnimatePresence initial={false}>
                      {logEntries.map((entry) => (
                        <motion.div
                          key={entry.key}
                          layout
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mb-4"
                        >
                          <span className={`mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            entry.label.startsWith("→")
                              ? `${BADGE_BG} ${BADGE_TEXT}`
                              : "bg-sky-100 text-sky-700"
                          }`}>
                            {entry.label}
                          </span>
                          <JsonHighlight data={entry.data} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </LayoutGroup>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Technical section (collapsible) ──────────────────────────── */}
        <SavingsCalculator demoId="speech" />

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${BADGE_BG}`}>
                <Cpu className={`h-4 w-4 ${ACCENT_TEXT}`} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{t("try-transcription.tech_title")}</span>
                <span className="block text-xs text-gray-400">{t("try-transcription.tech_subtitle")}</span>
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
                <div className="grid grid-cols-1 gap-6 border-t border-gray-100 px-6 py-6 md:grid-cols-3">
                  {/* Flow */}
                  <div>
                    <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900`}>
                      <Workflow className={`h-4 w-4 ${ACCENT_TEXT}`} />
                      {t("try-transcription.tech_flow_title")}
                    </h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      {[1, 2, 3, 4].map((n) => (
                        <li key={n} className="flex gap-2">
                          <span className={`font-semibold ${ACCENT_TEXT}`}>{n}.</span>
                          {t(`try-transcription.tech_flow_${n}`)}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Models */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Cpu className={`h-4 w-4 ${ACCENT_TEXT}`} />
                      {t("try-transcription.tech_model_title")}
                    </h3>
                    <dl className="space-y-1.5 text-xs">
                      {[
                        ["try-transcription.tech_stack_stt_label", "try-transcription.tech_stack_stt"],
                        ["try-transcription.tech_stack_brain_label", "try-transcription.tech_stack_brain"],
                        ["try-transcription.tech_stack_serving_label", "try-transcription.tech_stack_serving"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2 border-b border-gray-100 pb-1.5">
                          <dt className="text-gray-500">{t(label)}</dt>
                          <dd className="text-right font-medium text-gray-900">{t(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Privacy */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ShieldCheck className={`h-4 w-4 ${ACCENT_TEXT}`} />
                      {t("try-transcription.tech_api_title")}
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-600">
                      {[1, 2, 3].map((n) => (
                        <li key={n} className="flex gap-2">
                          <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${ACCENT_TEXT}`} />
                          {t(`try-transcription.tech_api_${n}`)}
                        </li>
                      ))}
                    </ul>
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
