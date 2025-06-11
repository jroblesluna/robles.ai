import { useState } from "react";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig";

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
  const [queryUrl, setQueryUrl] = useState<string | null>(null);
  const [queryResponse, setQueryResponse] = useState<any>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const selfieInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const callbackUrl = `${window.location.origin}/webhook/${uuidv4()}`;

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

      setQueryUrl(VERIFY_ENDPOINT);
      setQueryResponse(data);

      toast({ title: "Solicitud enviada", description: `ID: ${data.data.id}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!requestId) return;
    const url = STATUS_ENDPOINT(requestId);
    setQueryUrl(url);

    try {
      const res = await fetch(url);
      const data = await res.json();
      setQueryResponse(data);
      setStatus(data.data.status);
      setResult(data.data);
    } catch (err: any) {
      toast({ title: "Error al consultar estado", description: err.message });
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
    setQueryUrl(null);
    setQueryResponse(null);
    setModalImage(null);

    // Limpia el valor de los inputs de archivo
    if (selfieInputRef.current) selfieInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
  };


  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
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
          disabled={submitted} />
      </div>

      <div>
        <h2 className="text-sm font-semibold">Documento de Identidad</h2>
        <Input
          type="file"
          accept="image/jpeg, image/png"
          ref={documentInputRef}
          onChange={(e) => setDocument(e.target.files?.[0] || null)}
          disabled={submitted} />
      </div>

      <Button onClick={handleSubmit} disabled={loading || submitted || !selfie || !document}>
        {loading ? "Procesando..." : submitted ? "Enviado" : "Enviar Verificación"}
      </Button>

      {requestId && (
        <div className="space-y-2">
          <p className="text-sm">Estado actual: <strong>{status}</strong></p>
          <Button onClick={handleCheckStatus}>Verificar Estado</Button>
        </div>
      )}

      {payloadPreview && (
        <div className="bg-gray-100 text-xs p-4 rounded mt-4">
          <h2 className="font-semibold mb-2">Payload enviado a la API:</h2>
          <pre className="overflow-x-auto">{JSON.stringify(payloadPreview, null, 2)}</pre>
        </div>
      )}

      {queryUrl && (
        <div className="bg-gray-100 text-xs p-4 rounded mt-4">
          <h2 className="font-semibold mb-2">Consulta al API:</h2>
          <div className="mb-2 break-all">{queryUrl}</div>
          <h3 className="font-semibold">Respuesta:</h3>
          <pre className="overflow-x-auto">{JSON.stringify(queryResponse, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div className="bg-gray-100 text-xs p-4 rounded mt-4">
          <h2 className="font-semibold mb-2">Resultado del Reconocimiento:</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Estado: </span>
              <span className={result.success ? "text-green-600" : "text-red-600"}>
                {result.success ? "Verificación Exitosa" : "Verificación Fallida"}
              </span>
            </div>
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
            <div>
              <span className="font-medium">Fecha de Verificación: </span>
              <span>{new Date(result.updated_at).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="font-medium mb-2">Imágenes del Proceso:</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="cursor-pointer" onClick={() => setModalImage(result.data.output.FaceImageCV2)}>
                    <img src={result.data.output.FaceImageCV2} alt="Rostro" className="w-full h-24 object-cover rounded" />
                    <p className="text-center mt-1">Rostro</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => setModalImage(result.data.output.CardImageCV2)}>
                    <img src={result.data.output.CardImageCV2} alt="Documento" className="w-full h-24 object-cover rounded" />
                    <p className="text-center mt-1">Documento</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => setModalImage(result.data.output.FaceLandMarksImage)}>
                    <img src={result.data.output.FaceLandMarksImage} alt="Puntos Faciales" className="w-full h-24 object-cover rounded" />
                    <p className="text-center mt-1">Puntos Faciales</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => setModalImage(result.data.output.CardLandMarksImage)}>
                    <img src={result.data.output.CardLandMarksImage} alt="Puntos Documento" className="w-full h-24 object-cover rounded" />
                    <p className="text-center mt-1">Puntos Documento</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Modal" className="max-w-full max-h-full" />
        </div>
      )}

      {(requestId || payloadPreview) && (
        <Button variant="secondary" onClick={handleReset}>
          Reiniciar proceso
        </Button>
      )}
    </div>
  );
}
