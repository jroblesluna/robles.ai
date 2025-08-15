"use client";
import { useState } from "react";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

export default function LangChainFileUploader() {
  const [busy, setBusy] = useState(false);
  const backend = BASE_API;
  return (
    <div className="border p-3 rounded">
      <input type="file" multiple onChange={async (e)=>{
        const files = e.target.files; if (!files?.length) return;
        const fd = new FormData();
        Array.from(files).forEach(f => fd.append("files", f));
        setBusy(true);
        const saved = await fetch(`${backend}/upload`, { method:"POST", body:fd }).then(r=>r.json());
        await fetch(`${backend}/ingest`, { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ files: saved.saved })});
        setBusy(false);
        alert("Ingesta completada");
      }}/>
      {busy && <p className="text-sm">Procesando…</p>}
    </div>
  );
}