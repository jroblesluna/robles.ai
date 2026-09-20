import { useState, useEffect, useRef, useCallback } from "react";
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
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { StepCard } from "@/components/demo/StepCard";
import { Button } from "@/components/ui/button";

// ── Brand accent (teal/emerald) ──────────────────────────────────────────────
const ACCENT_GRADIENT = "from-teal-500 to-emerald-600";
const ACCENT_TEXT = "text-teal-600";
const TIP_HOVER = "hover:text-teal-600 focus:text-teal-600";
const BADGE_BG = "bg-teal-100";
const BADGE_TEXT = "text-teal-700";
const BADGE_DOT = "bg-teal-500";

// ── API base URL ─────────────────────────────────────────────────────────────
const getBaseApi = () => {
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

// ── Component ────────────────────────────────────────────────────────────────
export default function TryTranscription() {
  const { t } = useTranslation();

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
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Log
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const addLog = useCallback((label: string, data: any) =>
    setLogEntries((p) => [{ key: uuidv4(), label, data }, ...p]), []);

  // UI
  const [showTech, setShowTech] = useState(false);

  // Refs (not re-rendered on change)
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<Turn[]>([]); // shadow of transcript for WS callbacks
  transcriptRef.current = transcript;
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

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

  // Scroll transcript to bottom on new turns
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length]);

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
  const closeSession = useCallback(() => {
    // Send stop if WS is open
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: "stop" })); } catch {}
    }
    wsRef.current?.close();
    wsRef.current = null;
    // Stop microphone
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }, []);

  const handleReset = () => {
    closeSession();
    setTranscript([]);
    setAnalysisResult(null);
    setLogEntries([]);
    setWsStatus("disconnected");
    setAudioSeconds(null);
  };

  // ── Start recording ────────────────────────────────────────────────────────
  const handleStartRecording = async () => {
    if (recording || wsStatus === "connecting") return;

    // Wake the service if cold
    if (!(await ensureWarm())) {
      addLog("error", { message: t("try-transcription.service_warm_failed") });
      return;
    }

    // Reset transcript for new session (keep analysis from last session until new one)
    setTranscript([]);
    setAnalysisResult(null);
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
          mediaRecorderRef.current?.stop();
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
          sampleRate: 16000,
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

    // 3. MediaRecorder — use audio/webm; Deepgram accepts containerized audio
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = async (e) => {
      if (!e.data.size || ws.readyState !== WebSocket.OPEN) return;
      const buf = await e.data.arrayBuffer();
      ws.send(buf);
    };
    mr.start(250); // 250 ms chunks
    setRecording(true);
  };

  // ── Stop recording ─────────────────────────────────────────────────────────
  const handleStopRecording = () => {
    if (!recording) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      addLog("→ WS stop", { type: "stop" });
    }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const finalTurns = transcript
      .filter((t) => t.isFinal)
      .map((t) => ({ speaker: t.speaker, text: t.text }));

    if (!finalTurns.length) return;
    setAnalyzing(true);

    const payload = { transcript: finalTurns, mode, language };
    addLog("→ POST /analyze", payload);
    try {
      const res = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      addLog("← POST /analyze", data);
      if (data.status === "success") setAnalysisResult(data.data);
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left sm:gap-5">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm sm:h-24 sm:w-24`}>
              <AudioLines className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="flex flex-col justify-center">
              <span className={`mb-2 inline-flex w-fit items-center gap-1.5 self-center rounded-full ${BADGE_BG} px-3 py-1 text-xs font-semibold ${BADGE_TEXT} sm:self-start`}>
                <span className={`h-1.5 w-1.5 rounded-full ${BADGE_DOT}`} />
                {t("try-transcription.badge")}
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
                {t("try-transcription.title")}
              </h1>
              <p className="text-sm text-gray-600 sm:text-base">{t("try-transcription.description")}</p>
            </div>
          </div>

          {/* Disclaimer (8.3) */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
            <p>{t("try-transcription.instructions")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* ── Left: controls ────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-6">

            {/* Service status banner */}
            {serviceStatus === "warm" && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("try-transcription.service_ready")}
              </div>
            )}
            {(serviceStatus === "cold" || serviceStatus === "checking") && !recording && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>{t("try-transcription.service_cold_hint")}</span>
              </div>
            )}
            {serviceStatus === "warming" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                <span>{t("try-transcription.service_warming")}</span>
              </div>
            )}

            {/* Step 1: configure */}
            <StepCard
              icon={Settings2}
              number={1}
              title={t("try-transcription.step1_title")}
              tip={t("try-transcription.tip_configure")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Languages className="h-3.5 w-3.5" />
                    {t("try-transcription.language_label")}
                    <InfoTip text={t("try-transcription.tip_language")} hoverColor={TIP_HOVER} />
                  </label>
                  <div className="flex gap-2">
                    {(["es", "en", "multi"] as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLanguage(l)}
                        disabled={recording}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          language === l
                            ? `border-teal-400 ${BADGE_BG} ${BADGE_TEXT}`
                            : "border-gray-200 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50/50"
                        }`}
                      >
                        {t(`try-transcription.language_${l}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Cpu className="h-3.5 w-3.5" />
                    {t("try-transcription.mode_label")}
                    <InfoTip text={t("try-transcription.tip_mode")} hoverColor={TIP_HOVER} />
                  </label>
                  <div className="flex gap-2">
                    {(["basic", "specialized"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                          mode === m
                            ? `border-teal-400 ${BADGE_BG} ${BADGE_TEXT}`
                            : "border-gray-200 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50/50"
                        }`}
                      >
                        {t(`try-transcription.mode_${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </StepCard>

            {/* Step 2: record */}
            <StepCard
              icon={Mic}
              number={2}
              title={t("try-transcription.step2_title")}
              tip={t("try-transcription.tip_record")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              {/* WS status indicator */}
              {wsStatus !== "disconnected" && (
                <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  wsStatus === "ready" ? "bg-emerald-50 text-emerald-700" :
                  wsStatus === "connecting" ? "bg-amber-50 text-amber-800" :
                  wsStatus === "closed" ? "bg-gray-50 text-gray-600" :
                  "bg-red-50 text-red-700"
                }`}>
                  {wsStatus === "connecting" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {wsStatus === "ready" && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                  {wsStatus === "closed" && <span className="h-2 w-2 rounded-full bg-gray-400" />}
                  {wsStatus === "error" && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  <span>{t(`try-transcription.ws_status_${wsStatus}`)}</span>
                  {audioSeconds !== null && wsStatus === "closed" && (
                    <span className="ml-auto text-gray-400">{audioSeconds.toFixed(1)}s</span>
                  )}
                </div>
              )}

              {/* Record button */}
              <Button
                onClick={recording ? handleStopRecording : handleStartRecording}
                disabled={serviceStatus === "checking" || wsStatus === "connecting"}
                className={`w-full rounded-xl py-6 text-sm font-semibold text-white shadow-md transition-all disabled:opacity-50 ${
                  recording
                    ? "bg-red-500 shadow-red-500/20 hover:bg-red-600"
                    : `bg-gradient-to-r ${ACCENT_GRADIENT} shadow-teal-500/20 hover:brightness-105`
                }`}
              >
                {serviceStatus === "warming" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("try-transcription.service_warming")}
                  </span>
                ) : wsStatus === "connecting" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("try-transcription.ws_status_connecting")}
                  </span>
                ) : recording ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    {t("try-transcription.record_stop")}
                    <MicOff className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    {t("try-transcription.record_start")}
                  </span>
                )}
              </Button>

              {/* Live transcript */}
              {transcript.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("try-transcription.transcript_label")}
                    <InfoTip text={t("try-transcription.tip_transcript")} hoverColor={TIP_HOVER} />
                  </h3>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                    <AnimatePresence initial={false}>
                      {transcript.map((turn) => (
                        <motion.div
                          key={turn.key}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-lg border px-3 py-2 text-sm ${speakerColor(turn.speaker)} ${!turn.isFinal ? "opacity-60 italic" : ""}`}
                        >
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-60">
                            {speakerLabel(turn.speaker, analysisResult?.speakers ?? null, t)}
                          </span>
                          {turn.text}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={transcriptEndRef} />
                  </div>
                </div>
              )}
            </StepCard>

            {/* Step 3: analyze */}
            {hasFinalTurns && (
              <StepCard
                icon={Sparkles}
                number={3}
                title={t("try-transcription.step3_title")}
                tip={t("try-transcription.tip_analyze")}
                accent={ACCENT_GRADIENT}
                iconColor={ACCENT_TEXT}
                tipHoverColor={TIP_HOVER}
              >
                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className={`w-full rounded-xl py-5 text-sm font-semibold text-white shadow-md transition-all disabled:opacity-50 bg-gradient-to-r ${ACCENT_GRADIENT} shadow-teal-500/20 hover:brightness-105`}
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("try-transcription.analyzing")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t("try-transcription.analyze")}
                    </span>
                  )}
                </Button>

                {/* Analysis result */}
                {analysisResult && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 space-y-3"
                    >
                      {/* Industry + confidence */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl border border-teal-200 ${BADGE_BG} p-4`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                            {t("try-transcription.results_industry")}
                          </p>
                          <p className={`text-lg font-bold ${ACCENT_TEXT}`}>{analysisResult.industry}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                            {t("try-transcription.results_confidence")}
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {(analysisResult.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                          {t("try-transcription.results_title_label")}
                        </p>
                        <p className="text-sm font-medium text-gray-900">{analysisResult.title}</p>
                      </div>

                      {/* Speaker roles */}
                      {analysisResult.speakers && Object.keys(analysisResult.speakers).length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            {t("try-transcription.results_speakers")}
                          </p>
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
                        </div>
                      )}

                      {/* Terms table */}
                      {analysisResult.terms?.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            {t("try-transcription.results_terms")}
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="pb-1.5 text-left font-semibold text-gray-500">{t("try-transcription.results_term_spoken")}</th>
                                  <th className="pb-1.5 pl-3 text-left font-semibold text-gray-500">{t("try-transcription.results_term_basic")}</th>
                                  <th className="pb-1.5 pl-3 text-left font-semibold text-gray-500">{t("try-transcription.results_term_specialized")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisResult.terms.map((term: any, i: number) => (
                                  <tr key={i} className="border-b border-gray-50">
                                    <td className="py-1 font-medium text-gray-900">{term.spoken}</td>
                                    <td className="py-1 pl-3 text-gray-600">{term.basic}</td>
                                    <td className="py-1 pl-3 text-gray-600">{term.specialized}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                          {t("try-transcription.results_summary")}
                        </p>
                        <p className="text-sm leading-relaxed text-gray-700">{analysisResult.summary}</p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </StepCard>
            )}

            {/* Reset */}
            {(transcript.length > 0 || wsStatus !== "disconnected") && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("try-transcription.reset")}
              </Button>
            )}
          </div>

          {/* ── Right: log ────────────────────────────────────────────────── */}
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <Terminal className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {t("try-transcription.log")}
                  <InfoTip text={t("try-transcription.tip_log")} hoverColor={TIP_HOVER} />
                </h2>
                <p className="text-xs text-gray-400">{t("try-transcription.log_subtitle")}</p>
              </div>
            </div>

            <div className="p-6">
              {logEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-40 w-40 opacity-50" />
                  <p className="font-semibold text-gray-600 opacity-70">{t("try-transcription.log_empty_title")}</p>
                  <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-transcription.log_empty")}</p>
                </div>
              )}
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
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          entry.label.startsWith("→")
                            ? `${BADGE_BG} ${BADGE_TEXT}`
                            : "bg-sky-100 text-sky-700"
                        }`}>
                          {entry.label}
                        </span>
                      </div>
                      <JsonHighlight data={entry.data} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </div>
        </div>

        {/* ── Technical section (collapsible) ──────────────────────────── */}
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
