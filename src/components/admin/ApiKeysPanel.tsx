import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";

interface ApiKey {
  id: number; api_id: string; name: string; prefix: string;
  created_at: string; revoked_at: string | null; last_used_at: string | null;
}
interface KeysResponse { keys: ApiKey[]; demoKeys: Record<string, boolean>; required: boolean; }

const FIELD = "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const BUTTON = "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:opacity-50";

const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

/** API keys per backend, the key each demo uses and the switch that enforces them. */
export function ApiKeysPanel({ backends }: { backends: { id: string; label: string }[] }) {
  const [data, setData] = useState<KeysResponse | null>(null);
  const [created, setCreated] = useState<{ api: string; key: string } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [pasted, setPasted] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { void load(); }, []);

  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "No se pudo completar la acción.");
      await load();
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function generate(api: string, useForDemo: boolean) {
    const name = names[api]?.trim() || (useForDemo ? "Demos" : "");
    if (!name) { setError("Escribe un nombre para la clave."); return; }
    const result = await send("/api/admin/api-keys", "POST", { api, name, useForDemo });
    if (result) {
      setCreated({ api, key: result.key });
      setNames((all) => ({ ...all, [api]: "" }));
    }
  }

  async function saveDemoKey(api: string) {
    if (await send(`/api/admin/api-keys/demo/${api}`, "PUT", { key: pasted[api] ?? "" })) {
      setPasted((all) => ({ ...all, [api]: "" }));
    }
  }

  if (!data) return null;
  const allDemosReady = backends.every((backend) => data.demoKeys[backend.id]);

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <KeyRound className="h-4 w-4 text-violet-600" />
            API keys
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Cada API valida sus claves contra este panel. Las demos usan la clave marcada como "Demos": queda en este
            servidor y los visitantes solo reciben tokens de 15 minutos.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || (!data.required && !allDemosReady)}
          onClick={() => void send("/api/admin/api-keys/required", "PUT", { required: !data.required })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
            data.required ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-gray-900 text-white"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          {data.required ? "Exigencia activa · desactivar" : "Exigir API key en todas las APIs"}
        </button>
      </div>
      {!data.required && !allDemosReady && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Falta una clave de demos en alguna API. Sin ella la demo dejaría de funcionar, así que la exigencia no se puede activar todavía.
        </p>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      {created && (
        <div className="mt-3 rounded-lg bg-violet-50 p-3 text-xs text-violet-900">
          <p className="font-semibold">Copia esta clave ahora: no se volverá a mostrar.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-anywhere min-w-0 flex-1 rounded bg-white px-2 py-1.5 font-mono ring-1 ring-violet-100">{created.key}</code>
            <button type="button" className={BUTTON} onClick={() => void navigator.clipboard.writeText(created.key)}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
            <button type="button" className={BUTTON} onClick={() => setCreated(null)}>Ya la guardé</button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {backends.map((backend) => {
          const keys = data.keys.filter((key) => key.api_id === backend.id && !key.revoked_at);
          return (
            <div key={backend.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  {backend.label}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                    data.demoKeys[backend.id]
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}>
                    {data.demoKeys[backend.id] ? "Demos: configurada" : "Demos: sin clave"}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label={`Nombre de la clave para ${backend.label}`}
                    placeholder="Nombre del cliente"
                    value={names[backend.id] ?? ""}
                    onChange={(event) => setNames((all) => ({ ...all, [backend.id]: event.target.value }))}
                    className={`${FIELD} w-44`}
                  />
                  <button type="button" disabled={busy} className={BUTTON} onClick={() => void generate(backend.id, false)}>
                    Generar clave
                  </button>
                  <button type="button" disabled={busy} className={BUTTON} onClick={() => void generate(backend.id, true)}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Generar y usar en demos
                  </button>
                </div>
              </div>
              {keys.length > 0 && (
                <ul className="mt-2 divide-y divide-gray-50">
                  {keys.map((key) => (
                    <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs text-gray-600">
                      <span className="min-w-0">
                        <span className="font-medium text-gray-800">{key.name}</span>{" "}
                        <code className="font-mono text-gray-500">{key.prefix}…</code>
                      </span>
                      <span className="flex items-center gap-3 text-gray-400">
                        Creada {shortDate(key.created_at)} · Usada {shortDate(key.last_used_at)}
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Revocar ${key.name}`}
                          className="text-gray-400 transition-colors hover:text-red-600"
                          onClick={() => {
                            if (window.confirm(`¿Revocar "${key.name}"? Dejará de funcionar en un minuto.`)) {
                              void send(`/api/admin/api-keys/${key.id}`, "DELETE");
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  aria-label={`Clave de demos para ${backend.label}`}
                  placeholder="Pegar una clave existente para las demos"
                  value={pasted[backend.id] ?? ""}
                  onChange={(event) => setPasted((all) => ({ ...all, [backend.id]: event.target.value }))}
                  className={`${FIELD} min-w-0 flex-1`}
                />
                <button type="button" disabled={busy || !pasted[backend.id]} className={BUTTON} onClick={() => void saveDemoKey(backend.id)}>
                  Usar en demos
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
