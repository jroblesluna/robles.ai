import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Database, Loader2, Search, ArrowUpDown, Sparkles, Upload } from "lucide-react";
import sha256 from "crypto-js/sha256";
import encHex from "crypto-js/enc-hex";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      alert(t("try-rag.hash_error"));
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
      alert(t("try-rag.rerank_error"));
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
    <Button
      onClick={action}
      disabled={disabled || loading !== null}
      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
    >
      {loading === stepNumber ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );

  const StepCard = ({
    icon: Icon,
    number,
    title,
    children,
  }: {
    icon: React.ElementType;
    number: number;
    title: string;
    children: React.ReactNode;
  }) => (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-3"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <Icon className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </motion.section>
  );

  return (
    <div className="bg-white min-h-screen py-12">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-[6.5rem] md:h-[6.5rem] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Database className="h-10 w-10 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t("try-rag.title")}</h1>
              <p className="text-gray-600 text-sm sm:text-base">{t("try-rag.description")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <StepCard icon={Upload} number={1} title={t("try-rag.step1_title")}>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="rounded-lg border-gray-300"
            />
            {renderButton(handleUpload, t("try-rag.step1_button"), 1, !pdfFile)}
            {step >= 2 && (
              <>
                {extractedText && (
                  <Textarea className="text-sm mt-2 border-gray-300 rounded-lg" rows={4} value={extractedText} readOnly />
                )}
                <p className="text-sm text-gray-600 mt-2">
                  {t("try-rag.chunks_extracted")}: <strong className="text-gray-900">{chunkCount ?? "¿?"}</strong>
                  {wasAlreadyIndexed && ` ${t("try-rag.already_indexed")}`}
                </p>
              </>
            )}
          </StepCard>

          {showStep2 && (
            <StepCard icon={Database} number={2} title={t("try-rag.step2_title")}>
              {!wasAlreadyIndexed ? (
                <>
                  <p className="text-sm text-gray-600">
                    {t("try-rag.step2_pending", { count: chunkCount ?? "?", namespace })}
                  </p>
                  {renderButton(handleEmbedAndIndex, t("try-rag.step2_button"), 3)}
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  {t("try-rag.step2_done", { count: chunkCount ?? "?" })}
                </p>
              )}
              {wasAlreadyIndexed && renderButton(() => setStep(4), t("try-rag.go_to_query"), 4)}
            </StepCard>
          )}

          {step >= 4 && (
            <StepCard icon={Search} number={3} title={t("try-rag.step3_title")}>
              <Input
                placeholder={t("try-rag.query_placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-lg border-gray-300"
              />
              {renderButton(handleQuery, t("try-rag.query_button"), 5, !query)}
              {topResults.length > 0 && (
                <ul className="bg-gray-50 border border-gray-200 rounded-lg p-3 list-disc pl-8 text-sm text-gray-700 space-y-1">
                  {topResults.map((r, i) => (
                    <li key={i}>{r.text} ({t("try-rag.score_label")}: {r.score})</li>
                  ))}
                </ul>
              )}
            </StepCard>
          )}

          {step >= 6 && (
            <StepCard icon={ArrowUpDown} number={4} title={t("try-rag.step4_title")}>
              {renderButton(handleRerank, t("try-rag.rerank_button"), 7)}
              {rerankedResults.length > 0 && (
                <ul className="bg-gray-50 border border-gray-200 rounded-lg p-3 list-decimal pl-8 text-sm text-gray-700 space-y-1">
                  {rerankedResults.map((r, i) => (
                    <li key={i}>{r.text} ({t("try-rag.score_label")}: {r.score})</li>
                  ))}
                </ul>
              )}
            </StepCard>
          )}

          {step >= 8 && (
            <StepCard icon={Sparkles} number={5} title={t("try-rag.step5_title")}>
              {renderButton(handleGenerateAnswers, t("try-rag.generate_button"), 9)}
              <div className="space-y-2 text-sm">
                {hfAnswer && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <strong className="text-blue-700">Llama:</strong> <span className="text-gray-700">{hfAnswer}</span>
                  </div>
                )}
                {gptAnswer && (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                    <strong className="text-gray-900">GPT-4:</strong> <span className="text-gray-700">{gptAnswer}</span>
                  </div>
                )}
              </div>
            </StepCard>
          )}
        </div>
      </div>
    </div>
  );
}
