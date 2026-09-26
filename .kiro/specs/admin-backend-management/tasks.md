# Tasks — Admin Backend Management

> Feature del sitio `robles.ai`. Cada tarea cita el/los requisito(s). v1 = opción (i):
> lectura de estado (DNS + Cloud Run read-only + health) + publicar CNAMEs. Sin acciones
> destructivas desde el VPS.

## Fase 0 — Provisión GCP (operador/agente con gcloud, una vez)
- [ ] **P1. Proyecto raíz `robles-ai-admin`** (§1.5, R5) — crear proyecto + vincular
  billing `01817C-24FBFE-66BA22`.
- [ ] **P2. SA `backend-viewer@robles-ai-admin`** + `roles/run.viewer` en los 5 proyectos
  de backend (binding cross-project) + generar key JSON.
- [ ] **P3.** Cargar la key en `settings.gcp_sa_key` (desde `/admin` una vez exista la UI,
  o insertar) y **borrar** el JSON local. Nunca commitear la key.

## Fase A — Servidor: catálogo y credenciales
- [ ] **A1. `server/services/backends/registry.ts`** (§2, R3) — `BackendDef[]` con los 5
  backends, leyendo nombres reales de proyecto/servicio de los AGENTS.md hermanos.
- [ ] **A2. Claves de `settings`** (R2, §3) — helpers `getSecret/setSecret` para
  `hostinger_api_key`, `gcp_sa_key`, `hostinger_domain`, `dns_cname_target`.

## Fase B — Servidor: proveedores externos
- [ ] **B1. `dns/DnsProvider.ts` (interfaz) + `dns/HostingerDnsProvider.ts`** (R3, R4, §4)
  — `getRecords`, `upsertCname` vía `fetch` a la API DNS de Hostinger; mapeo de errores;
  limitador de rate + backoff en 429.
- [ ] **B2. `gcp/googleAuth.ts`** (R5, §5) — JWT bearer grant RS256 desde `gcp_sa_key`
  (normalizar `\n` del `private_key`), canje por access token, cache por expiración.
- [ ] **B3. `gcp/cloudRunClient.ts`** (R5) — `getService` (GET v2 API), solo lectura;
  `{available:false}` sin SA.
- [ ] **B4. `backends/health.ts`** (R5.5) — `pingHealth(url)` con timeout corto.

## Fase C — Servidor: endpoints
- [ ] **C1. `server/backendRoutes.ts`** (R1–R7, §7) — `GET/PUT /connections`, `GET /`,
  `POST /:id/dns`, `GET /:id/cloudrun`; montaje con `requireAuth`; envelope; log de
  auditoría; validación de `:id` contra el registry; secretos write-only.

## Fase D — Frontend
- [ ] **D1. `src/pages/admin/AdminBackends.tsx`** (§8) — sección Conexiones (Hostinger +
  GCP) + tabla de backends con Salud/DNS/Cloud Run + acción "Publicar DNS".
- [ ] **D2. Ruta + menú** — `<Route path="/admin/backends">` en `App.tsx` (Switch admin)
  + entrada en `AdminLayout`.
- [ ] **D3. i18n** — bloque `adminBackends.*` en en/es.

## Fase E — Verificación
- [ ] **E1.** `npm run build` + `npm run check` (sin errores nuevos).
- [ ] **E2.** Prueba local/prod: conectar Hostinger, listar backends, ver `chatbot` DNS
  `ok`; publicar DNS en uno `missing` (idempotente); health muestra vivo/dormido; con SA
  GCP, estado Cloud Run real; sin credenciales, degradación elegante.
- [ ] **E3.** Confirmar que ninguna respuesta/loguea secretos.

## Fase F — Docs + commit
- [ ] **F1.** Actualizar `AGENTS.md` (§10 claves de `settings`, rutas admin, endpoints) y
  `README.md` del sitio.
- [ ] **F2.** `git add` (archivos de la feature) + commit + push a `main` (dispara CI/CD
  del VPS). Nunca comitear `.env`.

## Trazabilidad
| Tarea | Requisitos |
|-------|-----------|
| A1 | R3, §2 |
| A2 | R2, §3 |
| B1 | R3, R4, R6 |
| B2, B3 | R5 |
| B4 | R5.5 |
| C1 | R1, R2, R4, R6, R7 |
| D1–D3 | R2–R5 (UI), R9 |
| E1–E3 | Criterios §7 |
| F1–F2 | R9 |
