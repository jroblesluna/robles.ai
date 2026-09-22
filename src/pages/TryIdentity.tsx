import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import {
  Fingerprint,
  Info,
  UploadCloud,
  UserRound,
  IdCard,
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  RotateCcw,
  Terminal,
  Cpu,
  Workflow,
  ShieldCheck,
  Sparkles,
  Zap,
  ScanFace,
  Images,
  Percent,
  Wand2,
} from "lucide-react";
import VideoModal from "@/components/VideoModal";
import { useTranslation } from "react-i18next";
import { BusinessCase } from "@/components/demo/BusinessCase";
import { SavingsCalculator } from "@/components/demo/SavingsCalculator";
import { useDemoTracking } from "@/components/demo/business";
import { JsonHighlight } from "@/components/demo/JsonHighlight";
import { InfoTip } from "@/components/demo/InfoTip";
import { HowItWorks, StatusPill, TechCard, type StatusTone } from "@/components/demo/DemoKit";

// ── Brand accent (violet/purple) ─────────────────────────────────────────────
const ACCENT_GRADIENT = "from-violet-500 to-purple-600";
const ACCENT_TEXT = "text-violet-600";
const TIP_HOVER = "hover:text-violet-600 focus:text-violet-600";
const BADGE_BG = "bg-violet-100";
const BADGE_TEXT = "text-violet-700";
const BADGE_DOT = "bg-violet-500";

const getBaseApi = () => {
  // VITE_IDENTITY_API overrides the default (e.g. point local dev at prod
  // instead of a local identity-api instance on :8080).
  const override: string | undefined = import.meta.env.VITE_IDENTITY_API;
  if (override) return override.replace(/\/+$/, "");
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://identity-api.robles.ai";
};

const BASE_API = getBaseApi();
const VERIFY_ENDPOINT = `${BASE_API}/recognition/verify-id`;
const STATUS_ENDPOINT = (id: string) => `${BASE_API}/recognition/get/${id}`;

// Fictional sample pair (same face on both) so a visitor with no photos handy
// can still run a real match. Not a real person's ID — see the card's own
// "DEMO ONLY" disclaimer.
const SAMPLE_SELFIE_URL = "/demo-samples/identity-selfie.jpg";
const SAMPLE_DOCUMENT_URL = "/demo-samples/identity-id-sample.jpg";

async function urlToFile(url: string, filename: string, type: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type });
}

/**
 * Clone an API response for the on-screen JSON log, replacing the (large)
 * base64 image data-URIs in data.output with a short marker. The full response
 * is still used to render the actual result images — this only keeps the log
 * readable. Backend already redacts the base64 INPUT images.
 */
function redactForLog(response: any): any {
  try {
    const clone = JSON.parse(JSON.stringify(response));
    const output = clone?.data?.data?.output ?? clone?.data?.output;
    if (output && typeof output === "object") {
      for (const key of ["FaceImageCV2", "CardImageCV2", "FaceLandMarksImage", "CardLandMarksImage"]) {
        const v = output[key];
        if (typeof v === "string" && v.startsWith("data:")) {
          output[key] = `<base64 image · ${v.length} chars>`;
        }
      }
    }
    return clone;
  } catch {
    return response;
  }
}

type StatusKey =
  | "pending"
  | "started"
  | "partially_completed"
  | "completed"
  | "completed_with_errors"
  | "failed";

const STATUS_META: Record<
  StatusKey,
  { progress: number; tone: string; bar: string; dot: string }
> = {
  pending: { progress: 20, tone: "text-amber-700 bg-amber-50 border-amber-200", bar: "bg-amber-400", dot: "bg-amber-400" },
  started: { progress: 45, tone: "text-blue-700 bg-blue-50 border-blue-200", bar: "bg-blue-500", dot: "bg-blue-500" },
  partially_completed: { progress: 75, tone: "text-indigo-700 bg-indigo-50 border-indigo-200", bar: "bg-indigo-500", dot: "bg-indigo-500" },
  completed: { progress: 100, tone: "text-emerald-700 bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  completed_with_errors: { progress: 100, tone: "text-orange-700 bg-orange-50 border-orange-200", bar: "bg-orange-500", dot: "bg-orange-500" },
  failed: { progress: 100, tone: "text-red-700 bg-red-50 border-red-200", bar: "bg-red-500", dot: "bg-red-500" },
};

/** Styled upload dropzone with live image preview. */
function ImageDropzone({
  id,
  label,
  hint,
  icon,
  file,
  disabled,
  inputRef,
  onSelect,
}: {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  file: File | null;
  disabled?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (f: File | null) => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={ACCENT_TEXT}>{icon}</span>
        <label htmlFor={id} className="text-sm font-semibold text-gray-900">
          {label}
        </label>
      </div>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/jpeg, image/png"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
      />
      <label
        htmlFor={id}
        className={`group relative flex items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-all ${
          disabled
            ? "cursor-not-allowed opacity-60 border-gray-200"
            : "cursor-pointer border-gray-200 hover:border-violet-400 hover:bg-violet-50/40"
        }`}
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <UploadCloud className="h-6 w-6 text-gray-400 transition-colors group-hover:text-violet-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
              <p className="mt-0.5 text-xs text-violet-600">{t("try-identity.change_file")}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">{t("try-identity.dropzone_cta")}</p>
              <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
              <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                {t("try-identity.dropzone_formats")}
              </span>
            </>
          )}
        </div>
        {file && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
      </label>
    </div>
  );
}

export default function TryIdentity() {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [payloadPreview, setPayloadPreview] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState(() => `${window.location.origin}/webhook/${uuidv4()}`);
  const [sidePanel, setSidePanel] = useState<"results" | "log">("results");
  const [loadingSamples, setLoadingSamples] = useState(false);

  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const { t, i18n } = useTranslation();
  const { start: trackStart, complete: trackComplete } = useDemoTracking("identity");
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  // Service warm/cold state (Cloud Run cold-start awareness)
  const [serviceStatus, setServiceStatus] = useState<"checking" | "warm" | "warming" | "cold">("checking");

  useEffect(() => {
    const translatedSrc = t("try-identity.videoSrc");
    if (translatedSrc && typeof translatedSrc === "string") {
      setVideoSrc(translatedSrc);
    }
  }, [t, i18n.language]);

  // Lightweight health check on mount: hit GET / and infer warm vs cold from
  // latency. A fast reply means an instance is already running (warm); a slow
  // reply or timeout means Cloud Run had scaled to zero (cold start).
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000); // 3s: warm should be well under this
    const started = Date.now();

    // Any reply means an instance is up. We only care that the request resolved
    // and how long it took — not the status/body. Using no-cors so the health
    // ping isn't blocked by the backend's CORS config (it returns an opaque
    // response, which is fine: we only measure latency / that it resolved).
    fetch(`${BASE_API}/`, { signal: controller.signal, mode: "no-cors" })
      .then(() => {
        clearTimeout(timer);
        if (cancelled) return;
        const elapsed = Date.now() - started;
        setServiceStatus(elapsed < 2500 ? "warm" : "cold");
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled) setServiceStatus("cold"); // timeout/abort ⇒ likely cold
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  /**
   * Wakes the service and resolves only once it responds quickly (warm).
   * Pings GET / with retries; the first ping also triggers the cold start.
   * Returns true if warm within the retry budget.
   */
  const warmUpService = async (): Promise<boolean> => {
    setServiceStatus("warming");
    const maxAttempts = 12; // ~ up to 60s total
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const started = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        await fetch(`${BASE_API}/`, { signal: controller.signal, mode: "no-cors" });
        clearTimeout(timer);
        const elapsed = Date.now() - started;
        // Any reply means the instance is up. A fast reply means it's warm.
        // no-cors returns an opaque response; we only rely on latency + that it
        // resolved (avoids being blocked by the backend's CORS headers).
        if (elapsed < 2500) {
          setServiceStatus("warm");
          return true;
        }
        // Responded but slowly (still spinning up) — give it a moment and retry.
        await new Promise((r) => setTimeout(r, 2000));
      } catch {
        // Timed out/aborted while cold — wait and retry.
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    // Exhausted the retry budget without a fast reply — fall back to "cold"
    // instead of leaving the UI frozen on "warming" forever.
    setServiceStatus("cold");
    return false;
  };

  useEffect(() => {
    if (!requestId || !submitted) return;
    if (status === "completed" || status === "completed_with_errors" || status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const url = STATUS_ENDPOINT(requestId);
        const res = await fetch(url);
        const data = await res.json();
        setStatus(data.data.status);
        setResult(data.data);

        const newEntry = { url, response: redactForLog(data), key: uuidv4() };
        setQueryHistory((prev) => [newEntry, ...prev]);

        if (["completed", "completed_with_errors"].includes(data.data.status)) {
          trackComplete({ status: data.data.status });
          clearInterval(interval);
        }
      } catch (err: any) {
        toast({ title: t("Error"), description: err.message, variant: "destructive" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId, submitted, status, t]);

  /**
   * Convert a File to a base64 data-URI, downscaling to keep the payload small.
   * Images now travel as base64 in the POST /verify-id body (no Firebase
   * Storage): the backend decodes them, compares in memory, and returns the
   * processed images inline as base64 — nothing is persisted to any bucket.
   */
  const fileToBase64 = (file: File, maxSize = 1024, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (Math.max(width, height) > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        // NOTE: use window.document — this component has a `document` state
        // variable (the ID file) that shadows the global `document`, so a bare
        // `document.createElement` would throw "createElement is not a function".
        const canvas = window.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not load image"));
      };
      img.src = url;
    });

  const handleSubmit = async () => {
    if (!selfie || !document || submitted) return;
    trackStart();

    try {
      setLoading(true);

      // Hybrid warm-up: if the service isn't confirmed warm, wake it and wait
      // until it responds fast BEFORE running the real verification. This
      // prevents the cold start from causing a timeout on verify-id.
      if (serviceStatus !== "warm") {
        const ready = await warmUpService();
        if (!ready) {
          toast({
            title: t("try-identity.service_cold_title"),
            description: t("try-identity.service_warm_failed"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const [faceImageBase64, cardIdImageBase64] = await Promise.all([
        fileToBase64(selfie),
        fileToBase64(document),
      ]);

      const payload = {
        faceImageBase64,
        cardIdImageBase64,
        callback: callbackUrl,
      };

      // Show a truncated preview in the log (base64 strings are huge).
      setPayloadPreview({
        faceImageBase64: `${faceImageBase64.slice(0, 48)}… (${faceImageBase64.length} chars)`,
        cardIdImageBase64: `${cardIdImageBase64.slice(0, 48)}… (${cardIdImageBase64.length} chars)`,
        callback: callbackUrl,
      });

      const response = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      setRequestId(data.data.id);
      setStatus(data.data.status);
      setSubmitted(true);
      setQueryHistory([{ url: VERIFY_ENDPOINT, response: data, key: uuidv4() }]);
      setSidePanel("results");

      toast({ title: t("try-identity.verify_sent"), description: `ID: ${data.data.id}`, variant: "success" });

      fetch(`${BASE_API}/cron/verify-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch((err) => console.error("Error invoking /cron/verify-id:", err));
    } catch (err: any) {
      toast({ title: t("Error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /** Fills both dropzones with the fictional sample pair so a visitor with no photos handy can still run a real match. */
  const handleUseSamples = async () => {
    if (submitted || loadingSamples) return;
    setLoadingSamples(true);
    try {
      const [sampleSelfie, sampleDocument] = await Promise.all([
        urlToFile(SAMPLE_SELFIE_URL, "sample-selfie.jpg", "image/jpeg"),
        urlToFile(SAMPLE_DOCUMENT_URL, "sample-id.jpg", "image/jpeg"),
      ]);
      setSelfie(sampleSelfie);
      setDocument(sampleDocument);
    } catch (err: any) {
      toast({ title: t("Error"), description: err.message, variant: "destructive" });
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleReset = () => {
    setSelfie(null);
    setDocument(null);
    setSubmitted(false);
    setRequestId(null);
    setStatus(null);
    setResult(null);
    setPayloadPreview(null);
    setQueryHistory([]);
    setModalImage(null);
    setSidePanel("results");
    if (selfieInputRef.current) selfieInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
    setCallbackUrl(`${window.location.origin}/webhook/${uuidv4()}`);
  };

  const statusMeta = status ? STATUS_META[status as StatusKey] : null;
  const showResult =
    result && ["partially_completed", "completed", "completed_with_errors", "failed"].includes(result.status);

  const pillStatus: { tone: StatusTone; label: string; spinning?: boolean } =
    loading ? { tone: "busy", label: t("try-identity.verify_processing"), spinning: true }
    : serviceStatus === "warming" ? { tone: "busy", label: t("try-identity.status_warming"), spinning: true }
    : serviceStatus === "checking" ? { tone: "idle", label: t("try-identity.status_checking"), spinning: true }
    : serviceStatus === "cold" ? { tone: "busy", label: t("try-identity.status_cold") }
    : { tone: "ready", label: t("try-identity.status_ready") };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">

        {/* Header: pitch + how it works (left), business case (right) */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT} text-white shadow-sm`}>
                <Fingerprint className="h-6 w-6" />
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full ${BADGE_BG} px-3 py-1 text-xs font-semibold ${BADGE_TEXT}`}>
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${BADGE_DOT}`} />
                {t("try-identity.badge")}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {t("try-identity.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t("try-identity.description")}
            </p>

            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("try-identity.how_title")}
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="rounded-xl border border-gray-200/80 bg-white/70 p-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-xs font-bold text-white`}>
                    {n}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{t(`try-identity.how_step${n}_title`)}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600">{t(`try-identity.how_step${n}_desc`)}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {[
                { icon: ShieldCheck, key: "trust_private" },
                { icon: Zap, key: "trust_fast" },
                { icon: ScanFace, key: "trust_accurate" },
              ].map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  {t(`try-identity.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <BusinessCase demoId="identity" variant="aside" />
          </div>
        </div>

        {/* ── Workspace: upload + verify (left) · result / log (right) ──── */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Toolbar: title + live status */}
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Fingerprint className={`h-4 w-4 ${ACCENT_TEXT}`} />
              {t("try-identity.workspace_title")}
            </h2>
            <StatusPill tone={pillStatus.tone} spinning={pillStatus.spinning} label={pillStatus.label} />
          </div>

          {/* Cold-start notice (only before the first run) */}
          {(serviceStatus === "cold" || serviceStatus === "warming") && !loading && (
            <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/70 px-5 py-2.5 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                {serviceStatus === "warming" ? t("try-identity.service_warming") : t("try-identity.service_cold_hint")}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5">

            {/* ── Left: upload form ─────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-col lg:col-span-3 lg:border-r lg:border-gray-100">
              <div className="flex h-[51px] shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-5">
                <span className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${BADGE_BG}`}>
                    <UploadCloud className={`h-3.5 w-3.5 ${ACCENT_TEXT}`} />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">{t("try-identity.step_upload")}</h3>
                  <InfoTip text={t("try-identity.tip_upload")} hoverColor={TIP_HOVER} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${ACCENT_TEXT} hover:text-violet-700`}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  {t("try-identity.watch_demo")}
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-6 p-5">
                <button
                  type="button"
                  onClick={handleUseSamples}
                  disabled={submitted || loadingSamples}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-3 text-left transition-colors hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex -space-x-3">
                    <img src={SAMPLE_SELFIE_URL} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
                    <img src={SAMPLE_DOCUMENT_URL} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{t("try-identity.samples_cta")}</span>
                    <span className="block text-xs text-gray-500">{t("try-identity.samples_hint")}</span>
                  </span>
                  {loadingSamples ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" />
                  ) : (
                    <Wand2 className="h-4 w-4 shrink-0 text-violet-500" />
                  )}
                </button>

                <div className="space-y-4">
                  <ImageDropzone
                    id="selfie-input"
                    label={t("try-identity.selfie")}
                    hint={t("try-identity.selfie_hint")}
                    icon={<UserRound className="h-4 w-4" />}
                    file={selfie}
                    disabled={submitted}
                    inputRef={selfieInputRef}
                    onSelect={setSelfie}
                  />
                  <ImageDropzone
                    id="document-input"
                    label={t("try-identity.document")}
                    hint={t("try-identity.document_hint")}
                    icon={<IdCard className="h-4 w-4" />}
                    file={document}
                    disabled={submitted}
                    inputRef={documentInputRef}
                    onSelect={setDocument}
                  />
                </div>

                {/* Callback URL */}
                <div>
                  <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("try-identity.webhook")}
                    <InfoTip text={t("try-identity.tip_webhook")} hoverColor={TIP_HOVER} />
                  </h4>
                  <div className="break-all rounded-lg border border-gray-200 bg-gray-50 p-2.5 font-mono text-xs text-gray-500">
                    {callbackUrl}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">{t("try-identity.webhook_hint")}</p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || submitted || !selfie || !document || serviceStatus === "checking"}
                  className={`w-full rounded-xl bg-gradient-to-r ${ACCENT_GRADIENT} py-6 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-105 disabled:opacity-50`}
                >
                  {serviceStatus === "warming" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("try-identity.verify_warming")}
                    </span>
                  ) : loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("try-identity.verify_processing")}
                    </span>
                  ) : submitted ? (
                    t("try-identity.verify_sent")
                  ) : (
                    t("try-identity.verify")
                  )}
                </Button>
              </div>

              {/* Control bar: fixed height so this space (bottom breathing room for
                  the form above) stays constant whether "Start over" is shown or not. */}
              <div className="flex h-[72px] shrink-0 items-center justify-end border-t border-gray-100 px-5">
                {(requestId || payloadPreview) && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("try-identity.reset")}
                  </Button>
                )}
              </div>
            </div>

            {/* ── Right: result / raw API log ───────────────────────────────── */}
            <div className="flex min-h-0 min-w-0 flex-col border-t border-gray-100 lg:col-span-2 lg:border-t-0">
              <div role="tablist" className="flex h-[51px] shrink-0 items-center gap-1 border-b border-gray-100 px-3">
                {([
                  { id: "results", icon: Sparkles, label: t("try-identity.tab_results") },
                  { id: "log", icon: Terminal, label: t("try-identity.tab_log"), count: queryHistory.length },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={sidePanel === tab.id}
                    onClick={() => setSidePanel(tab.id)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      sidePanel === tab.id
                        ? "border-violet-500 text-gray-900"
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

              <div className="max-h-[640px] overflow-x-hidden overflow-y-auto p-5 lg:max-h-none">
                {sidePanel === "results" ? (
                  <>
                    {/* Verification progress: lives at the top of the result panel now,
                        since it's the outcome of the request, not part of the upload form. */}
                    {status && statusMeta && (
                      <div className="mb-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot} ${status !== "completed" && status !== "failed" && status !== "completed_with_errors" ? "animate-pulse" : ""}`} />
                            {t(`try-identity.status_${status}`)}
                          </span>
                          <span className="text-xs font-medium text-gray-400">{statusMeta.progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <motion.div
                            className={`h-full rounded-full ${statusMeta.bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${statusMeta.progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">{t(`try-identity.status_${status}_description`)}</p>
                      </div>
                    )}
                    {showResult ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      {/* Headline cards */}
                      {result.data?.output && (
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            className={`rounded-xl border p-4 ${
                              result.data.output.result_match
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-red-200 bg-red-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {result.data.output.result_match ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              <span className="text-xs font-medium text-gray-600">{t("try-identity.results_match")}</span>
                              <InfoTip text={t("try-identity.tip_match")} hoverColor={TIP_HOVER} />
                            </div>
                            <p
                              className={`mt-1 text-lg font-bold ${
                                result.data.output.result_match ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {t(`try-identity.results_match_${result.data.output.result_match}`)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                              {t("try-identity.results_distance")}
                              <InfoTip text={t("try-identity.tip_distance")} hoverColor={TIP_HOVER} />
                            </span>
                            <p className="mt-1 text-lg font-bold text-violet-700">
                              {(result.data.output.distance * 100).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Meta rows */}
                      <dl className="space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <dt className="text-gray-500">{t("try-identity.results_status")}</dt>
                          <dd className="font-medium capitalize text-gray-900">{t(`try-identity.status_${result.status}`)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <dt className="text-gray-500">{t("try-identity.results_completed_ok")}</dt>
                          <dd className={`font-medium ${result.success ? "text-emerald-600" : "text-red-600"}`}>
                            {t(`try-identity.results_completed_ok_${result.success ? "yes" : "no"}`)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <dt className="text-gray-500">{t("try-identity.results_created_at")}</dt>
                          <dd className="text-gray-700">{new Date(result.created_at).toLocaleString()}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-gray-500">{t("try-identity.results_updated_at")}</dt>
                          <dd className="text-gray-700">{new Date(result.updated_at).toLocaleString()}</dd>
                        </div>
                      </dl>

                      {/* Processed images */}
                      {result.data?.output && (
                        <div>
                          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                            {t("try-identity.results_images")}
                            <InfoTip text={t("try-identity.tip_images")} hoverColor={TIP_HOVER} />
                          </h3>
                          <p className="mb-3 text-xs text-gray-400">{t("try-identity.results_images_hint")}</p>
                          <div className="grid grid-cols-2 gap-3">
                            {["FaceImageCV2", "CardImageCV2", "FaceLandMarksImage", "CardLandMarksImage"].map((key, idx) => {
                              const imageUrl = result.data.output[key];
                              const isPending = !imageUrl || imageUrl === "pending";
                              return (
                                <div
                                  key={idx}
                                  className={`min-w-0 overflow-hidden rounded-xl border border-gray-200 ${!isPending ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
                                  onClick={() => !isPending && setModalImage(imageUrl)}
                                >
                                  <div className="relative h-28 w-full bg-gray-100">
                                    {isPending ? (
                                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                                    ) : (
                                      <img src={imageUrl} alt={key} className="h-full w-full object-cover" />
                                    )}
                                  </div>
                                  <p className="truncate px-2 py-1.5 text-center text-[11px] font-medium text-gray-500">
                                    {key}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        {t("try-identity.results_empty_title")}
                        <InfoTip text={t("try-identity.tip_results")} hoverColor={TIP_HOVER} />
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {selfie && document ? t("try-identity.results_ready") : t("try-identity.results_locked")}
                      </p>
                      <ul className="mt-4 space-y-2.5">
                        {[
                          { icon: ScanFace, key: "results_match" },
                          { icon: Percent, key: "results_distance" },
                          { icon: Images, key: "results_images" },
                        ].map(({ icon: Icon, key }) => (
                          <li key={key} className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 px-3 py-2.5 text-sm text-gray-600">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50">
                              <Icon className="h-4 w-4 text-gray-400" />
                            </span>
                            {t(`try-identity.${key}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </>
                ) : queryHistory.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                    <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-24 w-24 opacity-50" />
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                      {t("try-identity.log_empty_title")}
                      <InfoTip text={t("try-identity.tip_log")} hoverColor={TIP_HOVER} />
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-identity.log_empty")}</p>
                  </div>
                ) : (
                  <LayoutGroup>
                    <AnimatePresence initial={false}>
                      {queryHistory.map((entry) => (
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
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                entry.url.includes("verify-id")
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              {entry.url.includes("verify-id") ? "POST" : "GET"}
                            </span>
                            <span className="break-all font-mono text-xs text-violet-600">{entry.url}</span>
                          </div>
                          <JsonHighlight data={entry.response} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </LayoutGroup>
                )}
              </div>
            </div>
          </div>
        </section>

        <SavingsCalculator demoId="identity" />

        {/* ── How it works (collapsible): overview and technical architecture ── */}
        <HowItWorks
          theme={{
            gradient: ACCENT_GRADIENT,
            text: ACCENT_TEXT,
            soft: BADGE_BG,
            activeTab: "border-violet-400 bg-violet-50/60 ring-2 ring-violet-100",
            notice: "bg-violet-50/70 text-violet-900",
          }}
          labels={{
            title: t("try-identity.tech_title"),
            subtitle: t("try-identity.tech_subtitle"),
            overviewTitle: t("try-identity.how_simple_title"),
            overviewSubtitle: t("try-identity.how_simple_subtitle"),
            techTitle: t("try-identity.how_tech_title"),
            techSubtitle: t("try-identity.how_tech_subtitle"),
          }}
          steps={[
            { icon: UploadCloud, title: t("try-identity.how_step1_title"), desc: t("try-identity.how_step1_desc") },
            { icon: ScanFace, title: t("try-identity.how_step2_title"), desc: t("try-identity.how_step2_desc") },
            { icon: CheckCircle2, title: t("try-identity.how_step3_title"), desc: t("try-identity.how_step3_desc") },
          ]}
          notice={t("try-identity.instructions")}
          technical={
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TechCard icon={Workflow} title={t("try-identity.tech_flow_title")} iconClass={ACCENT_TEXT}>
                <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gray-200">
                  {[1, 2, 3, 4].map((n) => (
                    <li key={n} className="relative flex gap-3">
                      <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${ACCENT_GRADIENT} text-[11px] font-bold text-white ring-4 ring-white`}>
                        {n}
                      </span>
                      <p className="text-sm leading-snug text-gray-600">{t(`try-identity.tech_flow_${n}`)}</p>
                    </li>
                  ))}
                </ol>
              </TechCard>

              <TechCard icon={Cpu} title={t("try-identity.tech_model_title")} iconClass={ACCENT_TEXT}>
                <dl className="space-y-3">
                  {[
                    ["try-identity.tech_model_name_label", "InsightFace buffalo_l"],
                    ["try-identity.tech_model_detector_label", "SCRFD"],
                    ["try-identity.tech_model_embed_label", "ArcFace ResNet-50 · 512-d"],
                    ["try-identity.tech_model_metric_label", t("try-identity.tech_model_metric_value")],
                    ["try-identity.tech_model_threshold_label", "0.35"],
                  ].map(([labelKey, value]) => (
                    <div key={labelKey} className="rounded-lg bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t(labelKey)}</dt>
                      <dd className="mt-0.5 font-mono text-[13px] leading-snug text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{t("try-identity.tech_model_note")}</p>
              </TechCard>

              <TechCard icon={ShieldCheck} title={t("try-identity.tech_api_title")} iconClass={ACCENT_TEXT}>
                <ul className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex gap-2.5 text-sm leading-snug text-gray-600">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${ACCENT_TEXT}`} />
                      {t(`try-identity.tech_api_${n}`)}
                    </li>
                  ))}
                </ul>
              </TechCard>
            </div>
          }
        />

      </div>

      {modalImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => setModalImage(null)}
        >
          <img src={modalImage} alt="" className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </div>
      )}

      {showVideo && videoSrc && <VideoModal videoSrc={videoSrc} onClose={() => setShowVideo(false)} />}
    </div>
  );
}
