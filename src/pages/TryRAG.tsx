import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { FileUp, Loader2 } from "lucide-react";
import sha256 from "crypto-js/sha256";
import encHex from "crypto-js/enc-hex";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://rag-api.robles.ai";
};

const BASE_API = getBaseApi();

async function calculatePdfHash(file: File): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const arrayBuffer = await file.arrayBuffer();
      const digest = await window.crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    } else {
      const buffer = await file.arrayBuffer();
      // Convert Uint8Array to CryptoJS WordArray
      const uint8Array = new Uint8Array(buffer);
      const wordArray = encHex.parse(Array.prototype.map.call(uint8Array, (x: number) => ('00' + x.toString(16)).slice(-2)).join(''));
      const hash = sha256(wordArray);
      const answeredHash = hash.toString(encHex).slice(0, 16);
      console.log("Calculated hash:", answeredHash);
      return answeredHash;
    }
  } catch (e) {
    console.error("Hash calculation failed:", e);
    throw new Error("Hash calculation failed.");
  }
}

export default function TryRAG() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [chunks, setChunks] = useState<string[]>([]);
  const [query, setQuery] = useState<string>("");
  const [topResults, setTopResults] = useState<any[]>([]);
  const [rerankedResults, setRerankedResults] = useState<any[]>([]);
  const [hfAnswer, setHfAnswer] = useState<string>("");
  const [gptAnswer, setGptAnswer] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<number | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [wasAlreadyIndexed, setWasAlreadyIndexed] = useState<boolean>(false);
  const [showStep2, setShowStep2] = useState<boolean>(false);
  const [namespace, setNamespace] = useState<string>("");

  const handleUpload = async () => {
    if (!pdfFile) return;
    setChunks([]);
    setExtractedText("");
    setQuery("");
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setLoading(1);

    try {
      const shortNamespace = await calculatePdfHash(pdfFile);
      setNamespace(shortNamespace);

      const checkRes = await fetch(`${BASE_API}/rag/check-namespace`, {
        method: "POST",
        body: new URLSearchParams({ namespace: shortNamespace }),
      });
      const checkJson = await checkRes.json();
      console.log("Namespace check response:", checkJson);
      setWasAlreadyIndexed(checkJson.data.exists);

      if (checkJson.data.exists) {
        setChunkCount(checkJson.data.vector_count);
        setShowStep2(true);
        setStep(2);
        setLoading(null);
        return;
      }

      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch(`${BASE_API}/rag/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      setExtractedText(json.data.chunks.join("\n"));
      setChunks(json.data.chunks);
      setChunkCount(json.data.n_chunks);
      setShowStep2(true);
      setStep(2);
      setLoading(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert("No se pudo calcular el hash del archivo. Usa un navegador compatible.");
      setLoading(null);
    }
  };

  const handleEmbedAndIndex = async () => {
    if (!namespace) return;
    setQuery("");
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");

    setLoading(3);

    //const formData = new FormData();
    //formData.append("namespace", namespace);

    const res = await fetch(`${BASE_API}/rag/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namespace, chunks }),
    });

    const json = await res.json();
    if (json.success && json.data.namespace) {
      const countMatch = json.data.message.match(/\d+/);
      if (countMatch) {
        setChunkCount(parseInt(countMatch[0]));
      }
    }
    setWasAlreadyIndexed(true);
    setStep(4);
    setLoading(null);
  };

  const handleQuery = async () => {
    if (!query || !namespace) return;
    setTopResults([]);
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setLoading(5);
    const formData = new FormData();
    formData.append("question", query);
    formData.append("namespace", namespace);

    const res = await fetch(`${BASE_API}/rag/query`, {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    setTopResults(json.data.results);
    setStep(6);
    setLoading(null);
  };

  const handleRerank = async () => {
    if (!namespace) return;
    setRerankedResults([]);
    setHfAnswer("");
    setGptAnswer("");
    setLoading(7);
    //const formData = new FormData();
    //formData.append("question", query);
    //formData.append("namespace", namespace);

    const res = await fetch(`${BASE_API}/rag/rerank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, top_results: topResults }),
    });

    const json = await res.json();

    console.log("Rerank response:", json);

    if (!(json.status == "success") || !json.data?.reranked) {
      alert("Error al hacer reranking");
      setLoading(null);
      return;
    }
    setRerankedResults(json.data.reranked);
    setStep(8);
    setLoading(null);
  };

  const handleGenerateAnswers = async () => {
    if (!namespace) return;
    setHfAnswer("");
    setGptAnswer("");
    setLoading(9);

    const res = await fetch(`${BASE_API}/rag/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: query,
        reranked: rerankedResults,
      }),
    });

    const json = await res.json();
    setHfAnswer(json.data.llama);
    setGptAnswer(json.data.gpt);
    setStep(10);
    setLoading(null);
  };

  const renderButton = (
    action: () => void,
    label: string,
    stepNumber: number,
    disabled: boolean = false
  ) => (
    <Button onClick={action} disabled={disabled || loading !== null}>
      {loading === stepNumber ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">RAG Pipeline 🔍📄</h1>
        <p className="text-sm text-slate-500 mt-1">
          Desde PDF hasta respuesta generada con embeddings, búsqueda, reranking y LLM
        </p>
      </div>

      <motion.section className="bg-blue-50 rounded-xl p-6 shadow space-y-2">
        <h2 className="text-xl font-semibold text-blue-700 mb-2">1️⃣ Subir archivo PDF</h2>
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
        />
        {renderButton(handleUpload, "Extraer texto y generar chunks", 1, !pdfFile)}
        {step >= 2 && (
          <>
            {extractedText && (<Textarea className="text-sm mt-4" rows={4} value={extractedText} readOnly />)}
            <p className="text-sm text-blue-700 mt-2">
              Chunks extraídos: <strong>{chunkCount ?? "¿?"}</strong>
              {wasAlreadyIndexed && " — Archivo ya está indexado en Pinecone."}
            </p>
          </>
        )}
      </motion.section>

      {showStep2 && (
        <motion.section className="bg-green-50 rounded-xl p-6 shadow space-y-2">
          <h2 className="text-xl font-semibold text-green-700 mb-2">2️⃣ Embeddings y subida a Pinecone</h2>
          {!wasAlreadyIndexed
            ? <>
              <p className="text-sm text-green-700 mt-2">Se enviarán <strong>{chunkCount ?? "?"}</strong> vectores a Pinecone usando el namespace <strong>{namespace}</strong>.</p>
              {renderButton(handleEmbedAndIndex, "Generar embeddings y subir", 3)}
            </>
            : <p className="text-sm text-green-700 mt-2">Embeddings ya se encuentran indexados en Pinecone. El índice contiene <strong>{chunkCount ?? "?"}</strong> vectores.</p>
          }
          {wasAlreadyIndexed && renderButton(() => setStep(4), "Ir a consulta", 4)}
        </motion.section>
      )}

      {step >= 4 && (
        <motion.section className="bg-yellow-50 rounded-xl p-6 shadow space-y-2">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">3️⃣ Consulta al vector DB (top 65)</h2>
          <Input
            placeholder="Escribe tu pregunta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {renderButton(handleQuery, "Consultar", 5, !query)}
          {topResults.length > 0 && (
            <ul className="mt-4 list-disc pl-5 text-sm text-slate-700 space-y-1">
              {topResults.map((r, i) => (
                <li key={i}>{r.text} (score: {r.score})</li>
              ))}
            </ul>
          )}
        </motion.section>
      )}

      {step >= 6 && (
        <motion.section className="bg-purple-50 rounded-xl p-6 shadow space-y-2">
          <h2 className="text-xl font-semibold text-purple-700 mb-2">4️⃣ Reranking MonoT5 ➜ BGE</h2>
          {renderButton(handleRerank, "Aplicar reranking", 7)}
          {rerankedResults.length > 0 && (
            <ul className="mt-4 list-decimal pl-5 text-sm text-slate-700 space-y-1">
              {rerankedResults.map((r, i) => (
                <li key={i}>{r.text} (score: {r.score})</li>
              ))}
            </ul>
          )}
        </motion.section>
      )}

      {step >= 8 && (
        <motion.section className="bg-pink-50 rounded-xl p-6 shadow space-y-2">
          <h2 className="text-xl font-semibold text-pink-700 mb-2">5️⃣ Generación con LLMs</h2>
          {renderButton(handleGenerateAnswers, "Generar Respuestas (Llama & GPT)", 9)}
          <div className="mt-4 space-y-2 text-sm">
            {hfAnswer && (
              <div className="bg-white border-l-4 border-pink-500 p-3 rounded">
                <strong className="text-pink-600">Llama:</strong> {hfAnswer}
              </div>
            )}
            {gptAnswer && (
              <div className="bg-white border-l-4 border-slate-500 p-3 rounded">
                <strong className="text-slate-800">GPT-4:</strong> {gptAnswer}
              </div>
            )}
          </div>
        </motion.section>
      )}
    </div>
  );
}
