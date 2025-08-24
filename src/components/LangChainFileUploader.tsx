// src/components/LangChainFileUploader.tsx
"use client";
import { useState } from "react";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

export default function LangChainFileUploader({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const backend = BASE_API;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));

    setBusy(true);
    setStatusMessage("Subiendo archivo…");

    try {
      const saved = await fetch(`${backend}/upload`, {
        method: "POST",
        body: fd,
      }).then((r) => r.json());

      setStatusMessage("Obteniendo embeddings y almacenando en Pinecone…");

      await fetch(`${backend}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: saved.saved, session_id: sessionId }),
      });

      setStatusMessage("Ingesta completada.");
    } catch (err) {
      setStatusMessage("Ocurrió un error durante la carga.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border p-3 rounded space-y-2">
      <input
        type="file"
        multiple
        disabled={busy}
        onChange={handleUpload}
        className="disabled:opacity-50"
      />
      {statusMessage && (
        <div className="text-sm text-gray-700">
          {busy && <span className="animate-pulse mr-2">⏳</span>}
          {statusMessage}
        </div>
      )}
    </div>
  );
}