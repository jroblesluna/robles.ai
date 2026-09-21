import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
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
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { v4 as uuidv4 } from "uuid";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { StepCard } from "@/components/demo/StepCard";

// Brand accent (indigo/blue) for the object-detection demo.
const ACCENT_GRADIENT = "from-indigo-500 to-blue-600";
const ACCENT_TEXT = "text-indigo-600";
const TIP_HOVER = "hover:text-indigo-600 focus:text-indigo-600";

type ModelStatus = "loading" | "ready" | "error";
type LogEntry = { label: string; response: any; key: string };
type Detection = { class: string; score: number; bbox: [number, number, number, number] };

// A palette so different classes get distinct box colors.
const BOX_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

export default function TryObjectDetection() {
  const { t } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("objectdetection");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [mode, setMode] = useState<"camera" | "image">("camera");
  const [running, setRunning] = useState(false); // live camera loop active
  const [detections, setDetections] = useState<Detection[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showTech, setShowTech] = useState(false);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);

  const pushLog = (label: string, response: any) =>
    setLog((prev) => [{ label, response, key: uuidv4() }, ...prev].slice(0, 12));

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

  const drawDetections = useCallback(
    (dets: Detection[], sourceW: number, sourceH: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = sourceW;
      canvas.height = sourceH;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = Math.max(2, sourceW / 320);
      ctx.font = `${Math.max(12, sourceW / 40)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      dets.forEach((d, i) => {
        const [x, y, w, h] = d.bbox;
        const color = BOX_COLORS[i % BOX_COLORS.length];
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, w, h);
        const label = `${d.class} ${(d.score * 100).toFixed(0)}%`;
        const tw = ctx.measureText(label).width;
        const th = Math.max(14, sourceW / 34);
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - th), tw + 8, th);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 4, Math.max(0, y - th) + 2);
      });
    },
    []
  );

  // ── Camera mode ────────────────────────────────────────────────────────────
  async function startCamera() {
    if (!modelRef.current || modelStatus !== "ready") return;
    trackStart();
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
      setRunning(true);
      runningRef.current = true;
      detectLoop();
    } catch (e) {
      console.error("getUserMedia error:", e);
      alert(t("try-object.camera_error"));
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

  async function detectLoop() {
    const model = modelRef.current;
    const video = videoRef.current;
    if (!model || !video || !runningRef.current) return;
    if (video.readyState >= 2) {
      try {
        const preds = await model.detect(video);
        const dets = preds.map((p) => ({
          class: p.class,
          score: p.score,
          bbox: p.bbox as [number, number, number, number],
        }));
        setDetections(dets);
        drawDetections(dets, video.videoWidth, video.videoHeight);
        if (dets.length) trackComplete({ source: "camera" });
      } catch (e) {
        console.error("detect error:", e);
      }
    }
    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(detectLoop);
    }
  }

  // ── Image mode ───────────────────────────────────────────────────────────
  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !modelRef.current) return;
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
      const preds = await modelRef.current.detect(img);
      const dets = preds.map((p) => ({
        class: p.class,
        score: p.score,
        bbox: p.bbox as [number, number, number, number],
      }));
      setDetections(dets);
      drawDetections(dets, img.naturalWidth, img.naturalHeight);
      trackComplete({ source: "image" });
      pushLog(t("try-object.log_image_label"), {
        source: "image",
        objects: dets.length,
        detections: dets.map((d) => ({ class: d.class, score: Number(d.score.toFixed(3)) })),
      });
    } catch (err) {
      console.error("image detect error:", err);
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = "";
    }
  }

  // Log a snapshot of the current live detections.
  function snapshotLog() {
    pushLog(t("try-object.log_snapshot_label"), {
      source: "camera",
      objects: detections.length,
      detections: detections.map((d) => ({ class: d.class, score: Number(d.score.toFixed(3)) })),
    });
  }

  function switchMode(next: "camera" | "image") {
    if (next === mode) return;
    stopCamera();
    setDetections([]);
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setMode(next);
  }

  // Aggregate counts by class for the summary chips.
  const counts = detections.reduce<Record<string, number>>((acc, d) => {
    acc[d.class] = (acc[d.class] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left sm:gap-5">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm sm:h-24 sm:w-24`}
            >
              <ScanEye className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="mb-2 inline-flex w-fit items-center gap-1.5 self-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 sm:self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {t("try-object.badge")}
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
                {t("try-object.title")}
              </h1>
              <p className="text-sm text-gray-600 sm:text-base">{t("try-object.description")}</p>
            </div>
          </div>
          {/* Privacy note — everything runs locally */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p>{t("try-object.privacy")}</p>
          </div>
        </div>

        <BusinessCase demoId="objectdetection" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: interaction */}
          <div className="min-w-0 space-y-6">
            {/* Model status banner */}
            {modelStatus === "loading" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                <span>{t("try-object.model_loading")}</span>
              </div>
            )}
            {modelStatus === "ready" && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("try-object.model_ready")}
              </div>
            )}
            {modelStatus === "error" && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span>{t("try-object.model_error")}</span>
              </div>
            )}

            {/* Step 1: choose mode */}
            <StepCard
              icon={Workflow}
              number={1}
              title={t("try-object.step1_title")}
              tip={t("try-object.tip_mode")}
              accent={ACCENT_GRADIENT}
              iconColor={ACCENT_TEXT}
              tipHoverColor={TIP_HOVER}
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "camera" as const, icon: Camera, label: t("try-object.mode_camera") },
                  { id: "image" as const, icon: Upload, label: t("try-object.mode_image") },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => switchMode(id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      mode === id
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50"
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
              title={mode === "camera" ? t("try-object.step2_camera_title") : t("try-object.step2_image_title")}
              tip={t("try-object.tip_run")}
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
                      {t("try-object.start_camera")}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={stopCamera}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <CircleStop className="h-4 w-4" />
                        {t("try-object.stop_camera")}
                      </button>
                      <button
                        onClick={snapshotLog}
                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 px-4 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                      >
                        <Terminal className="h-4 w-4" />
                        {t("try-object.log_frame")}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="object-image-input"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <Upload className="mb-2 h-6 w-6 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700">{t("try-object.upload_cta")}</span>
                  <span className="mt-0.5 text-xs text-gray-400">{t("try-object.upload_hint")}</span>
                  <input
                    id="object-image-input"
                    type="file"
                    accept="image/*"
                    disabled={modelStatus !== "ready"}
                    className="sr-only"
                    onChange={handleImage}
                  />
                </label>
              )}

              {/* Preview area: video (camera) or image, with the canvas overlay */}
              <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full ${mode === "camera" && running ? "block" : "hidden"}`}
                />
                <img
                  ref={imgRef}
                  alt=""
                  className={`w-full ${mode === "image" ? "block" : "hidden"}`}
                />
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                {mode === "camera" && !running && (
                  <div className="flex aspect-video items-center justify-center text-xs text-gray-400">
                    {t("try-object.camera_placeholder")}
                  </div>
                )}
              </div>

              {/* Detected classes summary */}
              {detections.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    {t("try-object.detected_label", { count: detections.length })}
                    <InfoTip text={t("try-object.tip_detected")} hoverColor={TIP_HOVER} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(counts).map(([cls, n]) => (
                      <span
                        key={cls}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {cls}{n > 1 ? ` ×${n}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </StepCard>
          </div>

          {/* Right: detections log */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {t("try-object.log")}
                    <InfoTip text={t("try-object.log_subtitle")} hoverColor={TIP_HOVER} />
                  </h2>
                  <p className="text-xs text-gray-400">{t("try-object.log_subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                {log.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-40 w-40 opacity-50" />
                    <p className="font-semibold text-gray-600 opacity-70">{t("try-object.log_empty_title")}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-object.log_empty")}</p>
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
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
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
