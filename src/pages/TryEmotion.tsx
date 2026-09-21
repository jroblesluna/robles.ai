import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import * as faceapi from "@vladmandic/face-api";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { StepCard } from "@/components/demo/StepCard";

// Brand accent (rose/pink) for the emotion demo.
const ACCENT_GRADIENT = "from-rose-500 to-pink-600";
const ACCENT_TEXT = "text-rose-600";
const TIP_HOVER = "hover:text-rose-600 focus:text-rose-600";

// face-api model weights served from the package's CDN (no backend needed).
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

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

type ModelStatus = "loading" | "ready" | "error";
type LogEntry = { label: string; response: any; key: string };
type FaceResult = {
  expressions: Record<string, number>;
  top: string;
  box: { x: number; y: number; width: number; height: number };
};

export default function TryEmotion() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("emotion");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [mode, setMode] = useState<"camera" | "image">("camera");
  const [running, setRunning] = useState(false);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showTech, setShowTech] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);

  const pushLog = (label: string, response: any) =>
    setLog((prev) => [{ label, response, key: uuidv4() }, ...prev].slice(0, 12));

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
        if (cancelled) return;
        setModelStatus("ready");
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

  const topExpression = (expr: Record<string, number>) =>
    Object.entries(expr).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  const draw = useCallback(
    (results: FaceResult[], drawLandmarks: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[], w: number, h: number, mirror: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = Math.max(2, w / 320);
      ctx.font = `${Math.max(13, w / 36)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      // The selfie video is mirrored with CSS. Mirroring the canvas the same way
      // would flip the label text, so we flip the x coordinates here instead.
      const fx = (px: number) => (mirror ? w - px : px);

      // Boxes + top-emotion labels.
      results.forEach((r) => {
        const meta = EMOTIONS.find((e) => e.key === r.top);
        const color = meta?.color || "#ec4899";
        const { y, width, height } = r.box;
        const x = mirror ? w - r.box.x - width : r.box.x;
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, width, height);
        const pct = Math.round((r.expressions[r.top] || 0) * 100);
        const label = `${meta?.emoji || ""} ${r.top} ${pct}%`;
        const tw = ctx.measureText(label).width;
        const th = Math.max(16, w / 30);
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - th), tw + 10, th);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 5, Math.max(0, y - th) + 2);
      });

      // 68-point landmark mesh (small dots) for the "tech" look.
      ctx.fillStyle = "rgba(236, 72, 153, 0.9)";
      drawLandmarks.forEach((d) => {
        d.landmarks.positions.forEach((p) => {
          ctx.beginPath();
          ctx.arc(fx(p.x), p.y, Math.max(1, w / 400), 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    },
    []
  );

  async function analyze(input: HTMLVideoElement | HTMLImageElement, w: number, h: number) {
    const results = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceExpressions();

    const mapped: FaceResult[] = results.map((r) => {
      const expr = r.expressions as unknown as Record<string, number>;
      const { x, y, width, height } = r.detection.box;
      return { expressions: expr, top: topExpression(expr), box: { x, y, width, height } };
    });
    setFaces(mapped);
    if (mapped.length) trackComplete();
    draw(mapped, results, w, h, input instanceof HTMLVideoElement);
    return mapped;
  }

  // ── Camera ───────────────────────────────────────────────────────────────
  async function startCamera() {
    if (modelStatus !== "ready") return;
    trackStart();
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
      setRunning(true);
      runningRef.current = true;
      loop();
    } catch (e) {
      console.error("getUserMedia error:", e);
      alert(t("try-emotion.camera_error"));
    }
  }

  function stopCamera() {
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }

  async function loop() {
    const video = videoRef.current;
    if (!video || !runningRef.current) return;
    if (video.readyState >= 2) {
      try {
        await analyze(video, video.videoWidth, video.videoHeight);
      } catch (e) {
        console.error("analyze error:", e);
      }
    }
    if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
  }

  // ── Image ────────────────────────────────────────────────────────────────
  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || modelStatus !== "ready") return;
    trackStart();
    stopCamera();
    const url = URL.createObjectURL(file);
    const img = imgRef.current;
    if (!img) return;
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });
    try {
      const mapped = await analyze(img, img.naturalWidth, img.naturalHeight);
      pushLog(t("try-emotion.log_image_label"), buildLogPayload("image", mapped));
    } catch (err) {
      console.error("image analyze error:", err);
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = "";
    }
  }

  function buildLogPayload(source: string, mapped: FaceResult[]) {
    return {
      source,
      faces: mapped.length,
      results: mapped.map((f) => ({
        top_emotion: f.top,
        confidence: Number((f.expressions[f.top] || 0).toFixed(3)),
        expressions: Object.fromEntries(
          Object.entries(f.expressions).map(([k, v]) => [k, Number(v.toFixed(3))])
        ),
      })),
    };
  }

  function snapshotLog() {
    pushLog(t("try-emotion.log_snapshot_label"), buildLogPayload("camera", faces));
  }

  function switchMode(next: "camera" | "image") {
    if (next === mode) return;
    stopCamera();
    setFaces([]);
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setMode(next);
  }

  // Aggregate expression bars from the first detected face (most representative).
  const primary = faces[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left sm:gap-5">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm sm:h-24 sm:w-24`}
            >
              <Smile className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="mb-2 inline-flex w-fit items-center gap-1.5 self-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 sm:self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {t("try-emotion.badge")}
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
                {t("try-emotion.title")}
              </h1>
              <p className="text-sm text-gray-600 sm:text-base">{t("try-emotion.description")}</p>
            </div>
          </div>
          {/* Privacy note — biometric data never leaves the device */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p>{t("try-emotion.privacy")}</p>
          </div>
        </div>

        <BusinessCase demoId="emotion" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: interaction */}
          <div className="min-w-0 space-y-6">
            {/* Model status banner */}
            {modelStatus === "loading" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                <span>{t("try-emotion.model_loading")}</span>
              </div>
            )}
            {modelStatus === "ready" && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("try-emotion.model_ready")}
              </div>
            )}
            {modelStatus === "error" && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span>{t("try-emotion.model_error")}</span>
              </div>
            )}

            {/* Step 1: mode */}
            <StepCard
              icon={Workflow}
              number={1}
              title={t("try-emotion.step1_title")}
              tip={t("try-emotion.tip_mode")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "camera" as const, icon: Camera, label: t("try-emotion.mode_camera") },
                  { id: "image" as const, icon: Upload, label: t("try-emotion.mode_image") },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => switchMode(id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      mode === id
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-rose-200 hover:bg-rose-50/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </StepCard>

            {/* Step 2: run */}
            <StepCard
              icon={mode === "camera" ? Camera : Upload}
              number={2}
              title={mode === "camera" ? t("try-emotion.step2_camera_title") : t("try-emotion.step2_image_title")}
              tip={t("try-emotion.tip_run")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              {mode === "camera" ? (
                <div className="flex flex-wrap gap-2">
                  {!running ? (
                    <button
                      onClick={startCamera}
                      disabled={modelStatus !== "ready"}
                      className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r ${ACCENT_GRADIENT} px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50`}
                    >
                      {modelStatus !== "ready" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {t("try-emotion.start_camera")}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={stopCamera}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <CircleStop className="h-4 w-4" />
                        {t("try-emotion.stop_camera")}
                      </button>
                      <button
                        onClick={snapshotLog}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        <Terminal className="h-4 w-4" />
                        {t("try-emotion.log_frame")}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="emotion-image-input"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-rose-300 hover:bg-rose-50/50"
                >
                  <Upload className="mb-2 h-6 w-6 text-rose-500" />
                  <span className="text-sm font-medium text-gray-700">{t("try-emotion.upload_cta")}</span>
                  <span className="mt-0.5 text-xs text-gray-400">{t("try-emotion.upload_hint")}</span>
                  <input
                    id="emotion-image-input"
                    type="file"
                    accept="image/*"
                    disabled={modelStatus !== "ready"}
                    className="sr-only"
                    onChange={handleImage}
                  />
                </label>
              )}

              {/* Preview: mirrored video (selfie) or image + canvas overlay */}
              <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full -scale-x-100 ${mode === "camera" && running ? "block" : "hidden"}`}
                />
                <img ref={imgRef} alt="" className={`w-full ${mode === "image" ? "block" : "hidden"}`} />
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
                {mode === "camera" && !running && (
                  <div className="flex aspect-video items-center justify-center text-xs text-gray-400">
                    {t("try-emotion.camera_placeholder")}
                  </div>
                )}
              </div>

              {/* Live expression bars from the primary face */}
              {primary && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    {faces.length > 1
                      ? t("try-emotion.faces_label", { count: faces.length })
                      : t("try-emotion.expressions_label")}
                    <InfoTip text={t("try-emotion.tip_expressions")} hoverColor={TIP_HOVER} />
                  </div>
                  <div className="space-y-1.5">
                    {EMOTIONS.map(({ key, emoji, color }) => {
                      const v = primary.expressions[key] || 0;
                      const pct = Math.round(v * 100);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-xs text-gray-600">
                            {emoji} {t(`try-emotion.emotion_${key}`)}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-gray-500">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </StepCard>
          </div>

          {/* Right: analysis log */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                  <Terminal className="h-4 w-4 text-rose-400" />
                </div>
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {t("try-emotion.log")}
                    <InfoTip text={t("try-emotion.log_subtitle")} hoverColor={TIP_HOVER} />
                  </h2>
                  <p className="text-xs text-gray-400">{t("try-emotion.log_subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                {log.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-40 w-40 opacity-50" />
                    <p className="font-semibold text-gray-600 opacity-70">{t("try-emotion.log_empty_title")}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-emotion.log_empty")}</p>
                  </div>
                )}
                <LayoutGroup>
                  <AnimatePresence initial={false}>
                    {log.map((entry) => (
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
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                            {entry.label}
                          </span>
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
    </div>
  );
}
