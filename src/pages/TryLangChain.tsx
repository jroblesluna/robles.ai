// src/pages/TryLangChain.tsx
"use client";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import LangChainChat from "@/components/LangChainChat";
import LangChainFileUploader from "@/components/LangChainFileUploader";

export default function TryLangChain() {
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [mode, setMode] = useState<"rag" | "tools" | "json">("rag");

  function startNewSession() {
    const newId = uuidv4();
    setSessionId(newId);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">LangChain Full-Stack Demo</h1>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <strong>Session ID:</strong> <span className="font-mono">{sessionId}</span>
        </div>
        <button
          onClick={startNewSession}
          className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          Nueva sesión
        </button>
      </div>

      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as any)}
        className="border p-2 rounded w-full"
      >
        <option value="rag">RAG</option>
        <option value="tools">Agent (Tools)</option>
        <option value="json">JSON Structured</option>
      </select>

      {mode === "rag" && <LangChainFileUploader sessionId={sessionId} />}
      <LangChainChat sessionId={sessionId} mode={mode} />

      <p className="text-xs opacity-70">
        Sube documentos y consulta con RAG o prueba el agente con tools.
      </p>
    </main>
  );
}