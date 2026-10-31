import { useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, Plus, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKey {
  id: number; api_id: string; name: string; prefix: string;
  created_at: string; revoked_at: string | null; last_used_at: string | null; is_demo: boolean;
}
interface KeysResponse {
  apis: { id: string; label: string }[];
  keys: ApiKey[];
  demoKeys: Record<string, boolean>;
  required: boolean;
}

const CARD = "rounded-xl border border-gray-200 bg-white p-5";
const SELECT = "h-10 rounded-md border border-input bg-background px-3 text-sm";
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
const shortLabel = (label: string) => label.split(" — ")[0];

/** Who may call the demo APIs: the global switch, the site's own demo keys and the keys of clients. */
export default function AdminApiKeys() {
  const [data, setData] = useState<KeysResponse | null>(null);
  const [created, setCreated] = useState<{ client: string; api: string; key: string } | null>(null);
  const [client, setClient] = useState("");
  const [api, setApi] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) setData(await res.json());
    else setError("No se pudieron cargar las claves.");
  }
  useEffect(() => { void load(); }, []);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "No se pudo completar la acción.");
    return json;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      await load();
      setBusy(false);
    }
  }

  const createDemoKey = (id: string) => call("/api/admin/api-keys", "POST", { api: id, name: "Demos", useForDemo: true });

  if (!data) {
    return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <Loader2 className="h-5 w-5 animate-spin text-gray-400" />;
  }

  const activeKeys = data.keys.filter((key) => !key.revoked_at);
  const clientKeys = activeKeys.filter((key) => !key.is_demo);
  const missingDemos = data.apis.filter(({ id }) => !data.demoKeys[id]);
  const apiName = (id: string) => shortLabel(data.apis.find((item) => item.id === id)?.label ?? id);

  const generateMissing = () => run(async () => {
    for (const { id } of missingDemos) await createDemoKey(id);
  });

  const renewDemo = (id: string) => {
    if (!window.confirm(`¿Renovar la clave de la demo ${apiName(id)}? Quien tenga la demo abierta tendrá que recargar.`)) return;
    const previous = activeKeys.find((key) => key.api_id === id && key.is_demo);
    void run(async () => {
      await createDemoKey(id);
      if (previous) await call(`/api/admin/api-keys/${previous.id}`, "DELETE");
    });
  };

  const addClientKey = () => run(async () => {
    const result = await call("/api/admin/api-keys", "POST", { api, name: client.trim() });
    setCreated({ client: client.trim(), api, key: result.key });
    setClient("");
  });

  const revoke = (key: ApiKey) => {
    if (!window.confirm(`¿Revocar la clave de "${key.name}" para ${apiName(key.api_id)}? Dejará de funcionar en un minuto.`)) return;
    void run(() => call(`/api/admin/api-keys/${key.id}`, "DELETE"));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <KeyRound className="h-6 w-6 text-violet-600" /> API Keys
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">Controla quién puede usar las APIs de robles.ai.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{error}</p>}

      {/* Global switch */}
      <section className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {data.required
            ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {data.required ? "Protección activa" : "Protección apagada"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-600">
              {data.required
                ? "Las 7 APIs solo aceptan claves válidas."
                : "Cualquiera con la URL puede llamar a las 7 APIs sin clave."}
              {!data.required && missingDemos.length > 0 && " Para activarla, primero prepara las demos."}
            </p>
          </div>
        </div>
        <Button
          variant={data.required ? "outline" : "default"}
          disabled={busy || (!data.required && missingDemos.length > 0)}
          onClick={() => void run(() => call("/api/admin/api-keys/required", "PUT", { required: !data.required }))}
        >
          {data.required ? "Desactivar" : "Activar protección"}
        </Button>
      </section>

      {/* Site demos */}
      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-64 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Demos de la web</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              Una clave interna por API, para que las demos sigan funcionando con la protección activa. Se guarda en el servidor: no hay que copiarla.
            </p>
          </div>
          {missingDemos.length > 0 && (
            <Button disabled={busy} onClick={() => void generateMissing()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Preparar {missingDemos.length === 1 ? "la demo que falta" : `las ${missingDemos.length} demos que faltan`}
            </Button>
          )}
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.apis.map(({ id, label }) => {
            const ready = data.demoKeys[id];
            return (
              <li key={id} className="flex min-h-[60px] items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-gray-800">
                  {ready
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    : <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />}
                  {shortLabel(label)}
                  {!ready && <span className="text-xs text-amber-700">Sin clave</span>}
                </span>
                {ready && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => renewDemo(id)}
                    className="tap-target inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Renovar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Client keys */}
      <section className={CARD}>
        <h2 className="text-sm font-semibold text-gray-900">Clientes</h2>
        <p className="mt-0.5 text-sm text-gray-600">
          Claves para quien use las APIs desde sus propios sistemas. Crea las que necesites: cada una sirve para una API y funciona hasta que la revoques.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            aria-label="Nombre del cliente"
            name="api-key-client-label"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="Nombre del cliente"
            value={client}
            onChange={(event) => setClient(event.target.value)}
            className="min-w-48 flex-1"
          />
          <select aria-label="API" value={api} onChange={(event) => setApi(event.target.value)} className={SELECT}>
            <option value="">Elige una API</option>
            {data.apis.map(({ id, label }) => <option key={id} value={id}>{shortLabel(label)}</option>)}
          </select>
          <Button disabled={busy || !client.trim() || !api} onClick={() => void addClientKey()}>
            <Plus className="mr-2 h-4 w-4" /> Crear clave
          </Button>
        </div>

        {created && (
          <div className="mt-4 rounded-lg bg-violet-50 p-3 text-sm text-violet-900">
            <p className="font-semibold">
              Clave de {created.client} para {apiName(created.api)}. Cópiala ahora: no se volverá a mostrar.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-anywhere min-w-0 flex-1 rounded bg-white px-2 py-1.5 font-mono text-xs ring-1 ring-violet-100">{created.key}</code>
              <Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(created.key)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCreated(null)}>Ya la guardé</Button>
            </div>
          </div>
        )}

        {clientKeys.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            Todavía no hay claves de clientes.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">API</th>
                  <th className="py-2 pr-3 font-medium">Clave</th>
                  <th className="py-2 pr-3 font-medium">Creada</th>
                  <th className="py-2 pr-3 font-medium">Último uso</th>
                  <th className="py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {clientKeys.map((key) => (
                  <tr key={key.id}>
                    <td className="py-2 pr-3 font-medium text-gray-900">{key.name}</td>
                    <td className="py-2 pr-3">{apiName(key.api_id)}</td>
                    <td className="py-2 pr-3"><code className="font-mono text-xs text-gray-500">{key.prefix}…</code></td>
                    <td className="py-2 pr-3">{shortDate(key.created_at)}</td>
                    <td className="py-2 pr-3">{shortDate(key.last_used_at)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => revoke(key)}
                        className="tap-target inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
