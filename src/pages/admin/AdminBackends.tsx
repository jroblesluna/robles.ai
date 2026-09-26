import { useEffect, useState } from "react";
import {
  Server,
  Globe,
  Cloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Plug,
} from "lucide-react";

/**
 * Admin portal: backend management (spec: admin-backend-management).
 * v1 = connect credentials (Hostinger + GCP SA) + see per-backend DNS / Cloud Run /
 * health status + publish CNAMEs. Read-only towards GCP; DNS writes via Hostinger.
 * Credentials are write-only from here (server never returns their values).
 */

interface HealthStatus { alive: boolean; ms: number | null; warm?: boolean; }
interface CloudRunStatus {
  available: boolean; exists?: boolean; url?: string; ready?: boolean;
  latestRevision?: string; region?: string; error?: string;
}
interface BackendItem {
  id: string; label: string; subdomain: string; publicUrl: string;
  expectedTarget: string; dnsStatus: "ok" | "missing" | "mismatch" | "unknown";
  currentTarget: string | null; health: HealthStatus; cloudRun: CloudRunStatus;
}
interface ListResponse {
  hostingerConnected: boolean; gcpConnected: boolean; domain: string; items: BackendItem[];
}

const DNS_BADGE: Record<string, { cls: string; label: string }> = {
  ok: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "OK" },
  missing: { cls: "bg-amber-50 text-amber-700 ring-amber-200", label: "Falta" },
  mismatch: { cls: "bg-orange-50 text-orange-700 ring-orange-200", label: "No coincide" },
  unknown: { cls: "bg-gray-100 text-gray-500 ring-gray-200", label: "Desconocido" },
};

export default function AdminBackends() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Connection form (write-only).
  const [hostKey, setHostKey] = useState("");
  const [gcpKey, setGcpKey] = useState("");
  const [savingConn, setSavingConn] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backends");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveConnections() {
    setSavingConn(true);
    setMsg(null);
    try {
      const body: Record<string, string> = {};
      if (hostKey.trim()) body.hostinger_api_key = hostKey.trim();
      if (gcpKey.trim()) body.gcp_sa_key = gcpKey.trim();
      const res = await fetch("/api/admin/backends/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: json?.error?.message || "No se pudo guardar." });
      } else {
        const valid = json?.hostinger?.valid;
        setMsg({
          kind: "ok",
          text:
            valid === false
              ? "Guardado, pero el token de Hostinger no validó (revisa la key)."
              : "Conexiones guardadas.",
        });
        setHostKey("");
        setGcpKey("");
        load();
      }
    } catch {
      setMsg({ kind: "err", text: "Error de red al guardar." });
    } finally {
      setSavingConn(false);
    }
  }

  async function publishDns(id: string) {
    setPublishing(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/backends/${id}/dns`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: json?.error?.message || "No se pudo publicar el DNS." });
      } else {
        setMsg({ kind: "ok", text: `DNS de ${id}: ${json.dnsStatus}.` });
        load();
      }
    } catch {
      setMsg({ kind: "err", text: "Error de red al publicar DNS." });
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Backends</h1>
            <p className="text-sm text-gray-500">Conexión, DNS y estado de los servicios de demo.</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {msg && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Conexiones */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Globe className="h-4 w-4 text-violet-600" /> Hostinger (DNS)
            </h2>
            {data && (
              <ConnBadge connected={data.hostingerConnected} />
            )}
          </div>
          <input
            type="password"
            value={hostKey}
            onChange={(e) => setHostKey(e.target.value)}
            placeholder={data?.hostingerConnected ? "•••• (pegar para actualizar)" : "Pega tu API key de Hostinger"}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <p className="mt-2 text-xs text-gray-400">
            Dominio: <code>{data?.domain ?? "robles.ai"}</code>. Se usa para publicar los CNAME.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Cloud className="h-4 w-4 text-violet-600" /> GCP (Cloud Run, solo lectura)
            </h2>
            {data && <ConnBadge connected={data.gcpConnected} />}
          </div>
          <textarea
            value={gcpKey}
            onChange={(e) => setGcpKey(e.target.value)}
            rows={3}
            placeholder={data?.gcpConnected ? "•••• (pegar JSON para actualizar)" : "Pega el JSON de la service account (run.viewer)"}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <p className="mt-2 text-xs text-gray-400">SA <code>backend-viewer@robles-ai-admin</code>, solo lectura.</p>
        </div>
      </section>

      <div className="mb-8">
        <button
          onClick={saveConnections}
          disabled={savingConn || (!hostKey.trim() && !gcpKey.trim())}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          {savingConn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          Guardar conexiones
        </button>
      </div>

      {/* Tabla de backends */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Backend</th>
                <th className="px-4 py-3">Salud</th>
                <th className="px-4 py-3">DNS</th>
                <th className="px-4 py-3">Cloud Run</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : (
                data?.items.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.label}</div>
                      <a href={b.publicUrl} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline">
                        {b.subdomain}.{data?.domain}
                      </a>
                    </td>
                    <td className="px-4 py-3"><HealthCell h={b.health} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DNS_BADGE[b.dnsStatus].cls}`}>
                        {DNS_BADGE[b.dnsStatus].label}
                      </span>
                      {b.currentTarget && b.dnsStatus === "mismatch" && (
                        <div className="mt-1 max-w-[12rem] truncate text-[11px] text-gray-400" title={b.currentTarget}>→ {b.currentTarget}</div>
                      )}
                    </td>
                    <td className="px-4 py-3"><CloudRunCell c={b.cloudRun} /></td>
                    <td className="px-4 py-3 text-right">
                      {(b.dnsStatus === "missing" || b.dnsStatus === "mismatch") && data?.hostingerConnected ? (
                        <button
                          onClick={() => publishDns(b.id)}
                          disabled={publishing === b.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          {publishing === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                          Publicar DNS
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ConnBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
      <XCircle className="h-3 w-3" /> No conectado
    </span>
  );
}

function HealthCell({ h }: { h: HealthStatus }) {
  if (!h.alive) return <span className="inline-flex items-center gap-1 text-xs text-gray-400"><XCircle className="h-3.5 w-3.5" /> Dormido</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Vivo{h.ms != null ? ` · ${h.ms} ms` : ""}
    </span>
  );
}

function CloudRunCell({ c }: { c: CloudRunStatus }) {
  if (!c.available) return <span className="text-xs text-gray-400">GCP no conectado</span>;
  if (c.error) return <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> {c.error}</span>;
  if (c.exists === false) return <span className="text-xs text-red-600">No existe</span>;
  return (
    <span className="text-xs text-gray-700">
      {c.ready ? <span className="text-emerald-700">Ready</span> : "—"}
      {c.latestRevision ? <span className="text-gray-400"> · {c.latestRevision}</span> : ""}
    </span>
  );
}
