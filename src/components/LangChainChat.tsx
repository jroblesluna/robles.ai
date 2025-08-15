"use client";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ChatResponse, AgentResponse, JSONResponse } from "@/pages/types/api-types";

const getBaseApi = () => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "https://langchain-api.robles.ai";
};

const BASE_API = getBaseApi();

export default function LangChainChat() {
  const backend = BASE_API;
  const [mode, setMode] = useState<"rag"|"tools"|"json">("rag");
  const [sessionId] = useState<string>(() => uuidv4());
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  async function send() {
    if (!q.trim()) return;
    if (mode==="rag"){
      const r: ChatResponse = await fetch(`${backend}/chat`, {method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ session_id: sessionId, question:q })}).then(r=>r.json());
      setA(r.answer);
    } else if (mode==="tools") {
      const r: AgentResponse = await fetch(`${backend}/agent`, {method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mode:"tools", input:q })}).then(r=>r.json());
      setA(r.answer);
    } else {
      const r: JSONResponse = await fetch(`${backend}/json`, {method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query:q })}).then(r=>r.json());
      setA(JSON.stringify(r, null, 2));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={mode} onChange={e=>setMode(e.target.value as any)} className="border p-2 rounded">
          <option value="rag">RAG</option>
          <option value="tools">Agent (Tools)</option>
          <option value="json">JSON Structured</option>
        </select>
        <input className="flex-1 border rounded p-2" placeholder="Escribe tu pregunta…" value={q} onChange={e=>setQ(e.target.value)}/>
        <button onClick={send} className="px-3 py-2 rounded bg-black text-white">Enviar</button>
      </div>
      {a && <pre className="whitespace-pre-wrap text-sm border rounded p-3">{a}</pre>}
    </div>
  );
}