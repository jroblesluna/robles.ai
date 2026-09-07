// src/components/LangChainChat.tsx
"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChatResponse, AgentResponse, JSONResponse } from "@/pages/types/api-types";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

export default function LangChainChat({ sessionId, mode }: { sessionId: string, mode: "rag" | "tools" | "json" }) {
  const { t } = useTranslation();
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
          className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t("try-langchain.chat_placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={send}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors shrink-0"
        >
          {t("try-langchain.send")}
        </button>
      </div>

      {a && (
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg p-3">{a}</pre>
      )}

      {mode === "rag" && history.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <button
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? t("try-langchain.hide_history") : t("try-langchain.show_history")}
          </button>
          {showHistory && (
            <div className="space-y-2 mt-2">
              {history.map((h, i) => (
                <div key={i} className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-700">
                  <div className="font-semibold text-gray-900">Q: {h.question}</div>
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