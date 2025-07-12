import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useTranslation } from "react-i18next";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://identity-api.robles.ai";
};

const BASE_API = getBaseApi();
const VERIFY_ENDPOINT = `${BASE_API}/recognition/verify-id`;
const STATUS_ENDPOINT = (id: string) => `${BASE_API}/recognition/get/${id}`;

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
  const { t } = useTranslation();

  const STATUS_MAP: Record<string, { text: string; progress: number }> = {
    pending: { text: t("try-identity.status_pending"), progress: 20 },
    started: { text: t("try-identity.status_started"), progress: 40 },
    partially_completed: { text: t("try-identity.status_partially_completed"), progress: 75 },
    completed: { text: t("try-identity.status_completed"), progress: 100 },
    completed_with_errors: { text: t("try-identity.status_completed_with_errors"), progress: 100 },
    failed: { text: t("try-identity.status_failed"), progress: 0 },
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 mx-5 md:mx-10 lg:mx-15 xl:mx-20">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("try-identity.title")}</h1>
        <div className="text-justify">
          <p className="text-sm text-gray-600">{t("try-identity.description")}</p>
          <p className="text-sm text-gray-500 mt-2">{t("try-identity.instructions")}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold">{t("try-identity.webhook")}</h2>
          <div className="text-xs bg-gray-100 p-2 rounded break-all">{callbackUrl}</div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">{t("try-identity.selfie")}</h2>
          <Input type="file" accept="image/jpeg, image/png" ref={selfieInputRef} onChange={(e) => setSelfie(e.target.files?.[0] || null)} disabled={submitted} />
        </div>

        <div>
          <h2 className="text-sm font-semibold">{t("try-identity.document")}</h2>
          <Input type="file" accept="image/jpeg, image/png" ref={documentInputRef} onChange={(e) => setDocument(e.target.files?.[0] || null)} disabled={submitted} />
        </div>

        <Button onClick={handleSubmit} disabled={loading || submitted || !selfie || !document}>
          {loading ? t("try-identity.verify_processing") : submitted ? t("try-identity.verify_sent") : t("try-identity.verify")}
        </Button>

        {status && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">{STATUS_MAP[status]?.text}</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${STATUS_MAP[status]?.progress}%` }}></div>
            </div>
          </div>
        )}

        {result && ["partially_completed", "completed", "completed_with_errors", "failed"].includes(result.status) && (
          <div className="bg-gray-100 text-xs p-4 rounded mt-4">
            <h2 className="font-semibold mb-2">{t("try-identity.results_label")}</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">{t("try-identity.results_status")}: </span>
                <span className="capitalize">{t(`try-identity.status_${result.status}`)}</span>
              </div>
              <div>
                <span className="font-medium">{t("try-identity.results_completed_ok")}: </span>
                <span className={result.success ? "text-green-600" : "text-red-600"}>{t(`try-identity.results_completed_ok_${result.success ? "yes" : "no"}`)}</span>
              </div>
              {result.data?.output && (
                <>
                  <div>
                    <span className="font-medium">{t("try-identity.results_match")}: </span>
                    <span className={`${result.data.output.result_match ? "text-green-600" : "text-red-600"} font-bold`}>{t(`try-identity.results_match_${result.data.output.result_match}`)}</span>
                  </div>
                  <div>
                    <span className="font-medium">{t("try-identity.results_distance")}: </span>
                    <span>{(result.data.output.distance * 100).toFixed(2)}%</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">{t("try-identity.results_images")}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {["FaceImageCV2", "CardImageCV2", "FaceLandMarksImage", "CardLandMarksImage"].map((key, idx) => {
                        const imageUrl = result.data.output[key];
                        const isPending = !imageUrl || imageUrl === "pending";

                        return (
                          <div key={idx} className="cursor-pointer" onClick={() => !isPending && setModalImage(imageUrl)}>
                            <div className="w-full h-24 relative overflow-hidden rounded-xl bg-gray-300">
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                              {isPending ? (
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                              ) : (
                                <img
                                  src={imageUrl}
                                  alt={key}
                                  className="w-full h-24 object-cover rounded opacity-90"
                                />
                              )}
                            </div>

                            <p className="text-center mt-1">{key}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              <div>
                <span className="font-medium">{t("try-identity.results_created_at")}: </span>
                <span>{new Date(result.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium">{t("try-identity.results_updated_at")}: </span>
                <span>{new Date(result.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
        <div>
          {(requestId || payloadPreview) && (
            <Button variant="secondary" onClick={handleReset}>
              {t("try-identity.reset")}
            </Button>
          )}
        </div>

      </div>

      <div className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-[80vh]">
        <h2 className="font-semibold mb-2">{t("try-identity.log")}</h2>
        <LayoutGroup>
          <AnimatePresence initial={false}>
            {queryHistory.map((entry) => (
              <motion.div
                key={entry.key}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                <div className="mb-1 break-all text-blue-800 font-mono">{entry.url}</div>
                <pre className="bg-white p-2 rounded overflow-x-auto">{JSON.stringify(entry.response, null, 2)}</pre>
              </motion.div>
            ))}
          </AnimatePresence>
        </LayoutGroup>
      </div>

      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Modal" className="max-w-full max-h-full" />
        </div>
      )}
    </div>
  );
}

