# AGENTS.md — Contexto para asistentes de código

> Documento de contexto integral del proyecto `robles.ai` para agentes de IA y
> nuevos contribuidores: negocio, arquitectura, features, datos, rutas,
> convenciones, CI/CD y despliegue. Léelo antes de hacer cambios. El
> [README.md](README.md) es la referencia técnica orientada a humanos. El roadmap de demos
> (priorización por efecto wow + ROI) está en [DEMOS_PLAN.md](DEMOS_PLAN.md).

---

## 1. Qué es Robles.AI

Sitio web público de **Robles.AI**, una consultora/estudio de soluciones de Inteligencia Artificial. La plataforma cumple tres roles a la vez:

1. **Sitio corporativo / landing comercial**: presenta servicios, casos de éxito, equipo, cursos, un **laboratorio de demos de IA** en vivo, un **quiz de diagnóstico** que captura leads verificados, y formularios de contacto/postulación laboral.
2. **Medio editorial autogenerado por IA**: un blog con 24 "editores" (personas IA) que publican notas sobre tecnología/IA de forma automática, indexado con búsqueda full-text.
3. **Panel de administración interno**: gestiona un newsletter semanal ("El Dominical IA"), publicación multi-plataforma en redes sociales, generación de video, un chatbot con inbox de conversaciones, los leads del quiz, y un dashboard de analítica (GA4 + Meta).

- **Sitio**: https://robles.ai
- **Contacto**: info@robles.ai · WhatsApp/Tel +1 (408) 590-0153
- **Ubicación**: Cupertino, CA
- **Licencia**: MIT (c) 2025 Robles.AI

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS + framer-motion + shadcn/ui (Radix) + recharts + wouter (routing) |
| Backend | Express 4 + Node.js ≥20 + `tsx watch` (dev) / esbuild (bundle prod) |
| Base de datos | SQLite vía `better-sqlite3` (13 tablas, archivo único `server/data/dominical.db`) |
| IA / LLM | OpenAI — GPT-4o, GPT-4o-mini, `gpt-image-1` (generación de imágenes) |
| APIs sociales | LinkedIn UGC Posts API, Meta Graph API (Instagram + Facebook) |
| Analítica | Google Analytics Data API (GA4) + Meta Graph API (Insights) |
| Procesamiento de imagen/video | `sharp` (composición/resize), `pdfkit` (export PDF), `fluent-ffmpeg` + `@ffmpeg-installer`/`@ffprobe-installer` (generación de video) |
| Búsqueda | SQLite FTS5 con ranking BM25 |
| Auth | JWT (cookie httpOnly) + `bcrypt` para passwords admin; OTP (`otpauth`) |
| Email | `nodemailer` (Gmail) |
| IA en el navegador | TensorFlow.js + COCO-SSD (detección de objetos), `@vladmandic/face-api` (emociones) |
| i18n | `i18next` + `react-i18next` (en/es) |
| Testing | `vitest` + `fast-check` (property-based) + `supertest` (integración) + `@testing-library/react` |
| Despliegue | VPS + PM2, script `pull.sh` |

---

## 3. Funcionalidades principales

- **SPA** con Vite + React, routing con `wouter`.
- **Servidor Express** que sirve estáticos e integra middleware de Vite en desarrollo.
- **i18n** (en/es) con carga asíncrona de `translation.json` por idioma.
- **Landing page publicitaria** (`/get-started`): bilingüe, orientada a conversión, con pasos del proceso, servicios, tecnologías, precios, roadmap y CTA.
- **Chatbot IA "Robly"**: widget flotante (reemplazó una burbuja de WhatsApp antigua), impulsado por GPT-4o-mini con streaming SSE, consciente del contexto de página, recolecta datos de contacto durante la conversación y guarda transcripts. Avatar SVG con 4 estados de ánimo animados (idle/listening/thinking/speaking) más variantes nuevas "pointing"/"dominical" para video (ver §7).
- **Laboratorio de demos** (`/demos`, catálogo en `DemosCatalog.tsx`): seis demos *live* — `/try-identity`, `/try-rag`, `/try-langchain` y `/try-transcription` contra APIs propias en Cloud Run, más `/try-object-detection` y `/try-emotion` que corren 100% en el navegador. `/try-medical` está en **"soon"**: no tiene backend y ya no sube nada (ver §18). Las APIs escalan a cero, por eso cada página hace un **warm-up** al montar (ping `mode:"no-cors"` a `/`, o `GET /health` en transcription) con banner de estado, tooltips (`InfoTip`) y log JSON con resaltado (`JsonHighlight`). `TryRAG` extrae el texto del PDF **en el navegador** con `pdfjs-dist` (solo el texto va a la API; elimina el límite de 32 MB de Cloud Run).
- **Quiz de diagnóstico de IA** (`/diagnostico-ia`, `Quiz.tsx`): preguntas con puntaje → mensaje de resultado generado con GPT → email de verificación con token → reporte PDF descargable (solo si el email está verificado). Los leads se guardan en `quiz_leads` y se ven en `/admin/quiz-leads`; el equipo recibe un aviso por email en cuanto entra un lead.
- **Blog estático**: posts en `server/data/posts/YYYY/MM/DD/*.json`, bilingües, con búsqueda full-text FTS5.
- **SEO server-side**: middleware Express inyecta `<title>`, `<meta>`, Open Graph, Twitter Card, hreflang, canonical y JSON-LD antes de servir el HTML a crawlers (sin depender de JS del cliente).
- **Panel Admin** (`/admin`): dashboard autenticado con JWT — gestión de El Dominical IA, publicación multi-plataforma, generación de carrusel de imágenes, generación de video, inbox de conversaciones del chatbot, y analítica.
- **El Dominical IA**: newsletter semanal automatizado (ver §6).
- **Dashboard de Analítica**: métricas de GA4 y Meta (Instagram/Facebook) con caché en SQLite, en pestañas Overview/Traffic/Behavior/Social (recharts).
- **Formularios** con validación `zod` y envío por email (`nodemailer`).
- **Analítica opcional**: GA4 y Facebook Pixel (solo en producción).
- **Sitemaps** con anotaciones hreflang (`sitemap.xml` + archivos XML mensuales por idioma).

---

## 4. Estructura de directorios clave

```
src/
  components/           # Componentes UI reutilizables
    DemosCatalog.tsx    # Catálogo del laboratorio de demos (home + /demos)
    chat/               # ChatbotWidget, ChatPanel, MessageList, MessageInput
    demo/               # UI compartida de demos: JsonHighlight, InfoTip, StepCard
    admin/               # CarouselPreview, SlideEditor, PlatformPublishStatus, VideoGenerator
    admin/analytics/     # OverviewTab, TrafficTab, BehaviorTab, SocialTab, KpiCard
  pages/
    Home, Landing, Quiz, Demos, Careers, Apply, BlogList, BlogPost, OTP, not-found,
    TryIdentity, TryLangChain, TryRAG, TryTranscription, TryObjectDetection,
    TryEmotion, TryMedical (soon, sin backend)
    admin/               # AdminLayout, AdminDashboard, AdminSettings, AdminDominicalList,
                          # AdminDominicalDetail, AdminConversationList, AdminConversationDetail,
                          # AdminAnalytics, AdminQuizLeads, AdminLogin, AdminSetup
  hooks/                 # useChatSession, useSearch, useSEO
  scripts/               # Generación de posts, limpieza, detección de huecos, sitemaps
  i18n/                  # locales/en/ y locales/es/

server/
  adminRoutes.ts         # Todos los endpoints /api/admin/*
  analyticsRoutes.ts     # /api/admin/analytics/*
  chatRoutes.ts          # /api/chat/* (SSE streaming, sesiones)
  chatAdminRoutes.ts     # /api/admin/conversations/*
  publicRoutes.ts        # /api/public/slides/* (sin auth — acceso de imágenes para API de Meta)
  searchRoutes.ts        # /api/blog/search (búsqueda FTS5 BM25)
  auth.ts                # Middleware JWT (generateToken, verifyToken, requireAuth)
  db.ts                  # Conexión SQLite + creación de todas las tablas
  vite.ts                # Integración de Vite + singleton de índice de slugs
  fts/                   # Indexador FTS5, script de migración, property tests
  listing/                # Indexador blog_posts_index, property tests
  migrations/             # Migración chatTables
  seo/                    # MetaInjector, SlugIndex, metaBuilders, htmlInjector, types
  jobs/
    generateDominical.ts      # Sábado 12pm: puntuar + generar + notificar
    autoPublishDominical.ts   # Domingo 12pm: publicar o saltar
    chatSessionCleanup.ts     # Cada 5min: cerrar sesiones de chat inactivas
  services/
    dominicalScoring.ts       # Puntuación multidimensional con GPT-4o
    imageGeneration.ts        # Imagen de portada con gpt-image-1
    linkedin.ts                # Re-export (wrapper de compatibilidad)
    engagementPhrases.ts       # Frases de engagement en batch con GPT-4o
    carouselImageGen.ts        # Fondo por slide con gpt-image-1
    slideCompositor.ts         # sharp + overlay SVG → PNG 1080×1080
    carouselGenerator.ts       # Orquestación del carrusel (generar + regenerar)
    pdfExporter.ts             # pdfkit → PDF Buffer
    carouselTypes.ts           # Interfaces compartidas del carrusel
    dominicalVideoGen.ts       # Generación de video narrado con robot IA (nuevo)
    robotFrames.ts             # Poses/frames SVG del robot Robly para video (nuevo)
    quizResultMessage.ts       # Mensaje de resultado del quiz con GPT
    quizVerificationEmail.ts   # Email de verificación de leads del quiz
    quizLeadPdf.ts             # Reporte PDF del quiz con pdfkit (+ pdfIcons.ts)
    chatEngine.ts               # SSE streaming GPT-4o-mini + tool calls
    chatContext.ts              # Contexto consciente de la página (blog/home/demo)
    chatNotifier.ts             # Notificación por email del transcript
    conversationStore.ts        # CRUD SQLite de conversaciones/mensajes/contactos
    ga4Client.ts                 # Cliente de Google Analytics Data API
    metaInsights.ts              # Meta Graph API (insights de Instagram + Facebook)
    analyticsCache.ts            # Caché TTL en SQLite para respuestas de analítica
    platforms/
      types.ts                  # PlatformName, PlatformStatus, PlatformAdapter interface
      contentFormatter.ts       # Truncado de texto, preservación de hashtags, selección de formato
      linkedinAdapter.ts        # LinkedIn UGC Posts API + refresh de token
      instagramAdapter.ts       # Meta Graph API — publicación de carrusel
      facebookAdapter.ts        # Meta Graph API — post multi-foto
      publishingEngine.ts       # Orquesta publicación multi-plataforma con aislamiento de fallos

public/
  images/               # Imágenes de la landing (servidas localmente)
  avatars/              # Headshots de editores (24 editores)
  robly-avatar/         # SVGs de Robly: idle, listening, speaking, thinking, pointing, dominical
  case-studies/         # content.json (4 casos de éxito bilingües en HTML) + imágenes

study-cases/            # Documentos PDF + DOCX de casos de éxito (EN + ES)
scripts/                # generateCaseStudyContent.js (generación de HTML de casos de éxito)
shared/
  schema.ts             # Único archivo cruzado cliente/servidor (@shared/schema)
  chatTypes.ts           # Tipos compartidos del sistema de chat
.kiro/specs/             # Specs de features (requirements/design/tasks) — ver §11
DEMOS_PLAN.md            # Roadmap del laboratorio de demos (wow + ahorro/ROI)
REMOTION_VIDEO_CONTEXT.md # Contexto de marca + brief del video de marketing en Remotion
```

---

## 5. Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Páginas SPA: Home, Landing, Blog, Demos, Panel Admin            │
│  Componentes: ChatbotWidget (Robly), BlogSearch, CarouselPreview │
│  Tabs admin: Dominical, Settings, Conversations, Analytics       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / SSE / fetch + cookie JWT
┌──────────────────────────────▼──────────────────────────────────┐
│                       Servidor Express                           │
│  server/routes.ts        ← router principal + cron jobs         │
│  server/adminRoutes.ts   ← /api/admin/* (requiere auth)         │
│  server/chatRoutes.ts    ← /api/chat/* (streaming SSE)          │
│  server/analyticsRoutes.ts ← /api/admin/analytics/*             │
│  server/searchRoutes.ts  ← /api/blog/search (FTS5)              │
│  server/publicRoutes.ts  ← /api/public/slides/* (sin auth)      │
├──────────────────────────────────────────────────────────────────┤
│  Middleware SEO (server/seo/)                                    │
│  MetaInjector → SlugIndex → BlogMetaBuilder / StaticMetaBuilder │
│  → HtmlInjector → sirve HTML modificado a crawlers               │
├──────────────────────────────────────────────────────────────────┤
│  Cron Jobs (node-cron, zona horaria America/Lima)                │
│  - Cada hora:      genera posts de blog + actualiza índices FTS  │
│  - Sábado 12pm:     generateDominical (puntuar → post → notificar)│
│  - Domingo 12pm:    autoPublishDominical (LinkedIn/IG/FB)         │
│  - Cada 5min:       chatSessionCleanup (cierra sesiones inactivas)│
├──────────────────────────────────────────────────────────────────┤
│  APIs externas                                                    │
│  OpenAI (GPT-4o, GPT-4o-mini, gpt-image-1)                        │
│  LinkedIn UGC Posts API + OAuth 2.0                               │
│  Meta Graph API (carrusel Instagram + multi-foto Facebook)        │
│  Google Analytics Data API (GA4)                                  │
│  NewsAPI (descubrimiento de temas para posts de blog)             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  SQLite (server/data/dominical.db)                                │
│  13 tablas: admin, settings, dominical, carousel, platform,       │
│             analytics_cache, chat×3, fts5, listing_index, quiz×2  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. El Dominical IA (newsletter automatizado)

Sistema gestionado desde `/admin/dominical`:

**Sábado 12:00pm (America/Lima)** — job de generación:
1. Lee todos los posts de blog de los últimos 7 días.
2. Envía a GPT-4o para puntuación multidimensional (novedad, impacto en personas, impacto económico, potencial narrativo, escala 1–100).
3. Selecciona el top N posts (configurable, por defecto 5).
4. Genera borrador de post para LinkedIn (hook + opiniones + hashtags, en español).
5. Genera variante de texto específica para Instagram.
6. Guarda el reporte en `dominical_reports` con estado `pending_review`.
7. Envía email de notificación al admin.

**Panel de revisión admin** (`/admin/dominical/:id`):
- Vista dividida: lista de noticias puntuadas (izquierda) + texto editable del post (derecha).
- Generación de carrusel de imágenes: slides PNG 1080×1080 (portada + artículo×N + CTA).
  - Fondos: ilustraciones vectoriales conceptuales con gpt-image-1.
  - Composición: overlay SVG con banda blanca de encabezado, logo, título de 3 líneas, frase de engagement, etiquetas de categoría, selector de paleta de colores.
  - Regeneración individual de slides, edición de texto (recompone sin regenerar el fondo).
  - Descarga de carrusel en PDF (pdfkit).
- **Generación de video narrado (feature nueva)**: video con un robot IA ("Robly") que narra y señala el contenido del Dominical, compuesto con `fluent-ffmpeg`, fondo generado con `gpt-image-1`, frames del robot renderizados desde SVG (`server/services/robotFrames.ts`) y subtítulos superpuestos (`server/services/dominicalVideoGen.ts`, componente `src/components/admin/VideoGenerator.tsx`).
- Panel de estado de publicación multi-plataforma (LinkedIn/Instagram/Facebook).
- Publicación manual o cancelación.

**Domingo 12:00pm (America/Lima)** — job de auto-publicación:
- Publica en todas las plataformas con credenciales válidas y estado `not_published`.
- Delay de 5 segundos entre intentos por plataforma.
- Aislamiento de fallos por plataforma.
- Email de notificación con resumen de resultados.

---

## 7. Chatbot IA "Robly"

Widget flotante global (`src/components/chat/ChatbotWidget.tsx`) impulsado por GPT-4o-mini:

- Aparece en todas las páginas no-admin con secuencia de entrada temporizada (burbuja a los 10s, puntos de "escribiendo" a los 20s, saludo a los 22s).
- Avatar Robly con SVGs de 4 estados de ánimo: idle, listening, thinking, speaking (`public/robly-avatar/`), más variantes nuevas `robly-pointing`, `robly-pointing-glasses` y `robly-dominical` para las escenas de video de El Dominical IA.
- Streaming SSE para entrega de tokens en tiempo real.
- Consciente del contexto de página: lee contenido de posts de blog, servicios de home, descripciones de demos.
- Recolecta de forma natural datos de contacto del visitante (nombre, email/teléfono) durante la conversación.
- Cada sesión se guarda en SQLite con transcript completo.
- Notificación por email a `EMAIL_TO` cuando una sesión se cierra.
- Inbox admin en `/admin/conversations` con filtros, analítica y vista de detalle.
- Botón de fallback a WhatsApp dentro del panel de chat (`https://wa.me/14085900153`).
- Oculto en rutas `/admin/*` y al imprimir.

---

## 8. Blog editorial (IA)

- Ubicación: `server/data/posts/YYYY/MM/DD/*.json`.
- Estructura del post: `slug`, `date`, `editorId`, `categories`, `keywords`, `translations` (en/es), `sources`.
- **24 personas de editores IA** definidas en `server/data/editors.json` (id 1–24), cada una con especialidad, `systemPrompt`, perfil, firma, paleta de colores y rangos de temperatura/top_p.

| IDs | Especialidades |
|-----|-----------------|
| 1–5 | Ciudades inteligentes, Robótica, Deep Learning, Visión por computadora, NLP |
| 6–10 | Big Data, Computación cuántica, Edge Computing, Streaming, Vehículos autónomos |
| 11–15 | Ética/Diversidad en IA, IA cuántica, Neurociencia, Infraestructura/Cloud, Gobernanza de IA |
| 16–20 | IA en salud, IA musical, Ciberseguridad, AR/VR, IA en animación |
| 21–24 | Arte con IA, Telecomunicaciones, Clima/IA, Blockchain/IA |

- Avatares: `public/avatars/{id}.png` y `{id}-headshot.png`.
- Listado respaldado por la tabla SQLite `blog_posts_index` (paginación SQL rápida, filtro O(1) por `editorId`/`category`).
- Búsqueda full-text vía tabla virtual FTS5 con ranking BM25 (título ponderado), snippets resaltados con `<mark>`.
- Cron horario genera nuevos posts y actualiza incrementalmente los índices FTS y de listado.
- Scripts de utilidad: `detectGaps.ts` (encuentra posts faltantes), `fillGaps.ts` (autocompleta huecos), `cleanupDuplicates.ts`.

---

## 9. Casos de éxito (contenido comercial)

Cuatro casos de éxito bilingües (EN/ES) en `public/case-studies/content.json`:

| Industria | Caso | Resultado clave |
|-----------|------|------------------|
| Smart City | Sistema de vigilancia de seguridad con IA | 27% reducción de crimen, 42% respuesta de emergencia más rápida |
| Salud | Analítica predictiva para cuidado de pacientes | 87% precisión en predicción de reingresos, 23% reducción de reingresos |
| Finanzas | Detección de fraude para servicios financieros | 99.2% precisión, $4.5M+ ahorro anual, <300ms de respuesta |
| Telco | Chatbot IA para atención al cliente | 78% resolución autónoma, 85% respuesta más rápida, 32% aumento de CSAT |

Documentos completos (PDF + DOCX, EN + ES) en `study-cases/`.

---

## 10. Base de datos (SQLite)

Todo el estado persistente vive en `server/data/dominical.db` (ignorado por git). Tablas:

| Tabla | Propósito |
|-------|-----------|
| `admin_users` | Autenticación admin (passwords con bcrypt) |
| `settings` | Almacén key-value para API keys, tokens, preferencias |
| `dominical_reports` | Reportes semanales de El Dominical IA (texto, estado, scores) |
| `carousel_slides` | Datos por slide para imágenes de carrusel del Dominical |
| `platform_publish_status` | Ciclo de vida de publicación por plataforma (linkedin/instagram/facebook) |
| `analytics_cache` | Respuestas cacheadas con TTL de APIs de GA4 y Meta |
| `chat_conversations` | Sesiones del chatbot (abiertas/cerradas) |
| `chat_messages` | Mensajes individuales por conversación |
| `chat_contacts` | Datos de contacto del visitante capturados durante el chat |
| `blog_fts` | Tabla virtual FTS5 para búsqueda full-text del blog |
| `blog_posts_index` | Índice de listado para queries paginadas rápidas del blog |
| `quiz_leads` | Leads del quiz de diagnóstico (respuestas, puntaje, perfil, mensaje de resultado, verificado) |
| `quiz_verification_tokens` | Tokens de verificación de email de los leads (expiración, `used_at`) |

### Claves de la tabla `settings`

```
openai_api_key, linkedin_client_id, linkedin_client_secret,
linkedin_access_token, linkedin_refresh_token, linkedin_token_expires_at,
linkedin_person_id, image_provider, dominical_notification_email,
dominical_auto_publish, dominical_top_n, admin_jwt_secret,
meta_app_id, meta_app_secret, instagram_business_account_id,
instagram_access_token, facebook_page_id, facebook_page_access_token,
meta_token_expires_at
```

---

## 11. Especificaciones de features (`.kiro/specs/`)

El proyecto usa specs estilo "Kiro" (requirements/design/tasks) para features grandes. Directorios existentes:

- `ai-chatbot-widget/`
- `analytics-dashboard/`
- `blog-fts5-search/`
- `blog-posts-db-index/`
- `dominical-carousel-images/`
- `dominical-ia/`
- `multi-platform-publishing/`
- `seo-improvements/`
- `whatsapp-widget-time-fix/`

Cada una contiene `requirements.md`, `design.md`, `tasks.md` (+ `tasks.meta.json`). Útil como fuente de verdad histórica de decisiones de diseño por feature.

---

## 12. Páginas y rutas del frontend

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Home | Hero, soluciones, cursos, casos de éxito, equipo |
| `/get-started` | Landing | Landing bilingüe de diagnóstico IA |
| `/diagnostico-ia` | Quiz | Quiz de diagnóstico con captura de lead verificado + PDF |
| `/demos` | Demos | Catálogo del laboratorio de demos (live + soon) |
| `/careers` | Careers | Listado de vacantes |
| `/apply` | Apply | Formulario de postulación |
| `/blog` | BlogList | Blog paginado + búsqueda FTS5 |
| `/blog/:slug` | BlogPost | Post individual con SEO inyectado server-side |
| `/try-identity` | TryIdentity | Demo de verificación de identidad |
| `/try-langchain` | TryLangChain | Demo de LangChain |
| `/try-rag` | TryRAG | Demo de pipeline RAG |
| `/try-medical` | TryMedical | **Soon**: solo selector de modalidad; sin backend, no sube nada |
| `/try-transcription` | TryTranscription | Transcripción en vivo + diarización + análisis IA |
| `/try-object-detection` | TryObjectDetection | Detección de objetos en el navegador (COCO-SSD) |
| `/try-emotion` | TryEmotion | Reconocimiento de emociones en el navegador (face-api) |
| `/otp` | OTP | Segundo factor OTP |
| `/admin` | AdminPage | Login / setup inicial |
| `/admin/settings` | AdminSettings | Preferencias LinkedIn, Meta, OpenAI, Dominical |
| `/admin/dominical` | AdminDominicalList | Listado de reportes semanales |
| `/admin/dominical/:id` | AdminDominicalDetail | Revisión, edición, carrusel, video, publicación |
| `/admin/quiz-leads` | AdminQuizLeads | Leads del quiz de diagnóstico |
| `/admin/conversations` | AdminConversationList | Inbox de chat con filtros + analítica |
| `/admin/conversations/:id` | AdminConversationDetail | Transcript completo + datos de contacto |
| `/admin/analytics` | AdminAnalytics | Dashboard GA4 + Meta (4 tabs) |

---

## 13. API — resumen de endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/contact` | No | Formulario de contacto → email |
| POST | `/api/send-application` | No | Postulación laboral → email |
| GET | `/api/blog` | No | Listado paginado del blog (índice SQL) |
| GET | `/api/blog/:slug` | No | Detalle de post (archivo JSON) |
| GET | `/api/blog/search?q=` | No | Búsqueda full-text FTS5 |
| GET | `/api/editors` | No | Listado de editores |
| GET | `/api/generate-posts?date=YYYY-MM-DD` | No | Disparo manual de generación de posts |
| GET | `/api/test` | No | Health check |
| GET | `/sitemap.xml` | No | Índice de sitemap |
| GET | `/sitemaps/:filename` | No | Sitemaps mensuales del blog |
| GET | `/api/public/slides/:reportId/:position` | No | Imagen de slide de carrusel (para API de Meta) |
| POST | `/api/quiz-lead` | No | Envía el quiz: mensaje GPT, guarda lead, manda email de verificación |
| GET | `/api/quiz-lead/status?leadId=` | No | Polling mientras espera: verificado / expirado |
| GET | `/api/quiz-lead/verify?token=` | No | Link de verificación del email (página HTML) |
| POST | `/api/quiz-lead/resend` | No | Reenvía el email de verificación |
| GET | `/api/quiz-lead/pdf?leadId=` | No | Reporte PDF (solo si está verificado) |
| POST | `/api/chat/session` | No | Crea sesión de chat (setea cookie) |
| GET | `/api/chat/history` | Cookie | Restaura conversación |
| POST | `/api/chat/message` | Cookie | Envía mensaje (stream SSE) |
| POST | `/api/chat/close` | Cookie | Termina sesión |
| GET | `/api/admin/status` | No | Chequea estado de auth/setup |
| POST | `/api/admin/setup` | No | Setup inicial de admin |
| POST | `/api/admin/login` | No | Login admin |
| POST | `/api/admin/logout` | Sí | Logout admin |
| GET/PUT | `/api/admin/settings` | Sí | Obtener/setear todas las settings |
| GET | `/api/admin/dominical` | Sí | Listar reportes Dominical |
| GET/PUT | `/api/admin/dominical/:id` | Sí | Detalle/actualización de reporte |
| POST | `/api/admin/dominical/generate` | Sí | Generación manual del Dominical |
| POST | `/api/admin/dominical/:id/publish` | Sí | Publicar (legacy, LinkedIn) |
| POST | `/api/admin/dominical/:id/publish/:platform` | Sí | Publicar a plataforma específica |
| POST | `/api/admin/dominical/:id/publish-all` | Sí | Publicar a todas las plataformas |
| GET | `/api/admin/dominical/:id/publish-status` | Sí | Estado por plataforma |
| POST | `/api/admin/dominical/:id/generate-carousel` | Sí | Generar imágenes de carrusel |
| GET | `/api/admin/dominical/:id/carousel` | Sí | Metadata del carrusel |
| GET | `/api/admin/dominical/:id/carousel/pdf` | Sí | Descargar PDF |
| POST | `/api/admin/dominical/:id/generate-video` | Sí | Generar video narrado del Dominical |
| GET | `/api/admin/conversations` | Sí | Listado de conversaciones de chat |
| GET | `/api/admin/conversations/:id` | Sí | Detalle de conversación |
| GET | `/api/admin/conversations/analytics` | Sí | Analítica de chat |
| GET | `/api/admin/analytics/overview` | Sí | KPIs de overview GA4 |
| GET | `/api/admin/analytics/traffic` | Sí | Datos de tráfico GA4 |
| GET | `/api/admin/analytics/behavior` | Sí | Datos de comportamiento GA4 |
| GET | `/api/admin/analytics/social/instagram` | Sí | Insights de Instagram |
| GET | `/api/admin/analytics/social/facebook` | Sí | Insights de Facebook |
| POST | `/api/admin/analytics/refresh` | Sí | Limpiar caché de analítica |
| POST | `/api/admin/reindex-posts` | Sí | Forzar reconstrucción del índice del blog |
| GET | `/api/admin/quiz-leads` | Sí | Listado de leads del quiz |

> La ruta `generate-video` ya figura también en README.md.

---

## 14. Autenticación

- Rutas admin usan JWT en cookie httpOnly `admin_token` (expiración 7 días). El middleware `requireAuth` en `server/auth.ts` lee la cookie, verifica el JWT y adjunta `req.user`.
- Rutas de chat usan una cookie httpOnly separada `chat_session` (TTL 1 hora, se refresca en cada mensaje).
- Passwords admin con `bcrypt`. Soporte de OTP (`otpauth`) para segundo factor (página `/OTP`).

---

## 15. Variables de entorno (`.env`, no versionado)

```env
# Servidor
PORT=5173
HOST=0.0.0.0

# Email (formularios + notificaciones del chatbot + notificaciones del Dominical)
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_TO=...

# Analítica (solo producción)
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_FACEBOOK_PIXEL_ID=1234567890

# OpenAI (generación de blog, chatbot, scoring del Dominical, generación de imágenes/video)
OPENAI_ORGANIZATION=org-xxx
OPENAI_API_KEY=sk-xxx

# Noticias (cron de generación de posts de blog)
NEWS_API_KEYS=xxx

# JWT admin (auto-generado y guardado en DB si no se define)
ADMIN_JWT_SECRET=your-secret-here
```

> **Importante**: no agregar `NODE_ENV` al `.env` — el script `start` lo setea explícitamente inline. Ver bug corregido en §17.
> Solo las variables con prefijo `VITE_` se exponen al frontend; el resto son solo del servidor.

---

## 16. Convenciones de código

### Alias de rutas
Configurados en `vite.config.ts` y `vitest.config.ts`:

| Alias | Resuelve a |
|-------|------------|
| `@/` | `src/` |
| `@shared/` | `shared/` |

### Convenciones de import
- Archivos de servidor: **ESM con extensión `.js`** incluso para código fuente `.ts` (`import db from './db.js'`).
- Archivos de frontend: alias de ruta o imports relativos sin extensión (`import { Button } from '@/components/ui/button'`).
- `shared/schema.ts` es el único archivo cruzado cliente/servidor, importado como `@shared/schema`.

### Formato de posts de blog (JSON)

```jsonc
{
  "slug": "2025-03-28-00-00-00-base-slug",
  "date": "2025-03-28",
  "image": "/images/optional-cover.jpg",
  "editorId": 3,
  "categories": ["Deep Learning", "NLP"],
  "keywords": ["transformer", "fine-tuning"],
  "translations": {
    "en": { "slug": "...", "title": "...", "excerpt": "...", "content": [{ "heading": "...", "body": "..." }] },
    "es": { "slug": "...", "title": "...", "excerpt": "...", "content": [{ "heading": "...", "body": "..." }] }
  },
  "sources": [{ "title": "...", "url": "https://...", "source": "..." }]
}
```

### Cron schedule (America/Lima)

| Horario | Job | Guard |
|---------|-----|-------|
| `0 * * * *` (cada hora) | Genera posts de blog + actualiza índices FTS/listado | Saltado en dev salvo disparo explícito |
| `0 12 * * 6` (sáb 12pm) | Genera reporte de El Dominical IA | Saltado en dev |
| `0 12 * * 0` (dom 12pm) | Auto-publica el Dominical en todas las plataformas | Saltado en dev |
| `*/5 * * * *` (cada 5min) | Cierra sesiones de chat inactivas | Siempre corre |

### Testing
`vitest.config.ts` usa `environment: 'jsdom'` global, override a `node` para `server/**/*.test.ts`. Property tests con `fast-check` (≥100 iteraciones). Tests co-ubicados con los módulos.

**Gotcha local conocido (sep 2026):** ~96 tests de servidor fallan localmente con `NODE_MODULE_VERSION 115 ... requires 137`: el binario nativo de `better-sqlite3` quedó compilado para Node 20 y vitest corre con otro Node. No es un bug del código (fallan igual en `main` sin cambios). Se arregla con `npm rebuild better-sqlite3` usando la misma versión de Node que corre `npm test`. Antes de atribuir una falla a tu cambio, compará contra `main`.

### Build y persistencia de datos
`dist/` se regenera completo en cada build. El paso `postbuild` copia `server/data/` a `dist/data/` **sin sobreescribir** archivos existentes, así la base SQLite, posts, imágenes de carrusel y sitemaps persisten entre despliegues. No guardar nada que deba sobrevivir builds directamente dentro de `dist/`.

---

## 17. Despliegue (CI/CD)

El proyecto corre en un **VPS con PM2** bajo el usuario `roblesai`. El despliegue
está automatizado con GitHub Actions:

```
bash push.sh (local)  →  git commit + push a main
                              ↓
        GitHub Actions (.github/workflows/deploy.yml)
                              ↓
        SSH al VPS  →  bash pull.sh (fetch + build selectivo + pm2 restart)
```

Tras el setup inicial, el ciclo completo es: `bash push.sh` (commitea, pushea y
el deploy arranca solo).

### `pull.sh` — build selectivo por tipo de cambio

`pull.sh` hace `git fetch` de `origin/main`, inspecciona **qué archivos
cambiaron** y hace solo lo justificado (no recompila a ciegas):

| Cambió | Acción |
|--------|--------|
| `package.json` / `package-lock.json` | `npm install` + build + pm2 restart |
| `src/`, `server/`, `shared/`, configs (vite/tailwind/tsconfig), `index.html` | build + pm2 restart |
| solo `server/data/` (posts del blog) | sync de data a `dist/` + pm2 restart (sin compilar) |
| solo docs / `*.sh` / `.gitignore` | nada (servidor sigue corriendo) |
| sin commits nuevos | no-op |

Requiere NVM cargado (el script hace `source ~/.nvm/nvm.sh`).

### Setup único del CI/CD (GitHub Secrets)

El workflow se autentica al VPS por **llave SSH**. Cuatro secretos en el repo
(Settings → Secrets and variables → Actions):

| Secreto | Valor |
|---------|-------|
| `VPS_HOST` | IP o host del VPS (`robles.ai`) |
| `VPS_USER` | usuario SSH (`roblesai`) |
| `VPS_SSH_KEY` | clave **privada** SSH autorizada en el VPS |
| `VPS_REPO_PATH` | ruta absoluta del repo en el VPS (`/home/roblesai/htdocs/robles.ai`) |

Generar la llave dedicada y registrarla:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
ssh-copy-id -i ~/.ssh/github_deploy.pub roblesai@robles.ai
gh secret set VPS_SSH_KEY --repo jroblesluna/robles.ai < ~/.ssh/github_deploy
# + VPS_HOST, VPS_USER, VPS_REPO_PATH via `gh secret set` o la UI
```

### Deploy manual (fallback)

```bash
# En el VPS, o por SSH desde el Mac:
source ~/.nvm/nvm.sh && bash pull.sh
```

### Configuración conocida del VPS

| Setting | Valor |
|---------|-------|
| Usuario | `roblesai` |
| Ruta de la app | `~/htdocs/robles.ai` |
| Nombre del proceso PM2 | `robles-ai` |
| Binario PM2 | `~/.nvm/versions/node/v22.14.0/bin/pm2` |
| Versión de Node | v22.14.0 (vía NVM) |
| Puerto | 5173 |
| Logs PM2 | `~/.pm2/logs/robles-ai-out.log` / `robles-ai-error.log` |

### Bug histórico de NODE_ENV (corregido 29 ago 2026)
El script `start` usaba `NODE_ENV=production && node dist/index.js`. El operador `&&` **no** pasa la variable al proceso hijo — ejecuta `NODE_ENV=production` como comando no-op y luego `node` sin `NODE_ENV` definido. Express asume `"development"` por defecto, lo que hacía que todos los cron jobs (generación de blog, Dominical IA) se saltaran por sus guards de modo dev. Corregido a `NODE_ENV=production node dist/index.js` (asignación inline, estándar POSIX).

---

## 18. Historial reciente relevante (git log, más nuevo primero)

| Commit | Descripción |
|--------|-------------|
| `6a78797` | fix(try-emotion): texto de las etiquetas ya no sale espejado |
| `8e63cba` | feat(demos): rediseño del catálogo de demos y de la sección del home |
| `9f2e524` | feat(home): rediseño de las secciones features y solutions |
| `5c80c0b` | feat: demo TryTranscription (WS streaming, diarización, panel /analyze) |
| `9f07eea` | feat(try-identity): imágenes en base64, sin subida a Firebase Storage |
| `2acea98` | feat(demos): detección de objetos y emociones en el navegador |
| `116b79c` | feat: flujo de quiz con verificación de lead, reporte PDF y panel admin |
| `96758` | feat: generación de video narrado por robot IA para El Dominical IA |
| `aa22f` | chore: gitignore de output generado de video/audio del Dominical |
| `a9cb9` | fix: routing client-side para links de nav en Hero y Footer |
| `a6b6f` | fix: corrección de asignación de NODE_ENV en script start |
| `42319` | feat: pulido del panel admin — paginación fija abajo, vistas tabla-a-tarjeta, headers con color |
| `b2fff` | feat: panel admin responsive con layout persistente y branding del sitio |
| `5177d` | feat: rediseño del avatar del chatbot, fix de búsqueda de blog, paginación/filtros de blog |

### Cambios recientes de las páginas demo (2026-09)
- **Sección/página de catálogo de demos**: `src/components/DemosCatalog.tsx` (usada en el home y en la ruta `/demos`, `src/pages/Demos.tsx`), con demos "live" y placeholders "coming soon". El chatbot Robly conoce el catálogo (contexto inyectado en `server/services/chatContext.ts`).
- **`TryIdentity` y `TryRAG` rediseñadas** al mismo nivel: header con badge, tooltips por bloque (`InfoTip`), log JSON con resaltado de sintaxis (`JsonHighlight`), sección técnica colapsable, y **warm-up del servicio** (ping `mode:"no-cors"` a `/`, para el cold-start de Cloud Run que escala a cero).
- **`TryRAG` extrae el texto del PDF en el navegador** con `pdfjs-dist` (dependencia nueva); solo envía el texto a `rag-api` (no el archivo), eliminando el límite de 32 MB de Cloud Run. El hash del namespace se calcula sobre el texto (cliente y backend coinciden). Sin OCR — PDFs escaneados sin capa de texto no producen texto.
- **`TryLangChain` rediseñada al mismo patrón (2026-09)**: reescrita como página autocontenida con warm-up + banner de estado, layout de dos columnas, pasos numerados (`StepCard`), tooltips (`InfoTip`), log de API con `JsonHighlight`, animaciones framer-motion y sección técnica colapsable — color de marca ámbar/naranja. Los tres modos (`rag`/`tools`/`json`) llaman a `POST /chat`, `/agent`, `/json` (+ `/upload` y `/ingest` en RAG) de `langchain-api.robles.ai`. Se eliminaron los componentes viejos `LangChainChat.tsx` y `LangChainFileUploader.tsx`. Los helpers de UI de las demos se extrajeron a `src/components/demo/` (`JsonHighlight`, `InfoTip`, `StepCard`) reutilizables.
- **"Laboratorio de Demos" ahora visible**: botón `/demos` añadido al header (`Header.tsx`, CTA con `FlaskConical`, en desktop y móvil) y al hero (`Hero.tsx`, slide de demos, `demosPromo.viewAll`). Claves i18n `nav.demos` y `demosPromo.viewAll` en en/es.
- **Backend de LangChain (desplegado)**: `langchain-api.robles.ai` está en Cloud Run (proyecto `robles-ai-langchain-project`, servicio `langchain-api-server`), con dominio + cert TLS y `GET /` para warm-up. Su código vive en el repo hermano **`robles.ai-langchain-api`** (FastAPI + LangChain/LangGraph). Los tres modos (`/chat`, `/agent`, `/json` + `/upload`, `/ingest`) responden y el CORS permite `https://robles.ai`. Los backends de las demos son repos separados: `robles.ai-identity-api`, `robles.ai-rag-api`, `robles.ai-langchain-api`, `robles.ai-transcription-api` (mismo patrón de Cloud Run + dominio + scripts `deploy_fresh_gcp.sh` / `update_docker.sh` / `delete_all_gcp_resources.sh`).
- **`TryTranscription` (2026-09)**: nueva demo de transcripción en tiempo real + diarización + análisis de IA. WS streaming desde el micrófono → Deepgram Nova-3 (diarización) → burbujas por hablante en vivo. Tras grabar, `POST /analyze` → detección de industria, roles de hablante, tabla de términos (básico/especializado), resumen. Backend: `robles.ai-transcription-api` en Cloud Run (`transcription-api.robles.ai`, proyecto `robles-ai-transcript-project`). Warm-up vía `GET /health`. Color de marca teal/emerald. Catálogo `/demos`: ítem "speech" pasó de `soon` a `live`. Ruta: `/try-transcription`. chatContext actualizado.
- **`TryIdentity` refactorizado (2026-09)**: el backend identity eliminó Firebase por completo (Firestore + Storage → in-memory store + imágenes base64). El frontend ahora convierte las imágenes a base64 en canvas y las manda en el body del POST (sin upload a Storage). Proyecto renombrado a `robles-ai-identity-project`.
- **Detección de objetos y emociones en el navegador (2026-09)**: `TryObjectDetection` (TensorFlow.js + COCO-SSD `lite_mobilenet_v2`) y `TryEmotion` (`@vladmandic/face-api`, modelos desde jsDelivr). Sin backend: nada sale del navegador. En `TryEmotion` el video selfie va espejado por CSS, pero el canvas de overlay **no**: se invierten las coordenadas x al dibujar (si se espejara el canvas, el texto de las etiquetas quedaría al revés).
- **Rediseño del home y del catálogo (2026-09)**: nuevas secciones Features/Solutions y catálogo de demos rediseñado (commits `9f2e524`, `8e63cba`).
- **`TryTranscription`: captura PCM (2026-09)**: el API reenvía el audio a Deepgram como `linear16` 16 kHz mono y **ignora** el `encoding` declarado en `start`. `MediaRecorder` emitía WebM/Opus, que Deepgram leía como ruido (nunca llegaba un `partial`/`final`). Ahora se captura PCM con un `AudioWorklet` (fallback `ScriptProcessorNode`) a 16 kHz, en frames de ~128 ms.
- **`TryMedical` pasó a "soon" y se eliminó Firebase del sitio (2026-09)**: `medical-api.robles.ai` no existe (sin DNS, sin repo, sin proyecto GCP), pero la página subía las imágenes clínicas a Firebase Storage antes de fallar. Ahora es solo un selector de modalidad con aviso de "próximamente"; las imágenes no salen del navegador. Se borró `src/lib/firebaseConfig.ts`, el chunk `firebase` de `vite.config.ts` y la dependencia `firebase`. Catálogo (en/es) → `status: "soon"`; el Hero promociona `/try-transcription` en su lugar; `chatContext.ts` actualizado para que Robly no prometa resultados.
- **Infra de las APIs de demos (2026-09)** — convenciones comunes a los cuatro repos hermanos:
  - Cloud Run escala a cero (sin `minScale`) con facturación por request; un proyecto GCP por API, todos en la misma cuenta de facturación.
  - Artifact Registry con nombre `<servicio>-api-repo`. El de identity se renombró `my-repo` → `identity-api-repo` (queda `my-repo` en GCP pendiente de borrar a mano).
  - `prune_registry.sh` (nuevo en cada repo) conserva las 3 versiones más recientes por paquete y registra una cleanup policy; corre al final de `update_docker.sh`, `deploy_fresh_gcp.sh` y en CI (`continue-on-error`). El SA `github-deployer` solo tiene `artifactregistry.writer`, que no puede borrar ni registrar políticas: en CI solo avisa; hace falta `roles/artifactregistry.repoAdmin` para que pode en cada push.
  - `rotate_secret.sh` sube los secretos desde `.env`, recarga Cloud Run (`:latest`) y **destruye** todas las versiones anteriores (Secret Manager cobra por versión activa, incluidas las deshabilitadas).
- **Resuelto: `/analyze` de transcription devolvía 502.** Primero por una clave de OpenAI inválida (se rota con `rotate_secret.sh` en el repo `robles.ai-transcription-api`, **no** con el `.env` del sitio) y después por `brain_bad_schema` (ver Fase 0 más abajo). Para diagnosticarlo, buscar `openai_call_failed` / `openai_bad_schema` en Cloud Logging.
- **Fase 0 de `DEMOS_PLAN.md` (2026-09-21)** — encuadre de negocio del laboratorio de demos:
  - El catálogo (`demosCatalog.items`, en/es) tiene títulos orientados a resultados y un campo nuevo `benefit` (línea de ahorro en cada tarjeta). Los ids *live* son `identity`, `rag`, `speech`, `langchain`, `objectdetection` y `emotion`; el roadmap, `sitechatbot`, `docextract`, `voiceagent`, `anomaly`, `forecast` e `imagegen`. `medical`, `sentiment` y `recommend` salieron del catálogo.
  - `src/components/demo/`: `BusinessCase` (bajo el header de cada demo), `SavingsCalculator` (antes de la sección técnica; volumen × minutos × % automatizable × costo/hora, más los CTA a `/diagnostico-ia` y a contacto) y `business.ts` (valores de ejemplo por demo, `computeSavings`, `useDemoTracking`, `useGoToHomeSection`). Los textos van en i18n bajo `demoBusiness.<id>`. Los valores iniciales de la calculadora son **ejemplos editables, no cifras de resultado**.
  - Analítica: `trackDemoEvent` (`src/lib/analytics.ts`) envía `demo_start`, `demo_complete`, `roi_calculated` y `demo_cta_click` con `demo_id`. Funciona con GTM (`dataLayer`), GA4 directo y Meta Pixel. **Ojo:** el `trackEvent` viejo no hace nada cuando el sitio usa GTM. Con GTM hay que crear la etiqueta GA4 para estos eventos para que aparezcan en GA4.
  - Robly (`chatContext.ts`): cada demo *live* tiene un "business angle" y la instrucción de ofrecer la calculadora y el diagnóstico, sin prometer cifras.
  - `transcription-api`: `/analyze` fallaba con `brain_bad_schema` en conversaciones casuales porque el modelo omitía `summary`. Se corrigió el prompt y el reintento ahora nombra los campos faltantes (los logs incluyen `schema_errors`: ruta del campo y tipo de error, nunca valores).
  - `rag-api` (cold start de ~60 s → ~29 s): los modelos de Hugging Face (MiniLM, monoT5, BGE) se incluyen en la imagen al construirla (`HF_HOME=/opt/hf-cache`), y monoT5/BGE se cargan de forma diferida (getters con lock). `POST /rag/warmup` los carga y corre una inferencia de prueba; `TryRAG` lo llama sin esperar respuesta apenas empieza el upload. Así el rerank tarda ~1.5 s en vez de ~46 s. Dos lecciones de Cloud Run con facturación por request: (1) un thread en segundo plano casi no recibe CPU entre requests, así que el trabajo pesado tiene que ocurrir *dentro* de una request; (2) los pesos van memory-mapped, así que cargar el modelo no alcanza: hasta la primera inferencia no se leen del disco.
- **Documentos nuevos**: `REMOTION_VIDEO_CONTEXT.md` (contexto de marca + brief del video de marketing en Remotion) y `DEMOS_PLAN.md` (roadmap del laboratorio de demos priorizado por efecto wow y ahorro/ROI).
- **CI/CD del sitio**: push a `main` → GitHub Actions (`.github/workflows/deploy.yml`) → SSH al VPS → `pull.sh` (build selectivo por tipo de archivo). Ver §17.

---

## 19. Requisitos y comandos

- **Node.js ≥ 20** (recomendado)
- **npm**

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Levanta Express con `tsx watch` y Vite en modo dev |
| `npm run build` | Compila frontend (Vite) + empaqueta servidor (esbuild) a `dist/` |
| `npm start` | Producción: `NODE_ENV=production node dist/index.js` |
| `npm run check` | Type check con TypeScript (`tsc`) |
| `npm test` | Corre todos los tests (`vitest --run`) |
| `npm run fix-sitemap` | Corrige entradas faltantes del sitemap |
| `npm run cleanup-duplicates` | Elimina posts duplicados |
| `npm run detect-gaps` | Detecta huecos en la generación diaria de posts |
| `npm run fill-gaps` | Autocompleta huecos detectados |

En desarrollo, disponible en `http://localhost:5173` (ajustable con `PORT`).

---

## 20. Referencias

- Referencia técnica orientada a humanos: [README.md](README.md)
- Specs de features por módulo (fuente de verdad histórica de diseño): `.kiro/specs/*/`
  (contienen `requirements.md` / `design.md` / `tasks.md` — NO son documentación
  del proyecto, son artefactos del flujo de specs; no borrar).
