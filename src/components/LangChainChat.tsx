// src/components/LangChainChat.tsx
"use client";
import { useState } from "react";
import type { ChatResponse, AgentResponse, JSONResponse } from "@/pages/types/api-types";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

export default function LangChainChat({ sessionId, mode }: { sessionId: string, mode: "rag" | "tools" | "json" }) {
  const backend = BASE_API;
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  async function send() {
    if (!q.trim()) return;
    let answer = "";
    if (mode === "rag") {
      const r: ChatResponse = await fetch(`${backend}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question: q }),
      }).then((r) => r.json());
      answer = r.answer;
    } else if (mode === "tools") {
      const r: AgentResponse = await fetch(`${backend}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tools", input: q }),
      }).then((r) => r.json());
      answer = r.answer;
    } else {
      const r: JSONResponse = await fetch(`${backend}/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      }).then((r) => r.json());
      answer = JSON.stringify(r, null, 2);
    }

    setA(answer);
    if (mode === "rag") {
      setHistory((h) => [...h, { question: q, answer }]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded p-2"
          placeholder="Escribe tu pregunta…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={send} className="px-3 py-2 rounded bg-black text-white">
          Enviar
        </button>
      </div>

      {a && <pre className="whitespace-pre-wrap text-sm border rounded p-3">{a}</pre>}

      {mode === "rag" && history.length > 0 && (
        <div className="border-t pt-3">
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "Ocultar historial" : "Mostrar historial"}
          </button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {history.map((h, i) => (
                <div key={i} className="text-sm border rounded p-2 bg-gray-50">
                  <div className="font-semibold">Q: {h.question}</div>
                  <div className="mt-1">A: {h.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}