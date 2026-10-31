# Handover a Kiro IDE

> **Fecha:** 31 de octubre de 2026.
> **Para:** Kiro IDE, que continúa el trabajo en estos 8 repositorios.
> **Lee primero:** `AGENTS.md`, `README.md`, `.kiro/steering/` y este documento.
> **Siguiente trabajo:** el overhaul del motor de noticias, en `docs/NEWS_ENGINE_OVERHAUL.md`.

---

## 1. Estado actual

Todo está en `main`, sincronizado con GitHub y desplegado.

| Área | Estado |
|---|---|
| Sitio `robles.ai` | En producción |
| 7 APIs de demos | Desplegadas en Cloud Run |
| API keys | **Protección activa.** Las 7 demos tienen clave. Verificado: sin clave o con clave inválida responden 401, y con token de demo pasan la autenticación |
| Blog y Dominical | Usan `gpt-6-luna` |
| Motor de noticias | Sigue el generador actual, con mejoras puntuales. El overhaul no ha empezado |
| Dominical nº 21 | `pending_review`, **se publica solo el domingo 1 de noviembre a las 18:00 de Lima** salvo que se cancele o cambie |

### Repositorios

Rutas bajo `/Users/antoniorobles/Dev/`. Cada push a `main` despliega.

| Repo | Commit | Función |
|---|---|---|
| `robles.ai` | Ver `git log` | Sitio, admin y motor de noticias. Despliega por GitHub Actions → SSH → `pull.sh` |
| `robles.ai-rag-api` | `82736fe` | `/try-rag` |
| `robles.ai-identity-api` | `0c8f4b7` | `/try-identity` |
| `robles.ai-chatbot-api` | `97eed82` | `/try-chatbot` |
| `robles.ai-langchain-api` | `7a79c4f` | `/try-langchain` |
| `robles.ai-docextract-api` | `a46c5b6` | `/try-docextract` |
| `robles.ai-tts-api` | `13dd5e2` | `/try-tts` |
| `robles.ai-transcription-api` | `240f6ec` | `/try-transcription` |

Último commit de código del sitio: `2efc3ef`.

---

## 2. Qué se hizo

### Demos

- **Guía paso a paso** en todas las demos (`DemoGuide.tsx`) y **Robly** como indicador de progreso compartido (`RunnerTrack.tsx`).
- **Tarjetas del catálogo tipo Shorts:** hover o mantener presionado reproduce; clic abre la demo.
- **Identity:** ya no envía el `callback` ficticio que producía `completed_with_errors`. La API reporta bien el estado de fallo.
- **RAG:** se quitó Llama, el rerank quedó acotado a 12 candidatos con timeout de 45 s y sigue con el orden vectorial si falla.
- **Transcripción:**
  - Speechmatics como proveedor principal, en vivo y por archivo (`POST /transcribe-file`, hasta 25 MB). Deepgram solo con `STT_PROVIDER=deepgram`.
  - Idioma Auto por defecto.
  - Parada en dos fases, para que la última frase termine con su hablante.
  - `POST /refine` corrige errores con contexto, como "Microsoft three. 65" → "Microsoft 365".
  - Micrófono sin cancelación de eco, para captar audio de otro dispositivo.
- **TTS:** timeout de `ffprobe` ampliado a 60 s.

### Modelos de OpenAI

- Se retiró el uso de `gpt-4` y `gpt-image-1`.
- Los modelos se configuran en Admin → Settings → *AI Models*. Las APIs los leen de `GET /api/public/ai-models`, con caché de 5 minutos.
- `chatOptions()` y `chatOptionsFor()` adaptan los parámetros: GPT-5 en adelante y la serie o rechazan `temperature`, `top_p` y `max_tokens`.

### API keys

- Sección **Admin → API Keys** (`/admin/api-keys`): protección global, claves internas de demos y claves de clientes, varias por API.
- `api_auth.py`, misma copia en los 7 repos, valida contra `POST /api/public/api-keys/verify`. Interruptor leído cada 60 s y claves con caché de 60 s.
- Claves `rbk_<api>_<hex>`, guardadas solo como hash. No caducan.
- Tokens de demo `rbt.<api>.<exp>.<hmac>`, de 15 minutos, firmados por el sitio. `POST /api/public/demo-token` limita a 60 por minuto por IP, solo en el sitio.
- `DemoGate` muestra "Esta demo no está disponible por el momento" si la protección está activa y falta la clave (`unavailableDemos` en `site-config`).
- `/redoc` fijado en la versión 2.1.5 en las 7 APIs.

### Infraestructura

- **Chatbot:** su CI fallaba desde septiembre porque faltaba `GCP_SA_KEY` en GitHub. Se cargó y volvió a desplegar.
- **Transcripción:** se creó el secreto `SPEECHMATICS_API_KEY` en GCP.
- **404 al recargar admin:** las rutas deben estar en `utilityRoute`, en `server/seo/metaInjector.ts`. Ya están API Keys, Monitoring y Contact Leads.

### Blog y Dominical

- **Hallazgo:** cada post lleva la fecha del día anterior por diseño, y `BlogList` la interpreta como hora real. Por eso nada parece de hoy.
- **Huecos:** de 13 reales, se rellenaron 5. 6 quedaron sin noticias y 2 los rechazó el modelo.
- **Modelo:** `gpt-6-luna` como predeterminado de contenido, en el blog y El Dominical.
- **Búsquedas:** Alex Cypher y Felipe Mesh tienen `extraNewsQueries`, sin "AI" y sin palabras de una noticia concreta.
- **Prompt:** prohíbe inventar personas, citas o cifras, afirmar que la IA intervino si la fuente no lo dice e insinuar que Robles.AI lo habría evitado.
- **Generación:** `draftPost` usa `json_object`, registra la respuesta inservible completa y reintenta una vez. Hacen falta al menos 2 artículos.
- **Binance:** Felipe del 29 de octubre se regeneró. Alex y Felipe del 30 se generaron antes de su hora. Alex del 29 no se regeneró porque el modelo no cubrió el tema.
- **Archivo:** el post reemplazado está en `server/data/replaced-posts/` en el VPS. Su URL antigua responde 404 y no aparece en sitemaps.
- **Dominical verificado sin guardar:** los posts de Binance salieron #1 y #3 de forma natural en dos corridas. El reporte 21 no se tocó.
- **Sitemaps:** auditoría de 24,907 URLs de blog, todas con post existente.

### Landing

- `/get-started`: campos de formulario claros sobre fondo oscuro.

### Documentación

- `AGENTS.md` y `README.md` actualizados en los 8 repos.
- Las 7 APIs tienen sección de autenticación en su README.

---

## 3. Pendientes

### Requieren decisión o acción del dueño

| Prioridad | Tema | Acción |
|---|---|---|
| **Inmediata** | Dominical nº 21 | Decidir antes del domingo 18:00 de Lima. Su top 5 no incluye Binance y repite temas (cuántica y Rivian). Regenerarlo metería dos posts de Binance |
| Alta | Licencia de NewsAPI | Confirmar términos del plan gratuito. Hay 7 claves en rotación en un sitio comercial |
| Alta | Claves filtradas en una sesión | Rotar la clave de Deepgram y la de OpenAI. Una salida de pruebas imprimió la primera completa y la segunda parcial |
| Alta | Respaldo de `dominical.db` | Existe `~/backups`, pero `crontab` no muestra un respaldo programado |
| Media | Decisiones D1–D5 | Ver §2 de `docs/NEWS_ENGINE_OVERHAUL.md` |
| Media | Prueba del iPhone | Repetir la separación de hablantes con Speechmatics. Si se mezclan, añadir reasignación por contexto |
| Media | Reemplazos de modelos | Elegir y probar antes de diciembre (NEWS-04) |

### Backlog técnico

En `docs/PENDING_WORK.md`:

| Código | Tema |
|---|---|
| PAY-01 | Pasarela de pagos |
| SEC-01 | Rotar secretos de APIs desde admin. **Solo la cuenta del dueño y con 2FA** |
| SEC-02 | Endurecer acceso: IP real en Cloud Run, anti-bots en `demo-token`, restringir `callback` de Identity |
| SEC-03 | Medición de uso, créditos y cuotas por cliente. **No existe hoy**: un token sirve para llamadas ilimitadas durante 15 minutos |
| NEWS-01 | Limpiar editores con instrucciones de inventar y auditar posts antiguos |
| NEWS-02 | Dominical: solo puntúa los 30 posts más recientes y no evita temas repetidos |
| NEWS-03 | `/api/generate-posts` es público |
| NEWS-04 | Retiro de `gpt-4o-mini` y `gpt-4o-mini-tts` en enero de 2027 |

### Tareas menores abiertas

- Traducir los errores de validación en inglés del formulario de `/get-started`.
- Borrar trabajos sobrantes de Speechmatics.
- Quitar el secreto `HF_TOKEN` sin uso en RAG.
- Revisar costos de las APIs.
- Ajustar la fecha mostrada en `/blog`. El overhaul lo resuelve con `publishedAt`.

---

## 4. Siguiente trabajo: overhaul de noticias

- Plan completo: `docs/NEWS_ENGINE_OVERHAUL.md`.
- Crear 7 specs en este orden: `news-article-inquiry`, `news-engine-foundation`, `news-ingestion-events`, `news-editorial-engine`, `news-publishing-lifecycle`, `news-reader-experience` y `news-admin-console`.
- `news-article-inquiry` y `news-reader-experience` pueden empezar antes de resolver el proveedor.
- Los valores por defecto de D1–D5 sirven para avanzar.

---

## 5. Cuidados al trabajar aquí

### Reglas del proyecto

- **Las noticias existentes no se tocan.**
- Nunca presentar cifras ilustrativas como resultados de clientes.
- No nombrar a la razón social anterior ni presentar los logos como clientes de proyectos de IA.
- Todo texto público pasa por i18n con paridad en/es. El panel admin no usa i18n.
- Solo `README.md` y `AGENTS.md` en la raíz. Lo demás va en `docs/` y se agrega a las tablas de ambos.
- Una tarea termina con CI en verde y verificación en producción (`.kiro/steering/delivery-standards.md`).
- Usar herramientas de edición de archivos, no here-documents ni `sed -i` (`.kiro/steering/file-editing.md`).
- Sin commits ni push salvo petición del dueño. Un push a `main` despliega.
- No uses `push.sh`: commitea todo el árbol.

### Entorno local

- Usar Node 20: `~/.nvm/versions/node/v20.19.6/bin`. `better-sqlite3` está compilado para esa versión. Si falla, `npm rebuild better-sqlite3`.
- Scripts con `tsx` que usen `NEWS_API_KEYS`: cargar `dotenv/config` primero, porque `newsService.ts` lee las claves al importarse.
- `POSTS_DIR` en `dominicalScoring.ts` depende de ejecutarse desde `dist`; en `tsx` la ruta no resuelve.
- Pruebas de las APIs: correr desde una copia sin `.env`. `test_no_persistence.py` de transcripción se cuelga también en el código original.

### Pruebas conocidas

- Fallan de antes: 3 de slides en `publicRoutes.test.ts`, y `carouselGenerator` y `slideCompositor`.
- Intermitentes: `sessionCookie.property.test.ts` y, bajo carga, `metaInjector.integration.test.ts`.
- Antes de atribuir un fallo a un cambio, comparar con `main`.

### Producción

- VPS: usuario `roblesai`, ruta `~/htdocs/robles.ai`, proceso PM2 `robles-ai`, logs en `~/.pm2/logs/`.
- En el VPS, `pull.sh` figura modificado solo por permisos de archivo, y hay una imagen suelta en `public/images/`. No provienen de este trabajo.
- `gcloud` caduca: pide `gcloud auth login` en interactivo.
- **Nunca imprimir secretos ni valores de `.env` en la salida.**

### Lecciones que conviene no repetir

- La documentación puede quedar desactualizada: confirmar con código o producción.
- Interruptor de API keys: 60 s. Modelos: 5 minutos. No confundirlos.
- `gpt-4` fue retirado, `gpt-4o` no todavía. El apagado de `gpt-4o` y `gpt-4o-mini` está previsto para el 14 de enero de 2027.
- `fillGaps` incluye horas de hoy que el cron aún no alcanzó, y `/api/generate-posts` no cubría el indexado de fechas pasadas hasta `2efc3ef`.
- Una verificación que dependa de datos debe distinguir falsos positivos: las URL con acentos están codificadas en los sitemaps.
