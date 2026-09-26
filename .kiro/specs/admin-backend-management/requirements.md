# Requirements — Admin Backend Management (portal de infraestructura en `/admin`)

> Panel en `robles.ai/admin` para **conectar, activar y parametrizar los backends de
> demo** de Robles.AI (los servicios de Cloud Run: identity, rag, langchain,
> transcription, chatbot) y **administrar sus registros DNS** (CNAME → Cloud Run) a
> través de la API de **Hostinger**, donde vive el DNS de `robles.ai`. Opcionalmente,
> consultar el estado de los servicios en **GCP Cloud Run**.

---

## 1. Contexto y motivación

### 1.1 El problema que resuelve
Hoy, publicar un backend nuevo (p. ej. `chatbot-api`) exige entrar a **dos** paneles
externos a mano: la consola de GCP (crear el domain mapping — ya lo hace
`deploy_fresh_gcp.sh`) y **hPanel de Hostinger** (crear el CNAME
`<x>-api → ghs.googlehosted.com`). El olvido de ese CNAME fue exactamente lo que dejó
`chatbot-api.robles.ai` sin resolver y rompió la demo TryChatbot con "Error de red".

Un portal en `/admin` que cree/verifique esos CNAME desde la propia UI elimina ese paso
manual y da visibilidad del estado de cada backend (DNS + servicio) en un solo lugar.

### 1.2 Por qué encaja en el sitio (`robles.ai`), no en un backend
- El sitio ya tiene un **panel `/admin` autenticado con JWT** y un almacén de
  credenciales (`settings`) usado para LinkedIn, Meta y OpenAI. Añadir Hostinger/GCP es
  el mismo patrón.
- La gestión de DNS es una acción del **servidor Express**, que llama a APIs externas
  con credenciales del lado servidor. No pertenece a ningún servicio de Cloud Run.

### 1.3 Dónde se guardan las credenciales (decisión)
El portal se **conecta/activa/parametriza desde `/admin`**, así que las credenciales que
el operador administra desde la UI viven en la **tabla `settings` (BD)**, igual que las
llaves de LinkedIn/Meta/OpenAI. Es el patrón existente del proyecto y el que permite
conectar/rotar sin redesplegar.

- **`hostinger_api_key`** → `settings` (BD). Editable desde `/admin`. (El `.env` solo se
  usó para bootstrap durante el desarrollo; producción lee de la BD.)
- **`gcp_sa_key`** → `settings` (BD). JSON de **una única** service account de solo
  lectura que vive en un **proyecto raíz dedicado `robles-ai-admin`** (no en un proyecto
  de backend), con `roles/run.viewer` otorgado en cada proyecto de backend (IAM
  cross-project). Editable desde `/admin`. Ver R5 y §1.5.
- **`hostinger_domain`** (default `robles.ai`) y **`dns_cname_target`** (default
  `ghs.googlehosted.com.`) → `settings`, no sensibles.

> **Seguridad de estas llaves (R6/R7).** Son de alto privilegio (DNS del dominio; lectura
> de GCP). Aunque se guarden en `settings`, el portal **nunca** las devuelve al frontend:
> el `GET` de estado reporta solo presencia (`connected: bool`), y el `PUT` es
> write-only (se setea, no se lee de vuelta). Se enmascaran en logs. La GCP SA se acota a
> `roles/run.viewer` para que una fuga no permita operar/destruir servicios.

### 1.4 Abstracción de DNS (preparar la migración a GCP)
La gestión de DNS se implementa detrás de una interfaz **`DnsProvider`** (métodos
`getRecords(domain)`, `upsertCname(domain, name, target)`). En v1 la única implementación
es `HostingerDnsProvider`. Cuando Robles.AI migre su DNS a **Cloud DNS** (pendiente en
`DEMOS_PLAN.md` §8), solo se añade `CloudDnsProvider` y se cambia el proveedor activo, sin
tocar los endpoints ni la UI.

### 1.5 Proyecto raíz `robles-ai-admin` y la SA de solo lectura (decisión)
La SA que lee el estado de Cloud Run **no vive en un proyecto de backend**. Una SA
pertenece siempre a un proyecto (no existen SA "globales" a nivel de organización), así
que ponerla en, p. ej., `robles-ai-chatbot-project` acoplaría el acceso a los **cinco**
backends a la vida de un proyecto descartable: borrar ese backend borraría la identidad y
se perdería el acceso a todos.

Por eso se crea un **proyecto raíz dedicado `robles-ai-admin`** (infraestructura de
administración, no descartable) que aloja **una única** SA
`backend-viewer@robles-ai-admin.iam.gserviceaccount.com`, con `roles/run.viewer`
otorgado **en cada** proyecto de backend (binding cross-project). Ventajas:
- Una sola credencial que administrar/rotar desde `/admin` (`gcp_sa_key`).
- La identidad vive en un proyecto estable; ningún backend sostiene el acceso de los demás.
- Escala: sumar un backend nuevo = un binding `run.viewer` más a la misma SA.
- Es solo lectura: perder este acceso nunca rompe un backend, solo el panel de monitoreo.

Este proyecto raíz es además el hogar previsto del sitio `robles.ai` y de Cloud DNS
cuando se ejecute la migración a GCP (`DEMOS_PLAN.md` §8).

---

## 2. Alcance

### En alcance (v1)
- Sección nueva en `/admin` (p. ej. `/admin/backends`) que lista los backends de demo y,
  por cada uno, muestra el **estado DNS** (¿existe el CNAME esperado? ¿apunta al target
  correcto?) y permite **crear/actualizar** ese CNAME vía la API de Hostinger.
- Cliente de servidor para la **API DNS de Hostinger** (`GET`/`PUT`/`DELETE` de zona).
- Endpoints admin (`/api/admin/backends/*`) autenticados con el JWT existente.
- Estado de conexión de Hostinger (presente/ausente) sin exponer el token.

### En alcance (v1, opcional — detrás de bandera si complica)
- Estado de **GCP Cloud Run** por servicio (¿existe?, URL, domain mapping) — solo
  lectura. Ver R5 y la sección de riesgos (auth GCP desde el VPS).

### Fuera de alcance
- Crear/desplegar servicios de Cloud Run desde la UI (eso lo hacen los scripts y el
  CI/CD de cada repo). El portal **observa y conecta DNS**, no reemplaza el despliegue.
- Editar el token de Hostinger desde la UI (R6/§1.3).
- Gestión de otros tipos de registro DNS (A, MX, TXT…) más allá de los CNAME de los
  backends. (Se puede extender luego.)
- Multi-dominio / multi-cuenta Hostinger.

---

## 3. Catálogo de backends (fuente de verdad)

El portal conoce los backends desde una **definición declarativa en el servidor** (no
hardcodeada en la UI), p. ej. `server/services/backends/registry.ts`:

| id | subdominio | Cloud Run project | estado hoy |
|----|-----------|-------------------|-----------|
| `identity` | `identity-api` | `robles-ai-identity-project` | live |
| `rag` | `rag-api` | `robles-ai-rag-project` | live |
| `langchain` | `langchain-api` | `robles-ai-langchain-project` | live |
| `transcription` | `transcription-api` | `robles-ai-transcript-project` | live |
| `chatbot` | `chatbot-api` | `robles-ai-chatbot-project` | live |

Cada entrada define: `id`, `label`, `subdomain` (el `name` del CNAME), `cnameTarget`
(default `ghs.googlehosted.com.`), `cloudRunProject`, `cloudRunService`, `publicUrl`.

---

## 4. Requisitos funcionales

### R1 — Autenticación
- **R1.1** Todos los endpoints `/api/admin/backends/*` exigen el JWT de admin (middleware
  `requireAuth` existente). Sin sesión válida → 401.

### R2 — Estado de conexiones e ingreso de credenciales
- **R2.1** `GET /api/admin/backends/connections` devuelve
  `{hostinger: {connected, domain}, gcp: {connected}}` — `connected` refleja si la
  credencial correspondiente está en `settings`. **Nunca** devuelve los valores.
- **R2.2** `PUT /api/admin/backends/connections` acepta `{hostinger_api_key?,
  gcp_sa_key?, hostinger_domain?, dns_cname_target?}` y las guarda en `settings`
  (write-only para las sensibles). Permite conectar/rotar desde la UI (tu pedido de
  "conectar mis backends por API Key").
- **R2.3** Validación opcional al guardar: tras setear `hostinger_api_key`, el servidor
  puede hacer una llamada de prueba (`GET zones/{domain}`) y reportar si el token es
  válido, sin exponerlo.

### R3 — Estado DNS por backend
- **R3.1** `GET /api/admin/backends` devuelve la lista del catálogo (§3), cada uno con
  su estado DNS calculado: `dnsStatus ∈ {ok, missing, mismatch, unknown}` y el
  `currentTarget` si existe un CNAME para ese subdominio.
- **R3.2** El estado se calcula leyendo la zona vía Hostinger
  (`GET /api/dns/v1/zones/{domain}`) y comparando el registro `CNAME` cuyo `name` es el
  `subdomain` contra el `cnameTarget` esperado. `ok` = existe y coincide; `missing` = no
  existe; `mismatch` = existe pero apunta a otro valor; `unknown` = no se pudo consultar
  (Hostinger no conectado o error).
- **R3.3** Si Hostinger no está conectado, `dnsStatus = unknown` para todos y la UI lo
  indica, sin romper la página.

### R4 — Crear/actualizar el CNAME de un backend
- **R4.1** `POST /api/admin/backends/:id/dns` crea o actualiza el CNAME del backend `:id`
  vía Hostinger `PUT /api/dns/v1/zones/{domain}` con
  `{overwrite:true, zone:[{name:<subdomain>, type:"CNAME", ttl:<default>, records:[{content:<cnameTarget>}]}]}`.
- **R4.2** Es **idempotente**: si ya existe y coincide, no falla (reporta `ok`); si
  difiere, lo corrige (`overwrite:true`).
- **R4.3** Valida `:id` contra el catálogo (rechaza ids desconocidos → 400). Nunca
  construye el registro con datos arbitrarios del cliente (el `name`/`target` salen del
  catálogo del servidor, no del body) — evita que el portal se use para escribir DNS
  arbitrario.
- **R4.4** Devuelve el nuevo estado del backend (re-consulta o asume `ok` tras 200).
- **R4.5** Un `202` de Hostinger (operación asíncrona) se trata como "en progreso"; la
  UI puede re-verificar con R3.

### R5 — Estado de Cloud Run (solo lectura, vía SA `run.viewer`)
Los backends **son** servicios de GCP, así que el portal muestra su estado real leyéndolo
de la Cloud Run Admin API. **Solo lectura** — el VPS nunca opera/despliega/destruye
(eso queda para v2 vía CI/CD, y hoy lo hacen los scripts de cada repo).

- **R5.1** Credencial: `gcp_sa_key` (JSON en `settings`) de la **única SA**
  `backend-viewer@robles-ai-admin` (proyecto raíz, §1.5) con **`roles/run.viewer`**
  otorgado en cada uno de los 5 proyectos de backend. Un solo JSON para leer los cinco.
- **R5.2** `GET /api/admin/backends/:id/cloudrun` devuelve `{exists, url, ready,
  latestRevision, region}` leído de
  `GET https://run.googleapis.com/v2/projects/{project}/locations/{region}/services/{service}`
  autenticado con un token OAuth derivado de la SA (JWT bearer grant).
- **R5.3** Si `gcp_sa_key` no está configurada, devuelve `{available:false}` y la UI
  muestra "GCP no conectado" en esa columna, **sin romper** el resto del portal (el DNS y
  los health-checks siguen funcionando).
- **R5.4** **Prohibido** cualquier método de escritura sobre Cloud Run en v1 (deploy,
  update, delete, scale). El cliente GCP solo expone lectura.
- **R5.5** Health-check independiente de GCP: además del estado Cloud Run, el portal
  pinea `GET /health` y `GET /` de cada backend (público, sin credenciales) para mostrar
  vivo/dormido y latencia (warm/cold). Esto funciona aunque GCP no esté conectado.

### R6 — Manejo del token y de errores
- **R6.1** El token de Hostinger **solo** se lee de `process.env.HOSTINGER_API_KEY` en
  el servidor; jamás se envía al cliente ni se loguea (enmascarar en logs).
- **R6.2** Errores de Hostinger se mapean a respuestas JSON claras:
  `429` → "límite de Hostinger, reintenta en Ns" (respetar `Retry-After`); `401/403` →
  "token inválido o sin permisos"; `404` → "dominio no encontrado en la cuenta"; otros →
  error genérico. Nunca filtrar el token en el mensaje.
- **R6.3** Rate limit: el cliente Hostinger del servidor debe pacear (máx 90/min) y
  reintentar con backoff ante `429`.

---

## 5. Requisitos no funcionales

- **R7 — Seguridad.** El portal puede reescribir DNS: toda acción de escritura (R4) pasa
  por `requireAuth`, valida contra el catálogo (R4.3), y registra un log de auditoría
  (quién/qué/cuándo, sin secretos). Confirmación explícita en la UI antes de escribir.
- **R8 — Sin acoplar el arranque.** Que falten las credenciales (`hostinger_api_key` o
  `gcp_sa_key` en `settings`) **no** debe impedir que el sitio arranque ni que `/admin`
  cargue; solo deshabilita la sección correspondiente (DNS o Cloud Run) con estado
  `unknown`/`no conectado` + aviso, y la UI invita a conectarla.
- **R9 — Paridad de estilo.** Mismos patrones del admin existente: rutas en
  `server/adminRoutes.ts` (o un `backendRoutes.ts` montado igual), respuestas con el
  envelope del proyecto, página bajo `src/pages/admin/`, i18n en/es, JWT en cookie.

---

## 6. Contrato de API (nuevos endpoints admin)

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| GET | `/api/admin/backends/connections` | JWT | — | `{hostinger:{connected,domain}, gcp:{connected}}` |
| PUT | `/api/admin/backends/connections` | JWT | `{hostinger_api_key?, gcp_sa_key?, hostinger_domain?, dns_cname_target?}` | `{hostinger:{connected,valid?}, gcp:{connected}}` |
| GET | `/api/admin/backends` | JWT | — | `[{id,label,subdomain,publicUrl,dnsStatus,currentTarget,health,cloudRun}]` |
| POST | `/api/admin/backends/:id/dns` | JWT | `{}` | `{id, dnsStatus, currentTarget}` |
| GET | `/api/admin/backends/:id/cloudrun` | JWT | — | `{available, exists?, url?, ready?, latestRevision?, region?}` (R5) |

Hostinger DNS API (servidor → externo), base `https://developers.hostinger.com`, header
`Authorization: Bearer $HOSTINGER_API_KEY`, `Content-Type: application/json`:
- `GET /api/dns/v1/zones/{domain}` — leer zona.
- `PUT /api/dns/v1/zones/{domain}` — crear/actualizar (`overwrite:true`).
- `DELETE /api/dns/v1/zones/{domain}` — borrar por filtro (no usado en v1; disponible).

---

## 7. Criterios de aceptación

1. Desde `/admin/backends` se puede **conectar Hostinger** pegando la API key; queda
   guardada en `settings` y el estado pasa a `connected: true` sin devolver el valor.
2. Con Hostinger conectado, `/admin/backends` lista los 5 backends con su `dnsStatus`
   real leído de Hostinger; `chatbot` aparece `ok` (el CNAME ya existe).
3. Para un backend con `dnsStatus: missing`, el botón "Publicar DNS" crea el CNAME vía
   Hostinger y el estado pasa a `ok` (idempotente si se repite).
4. Con `gcp_sa_key` conectada, cada backend muestra su estado real de Cloud Run
   (existe, URL, revisión). Sin ella, muestra "GCP no conectado" y el resto del portal
   sigue funcionando.
5. El health-check (`/health` público) muestra vivo/dormido aunque GCP no esté conectado.
6. Las credenciales nunca aparecen en respuestas de la API ni en logs.
7. Un `:id` fuera del catálogo → 400, sin tocar Hostinger.
8. Los endpoints exigen JWT (401 sin sesión).
9. La lógica de DNS pasa por la interfaz `DnsProvider` (v1: `HostingerDnsProvider`),
   lista para sumar `CloudDnsProvider` en la migración futura.
