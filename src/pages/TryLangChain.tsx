// src/pages/TryLangChain.tsx
"use client";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import LangChainChat from "@/components/LangChainChat";
import LangChainFileUploader from "@/components/LangChainFileUploader";

export default function TryLangChain() {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [mode, setMode] = useState<"rag" | "tools" | "json">("rag");

  function startNewSession() {
    const newId = uuidv4();
    setSessionId(newId);
  }

  return (
    <div className="bg-white min-h-screen py-12">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-[6.5rem] md:h-[6.5rem] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Bot className="h-10 w-10 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t("try-langchain.title")}</h1>
              <p className="text-gray-600 text-sm sm:text-base">{t("try-langchain.description")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs bg-gray-50 border border-gray-200 text-gray-600 p-2.5 rounded-lg break-all font-mono flex-1 mr-3">
              <span className="font-semibold text-gray-900">{t("try-langchain.session_label")}:</span> {sessionId}
            </div>
            <button
              onClick={startNewSession}
              className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
            >
              {t("try-langchain.new_session")}
            </button>
          </div>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="rag">{t("try-langchain.mode_rag")}</option>
            <option value="tools">{t("try-langchain.mode_tools")}</option>
            <option value="json">{t("try-langchain.mode_json")}</option>
          </select>

          {mode === "rag" && <LangChainFileUploader sessionId={sessionId} />}
          <LangChainChat sessionId={sessionId} mode={mode} />
        </div>
      </div>
    </div>
  );
}
