import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Smile,
  Loader2,
  Info,
  Terminal,
  ChevronDown,
  Cpu,
  Workflow,
  Camera,
  Upload,
  CircleStop,
  ShieldCheck,
  Zap,
  Aperture,
  ImagePlus,
  RotateCcw,
  Lock,
  ScanFace,
  Activity,
  X,
  Expand,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { DemoNav } from "@/components/demo/DemoNav";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import * as faceapi from "@vladmandic/face-api";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { InfoTip } from "@/components/demo/InfoTip";
import { StatusPill, type StatusTone } from "@/components/demo/DemoKit";

// Brand accent (rose/pink) for the emotion demo.
const ACCENT_GRADIENT = "from-rose-500 to-pink-600";
const ACCENT_TEXT = "text-rose-600";
const TIP_HOVER = "hover:text-rose-600 focus:text-rose-600";

// face-api model weights served from the package's CDN (no backend needed).
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const DETECTOR = { inputSize: 320, scoreThreshold: 0.5 };

// The 7 expression classes face-api returns, with an emoji + color each.
const EMOTIONS = [
  { key: "neutral", emoji: "😐", color: "#94a3b8" },
  { key: "happy", emoji: "😊", color: "#22c55e" },
  { key: "sad", emoji: "😢", color: "#3b82f6" },
  { key: "angry", emoji: "😠", color: "#ef4444" },
  { key: "surprised", emoji: "😮", color: "#f59e0b" },
  { key: "fearful", emoji: "😨", color: "#a855f7" },
  { key: "disgusted", emoji: "🤢", color: "#84cc16" },
] as const;
const emotionMeta = (key: string) => EMOTIONS.find((e) => e.key === key) ?? EMOTIONS[0];

// One-click portraits for visitors without a camera.
const SAMPLES = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, src: `/images/emotion-samples/panel-${id}.jpg` }));

// Live timeline: one slot per sample, sampled a few times per second.
const TIMELINE_SLOTS = 48;
const UI_TICK_MS = 250;

type ModelStatus = "loading" | "ready" | "error";
type CameraState = "idle" | "starting" | "live" | "error";
type Source = "camera" | "image" | "sample";
type LogEntry = {
  key: string;
  source: Source;
  at: number;
  ok: boolean;
  ms?: number;
  request?: any;
  response?: any;
  error?: string;
};
type FaceResult = {
  expressions: Record<string, number>;
  top: string;
  box: { x: number; y: number; width: number; height: number };
};
type Landmarked = faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const topExpression = (expr: Record<string, number>) =>
  Object.entries(expr).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

export default function TryEmotion() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("emotion");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [mode, setMode] = useState<"camera" | "image">("camera");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [hasImage, setHasImage] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [perf, setPerf] = useState<{ ms: number; fps: number | null } | null>(null);
  const [timeline, setTimeline] = useState<{ top: string; conf: number }[]>([]);
  const [panelTab, setPanelTab] = useState<"expressions" | "log">("expressions");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [captureKey, setCaptureKey] = useState(0);
  const [showTech, setShowTech] = useState(false);
  const [previewSample, setPreviewSample] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const tickRef = useRef<{ last: number; fps: number; shownAt: number }>({ last: 0, fps: 0, shownAt: 0 });

  // What each run "sends" to the model, shown as the log's REQUEST block.
  const detectRequest = (source: Source, width: number, height: number) => ({
    input: source,
    width,
    height,
    detector: "TinyFaceDetector",
    ...DETECTOR,
  });
  const pushLog = (source: Source, request: any, response: any, ms?: number) =>
    setLog((prev) => [{ key: uuidv4(), source, at: Date.now(), ok: true, ms, request, response }, ...prev].slice(0, 12));
  const pushLogError = (source: Source, error: string, request?: any) =>
    setLog((prev) => [{ key: uuidv4(), source, at: Date.now(), ok: false, request, error }, ...prev].slice(0, 12));

  // Load the face-api models once (tiny detector + landmarks + expressions).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelStatus("ready");
      } catch (e) {
        console.error("face-api load error:", e);
        if (!cancelled) setModelStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(
    (results: FaceResult[], landmarks: Landmarked[], w: number, h: number, mirror: boolean) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      const unit = Math.max(w, h) / 640;
      const lineWidth = Math.max(2, 2.5 * unit);
      const fontSize = Math.round(Math.max(12, 13 * unit));
      const pad = Math.round(5 * unit);
      // The selfie video is mirrored with CSS. Mirroring the canvas the same way
      // would flip the label text, so we flip the x coordinates here instead.
      const fx = (px: number) => (mirror ? w - px : px);

      // 68-point landmark mesh (small dots) for the "tech" look.
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      landmarks.forEach((d) => {
        d.landmarks.positions.forEach((p) => {
          ctx.beginPath();
          ctx.arc(fx(p.x), p.y, Math.max(1, 1.3 * unit), 0, 2 * Math.PI);
          ctx.fill();
        });
      });

      // Boxes + top-emotion labels.
      ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      results.forEach((r) => {
        const meta = emotionMeta(r.top);
        const { y, width, height } = r.box;
        const x = mirror ? w - r.box.x - width : r.box.x;
        roundedRect(ctx, x, y, width, height, 6 * unit);
        ctx.fillStyle = `${meta.color}1a`;
        ctx.fill();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = meta.color;
        ctx.stroke();

        const pct = Math.round((r.expressions[r.top] || 0) * 100);
        const label = `${meta.emoji} ${t(`try-emotion.emotion_${r.top}`)} ${pct}%`;
        const tw = ctx.measureText(label).width + pad * 2;
        const th = fontSize + pad * 2;
        const lx = Math.min(Math.max(0, x - lineWidth / 2), w - tw);
        const ly = y - th - 2 >= 0 ? y - th - 2 : y + 2; // no room above → tuck inside the box
        roundedRect(ctx, lx, ly, tw, th, 3 * unit);
        ctx.fillStyle = meta.color;
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, lx + pad, ly + th / 2);
      });
    },
    [t]
  );

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  async function detect(input: HTMLVideoElement | HTMLImageElement) {
    const results = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions(DETECTOR))
      .withFaceLandmarks()
      .withFaceExpressions();
    const mapped: FaceResult[] = results.map((r) => {
      const expr = r.expressions as unknown as Record<string, number>;
      const { x, y, width, height } = r.detection.box;
      return { expressions: expr, top: topExpression(expr), box: { x, y, width, height } };
    });
    return { mapped, results };
  }

  const toLogResponse = (mapped: FaceResult[], ms?: number) => ({
    faces: mapped.length,
    inference_ms: ms !== undefined ? Math.round(ms) : undefined,
    results: mapped.map((f) => ({
      top_emotion: f.top,
      confidence: Number((f.expressions[f.top] || 0).toFixed(3)),
      expressions: Object.fromEntries(Object.entries(f.expressions).map(([k, v]) => [k, Number(v.toFixed(3))])),
    })),
  });

  // ── Camera mode ────────────────────────────────────────────────────────────
  async function startCamera() {
    if (modelStatus !== "ready") return;
    trackStart();
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      tickRef.current = { last: 0, fps: 0, shownAt: 0 };
      setTimeline([]);
      setCameraState("live");
      runningRef.current = true;
      loop();
    } catch (e) {
      console.error("getUserMedia error:", e);
      stopCamera();
      setCameraState("error");
    }
  }

  function stopCamera() {
    runningRef.current = false;
    setCameraState((s) => (s === "error" ? s : "idle"));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }

  function resetResults() {
    setFaces([]);
    setSelected(0);
    setPerf(null);
    setTimeline([]);
    clearCanvas();
  }

  function stopAndReset() {
    stopCamera();
    resetResults();
  }

  async function loop() {
    const video = videoRef.current;
    if (!video || !runningRef.current) return;
    if (video.readyState >= 2) {
      try {
        const started = performance.now();
        const { mapped, results } = await detect(video);
        const now = performance.now();
        if (!runningRef.current) return;
        draw(mapped, results, video.videoWidth, video.videoHeight, true);
        if (mapped.length) trackComplete({ source: "camera" });

        const tick = tickRef.current;
        if (tick.last) {
          const inst = 1000 / (now - tick.last);
          tick.fps = tick.fps ? tick.fps * 0.85 + inst * 0.15 : inst;
        }
        tick.last = now;
        // The canvas redraws every frame; the side panel only a few times per second.
        if (now - tick.shownAt > UI_TICK_MS) {
          tick.shownAt = now;
          setFaces(mapped);
          setPerf({ ms: now - started, fps: tick.fps || null });
          const first = mapped[0];
          if (first) {
            setTimeline((prev) =>
              [...prev, { top: first.top, conf: first.expressions[first.top] || 0 }].slice(-TIMELINE_SLOTS)
            );
          }
        }
      } catch (e) {
        console.error("analyze error:", e);
      }
    }
    if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
  }

  function captureFrame() {
    const video = videoRef.current;
    pushLog(
      "camera",
      detectRequest("camera", video?.videoWidth ?? 0, video?.videoHeight ?? 0),
      toLogResponse(faces, perf?.ms),
      perf?.ms
    );
    setCaptureKey((k) => k + 1);
  }

  // ── Image mode ───────────────────────────────────────────────────────────
  async function analyzeImage(src: string, source: "image" | "sample", revoke = false) {
    const img = imgRef.current;
    if (!img || modelStatus !== "ready") return;
    trackStart();
    stopCamera();
    setMode("image");
    setAnalyzing(true);
    resetResults();
    try {
      img.src = src;
      await img.decode();
      setHasImage(true);
      const started = performance.now();
      const { mapped, results } = await detect(img);
      const elapsed = performance.now() - started;
      setPerf({ ms: elapsed, fps: null });
      setFaces(mapped);
      draw(mapped, results, img.naturalWidth, img.naturalHeight, false);
      trackComplete({ source });
      pushLog(source, detectRequest(source, img.naturalWidth, img.naturalHeight), toLogResponse(mapped), elapsed);
    } catch (err) {
      console.error("image analyze error:", err);
      pushLogError(source, t("try-emotion.log_error_generic"));
    } finally {
      setAnalyzing(false);
      if (revoke) URL.revokeObjectURL(src);
    }
  }

  function pickFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/") || modelStatus !== "ready" || analyzing) return;
    void analyzeImage(URL.createObjectURL(file), "image", true);
  }

  function clearImage() {
    const img = imgRef.current;
    if (img) img.removeAttribute("src");
    setHasImage(false);
    resetResults();
  }

  function switchMode(next: "camera" | "image") {
    if (next === mode) return;
    stopAndReset();
    if (next === "camera") clearImage();
    setCameraState("idle");
    setMode(next);
  }

  // ── Derived view state ─────────────────────────────────────────────────────
  const live = mode === "camera" && cameraState === "live";
  const showImage = mode === "image" && hasImage;
  const showMedia = live || showImage;
  const modelReady = modelStatus === "ready";
  const faceIndex = Math.min(selected, Math.max(0, faces.length - 1));
  const face = faces[faceIndex];
  const dominant = face ? emotionMeta(face.top) : null;
  const dominantPct = face ? Math.round((face.expressions[face.top] || 0) * 100) : 0;

  const status: { tone: StatusTone; label: string; spinning?: boolean } =
    modelStatus === "loading" ? { tone: "busy", label: t("try-emotion.status_loading"), spinning: true }
    : modelStatus === "error" ? { tone: "error", label: t("try-emotion.status_error") }
    : live ? { tone: "live", label: t("try-emotion.status_live") }
    : { tone: "ready", label: t("try-emotion.status_ready") };

  const barButton =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

  // Log tab: same "Robly on the line" card as the other demos. There's no HTTP call here
  // (inference runs on-device), so each entry stands for one local run of the pipeline.
  const logCalls: ApiCallEntry[] = log.map((entry) => ({
    key: entry.key,
    method: entry.ok ? "RUN" : "ERR",
    url: "faceapi.detectAllFaces()",
    status: entry.ok ? "OK" : "ERR",
    ok: entry.ok,
    ms: entry.ms,
    at: entry.at,
    request: entry.request,
    response: entry.ok ? entry.response : { error: entry.error },
    chips: [{ label: t(`try-emotion.log_row_${entry.source}`) }],
  }));
  const callActive = analyzing || live;
  const callFailed = log.length > 0 && !log[0].ok;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-[max(72rem,70vw)] px-6">
        <DemoNav tone="rose" className="mb-8" />
        {/* Header: pitch + how it works (left), business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <Smile className="h-6 w-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                {t("try-emotion.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-emotion.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-emotion.description")}
            </p>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-emotion.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-emotion.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-emotion.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {[
                { icon: ShieldCheck, key: "trust_private" },
                { icon: Zap, key: "trust_realtime" },
                { icon: Smile, key: "trust_emotions" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t(`try-emotion.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="emotion" variant="aside" />
          </div>
        </div>

        {/* ── Workspace: stage (left) · expressions & log (right) ────────── */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <input
            ref={fileInputRef}
            id="emotion-image-input"
            type="file"
            accept="image/*"
            disabled={!modelReady}
            className="sr-only"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
            <div role="tablist" aria-label={t("try-emotion.input_label")} className="inline-flex rounded-xl bg-gray-100 p-1">
              {([
                { id: "camera" as const, icon: Camera, label: t("try-emotion.mode_camera") },
                { id: "image" as const, icon: ImagePlus, label: t("try-emotion.mode_image") },
              ]).map(({ id, icon: Icon, label }) => {
                const active = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchMode(id)}
                    className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                      active ? "text-gray-900" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="emo-mode-pill"
                        className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${active ? ACCENT_TEXT : ""}`} />
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <StatusPill tone={status.tone} spinning={status.spinning} label={status.label} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* ── Left: stage ─────────────────────────────────────────────── */}
            <div className="min-w-0 p-4 sm:p-5 lg:col-span-3 lg:border-r lg:border-gray-100">
              <div
                className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-xl bg-gray-950 sm:min-h-[440px]"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
                onDragOver={(e) => {
                  if (!modelReady || live) return;
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
                {/* Media shrink-wraps to the frame so the canvas overlay lines up with it */}
                <div className={`relative ${showMedia ? "" : "hidden"}`}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`max-h-[520px] w-auto max-w-full -scale-x-100 ${live ? "block" : "hidden"}`}
                  />
                  <img
                    ref={imgRef}
                    alt=""
                    className={`max-h-[520px] min-h-[320px] w-auto max-w-full ${showImage ? "block" : "hidden"}`}
                  />
                  <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                </div>

                {/* Model loading / error */}
                {modelStatus !== "ready" && (
                  <div className="flex max-w-sm flex-col items-center px-6 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      {modelStatus === "loading" ? (
                        <Loader2 className="h-6 w-6 animate-spin text-rose-300" />
                      ) : (
                        <Info className="h-6 w-6 text-rose-300" />
                      )}
                    </span>
                    <p className="mt-5 text-base font-semibold text-white">
                      {modelStatus === "loading" ? t("try-emotion.stage_loading_title") : t("try-emotion.status_error")}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                      {modelStatus === "loading" ? t("try-emotion.model_loading") : t("try-emotion.model_error")}
                    </p>
                  </div>
                )}

                {/* Camera: idle / waiting for permission / error */}
                {modelReady && mode === "camera" && cameraState !== "live" && (
                  <div className="flex max-w-sm flex-col items-center px-6 text-center">
                    {cameraState === "error" ? (
                      <>
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-400/30">
                          <Camera className="h-6 w-6 text-rose-300" />
                        </span>
                        <p className="mt-5 text-base font-semibold text-white">{t("try-emotion.camera_error_title")}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t("try-emotion.camera_error")}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100"
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t("try-emotion.retry")}
                          </button>
                          <button
                            type="button"
                            onClick={() => switchMode("image")}
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-200 ring-1 ring-white/15 transition-colors hover:bg-white/10"
                          >
                            <ImagePlus className="h-4 w-4" />
                            {t("try-emotion.use_image_instead")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg shadow-rose-500/30`}>
                          {cameraState === "starting" ? <Loader2 className="h-6 w-6 animate-spin" /> : <ScanFace className="h-6 w-6" />}
                        </span>
                        <p className="mt-5 text-base font-semibold text-white">
                          {cameraState === "starting" ? t("try-emotion.camera_starting") : t("try-emotion.camera_empty_title")}
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t("try-emotion.camera_empty_desc")}</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={cameraState === "starting"}
                          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-60"
                        >
                          <Camera className="h-4 w-4" />
                          {t("try-emotion.start_camera")}
                        </button>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <Lock className="h-3 w-3" />
                          {t("try-emotion.camera_permission_hint")}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Image: dropzone */}
                {modelReady && mode === "image" && !hasImage && (
                  <label
                    htmlFor="emotion-image-input"
                    className="group absolute inset-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/15 px-6 text-center transition-colors hover:border-rose-400/60 hover:bg-white/[0.02]"
                  >
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg shadow-rose-500/30 transition-transform group-hover:-translate-y-0.5`}>
                      <Upload className="h-6 w-6" />
                    </span>
                    <p className="mt-5 text-base font-semibold text-white">{t("try-emotion.upload_cta")}</p>
                    <p className="mt-1.5 text-sm text-gray-400">{t("try-emotion.upload_hint")}</p>
                    <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors group-hover:bg-gray-100">
                      <ImagePlus className="h-4 w-4" />
                      {t("try-emotion.browse")}
                    </span>
                  </label>
                )}

                {/* Live overlays */}
                {live && (
                  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    {t("try-emotion.live")}
                    {perf?.fps ? <span className="font-mono normal-case text-gray-300">· {Math.round(perf.fps)} FPS</span> : null}
                  </div>
                )}
                {showMedia && (
                  <div
                    title={t("try-emotion.stat_faces")}
                    className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur"
                  >
                    <ScanFace className="h-3.5 w-3.5 text-rose-300" />
                    {faces.length}
                  </div>
                )}

                {/* Floating controls */}
                {showMedia && (
                  <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
                    <div className="flex items-center gap-1 rounded-xl bg-gray-900/80 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur">
                      {live ? (
                        <>
                          <button type="button" onClick={captureFrame} className={barButton}>
                            <Aperture className="h-4 w-4" />
                            {t("try-emotion.capture_frame")}
                          </button>
                          <span className="h-5 w-px bg-white/15" />
                          <button type="button" onClick={stopAndReset} className={`${barButton} text-red-300 hover:bg-red-500/15`}>
                            <CircleStop className="h-4 w-4" />
                            {t("try-emotion.stop_camera")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={analyzing}
                            className={`${barButton} disabled:opacity-50`}
                          >
                            <ImagePlus className="h-4 w-4" />
                            {t("try-emotion.replace_image")}
                          </button>
                          <span className="h-5 w-px bg-white/15" />
                          <button type="button" onClick={clearImage} disabled={analyzing} className={`${barButton} disabled:opacity-50`}>
                            <X className="h-4 w-4" />
                            {t("try-emotion.clear_image")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Capture confirmation */}
                <AnimatePresence>
                  {captureKey > 0 && live && (
                    <motion.div
                      key={captureKey}
                      initial={{ opacity: 0.55 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.45 }}
                      className="pointer-events-none absolute inset-0 bg-white"
                    />
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {captureKey > 0 && live && (
                    <motion.p
                      key={`toast-${captureKey}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: [0, 1, 1, 0], y: 0 }}
                      transition={{ duration: 2, times: [0, 0.1, 0.8, 1] }}
                      className="pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur"
                    >
                      {t("try-emotion.captured")}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Analyzing */}
                {analyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50 backdrop-blur-[2px]">
                    <span className="flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-sm text-white">
                      <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
                      {t("try-emotion.analyzing")}
                    </span>
                  </div>
                )}

                {/* Drag target */}
                {dragging && (
                  <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-lg border-2 border-dashed border-rose-400 bg-rose-500/10 text-sm font-semibold text-rose-100">
                    {t("try-emotion.drop_active")}
                  </div>
                )}
              </div>

              {/* Below the stage: one-click sample portraits */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 whitespace-nowrap text-xs text-gray-500">{t("try-emotion.samples_label")}</span>
                <div className="flex items-center gap-2">
                  {SAMPLES.map((s, i) => (
                    <div key={s.id} className="group/sample relative">
                      <button
                        type="button"
                        onClick={() => analyzeImage(s.src, "sample")}
                        disabled={!modelReady || analyzing}
                        aria-label={t("try-emotion.sample_portrait", { n: i + 1 })}
                        title={t("try-emotion.sample_portrait", { n: i + 1 })}
                        className="rounded-full p-0.5 ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <img src={s.src} alt="" className="h-9 w-9 rounded-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSample(s.src);
                        }}
                        aria-label={t("try-emotion.sample_expand", { n: i + 1 })}
                        title={t("try-emotion.sample_expand", { n: i + 1 })}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-white opacity-0 shadow-sm ring-2 ring-white transition-opacity group-hover/sample:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                      >
                        <Expand className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: expressions & log ───────────────────────────────── */}
            <div className="relative min-w-0 border-t border-gray-100 lg:col-span-2 lg:border-t-0">
              <div className="flex flex-col lg:absolute lg:inset-0">
                <div role="tablist" className="flex shrink-0 gap-1 border-b border-gray-100 px-3 pt-2">
                  {([
                    { id: "expressions", icon: Activity, label: t("try-emotion.tab_expressions"), count: faces.length },
                    { id: "log", icon: Terminal, label: t("try-emotion.tab_log"), count: log.length },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      type="button"
                      aria-selected={panelTab === tab.id}
                      onClick={() => setPanelTab(tab.id)}
                      className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                        panelTab === tab.id ? "border-rose-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <tab.icon className={`h-4 w-4 ${panelTab === tab.id ? ACCENT_TEXT : ""}`} />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold tabular-nums text-gray-600">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="scrollbar-thin flex max-h-[560px] flex-col overflow-y-auto p-4 lg:max-h-none lg:min-h-0 lg:flex-1">
                  {panelTab === "expressions" ? (
                    <div className="space-y-5">
                      {/* Dominant emotion */}
                      {face && dominant ? (
                        <div
                          className="relative overflow-hidden rounded-xl p-4 ring-1 transition-colors duration-500"
                          style={{ backgroundColor: `${dominant.color}14`, ["--tw-ring-color" as any]: `${dominant.color}40` }}
                        >
                          <div className="flex items-center gap-4">
                            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-black/5">
                              <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                  key={face.top}
                                  initial={{ scale: 0.4, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.4, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                                  aria-hidden
                                >
                                  {dominant.emoji}
                                </motion.span>
                              </AnimatePresence>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                {t("try-emotion.dominant_label")}
                              </p>
                              <p className="truncate text-xl font-semibold text-gray-900">{t(`try-emotion.emotion_${face.top}`)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-semibold tabular-nums" style={{ color: dominant.color }}>
                                {dominantPct}%
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                {t("try-emotion.confidence")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: t("try-emotion.stat_faces"), value: faces.length },
                          { label: t("try-emotion.stat_inference"), value: perf ? `${Math.round(perf.ms)} ms` : "–" },
                          { label: "FPS", value: perf?.fps ? Math.round(perf.fps) : "–" },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                            <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>

                      {face ? (
                        <>
                          {/* Face picker when there's more than one */}
                          {faces.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                              {faces.map((f, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSelected(i)}
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                                    i === faceIndex
                                      ? "bg-rose-50 text-rose-700 ring-rose-200"
                                      : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  <span aria-hidden>{emotionMeta(f.top).emoji}</span>
                                  {t("try-emotion.face_n", { n: i + 1 })}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Expression scores */}
                          <div>
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                              {t("try-emotion.expressions_label")}
                              <InfoTip text={t("try-emotion.tip_expressions")} hoverColor={TIP_HOVER} />
                            </p>
                            <ul className="-mx-1 space-y-0.5">
                              {EMOTIONS.map(({ key, emoji, color }) => {
                                const pct = Math.round((face.expressions[key] || 0) * 100);
                                const isTop = key === face.top;
                                return (
                                  <li
                                    key={key}
                                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${isTop ? "bg-gray-50" : ""}`}
                                  >
                                    <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>
                                      {emoji}
                                    </span>
                                    <span className={`w-20 shrink-0 truncate text-sm ${isTop ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                                      {t(`try-emotion.emotion_${key}`)}
                                    </span>
                                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                      <span
                                        className="block h-full rounded-full transition-[width] duration-300"
                                        style={{ width: `${pct}%`, background: color }}
                                      />
                                    </span>
                                    <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-gray-500">{pct}%</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-24 w-24 opacity-60" />
                          <p className="text-sm font-semibold text-gray-600">{t("try-emotion.expressions_empty_title")}</p>
                          <p className="mt-1 max-w-xs text-sm text-gray-400">
                            {showMedia ? t("try-emotion.expressions_none") : t("try-emotion.expressions_empty")}
                          </p>
                        </div>
                      )}

                      {/* Live timeline of the dominant emotion */}
                      {mode === "camera" && timeline.length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            {t("try-emotion.timeline_label")}
                            <InfoTip text={t("try-emotion.timeline_tip")} hoverColor={TIP_HOVER} />
                          </p>
                          <div className="flex h-7 gap-px overflow-hidden rounded-md bg-gray-100">
                            {Array.from({ length: TIMELINE_SLOTS }, (_, i) => {
                              const s = timeline[i - (TIMELINE_SLOTS - timeline.length)];
                              return (
                                <span
                                  key={i}
                                  className="flex-1 transition-colors duration-300"
                                  style={s ? { background: emotionMeta(s.top).color, opacity: 0.35 + 0.65 * s.conf } : undefined}
                                  title={s ? `${t(`try-emotion.emotion_${s.top}`)} · ${Math.round(s.conf * 100)}%` : undefined}
                                />
                              );
                            })}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                            {EMOTIONS.filter((e) => timeline.some((s) => s.top === e.key)).map((e) => (
                              <span key={e.key} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="h-2 w-2 rounded-sm" style={{ background: e.color }} />
                                {t(`try-emotion.emotion_${e.key}`)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ApiCallLog
                      calls={logCalls}
                      active={callActive}
                      failed={callFailed}
                      activeDescription={
                        analyzing ? t("try-emotion.analyzing") : live ? t("try-emotion.log_live_desc") : undefined
                      }
                      empty={{ title: t("try-emotion.log_empty_title"), description: t("try-emotion.log_empty") }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical definition — collapsible */}
        <SavingsCalculator demoId="emotion" />

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <Cpu className="h-4 w-4 text-rose-600" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{t("try-emotion.tech_title")}</span>
                <span className="block text-xs text-gray-400">{t("try-emotion.tech_subtitle")}</span>
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
                      <Workflow className="h-4 w-4 text-rose-600" />
                      {t("try-emotion.tech_flow_title")}
                    </h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      {[1, 2, 3, 4].map((n) => (
                        <li key={n} className="flex gap-2">
                          <span className="font-semibold text-rose-600">{n}.</span>
                          {t(`try-emotion.tech_flow_${n}`)}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Cpu className="h-4 w-4 text-rose-600" />
                      {t("try-emotion.tech_stack_title")}
                    </h3>
                    <dl className="space-y-1.5 text-xs">
                      {[
                        ["tech_stack_detector_label", "Tiny Face Detector"],
                        ["tech_stack_model_label", "Landmarks 68 + Expression Net"],
                        ["tech_stack_runtime_label", "face-api.js · TensorFlow.js"],
                        ["tech_stack_infra_label", "100% in-browser · no server"],
                      ].map(([labelKey, value], i, arr) => (
                        <div
                          key={labelKey}
                          className={`flex justify-between gap-2 ${i < arr.length - 1 ? "border-b border-gray-100 pb-1.5" : ""}`}
                        >
                          <dt className="text-gray-500">{t(`try-emotion.${labelKey}`)}</dt>
                          <dd className="text-right font-medium text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t("try-emotion.tech_note")}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sample portrait lightbox */}
      <AnimatePresence>
        {previewSample && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-6 backdrop-blur-sm"
            onClick={() => setPreviewSample(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative max-h-[85vh] max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewSample}
                alt=""
                className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setPreviewSample(null)}
                aria-label={t("try-emotion.close_preview")}
                title={t("try-emotion.close_preview")}
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg ring-1 ring-gray-200 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
