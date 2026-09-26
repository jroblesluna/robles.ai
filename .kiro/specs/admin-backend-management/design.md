# Design — Admin Backend Management

> Implementa `requirements.md`. Feature del sitio `robles.ai` (Express + React + SQLite),
> siguiendo los patrones del `/admin` existente (JWT en cookie, `settings` key-value,
> rutas admin, páginas bajo `src/pages/admin/`, i18n en/es).

---

## 1. Arquitectura

```
Frontend  src/pages/admin/AdminBackends.tsx
  │  fetch + cookie JWT
  ▼
Express  server/backendRoutes.ts  (montado como /api/admin/backends, requireAuth)
  ├── connections (GET/PUT)  ── settings (BD): hostinger_api_key, gcp_sa_key, ...
  ├── list (GET)             ── registry + DnsProvider + CloudRunClient + health
  ├── :id/dns (POST)         ── DnsProvider.upsertCname
  └── :id/cloudrun (GET)     ── CloudRunClient.getService
        │
        ├── server/services/backends/registry.ts        (catálogo declarativo)
        ├── server/services/dns/DnsProvider.ts           (interfaz)
        ├── server/services/dns/HostingerDnsProvider.ts  (impl v1)
        ├── server/services/gcp/cloudRunClient.ts         (SA → OAuth → run.googleapis.com, read-only)
        └── server/services/gcp/googleAuth.ts             (JWT bearer grant desde el SA JSON)
```

Ninguna credencial llega al cliente. Todo el I/O a Hostinger/GCP ocurre en el servidor.

---

## 2. Catálogo de backends — `registry.ts`

```ts
export interface BackendDef {
  id: string;            // "chatbot"
  label: string;         // "Chatbot (Tu chatbot en 60s)"
  subdomain: string;     // "chatbot-api"  → name del CNAME
  publicUrl: string;     // "https://chatbot-api.robles.ai"
  cloudRunProject: string;
  cloudRunService: string;
  region: string;        // "us-central1"
  cnameTarget?: string;  // default global dns_cname_target
}
export const BACKENDS: BackendDef[] = [ identity, rag, langchain, transcription, chatbot ];
```
Valores tomados de los AGENTS.md de cada repo hermano (proyectos/servicios reales).
`transcription` usa proyecto `robles-ai-transcript-project` y servicio
`transcription-api-server`; `identity` el servicio `identity-server` (nota: aún sin
sufijo `-api`, ver deuda en DEMOS_PLAN §8) — el registry refleja los nombres **reales**.

---

## 3. Credenciales en `settings` (BD)

Claves nuevas en la tabla `settings` (mismo almacén key-value del admin):
`hostinger_api_key`, `gcp_sa_key` (JSON como texto), `hostinger_domain`
(default `robles.ai`), `dns_cname_target` (default `ghs.googlehosted.com.`).

Helpers en `conversationStore`/`settings` existentes para leer/escribir. Regla de oro:
un getter `getSecret(key)` para uso interno del servidor; el `GET` de la API expone solo
`Boolean(value)`.

---

## 4. `DnsProvider` (interfaz) + `HostingerDnsProvider`

```ts
export interface DnsRecord { name: string; type: string; target: string; ttl?: number; }
export interface DnsProvider {
  getRecords(domain: string): Promise<DnsRecord[]>;
  upsertCname(domain: string, name: string, target: string, ttl?: number): Promise<void>;
}
```

`HostingerDnsProvider` (usa `fetch`, no SDK — dependencia cero):
- Base `https://developers.hostinger.com`, header `Authorization: Bearer <hostinger_api_key>`,
  `Content-Type: application/json`.
- `getRecords(domain)` → `GET /api/dns/v1/zones/{domain}`; mapea la respuesta a
  `DnsRecord[]` (aplana `zone[].records[]`).
- `upsertCname(domain, name, target, ttl=3600)` → `PUT /api/dns/v1/zones/{domain}` con
  ```json
  { "overwrite": true,
    "zone": [ { "name": name, "type": "CNAME", "ttl": ttl,
                "records": [ { "content": target } ] } ] }
  ```
- Manejo de errores (R6.2): `401/403` → `hostinger_auth`; `404` → `domain_not_found`;
  `429` → `rate_limited` (respeta `Retry-After`); otro → `hostinger_error`. Nunca
  incluye el token en el mensaje.
- Rate limit (R6.3): un pequeño limitador (≤90/min) + reintento con backoff en `429`.

> El `name` del CNAME que Hostinger espera es el **subdominio relativo** (`chatbot-api`),
> no el FQDN. Se confirma contra `getRecords` al calcular el estado.

## 5. `CloudRunClient` (solo lectura) + `googleAuth`

Credencial: la **única SA** `backend-viewer@robles-ai-admin` (proyecto raíz dedicado,
requirements §1.5) con `roles/run.viewer` en los 5 proyectos de backend. Su key JSON se
guarda en `settings.gcp_sa_key`. Provisión (una vez, operador/agente con gcloud):
```
gcloud projects create robles-ai-admin
gcloud billing projects link robles-ai-admin --billing-account=01817C-24FBFE-66BA22
gcloud iam service-accounts create backend-viewer --project=robles-ai-admin
# por cada proyecto de backend:
gcloud projects add-iam-policy-binding <backend-project> \
  --member="serviceAccount:backend-viewer@robles-ai-admin.iam.gserviceaccount.com" \
  --role="roles/run.viewer"
gcloud iam service-accounts keys create key.json \
  --iam-account=backend-viewer@robles-ai-admin.iam.gserviceaccount.com
# → cargar key.json en settings.gcp_sa_key desde /admin, luego borrar el archivo.
```

`googleAuth.ts`: construye un **JWT bearer grant** desde el `gcp_sa_key` JSON
(`client_email`, `private_key`) firmado con RS256, `aud=https://oauth2.googleapis.com/token`,
`scope=https://www.googleapis.com/auth/cloud-platform.read-only`, y lo canjea por un
access token en `POST https://oauth2.googleapis.com/token`. Cachea el token hasta su
expiración. Usa `jsonwebtoken` (ya en el árbol de deps del sitio) — sin SDK de Google.

`cloudRunClient.getService(project, region, service)`:
- `GET https://run.googleapis.com/v2/projects/{project}/locations/{region}/services/{service}`
  con `Authorization: Bearer <access_token>`.
- Devuelve `{exists, url, ready, latestRevision, region}` (de `uri`, `terminalCondition`,
  `latestReadyRevision`). `404` → `{exists:false}`. Sin credencial → `{available:false}`.
- **Solo GET.** No se implementa ningún método de escritura (R5.4).

## 6. Health-check — `health.ts`
`pingHealth(publicUrl)`: `GET {publicUrl}/health` (fallback `/`) con timeout corto
(~4s) y `mode` server-side (no CORS). Devuelve `{alive, ms}` (warm si `ms` bajo). Público,
sin credenciales (R5.5). Se corre en paralelo para todos los backends en el `list`.

## 7. Endpoints — `server/backendRoutes.ts`

Montado en `server/routes.ts` como `app.use("/api/admin/backends", requireAuth, backendRouter)`.

- **`GET /connections`** → `{hostinger:{connected,domain}, gcp:{connected}}` (presencia,
  sin valores).
- **`PUT /connections`** → guarda en `settings` las llaves provistas; para
  `hostinger_api_key` hace una validación de prueba opcional (`getRecords`) y reporta
  `valid`. Write-only para las sensibles.
- **`GET /`** (lista) → para cada backend del registry, en paralelo: `dnsStatus` (via
  DnsProvider + comparación), `health` (ping), `cloudRun` (via CloudRunClient si hay SA).
  Degradación elegante: si Hostinger/GCP no están, esos campos van `unknown`/`{available:false}`.
- **`POST /:id/dns`** → valida `:id` en el registry (400 si no); `DnsProvider.upsertCname(
  domain, def.subdomain, def.cnameTarget ?? dns_cname_target)`; re-lee y devuelve estado.
  Log de auditoría (R7). El `name`/`target` salen del registry, nunca del body (R4.3).
- **`GET /:id/cloudrun`** → `CloudRunClient.getService(...)` del backend.

Errores → envelope del proyecto (`utils/response.ts`), con `code` machine-readable.
Ninguna respuesta incluye secretos.

## 8. Frontend — `src/pages/admin/AdminBackends.tsx`

- Ruta admin nueva (registrar en el `<Switch>` admin de `App.tsx`: `/admin/backends`) +
  entrada en el `AdminLayout` (menú lateral).
- **Sección "Conexiones":** dos tarjetas (Hostinger, GCP) con estado
  conectado/desconectado y un formulario para pegar la API key / el JSON de la SA
  (campos password, nunca muestran el valor guardado; solo "conectado ✓" o "pegar para
  actualizar"). Guarda vía `PUT /connections`.
- **Tabla de backends:** una fila por backend con columnas: nombre, URL (link),
  **Salud** (chip vivo/dormido + latencia, del ping), **DNS** (chip ok/missing/mismatch/
  unknown + target actual), **Cloud Run** (revisión + ready, o "GCP no conectado").
  Acción por fila: **"Publicar DNS"** (habilitada si `missing`/`mismatch` y Hostinger
  conectado) → confirma → `POST /:id/dns` → refresca la fila.
- Estilo: reutiliza los componentes admin existentes (tablas, tarjetas, `KpiCard`);
  paginación no necesaria (5 filas). i18n en/es bajo `adminBackends.*`.

## 9. Trazabilidad requisito → componente

| Requisito | Dónde |
|-----------|-------|
| R1 auth JWT | `requireAuth` en el montaje del router |
| R2 conexiones | `GET/PUT /connections`, `settings` |
| R3 estado DNS | `DnsProvider.getRecords` + comparación en `GET /` |
| R4 publicar CNAME | `POST /:id/dns` → `HostingerDnsProvider.upsertCname` |
| R5 Cloud Run RO | `cloudRunClient` + `googleAuth` (run.viewer) |
| R5.5 health | `health.pingHealth` |
| R6 token/errores | `getSecret` interno, mapeo de errores, máscara en logs |
| R7 seguridad/audit | validación de `:id`, confirmación UI, log de auditoría |
| R8 sin acoplar arranque | credenciales opcionales; degradación elegante |
| §1.4 DnsProvider | interfaz + impl Hostinger (swap futuro Cloud DNS) |
