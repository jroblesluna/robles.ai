import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ScanEye,
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
  Boxes,
  Aperture,
  ImagePlus,
  RotateCcw,
  Lock,
  ListChecks,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { ApiCallLog, type ApiCallEntry } from "@/components/demo/ApiCallLog";
import { InfoTip } from "@/components/demo/InfoTip";
import { StatusPill, type StatusTone } from "@/components/demo/DemoKit";

// Brand accent (indigo/blue) for the object-detection demo.
const ACCENT_GRADIENT = "from-indigo-500 to-blue-600";
const ACCENT_TEXT = "text-indigo-600";
const TIP_HOVER = "hover:text-indigo-600 focus:text-indigo-600";

type ModelStatus = "loading" | "ready" | "error";
type CameraState = "idle" | "starting" | "live" | "error";
type LogEntry = {
  key: string;
  source: "camera" | "image" | "sample";
  at: number;
  ok: boolean;
  ms?: number;
  request?: any;
  response?: any;
  error?: string;
};
type Detection = { class: string; score: number; bbox: [number, number, number, number] };

const BOX_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

// Same class → same color, so the boxes and the side list stay in sync between frames.
function colorFor(cls: string) {
  let h = 0;
  for (let i = 0; i < cls.length; i++) h = (h * 31 + cls.charCodeAt(i)) >>> 0;
  return BOX_COLORS[h % BOX_COLORS.length];
}

// The model returns everything above this floor; the slider filters client-side,
// so moving it re-draws an analyzed image instantly without re-running inference.
const MODEL_MIN_SCORE = 0.2;
const MAX_BOXES = 30;

const SAMPLES = [
  { id: "warehouse", src: "/images/od-warehouse.jpg", labelKey: "sample_warehouse" },
  { id: "loading", src: "/images/od-loading-yard.jpg", labelKey: "sample_loading" },
  { id: "factory", src: "/images/od-factory.jpg", labelKey: "sample_factory" },
  { id: "traffic", src: "/images/od-traffic.jpg", labelKey: "sample_traffic" },
] as const;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export default function TryObjectDetection() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("objectdetection");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [mode, setMode] = useState<"camera" | "image">("camera");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [hasImage, setHasImage] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [perf, setPerf] = useState<{ ms: number; fps: number | null } | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [panelTab, setPanelTab] = useState<"detections" | "log">("detections");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [captureKey, setCaptureKey] = useState(0);
  const [showTech, setShowTech] = useState(false);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const thresholdRef = useRef(threshold);
  const lastRawRef = useRef<{ dets: Detection[]; w: number; h: number } | null>(null);
  const fpsRef = useRef<{ last: number; fps: number; shownAt: number }>({ last: 0, fps: 0, shownAt: 0 });

  // What each run "sends" to the model, shown as the log's REQUEST block.
  const detectRequest = (source: LogEntry["source"], width: number, height: number) => ({
    input: source,
    width,
    height,
    maxBoxes: MAX_BOXES,
    minScore: MODEL_MIN_SCORE,
  });
  const pushLog = (source: LogEntry["source"], request: any, response: any, ms?: number) =>
    setLog((prev) => [{ key: uuidv4(), source, at: Date.now(), ok: true, ms, request, response }, ...prev].slice(0, 12));
  const pushLogError = (source: LogEntry["source"], error: string, request?: any) =>
    setLog((prev) => [{ key: uuidv4(), source, at: Date.now(), ok: false, request, error }, ...prev].slice(0, 12));

  // Load the COCO-SSD model once on mount (weights fetched from Google's CDN).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (cancelled) return;
        modelRef.current = model;
        setModelStatus("ready");
      } catch (e) {
        console.error("COCO-SSD load error:", e);
        if (!cancelled) setModelStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawDetections = useCallback((dets: Detection[], w: number, h: number) => {
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
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    dets.forEach((d) => {
      const [x, y, bw, bh] = d.bbox;
      const color = colorFor(d.class);
      roundedRect(ctx, x, y, bw, bh, 4 * unit);
      ctx.fillStyle = `${color}1f`;
      ctx.fill();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.stroke();

      const label = `${d.class} ${Math.round(d.score * 100)}%`;
      const tw = ctx.measureText(label).width + pad * 2;
      const th = fontSize + pad * 2;
      const lx = Math.min(Math.max(0, x - lineWidth / 2), w - tw);
      const ly = y - th - 2 >= 0 ? y - th - 2 : y + 2; // no room above → tuck inside the box
      roundedRect(ctx, lx, ly, tw, th, 3 * unit);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, lx + pad, ly + th / 2);
    });
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const showFrame = (raw: Detection[], w: number, h: number) => {
    lastRawRef.current = { dets: raw, w, h };
    const visible = raw.filter((d) => d.score >= thresholdRef.current);
    setDetections(visible);
    drawDetections(visible, w, h);
    return visible;
  };

  // Moving the slider re-filters the last result (and re-draws a still image right away).
  useEffect(() => {
    thresholdRef.current = threshold;
    const last = lastRawRef.current;
    if (last && !runningRef.current) showFrame(last.dets, last.w, last.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const toDetections = (preds: cocoSsd.DetectedObject[]): Detection[] =>
    preds.map((p) => ({ class: p.class, score: p.score, bbox: p.bbox as [number, number, number, number] }));

  // ── Camera mode ────────────────────────────────────────────────────────────
  async function startCamera() {
    if (!modelRef.current || modelStatus !== "ready") return;
    trackStart();
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      fpsRef.current = { last: 0, fps: 0, shownAt: 0 };
      setCameraState("live");
      runningRef.current = true;
      detectLoop();
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

  function stopAndReset() {
    stopCamera();
    lastRawRef.current = null;
    setDetections([]);
    setPerf(null);
    clearCanvas();
  }

  async function detectLoop() {
    const model = modelRef.current;
    const video = videoRef.current;
    if (!model || !video || !runningRef.current) return;
    if (video.readyState >= 2) {
      try {
        const started = performance.now();
        const raw = toDetections(await model.detect(video, MAX_BOXES, MODEL_MIN_SCORE));
        const now = performance.now();
        if (!runningRef.current) return;
        const visible = showFrame(raw, video.videoWidth, video.videoHeight);
        if (visible.length) trackComplete({ source: "camera" });

        const f = fpsRef.current;
        if (f.last) {
          const inst = 1000 / (now - f.last);
          f.fps = f.fps ? f.fps * 0.85 + inst * 0.15 : inst;
        }
        f.last = now;
        if (now - f.shownAt > 300) {
          f.shownAt = now;
          setPerf({ ms: now - started, fps: f.fps || null });
        }
      } catch (e) {
        console.error("detect error:", e);
      }
    }
    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(detectLoop);
    }
  }

  // ── Image mode ───────────────────────────────────────────────────────────
  async function analyzeImage(src: string, source: "image" | "sample", revoke = false) {
    const model = modelRef.current;
    const img = imgRef.current;
    if (!model || !img) return;
    trackStart();
    stopCamera();
    setMode("image");
    setAnalyzing(true);
    try {
      img.src = src;
      await img.decode();
      setHasImage(true);
      // tf.js reads an <img> at its rendered size (img.width), not its natural size, so a
      // visible image yields boxes in on-screen pixels; rescale them to natural pixels.
      const sx = img.naturalWidth / (img.width || img.naturalWidth);
      const sy = img.naturalHeight / (img.height || img.naturalHeight);
      const started = performance.now();
      const raw = toDetections(await model.detect(img, MAX_BOXES, MODEL_MIN_SCORE)).map((d) => ({
        ...d,
        bbox: [d.bbox[0] * sx, d.bbox[1] * sy, d.bbox[2] * sx, d.bbox[3] * sy] as Detection["bbox"],
      }));
      const elapsed = performance.now() - started;
      setPerf({ ms: elapsed, fps: null });
      const visible = showFrame(raw, img.naturalWidth, img.naturalHeight);
      trackComplete({ source });
      pushLog(
        source,
        detectRequest(source, img.naturalWidth, img.naturalHeight),
        {
          objects: visible.length,
          detections: visible.map((d) => ({
            class: d.class,
            score: Number(d.score.toFixed(3)),
            bbox: d.bbox.map(Math.round),
          })),
        },
        elapsed
      );
    } catch (err) {
      console.error("image detect error:", err);
      pushLogError(source, t("try-object.log_error_generic"));
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
    lastRawRef.current = null;
    setDetections([]);
    setPerf(null);
    clearCanvas();
  }

  function captureFrame() {
    const video = videoRef.current;
    pushLog(
      "camera",
      detectRequest("camera", video?.videoWidth ?? 0, video?.videoHeight ?? 0),
      {
        objects: detections.length,
        inference_ms: perf ? Math.round(perf.ms) : undefined,
        detections: detections.map((d) => ({
          class: d.class,
          score: Number(d.score.toFixed(3)),
          bbox: d.bbox.map(Math.round),
        })),
      },
      perf?.ms
    );
    setCaptureKey((k) => k + 1);
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

  const groups = Object.values(
    detections.reduce<Record<string, { cls: string; count: number; best: number }>>((acc, d) => {
      const g = (acc[d.class] ??= { cls: d.class, count: 0, best: 0 });
      g.count += 1;
      g.best = Math.max(g.best, d.score);
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count || b.best - a.best);

  const status: { tone: StatusTone; label: string; spinning?: boolean } =
    modelStatus === "loading" ? { tone: "busy", label: t("try-object.status_loading"), spinning: true }
    : modelStatus === "error" ? { tone: "error", label: t("try-object.status_error") }
    : live ? { tone: "live", label: t("try-object.status_live") }
    : { tone: "ready", label: t("try-object.status_ready") };

  const barButton =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

  // Log tab: mirrors the "Robly on the line" session card from the other live-API demos.
  // There's no real HTTP call here (detection runs on-device), so each entry stands for one
  // local inference run — "active" while one is in flight (analyzing a photo, or the live
  // camera loop continuously running detection).
  const logCalls: ApiCallEntry[] = log.map((entry) => ({
    key: entry.key,
    method: entry.ok ? "RUN" : "ERR",
    url: "cocoSsd.detect()",
    status: entry.ok ? "OK" : "ERR",
    ok: entry.ok,
    ms: entry.ms,
    at: entry.at,
    request: entry.request,
    response: entry.ok ? entry.response : { error: entry.error },
    chips: [{ label: t(`try-object.log_row_${entry.source}`) }],
  }));
  const callActive = analyzing || live;
  const callFailed = log.length > 0 && !log[0].ok;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Header: pitch + how it works (left), business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <ScanEye className="h-6 w-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                {t("try-object.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-object.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-object.description")}
            </p>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-object.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-object.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-object.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {[
                { icon: ShieldCheck, key: "trust_private" },
                { icon: Zap, key: "trust_realtime" },
                { icon: Boxes, key: "trust_classes" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t(`try-object.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="objectdetection" variant="aside" />
          </div>
        </div>

        {/* ── Workspace: stage (left) · detections & log (right) ─────────── */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <input
            ref={fileInputRef}
            id="object-image-input"
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
            <div role="tablist" aria-label={t("try-object.input_label")} className="inline-flex rounded-xl bg-gray-100 p-1">
              {([
                { id: "camera" as const, icon: Camera, label: t("try-object.mode_camera") },
                { id: "image" as const, icon: ImagePlus, label: t("try-object.mode_image") },
              ]).map(({ id, icon: Icon, label }) => {
                const active = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchMode(id)}
                    className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                      active ? "text-gray-900" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="od-mode-pill"
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
                    className={`max-h-[520px] w-auto max-w-full ${live ? "block" : "hidden"}`}
                  />
                  <img
                    ref={imgRef}
                    alt=""
                    className={`max-h-[520px] w-auto max-w-full ${showImage ? "block" : "hidden"}`}
                  />
                  <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                </div>

                {/* Model loading / error */}
                {modelStatus !== "ready" && (
                  <div className="flex max-w-sm flex-col items-center px-6 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      {modelStatus === "loading" ? (
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
                      ) : (
                        <Info className="h-6 w-6 text-rose-300" />
                      )}
                    </span>
                    <p className="mt-5 text-base font-semibold text-white">
                      {modelStatus === "loading" ? t("try-object.stage_loading_title") : t("try-object.status_error")}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                      {modelStatus === "loading" ? t("try-object.model_loading") : t("try-object.model_error")}
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
                        <p className="mt-5 text-base font-semibold text-white">{t("try-object.camera_error_title")}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t("try-object.camera_error")}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100"
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t("try-object.retry")}
                          </button>
                          <button
                            type="button"
                            onClick={() => switchMode("image")}
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-200 ring-1 ring-white/15 transition-colors hover:bg-white/10"
                          >
                            <ImagePlus className="h-4 w-4" />
                            {t("try-object.use_image_instead")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg shadow-indigo-500/30`}>
                          {cameraState === "starting" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                        </span>
                        <p className="mt-5 text-base font-semibold text-white">
                          {cameraState === "starting" ? t("try-object.camera_starting") : t("try-object.camera_empty_title")}
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t("try-object.camera_empty_desc")}</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={cameraState === "starting"}
                          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-60"
                        >
                          <Camera className="h-4 w-4" />
                          {t("try-object.start_camera")}
                        </button>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <Lock className="h-3 w-3" />
                          {t("try-object.camera_permission_hint")}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Image: dropzone */}
                {modelReady && mode === "image" && !hasImage && (
                  <label
                    htmlFor="object-image-input"
                    className="group absolute inset-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/15 px-6 text-center transition-colors hover:border-indigo-400/60 hover:bg-white/[0.02]"
                  >
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:-translate-y-0.5`}>
                      <Upload className="h-6 w-6" />
                    </span>
                    <p className="mt-5 text-base font-semibold text-white">{t("try-object.upload_cta")}</p>
                    <p className="mt-1.5 text-sm text-gray-400">{t("try-object.upload_hint")}</p>
                    <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors group-hover:bg-gray-100">
                      <ImagePlus className="h-4 w-4" />
                      {t("try-object.browse")}
                    </span>
                  </label>
                )}

                {/* Live overlays */}
                {live && (
                  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    {t("try-object.live")}
                    {perf?.fps ? <span className="font-mono normal-case text-gray-300">· {Math.round(perf.fps)} FPS</span> : null}
                  </div>
                )}
                {showMedia && (
                  <div
                    title={t("try-object.stat_objects")}
                    className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur"
                  >
                    <Boxes className="h-3.5 w-3.5 text-indigo-300" />
                    {detections.length}
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
                            {t("try-object.capture_frame")}
                          </button>
                          <span className="h-5 w-px bg-white/15" />
                          <button type="button" onClick={stopAndReset} className={`${barButton} text-red-300 hover:bg-red-500/15`}>
                            <CircleStop className="h-4 w-4" />
                            {t("try-object.stop_camera")}
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
                            {t("try-object.replace_image")}
                          </button>
                          <span className="h-5 w-px bg-white/15" />
                          <button type="button" onClick={clearImage} disabled={analyzing} className={`${barButton} disabled:opacity-50`}>
                            <X className="h-4 w-4" />
                            {t("try-object.clear_image")}
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
                      {t("try-object.captured")}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Analyzing */}
                {analyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50 backdrop-blur-[2px]">
                    <span className="flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-sm text-white">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                      {t("try-object.analyzing")}
                    </span>
                  </div>
                )}

                {/* Drag target */}
                {dragging && (
                  <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-500/10 text-sm font-semibold text-indigo-100">
                    {t("try-object.drop_active")}
                  </div>
                )}
              </div>

              {/* Below the stage: one-click samples */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 whitespace-nowrap text-xs text-gray-500">{t("try-object.samples_label")}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => analyzeImage(s.src, "sample")}
                      disabled={!modelReady || analyzing}
                      title={t(`try-object.${s.labelKey}`)}
                      className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 pr-2.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 disabled:opacity-50"
                    >
                      <img src={s.src} alt="" className="h-7 w-10 rounded-md object-cover" />
                      {t(`try-object.${s.labelKey}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: detections & log ────────────────────────────────── */}
            <div className="relative min-w-0 border-t border-gray-100 lg:col-span-2 lg:border-t-0">
              <div className="flex flex-col lg:absolute lg:inset-0">
                <div role="tablist" className="flex shrink-0 gap-1 border-b border-gray-100 px-3 pt-2">
                  {([
                    { id: "detections", icon: ListChecks, label: t("try-object.tab_detections"), count: detections.length },
                    { id: "log", icon: Terminal, label: t("try-object.tab_log"), count: log.length },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      type="button"
                      aria-selected={panelTab === tab.id}
                      onClick={() => setPanelTab(tab.id)}
                      className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                        panelTab === tab.id ? "border-indigo-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
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
                  {panelTab === "detections" ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: t("try-object.stat_objects"), value: detections.length },
                          { label: t("try-object.stat_classes"), value: groups.length },
                          { label: t("try-object.stat_inference"), value: perf ? `${Math.round(perf.ms)} ms` : "–" },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                            <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label htmlFor="od-threshold" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            {t("try-object.threshold_label")}
                            <InfoTip text={t("try-object.threshold_tip")} hoverColor={TIP_HOVER} />
                          </label>
                          <span className="font-mono text-xs tabular-nums text-gray-500">{Math.round(threshold * 100)}%</span>
                        </div>
                        <input
                          id="od-threshold"
                          type="range"
                          min={0.2}
                          max={0.9}
                          step={0.05}
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="mt-2 w-full cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {groups.length > 0 ? (
                        <ul className="-mx-1 space-y-0.5">
                          {groups.map(({ cls, count, best }) => {
                            const color = colorFor(cls);
                            return (
                              <li key={cls} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium capitalize text-gray-900">{cls}</span>
                                {count > 1 && (
                                  <span className="rounded bg-gray-100 px-1.5 text-[11px] font-semibold tabular-nums text-gray-600">×{count}</span>
                                )}
                                <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
                                  <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${best * 100}%`, background: color }} />
                                </span>
                                <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-gray-500">{Math.round(best * 100)}%</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-24 w-24 opacity-60" />
                          <p className="text-sm font-semibold text-gray-600">{t("try-object.detections_empty_title")}</p>
                          <p className="mt-1 max-w-xs text-sm text-gray-400">
                            {showMedia ? t("try-object.detections_none") : t("try-object.detections_empty")}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ApiCallLog
                      calls={logCalls}
                      active={callActive}
                      failed={callFailed}
                      activeDescription={
                        analyzing ? t("try-object.analyzing") : live ? t("try-object.log_live_desc") : undefined
                      }
                      empty={{ title: t("try-object.log_empty_title"), description: t("try-object.log_empty") }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical definition — collapsible */}
        <SavingsCalculator demoId="objectdetection" />

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <Cpu className="h-4 w-4 text-indigo-600" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{t("try-object.tech_title")}</span>
                <span className="block text-xs text-gray-400">{t("try-object.tech_subtitle")}</span>
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
                      <Workflow className="h-4 w-4 text-indigo-600" />
                      {t("try-object.tech_flow_title")}
                    </h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      {[1, 2, 3, 4].map((n) => (
                        <li key={n} className="flex gap-2">
                          <span className="font-semibold text-indigo-600">{n}.</span>
                          {t(`try-object.tech_flow_${n}`)}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Cpu className="h-4 w-4 text-indigo-600" />
                      {t("try-object.tech_stack_title")}
                    </h3>
                    <dl className="space-y-1.5 text-xs">
                      {[
                        ["tech_stack_model_label", "COCO-SSD (MobileNet v2)"],
                        ["tech_stack_runtime_label", "TensorFlow.js · WebGL"],
                        ["tech_stack_classes_label", "80 object classes"],
                        ["tech_stack_infra_label", "100% in-browser · no server"],
                      ].map(([labelKey, value], i, arr) => (
                        <div
                          key={labelKey}
                          className={`flex justify-between gap-2 ${i < arr.length - 1 ? "border-b border-gray-100 pb-1.5" : ""}`}
                        >
                          <dt className="text-gray-500">{t(`try-object.${labelKey}`)}</dt>
                          <dd className="text-right font-medium text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t("try-object.tech_note")}</p>
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
