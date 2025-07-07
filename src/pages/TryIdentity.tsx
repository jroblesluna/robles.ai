import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://identity-api.robles.ai";
};

const BASE_API = getBaseApi();
const VERIFY_ENDPOINT = `${BASE_API}/recognition/verify-id`;
const STATUS_ENDPOINT = (id: string) => `${BASE_API}/recognition/get/${id}`;

const STATUS_MAP: Record<string, { text: string; progress: number }> = {
  pending: { text: "En cola...", progress: 20 },
  started: { text: "Proceso iniciado...", progress: 40 },
  partially_completed: {
    text: "Resultado declarado... Enviando Callback y Subiendo Imágenes Procesadas...",
    progress: 75,
  },
  completed: { text: "Análisis Completo", progress: 100 },
  completed_with_errors: {
    text: "Análisis completado, errores en comunicación de resultados",
    progress: 100,
  },
};

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

  useEffect(() => {
    if (!requestId || !submitted) return;
    if (status === "completed" || status === "completed_with_errors") return;

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
        toast({ title: "Error al consultar estado", description: err.message });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId, submitted, status]);

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

      toast({ title: "Solicitud enviada", description: `ID: ${data.data.id}` });

      // 🚀 LLAMADA ADICIONAL A /cron/verify-id SIN ESPERAR RESULTADO
      fetch(`${BASE_API}/cron/verify-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch((err) => {
        console.error("Error invocando /cron/verify-id:", err);
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Columna izquierda */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Probar Verificación de Identidad</h1>

        <div>
          <h2 className="text-sm font-semibold">Webhook generado:</h2>
          <div className="text-xs bg-gray-100 p-2 rounded break-all">{callbackUrl}</div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Selfie</h2>
          <Input
            type="file"
            accept="image/jpeg, image/png"
            ref={selfieInputRef}
            onChange={(e) => setSelfie(e.target.files?.[0] || null)}
            disabled={submitted}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold">Documento de Identidad</h2>
          <Input
            type="file"
            accept="image/jpeg, image/png"
            ref={documentInputRef}
            onChange={(e) => setDocument(e.target.files?.[0] || null)}
            disabled={submitted}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading || submitted || !selfie || !document}>
          {loading ? "Procesando..." : submitted ? "Enviado" : "Enviar Verificación"}
        </Button>

        {status && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">{STATUS_MAP[status]?.text}</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${STATUS_MAP[status]?.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {result && ["partially_completed", "completed", "completed_with_errors"].includes(result.status) && (
          <div className="bg-gray-100 text-xs p-4 rounded mt-4">
            <h2 className="font-semibold mb-2">Resultado del Reconocimiento:</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Estado del proceso: </span>
                <span className="capitalize">{result.status}</span>
              </div>
              <div>
                <span className="font-medium">¿Proceso terminado correctamente?: </span>
                <span className={result.success ? "text-green-600" : "text-red-600"}>
                  {result.success ? "Sí" : "No"}
                </span>
              </div>
              {result.data?.output ? (
                <>
                  <div>
                    <span className="font-medium">Coincidencia Facial: </span>
                    <span className={result.data.output.result_match ? "text-green-600" : "text-red-600"}>
                      {result.data.output.result_match ? "Coincide" : "No Coincide"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Distancia Facial: </span>
                    <span>{(result.data.output.distance * 100).toFixed(2)}%</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Imágenes del Proceso:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {["FaceImageCV2", "CardImageCV2", "FaceLandMarksImage", "CardLandMarksImage"].map((key, idx) => (
                        <div key={idx} className="cursor-pointer" onClick={() => setModalImage(result.data.output[key])}>
                          <img src={result.data.output[key]} alt={key} className="w-full h-24 object-cover rounded" />
                          <p className="text-center mt-1">
                            {key.includes("Face") ? (key.includes("LandMarks") ? "Puntos Faciales" : "Rostro") : (key.includes("LandMarks") ? "Puntos Documento" : "Documento")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-yellow-600">
                  El resultado aún no contiene datos procesados. Vuelve a consultar en unos segundos.
                </div>
              )}
              <div>
                <span className="font-medium">Fecha de Verificación: </span>
                <span>{new Date(result.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {(requestId || payloadPreview) && (
          <Button variant="secondary" onClick={handleReset}>
            Reiniciar proceso
          </Button>
        )}
      </div>

      {/* Columna derecha */}
      <div className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-[80vh]">
        <h2 className="font-semibold mb-2">Historial de Comunicaciones</h2>
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
                <pre className="bg-white p-2 rounded overflow-x-auto">
                  {JSON.stringify(entry.response, null, 2)}
                </pre>
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