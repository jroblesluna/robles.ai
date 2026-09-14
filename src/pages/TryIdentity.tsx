import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig";
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
  ChevronDown,
  Cpu,
  Workflow,
  ShieldCheck,
} from "lucide-react";
import VideoModal from "@/components/VideoModal";
import { useTranslation } from "react-i18next";

/**
 * Lightweight, dependency-free JSON syntax highlighter.
 * Tokenizes a pretty-printed JSON string and colors keys, strings, numbers,
 * booleans and null with a VS Code "One Dark"–style palette.
 */
function JsonHighlight({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  // Match strings (incl. keys), numbers, booleans and null.
  const tokenRegex =
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      parts.push(json.slice(lastIndex, match.index)); // punctuation/whitespace
    }
    const token = match[0];
    let cls = "text-cyan-300"; // number default
    if (/^"/.test(token)) {
      cls = /:\s*$/.test(token) ? "text-sky-300" : "text-emerald-300"; // key vs string
    } else if (/true|false/.test(token)) {
      cls = "text-orange-300"; // boolean
    } else if (/null/.test(token)) {
      cls = "text-rose-300"; // null
    }
    parts.push(
      <span key={key++} className={cls}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < json.length) parts.push(json.slice(lastIndex));

  return (
    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-700/60 bg-slate-800/90 p-3 font-mono text-xs leading-relaxed text-slate-300 shadow-inner">
      {parts}
    </pre>
  );
}

/** Lightweight, dependency-free info tooltip (hover + keyboard focus). */
function InfoTip({ text, label }: { text: string; label?: string }) {
  return (
    <span className="group/tip relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-label={label || text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-violet-600 focus:text-violet-600 focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-gray-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://identity-api.robles.ai";
};

const BASE_API = getBaseApi();
const VERIFY_ENDPOINT = `${BASE_API}/recognition/verify-id`;
const STATUS_ENDPOINT = (id: string) => `${BASE_API}/recognition/get/${id}`;

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
        <span className="text-violet-600">{icon}</span>
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

  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const { t, i18n } = useTranslation();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showTech, setShowTech] = useState(false);
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

        const newEntry = { url, response: data, key: uuidv4() };
        setQueryHistory((prev) => [newEntry, ...prev]);

        if (["completed", "completed_with_errors"].includes(data.data.status)) {
          clearInterval(interval);
        }
      } catch (err: any) {
        toast({ title: t("Error"), description: err.message, variant: "destructive" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId, submitted, status, t]);

  const uploadImage = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmit = async () => {
    if (!selfie || !document || submitted) return;

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

      const uploadId = uuidv4();
      const selfiePath = `demo-uploads/${uploadId}/selfie.jpg`;
      const docPath = `demo-uploads/${uploadId}/document.jpg`;

      const [selfieUrl, docUrl] = await Promise.all([
        uploadImage(selfie, selfiePath),
        uploadImage(document, docPath),
      ]);

      const payload = {
        faceImageUrl: selfieUrl,
        cardIdImageUrl: docUrl,
        callback: callbackUrl,
      };

      setPayloadPreview(payload);

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
    if (selfieInputRef.current) selfieInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
    setCallbackUrl(`${window.location.origin}/webhook/${uuidv4()}`);
  };

  const statusMeta = status ? STATUS_META[status as StatusKey] : null;
  const showResult =
    result && ["partially_completed", "completed", "completed_with_errors", "failed"].includes(result.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-white py-12">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 sm:h-24 sm:w-24">
              <Fingerprint className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                Live API demo
              </span>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
                {t("try-identity.title")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
                {t("try-identity.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left column: form + results */}
          <div className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                  1
                </span>
                <h2 className="text-sm font-semibold text-gray-900">{t("try-identity.step_upload")}</h2>
                <InfoTip text={t("try-identity.tip_upload")} />
              </div>

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
              <div className="mt-5">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("try-identity.webhook")}
                  <InfoTip text={t("try-identity.tip_webhook")} />
                </h3>
                <div className="break-all rounded-lg border border-gray-200 bg-gray-50 p-2.5 font-mono text-xs text-gray-500">
                  {callbackUrl}
                </div>
                <p className="mt-1.5 text-xs text-gray-400">{t("try-identity.webhook_hint")}</p>
              </div>

              {/* Service status banner (Cloud Run cold-start awareness) */}
              {serviceStatus === "warm" && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t("try-identity.service_ready")}
                </div>
              )}
              {(serviceStatus === "cold" || serviceStatus === "checking") && !loading && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{t("try-identity.service_cold_hint")}</span>
                </div>
              )}
              {serviceStatus === "warming" && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
                  <span>{t("try-identity.service_warming")}</span>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || submitted || !selfie || !document || serviceStatus === "checking"}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-6 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
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

              {/* Progress */}
              {status && statusMeta && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.tone}`}
                    >
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
            </div>

            {/* Results */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {t("try-identity.results_label")}
                    <InfoTip text={t("try-identity.tip_results")} />
                  </h2>

                  {/* Headline cards */}
                  {result.data?.output && (
                    <div className="mb-5 grid grid-cols-2 gap-3">
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
                          <InfoTip text={t("try-identity.tip_match")} />
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
                          <InfoTip text={t("try-identity.tip_distance")} />
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
                    <div className="mt-5">
                      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                        {t("try-identity.results_images")}
                        <InfoTip text={t("try-identity.tip_images")} />
                      </h3>
                      <p className="mb-3 text-xs text-gray-400">{t("try-identity.results_images_hint")}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {["FaceImageCV2", "CardImageCV2", "FaceLandMarksImage", "CardLandMarksImage"].map((key, idx) => {
                          const imageUrl = result.data.output[key];
                          const isPending = !imageUrl || imageUrl === "pending";
                          return (
                            <div
                              key={idx}
                              className={`overflow-hidden rounded-xl border border-gray-200 ${!isPending ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
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
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              <Button
                variant="ghost"
                className="ml-auto text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                onClick={() => setShowVideo(true)}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {t("try-identity.watch_demo")}
              </Button>
            </div>
          </div>

          {/* Right column: log */}
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <Terminal className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {t("try-identity.log")}
                  <InfoTip text={t("try-identity.tip_log")} />
                </h2>
                <p className="text-xs text-gray-400">{t("try-identity.log_subtitle")}</p>
              </div>
            </div>

            <div className="p-6">
              {queryHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-40 w-40 opacity-50" />
                  <p className="font-semibold text-gray-600 opacity-70">{t("try-identity.log_empty_title")}</p>
                  <p className="mt-1 max-w-xs text-sm text-gray-400">{t("try-identity.log_empty")}</p>
                </div>
              )}
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
            </div>
          </div>
        </div>

        {/* Technical definition — collapsible */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            aria-expanded={showTech}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <Cpu className="h-4 w-4 text-violet-600" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{t("try-identity.tech_title")}</span>
                <span className="block text-xs text-gray-400">{t("try-identity.tech_subtitle")}</span>
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
                  {/* How it works */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Workflow className="h-4 w-4 text-violet-600" />
                      {t("try-identity.tech_flow_title")}
                    </h3>
                    <ol className="space-y-2 text-xs text-gray-600">
                      <li className="flex gap-2"><span className="font-semibold text-violet-600">1.</span>{t("try-identity.tech_flow_1")}</li>
                      <li className="flex gap-2"><span className="font-semibold text-violet-600">2.</span>{t("try-identity.tech_flow_2")}</li>
                      <li className="flex gap-2"><span className="font-semibold text-violet-600">3.</span>{t("try-identity.tech_flow_3")}</li>
                      <li className="flex gap-2"><span className="font-semibold text-violet-600">4.</span>{t("try-identity.tech_flow_4")}</li>
                    </ol>
                  </div>

                  {/* Model */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Cpu className="h-4 w-4 text-violet-600" />
                      {t("try-identity.tech_model_title")}
                    </h3>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2 border-b border-gray-100 pb-1.5">
                        <dt className="text-gray-500">{t("try-identity.tech_model_name_label")}</dt>
                        <dd className="text-right font-medium text-gray-900">InsightFace buffalo_l</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-gray-100 pb-1.5">
                        <dt className="text-gray-500">{t("try-identity.tech_model_detector_label")}</dt>
                        <dd className="text-right font-medium text-gray-900">SCRFD</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-gray-100 pb-1.5">
                        <dt className="text-gray-500">{t("try-identity.tech_model_embed_label")}</dt>
                        <dd className="text-right font-medium text-gray-900">ArcFace ResNet-50 · 512-d</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-gray-100 pb-1.5">
                        <dt className="text-gray-500">{t("try-identity.tech_model_metric_label")}</dt>
                        <dd className="text-right font-medium text-gray-900">{t("try-identity.tech_model_metric_value")}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">{t("try-identity.tech_model_threshold_label")}</dt>
                        <dd className="text-right font-medium text-gray-900">0.35</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t("try-identity.tech_model_note")}</p>
                  </div>

                  {/* Privacy / API */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ShieldCheck className="h-4 w-4 text-violet-600" />
                      {t("try-identity.tech_api_title")}
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-600">
                      <li>{t("try-identity.tech_api_1")}</li>
                      <li>{t("try-identity.tech_api_2")}</li>
                      <li>{t("try-identity.tech_api_3")}</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
