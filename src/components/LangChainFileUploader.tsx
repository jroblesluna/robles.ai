// src/components/LangChainFileUploader.tsx
"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

export default function LangChainFileUploader({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const backend = BASE_API;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));

    setBusy(true);
    setStatusMessage(t("try-langchain.upload_uploading"));

    try {
      const saved = await fetch(`${backend}/upload`, {
        method: "POST",
        body: fd,
      }).then((r) => r.json());

      setStatusMessage(t("try-langchain.upload_ingesting"));

      await fetch(`${backend}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: saved.saved, session_id: sessionId }),
      });

      setStatusMessage(t("try-langchain.upload_done"));
    } catch (err) {
      setStatusMessage(t("try-langchain.upload_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
      <input
        type="file"
        multiple
        disabled={busy}
        onChange={handleUpload}
        className="text-sm text-gray-700 disabled:opacity-50"
      />
      {statusMessage && (
        <div className="text-sm text-gray-600">
          {busy && <span className="animate-pulse mr-2">⏳</span>}
          {statusMessage}
        </div>
      )}
    </div>
  );
}