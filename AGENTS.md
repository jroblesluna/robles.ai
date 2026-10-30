# AGENTS.md — Contexto para asistentes de código

> Contexto integral de `robles.ai` para agentes de IA y nuevos contribuidores: negocio,
> arquitectura, features, datos, rutas, convenciones, despliegue e historial. Léelo antes de
> hacer cambios. [`README.md`](README.md) es la referencia técnica orientada a humanos (inglés).
> **Son los dos únicos `.md` de la raíz**: planes, auditorías y briefs viven en `docs/` (§23) y
> las specs de features en `.kiro/specs/` (§14).

---

## 1. Qué es Robles.AI

Sitio y plataforma de **Robles.AI**, consultora/estudio de soluciones de IA (Cupertino, CA · EE. UU. y Latinoamérica). Cumple tres roles:

1. **Sitio corporativo + landing de tráfico pagado**: servicios, casos ilustrativos, equipo, **laboratorio de demos en vivo**, **quiz de diagnóstico** con leads verificados y la landing `/get-started` para Google Ads / Meta Ads.
2. **Medio editorial autogenerado**: blog bilingüe escrito por 24 "editores" IA, con búsqueda full-text.
3. **Panel de administración interno**: El Dominical IA, publicación multi-plataforma, video narrado, inbox del chatbot, leads del quiz, analítica (GA4, Meta, Google Ads, Meta Ads) y portal de backends de las demos.

- **Sitio**: https://robles.ai · **Contacto**: info@robles.ai · WhatsApp/Tel +1 (408) 590-0153
- **Dirección**: 20380 Stevens Creek Blvd, Suite 205, Cupertino, CA 95014 (`shared/publicContent.ts`)
- **Oferta de entrada**: Diagnóstico IA de 2 semanas en tres paquetes de tarifa fija — Esencial desde USD 1,500 (hasta 2 procesos), Avanzado USD 2,500 (hasta 4), Integral USD 3,000 (hasta 6), cada uno con un beneficio adicional — o proyecto directo con propuesta.
- **Presencia local**: oficinas en Cupertino, CA (20380 Stevens Creek Blvd, Suite 205) y Lima, Perú (Calle Cuarenta 190, San Isidro) — `PUBLIC_OFFICES` en `shared/publicContent.ts`.
- **Licencia**: MIT (c) 2025 Robles.AI

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind + shadcn/ui (Radix) + framer-motion + recharts + wouter + TanStack Query |
| Backend | Express 4 + Node ≥ 20 (producción v22.14.0) · `tsx watch` en dev · esbuild en prod |
| Base de datos | SQLite vía `better-sqlite3` (`server/data/dominical.db`) |
| IA | OpenAI — GPT-4o, GPT-4o-mini, `gpt-image-2.5-flare`; proveedores de imagen opcionales (Replicate, Stability) |
| APIs sociales / ads | LinkedIn UGC Posts + OAuth 2.0; Meta Graph API (Instagram, Facebook, Marketing API) |
| Analítica | GA4 Data API, Meta Graph Insights; en el sitio GTM o GA4 + Meta Pixel directos |
| Medios | `sharp`, `pdfkit`, `fluent-ffmpeg` (+ `@ffmpeg-installer`, `@ffprobe-installer`) |
| Búsqueda | SQLite FTS5 (BM25) |
| IA en el navegador | TensorFlow.js + COCO-SSD, `@vladmandic/face-api`, `pdfjs-dist` |
| Auth | JWT en cookie httpOnly + `bcrypt`; página OTP (`otpauth`) |
| Email | `nodemailer` (Gmail; production credentials in Admin → Settings) |
| i18n | `i18next` + `react-i18next` (en/es) |
| Testing | `vitest` + `fast-check` + `supertest` + `@testing-library/react` |
| Despliegue | VPS + PM2; GitHub Actions → SSH → `pull.sh` |

---

## 3. Funcionalidades principales

- **SPA** Vite + React con `wouter`; Express sirve estáticos e integra el middleware de Vite en dev.
- **Primera respuesta legible**: `server/seo/publicContent.ts` genera HTML plano de cada ruta pública desde los mismos JSON de i18n (mejora progresiva, React lo reemplaza al iniciar) + meta tags, hreflang, canonical y JSON-LD server-side.
- **i18n** en/es; `?lang=es` en cualquier ruta pública.
- **Landing `/get-started`** (§6): hero orientado a resultado, tres paquetes de diagnóstico (desde USD 1,500 / 2,500 / 3,000) o proyecto directo, demos en vivo, industrias, compromisos, integraciones, seguridad y cumplimiento, fundador y oficinas EE. UU./Perú, FAQ, formulario, enlace de agenda y CTA fijo en móvil; variantes `?s=chatbots|rag|agents|docs` por grupo de anuncios.
- **Formulario de contacto** (`ContactForm`): selector "¿Qué quieres mejorar?", mensaje opcional, notas de respuesta/privacidad; se envía por email y cuenta como `generate_lead` solo si el servidor lo acepta.
- **Quiz de diagnóstico** (`/diagnostico-ia`): puntaje → mensaje GPT → verificación por email → PDF; leads en `quiz_leads`, visibles en `/admin/quiz-leads`; dispara `generate_lead` (`method: quiz`) al guardarse.
- **Laboratorio de demos** (`/demos`, §11): 10 demos live (7 con API en Cloud Run, 3 en el navegador) y 3 "soon".
- **Chatbot Robly** (§9), **blog** (§10), **El Dominical IA** (§8), **publicación multi-plataforma**.
- **Analítica admin** (§7): pestañas Overview/Traffic/Behavior/Social/**Ads** con caché en SQLite.
- **Portal de backends** (§21): DNS (Hostinger), estado Cloud Run y actividad (Cloud Monitoring), solo lectura hacia GCP.
- **Sitemaps** con hreflang (`sitemap.xml`, `static-pages.xml`, mensuales en `/sitemaps/*`).

---

## 4. Estructura de directorios

```
AGENTS.md / README.md     # únicos .md de la raíz
docs/                     # planes, auditorías, briefs, notas de release (§23)
.kiro/specs/              # specs de features (requirements/design/tasks)
.github/workflows/        # deploy.yml
pull.sh                   # build selectivo + reinicio PM2 en el VPS
push.sh                   # helper local (git add . + commit + push) — ignorado por git
__test_pointing_video.ts  # script ad-hoc: renderiza un video del Dominical con la pose "pointing"

src/
  App.tsx, Root.tsx, main.tsx, entry-server.tsx (build SSR)
  components/
    Header, Hero, ClientLogos, Features, Solutions, DemosCatalog, CaseStudies, Courses, Testimonials,
    Team, Contact (exporta ContactForm y CONTACT_GOALS), Footer, BlogArticle, BlogModal,
    BlogSearch, VideoModal, ParticleBackground
    chat/            # ChatbotWidget, ChatPanel, MessageList, MessageInput
    demo/            # ApiCallLog, BusinessCase, SavingsCalculator, business.ts, DemoKit, DemoNav,
                     # DemoTutorial, DemoVideoPreview, DemoVisualPreview, EmotionPreview, InfoTip, JsonHighlight, StepCard
    quiz/            # QuizIntro, QuizQuestionCard, QuizProgressBar, QuizAnalyzing, QuizResultPreview,
                     # QuizLeadForm, QuizWaitingVerification, QuizResultFull, QuizScoreRing
    admin/           # CarouselPreview, SlideEditor, RegenerateModal, PlatformPublishStatus, VideoGenerator
    admin/analytics/ # OverviewTab, TrafficTab, BehaviorTab, SocialTab, AdsTab, KpiCard, DateRangeSelector
    state/           # LoadingState, EmptyState, ErrorState
    ui/              # primitivas shadcn/ui
  pages/             # Home, Landing, Quiz, Demos, Careers, Apply, BlogRoute, BlogList, BlogPost, OTP,
                     # not-found, TryChatbot, TryIdentity, TryRAG, TryTranscription, TryLangChain,
                     # TryDocExtract, TryTTS, TryForecast, TryObjectDetection, TryEmotion, TryMedical
    admin/           # AdminLayout, AdminDashboard, AdminLogin, AdminSetup, AdminSettings,
                     # AdminDominicalList/Detail, AdminConversationList/Detail, AdminAnalytics,
                     # AdminQuizLeads, AdminBackends
  hooks/             # useChatSession, useSearch, useSEO, useScrollRestoration, useReducedMotion,
                     # useBlogModalRouting, useDemoPreviewMotion, useSpeechInput, useAdminDialog,
                     # usePublicDialog, use-toast, use-mobile
  lib/               # analytics, blogModal, forecast, pageMetadata, publicPost, queryClient, quizData, utils
  scripts/           # generación de posts, huecos, duplicados, sitemaps, avatares, servicios de noticias/imágenes
  i18n/locales/{en,es}/translation.json

server/
  index.ts, routes.ts (router principal: quiz, blog, editores, postulaciones, cron), vite.ts,
  publicServing.ts, db.ts, auth.ts
  adminRoutes.ts       # /api/admin/* (monta chatAdminRoutes)
  chatAdminRoutes.ts   # /api/admin/conversations/*
  analyticsRoutes.ts   # /api/admin/analytics/*
  backendRoutes.ts     # /api/admin/backends/*
  chatRoutes.ts        # /api/chat/*
  contactRoutes.ts     # /api/contact
  publicRoutes.ts      # /api/public/*
  searchRoutes.ts      # /api/blog/search
  seo/                 # metaInjector, slugIndex, metaBuilders, htmlInjector, publicContent, sitemap, sitemapRoutes
  fts/, listing/       # indexadores FTS5 y de listado (+ property tests)
  migrations/          # chatTables
  jobs/                # generateDominical, autoPublishDominical, chatSessionCleanup
  services/
    dominicalScoring, engagementPhrases, imageGeneration, carouselImageGen, slideCompositor,
    carouselGenerator, carouselTypes, pdfExporter, pdfIcons, dominicalVideoGen, robotFrames,
    quizResultMessage, quizVerificationEmail, quizLeadPdf, chatEngine, chatContext, chatNotifier,
    conversationStore, ga4Client, googleAdsReport, googleAdsApi, googleAdsInsights, googleAdsClicks, metaInsights, metaAds, metaGraphApi,
    analyticsCache, settingsSecrets, linkedin (re-export)
    platforms/   # types, contentFormatter, linkedinAdapter, instagramAdapter, facebookAdapter, publishingEngine
    backends/    # registry, settingsStore, health
    dns/         # DnsProvider, HostingerDnsProvider
    gcp/         # googleAuth, cloudRunClient, monitoringClient
  data/          # posts/, editors.json, dominical.db (ignorado), ga4-service-account.json (ignorado), medios generados

shared/          # schema.ts (zod), chatTypes, seoPolicy, seoMetadata, publicContent, dominicalSelection, disposableEmailDomains
public/          # images/ (incl. images/clients/), avatars/, robly-avatar/, case-studies/, assets/, demo-previews/, demo-samples/,
                 # videos/, robots.txt, sitemap.xml, static-pages.xml
scripts/         # HTML de casos, render de previews/clips de demos, kit de Firefly
study-cases/     # documentos de casos (PDF + DOCX, EN + ES)
creative/        # material fuente de los visuales de demos (prompts y frames de Firefly)
```

---

## 5. Arquitectura

```
┌──────────────────────────── Frontend (SPA React) ────────────────────────────┐
│ Home · Landing · Quiz · Demos + Try* · Blog · Careers · Panel admin          │
│ Widget Robly · ContactForm · analytics.ts (GTM / GA4 / Meta Pixel)            │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ fetch / SSE / cookies (admin_token, chat_session)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│ Express                                                                       │
│  routes.ts · adminRoutes · analyticsRoutes · backendRoutes · chatRoutes ·     │
│  contactRoutes · publicRoutes · searchRoutes · seo/                           │
│ Cron (node-cron, America/Lima): blog cada hora · sáb 12:00 Dominical ·        │
│ cada 30 min chequeo del slot de auto-publicación · cada 5 min limpieza chat   │
└───────┬──────────────────────────────┬───────────────────────────────────────┘
┌───────▼─────────┐   ┌────────────────▼────────────────────────────────────────┐
│ SQLite           │   │ OpenAI · LinkedIn · Meta Graph/Marketing · GA4 Data API │
│ dominical.db     │   │ NewsAPI · Gmail SMTP · Hostinger DNS · GCP (Cloud Run   │
│ 14 tablas        │   │ Admin, Cloud Monitoring) · APIs de demos en Cloud Run   │
└──────────────────┘   └─────────────────────────────────────────────────────────┘
```

---

## 6. Landing `/get-started` y conversiones

**Página**: `src/pages/Landing.tsx`; copy en `landing.v2.*` (+ `landing.cta.*`, `landing.whatsapp.*`, `landing.diagnostico.*`, `landing.howWeWork.quote`). Secciones en orden:

1. **Hero**: titular orientado a resultado, CTA *Agenda tu Diagnóstico IA* (`#contacto`), botón de WhatsApp, enlaces a demos (`#demos`), *solicitar propuesta* (`#diagnostico`) test de 2 minutos y, si hay `booking_url`, *Agenda una llamada de 30 min*; fila de confianza (incluye oficinas EE. UU./Perú); tarjeta lateral *Lo que recibes en 2 semanas* + *Desde USD 1,500* + **formulario rápido** (`#info-form`: `ContactForm` con `compact` y `sendInfo`; nombre, email y objetivo) que además envía al visitante un correo con los 3 paquetes, la agenda y WhatsApp (`server/services/contactInfoEmail.ts`, copy de `landing.v2.packages`; máx. 1 por dirección al día y 5 por IP por hora).
2. **Logos de clientes** (`#clients`): `ClientLogos` (ver abajo).
3. **Lo que construimos — pruébalo** (`#demos`): chatbots, asistentes de conocimiento, agentes e IA documental, cada uno enlazado a su demo (`demosCatalog.items`).
4. **Dónde encaja en tu negocio**: puntos de partida por industria, rotulados como ejemplos, no resultados de clientes.
5. **Dónde la IA suele dar resultados más rápido**: tres patrones + CTA.
6. **Cómo trabajamos**: cuatro pasos.
7. **Precios** (`#diagnostico`): tres paquetes del Diagnóstico IA (`landing.v2.packages.items`) — Esencial *desde USD 1,500* (hasta 2 procesos; beneficio: 30 días de consultas), Avanzado *USD 2,500* (hasta 4; destacado; beneficio: demo funcional del caso prioritario), Integral *USD 3,000* (hasta 6; beneficio: taller ejecutivo de 2 h); entregables comunes arriba y, debajo, el proyecto directo (`landing.v2.paths.project`). Los beneficios son propuestas comerciales: cambiarlos solo en el i18n.
8. **Integraciones** (`landing.v2.integrations.groups`): ERP, CRM, canales, documentos, datos/BI, nube y modelos.
9. **Compromisos, seguridad y cumplimiento**: banner superior con 4 compromisos contractuales (`landing.v2.commitments.items`) + 9 especificaciones técnicas de seguridad y privacidad (`landing.v2.security.items`).
10. **Con quién trabajarás**: fundador (`team.members[0]`) + **presencia local** (`PUBLIC_OFFICES`, textos en `landing.v2.presence`).
11. **FAQ**: incluye costo de implementación y "¿por qué no hacerlo nosotros mismos?".
12. **Contacto** (`#contacto`): `ContactForm` adaptado a tono oscuro (botón verde, sin newsletter, `defaultGoal` opcional) + agenda / email / teléfono (`tel:`) / WhatsApp.
13. **Barra inferior en móvil** (`.landing-dock`, < `md`): opaca para no tapar texto, con WhatsApp, el CTA (aparece tras el hero y se oculta cuando el formulario es visible) y Robly reducido; en móvil no se muestra su globo de saludo. `index.css` reserva su altura en `body`.
14. **Burbuja flotante de WhatsApp** (solo `md` en adelante): siempre visible, abajo a la izquierda de la página (Robly queda a la derecha), con animación suave (`contact_click`, `link_location=landing_floating`).

**Spot de 30 s** (`src/components/BrandSpot.tsx`, brief en `docs/REMOTION_SPOT_30S.md` §13): banda justo después del hero de `/get-started` (título `landing.v2.spot.*` + CTA de diagnóstico + enlace a `#demos`) y dentro de la sección de demos del home, entre el título y las tarjetas. Silenciado, en bucle, carga solo cerca del viewport y se pausa fuera de pantalla; con `prefers-reduced-motion` muestra el póster con *play*. *Ver con sonido* lo reinicia con audio una vez. Archivos `public/videos/robles-ai-spot-{es,en}.{webm,mp4}` + `robles-ai-spot-poster-{es,en}.jpg`, registrados en `SPOTS` por idioma (español e inglés); un idioma sin video oculta la sección entera. Los masters 16:9 sin comprimir (`videos-creados/`) están en `.gitignore`. Mide `spot_sound_on` / `spot_complete` con `trackDemoEvent` (`demo_id: brand_spot`, `placement`).

**Logos de clientes**: `src/components/ClientLogos.tsx` muestra `CLIENT_LOGOS` (`shared/publicContent.ts`, archivos en `public/images/clients/`) en dos filas con movimiento lento en sentidos opuestos (`.logo-marquee` en `index.css`; se pausa al pasar el mouse y queda estático con `prefers-reduced-motion`), a color en tarjetas blancas (`large: true` para logos con mucho aire interno, p. ej. Mibanco); textos `clients.title` / `clients.note`. Va en la landing (tono oscuro) y en el home justo después del hero (claro). Son clientes de software empresarial del equipo desde 2011; no presentarlos como clientes de proyectos de IA y no nombrar a la razón social anterior en la web. Para agregar uno: copiar el archivo (SVG con `viewBox` ajustado al logo, o PNG/WebP recortado y con fondo transparente) y añadir la entrada. Orígenes: BCP, Interbank, El Comercio, Banco Falabella, Ripley, Caja Piura y financieras del carrusel de sistemas.com.pe; BBVA (logo actual), Lexmark, Xerox y Scotiabank de logotyp.us; Mibanco y Banco de la Nación de whatthelogo.com; SUNAT de vectorseek.com (fondo eliminado); Chem Supply de chemsupply.com.pe; MasterCook (EE. UU.) de un archivo enviado por Antonio.

**Agenda**: Admin → Settings → *Calendar booking* guarda `booking_url`; `GET /api/public/site-config` lo expone (solo http/https; si está vacío usa `PUBLIC_CONTACT.bookingUrl`, la página de Google Calendar https://calendar.app.google/oR9yeJveKiKpBqF49) y `useBookingUrl()` (`src/lib/siteConfig.ts`) muestra los enlaces *Agenda una llamada* (hero, precios, contacto), medidos como `contact_click` con `contact_method=calendar`.

**Variantes `?s=`** (`chatbots`, `rag`, `agents`, `docs`, en `landing.v2.variants.*`): cambian titular, subtítulo, tarjeta lateral, CTA, título/botón del formulario, objetivo preseleccionado y mensaje de WhatsApp, para que cada grupo de anuncios aterrice en un mensaje coherente (Quality Score). URLs finales: `/get-started` (EN) o `/get-started?lang=es` (ES) + `s=`.

**Formulario** (`src/components/Contact.tsx` → `ContactForm`, usado en `/` y `/get-started`): campos nombre, email, empresa (opcional), objetivo (`CONTACT_GOALS`: service, documents, knowledge, automation, analytics, unsure) y mensaje (opcional si hay objetivo; si se escribe, ≥ 10 caracteres). La API no cambió: el cliente compone `subject` (`Website Inquiry — <objetivo>`) y `message` (`Interested in: <objetivo>` + texto). `POST /api/contact` valida con `insertContactSchema`, registra la consulta en la tabla `contact_submissions` en BD antes de intentar el envío para evitar pérdida de prospectos si falla SMTP, despacha el correo (Reply-To = visitante) y responde `{ success: true }` solo si el envío fue aceptado. Visible en `/admin/contact-submissions`.

**Atribución de leads** (`shared/attribution.ts`, `src/lib/attribution.ts`): al cargar cualquier página se leen de la URL los UTM, click IDs (`gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`…), parámetros ValueTrack (`keyword`, `matchtype`, `campaignid`, `adgroupid`, `creative`, `device`, `network`…) y la variante `s`, más el referrer externo (origen + ruta, sin query). Se guarda en `localStorage` (90 días; una visita etiquetada reemplaza la anterior) y `ContactForm` la envía como `attribution`. El servidor la re-normaliza **sin duplicados** (solo parámetros conocidos, sin placeholders `{...}`, alias con el mismo valor —`utm_term`/`keyword`, `utm_campaign`/`campaignid`, `utm_content`/`creative`— se guardan una vez, landing sin query), la guarda en `contact_submissions.attribution` (JSON) y la añade al email. Si hay `gclid` y la API de Google Ads está configurada, `/admin/contact-submissions` la completa con ClickView (`lookupGoogleAdsClick`: campaña, grupo, keyword + concordancia, anuncio, dispositivo, red y los términos de búsqueda con clics de ese grupo ese día —Google no da el término por clic—) en `contact_submissions.ads_click`; un clic no encontrado en < 48 h se reintenta.

**Microsoft Clarity** (`shared/clarity.ts`, `src/lib/analytics.ts`): grabaciones de sesión y mapas de calor. Con `clarity_project_id` (Admin → Settings → Analytics & Tracking) el sitio carga Clarity por su cuenta, con o sin GTM (no añadir otra etiqueta de Clarity en GTM); solo en producción y nunca en `/admin`. Etiqueta cada sesión con `traffic_source`, `campaign`, `keyword` y `landing_variant` (de la atribución) y, al aceptarse un lead, con `lead_id` (`contact-<id>` / `quiz-<id>`) + `upgrade` para que se conserve la grabación. `ContactForm` envía los IDs de usuario/sesión de las cookies `_clck`/`_clsk` (`contact_submissions.clarity_session`) y `/admin/contact-submissions` muestra *View recording* (`https://clarity.microsoft.com/player/<proyecto>/<usuario>/<sesión>`). Los formularios de contacto y quiz llevan `data-clarity-mask="true"`. Clarity guarda las grabaciones ~30 días.

**Enlaces en `/get-started`**: todo enlace que sale de la página (demos, quiz, header, footer, Robly, externos) abre en pestaña nueva; las anclas internas (`#contacto`), el cambio de idioma, `mailto:`, `tel:` y el logo del header (lleva `data-same-tab` y va al home en la misma pestaña) no.

**Medición** (`src/lib/analytics.ts`, solo producción y nunca en `/admin`): con `gtm_container_id` configurado **GTM es el único tracker** (eventos al `dataLayer`); si no, GA4 y Meta Pixel directos. `trackConversion()` encola eventos hasta que los trackers cargan y nunca incluye datos del visitante.

| Función | GA4 | Meta | Cuándo |
|---------|-----|------|--------|
| `trackContactLead()` | `generate_lead` (`form_id: contact`, `method: contact_form`) | `Lead` | `POST /api/contact` → `success: true` |
| `trackQuizLead()` | `generate_lead` (`form_id: quiz`, `method: quiz`) | `Lead` | `POST /api/quiz-lead` devuelve `leadId` |
| `trackContactClick(canal, ubicación)` | `contact_click` (`contact_method`, `link_location`) | `Contact` | clic en WhatsApp/email/teléfono/agenda (landing, contacto del home, Robly) |
| `trackDemoEvent(evento, demoId)` | `demo_start`, `demo_complete`, `roi_calculated`, `demo_cta_click` | custom | embudo de demos |

Configuración externa: el GTM existente tiene una etiqueta GA4 *catch-all* que reenvía los eventos por nombre y una tabla FBEventName que mapea `generate_lead → Lead` (añadir `contact_click → Contact` si se quiere en Meta). En GA4, `generate_lead` es key event. **Google Ads**: cuenta *Robles.AI* (EE. UU., USD, hora del Pacífico, login `antonio@robles.ai`) vinculada a la propiedad GA4 `492769320`; `generate_lead` importado como conversión principal "Submit lead form"; `contact_click` debe importarse como **secundaria**. Detalle: `docs/CONTACT_CONVERSIONS.md`.

---

## 7. Analítica admin (`/admin/analytics`)

| Pestaña | Fuente | Contenido |
|---------|--------|-----------|
| Overview | GA4 Data API | Usuarios, sesiones, vistas, rebote, duración vs período anterior, tendencia diaria, usuarios en tiempo real |
| Traffic | GA4 | Páginas top, canales, países, dispositivos |
| Behavior | GA4 | Landing pages, nuevos vs recurrentes |
| Social | Meta Graph API | Insights de Instagram y de la página de Facebook + publicaciones recientes |
| Ads | Google Ads REST API opcional (`googleAdsApi.ts`), fallback GA4 (`googleAdsReport.ts`) + Meta Marketing API | Filtro por cuenta/campaña y fecha; gasto/clics/conversiones Ads; señales `generate_lead` GA4 separadas por formulario cuando la dimensión está registrada. Canales globales y tasa nativa `sessionKeyEventRate` en Traffic. Configuración y límites en `docs/ADS_ANALYTICS.md`. |

- Caché `analytics_cache`: tiempo real 30 s, rangos que terminan hoy 5 min, históricos 1 h, Meta 30 min; *Refresh* la limpia.
- GA4 requiere `ga4_property_id` + JSON de service account (`server/data/ga4-service-account.json`, subido desde settings).
- Meta Ads requiere `meta_ad_account_id` + `meta_ads_access_token` (token de System User con `ads_read`; los tokens de página/Instagram no sirven). El token va en cabecera `Authorization`, nunca en la URL.
- Leads de Meta: se toma el primer tipo presente entre `lead`, `offsite_conversion.fb_pixel_lead`, `onsite_conversion.lead_grouped` (no se suman para no duplicar).
- La UI del panel admin está en inglés (no usa i18n).

---

## 8. El Dominical IA (newsletter automatizado)

- **Sábado 12:00 (America/Lima)** — `generateDominicalReport`: lee los posts de los últimos 7 días, los puntúa con GPT-4o (novedad, impacto en personas, impacto económico, potencial narrativo), toma el top N (`dominical_top_n`, por defecto 5), redacta textos para LinkedIn e Instagram, guarda el reporte como `pending_review`, notifica a `notification_email` y genera el carrusel (paleta `natural`, estilo `cinematic-scene`).
- **Revisión** (`/admin/dominical/:id`): edición y regeneración de textos; carrusel 1080×1080 (portada + artículos + CTA; fondos `gpt-image-2.5-flare`, overlay SVG con sharp, regeneración/edición por slide, PDF con pdfkit); **video narrado** con Robly (`dominicalVideoGen.ts`, `robotFrames.ts`, `VideoGenerator.tsx`; fluent-ffmpeg, subtítulos); estado de publicación por plataforma; publicación manual o cancelación.
- **Auto-publicación**: un cron cada 30 min llama a `shouldRunAutoPublishNow()` y publica solo el **domingo** a `auto_publish_time` (por defecto `18:00`) en `auto_publish_timezone` (por defecto `America/Lima`), salvo que `auto_publish` sea `false`/`0`. Publica en las plataformas con credenciales válidas y estado `not_published`, con 5 s entre intentos y aislamiento de fallos, y envía un email resumen.

### Publicación multi-plataforma

Adaptadores en `server/services/platforms/` orquestados por `publishingEngine.ts`:

| Plataforma | API | Formato |
|-----------|-----|---------|
| LinkedIn | UGC Posts (OAuth 2.0 + refresh) | Carrusel PDF (≥ 2 slides) o texto + imagen |
| Instagram | Meta Graph API | Carrusel (PNG → JPEG) |
| Facebook | Meta Graph API | Post multi-foto |

`platform_publish_status`: `not_published → publishing → published | failed`. Meta descarga las imágenes desde `/api/public/slides/...`. Versión de Graph API fijada en `server/services/metaGraphApi.ts`.

---

## 9. Chatbot IA "Robly"

Widget global `src/components/chat/ChatbotWidget.tsx` (GPT-4o-mini vía `server/services/chatEngine.ts`):

- En todas las páginas públicas (oculto en `/admin/*` y al imprimir). Entrada: burbuja al montar, puntos de "escribiendo" a los 3 s, saludo a los 5 s (en teléfonos se oculta a los 8 s); el estado abierto/cerrado persiste entre recargas.
- SVGs en `public/robly-avatar/` (idle, listening, thinking, speaking, standby, pointing, pointing-glasses, dominical, entre otros).
- Streaming SSE, contexto según la página (`chatContext.ts`: posts, home, demos con su "business angle" y oferta de calculadora/diagnóstico sin prometer cifras), captura natural de contacto, tool calls.
- Sesiones en SQLite (`chat_conversations`, `chat_messages`, `chat_contacts`); email con transcript a `EMAIL_TO` al cerrar; cierre de sesiones inactivas cada 5 min.
- Inbox en `/admin/conversations`; botones de WhatsApp (`https://wa.me/14085900153`) medidos como `contact_click`.

---

## 10. Blog editorial (IA)

- Posts en `server/data/posts/YYYY/MM/DD/*.json`.
- **24 editores IA** en `server/data/editors.json` (ids 1–24: especialidad, `systemPrompt`, perfil, firma, paleta, rangos de temperatura/top_p). Avatares en `public/avatars/`.

| IDs | Especialidades |
|-----|----------------|
| 1–5 | Ciudades inteligentes, Robótica, Deep Learning, Visión por computadora, NLP |
| 6–10 | Big Data, Computación cuántica, Edge Computing, Streaming, Vehículos autónomos |
| 11–15 | Ética/Diversidad en IA, IA cuántica, Neurociencia, Infraestructura/Cloud, Gobernanza de IA |
| 16–20 | IA en salud, IA musical, Ciberseguridad, AR/VR, IA en animación |
| 21–24 | Arte con IA, Telecomunicaciones, Clima/IA, Blockchain/IA |

- Listado desde `blog_posts_index` (paginación SQL, filtros por `editorId`/`category`); búsqueda FTS5 (`blog_fts`, BM25 con título ponderado, snippets con `<mark>`).
- Cron horario genera posts (temas de NewsAPI) y actualiza ambos índices; scripts `detect-gaps`, `fill-gaps`, `cleanup-duplicates`.
- `/blog` abre los posts en un modal accesible (`BlogModal`, `useBlogModalRouting`, `lib/blogModal.ts`) con deep-link History API; la carga directa de `/blog/:slug` renderiza `BlogPost` completo (SEO intacto).

Formato del post:

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

---

## 11. Laboratorio de demos

Catálogo en `demosCatalog.items` (en/es: `id`, `href`, `status`, `icon`, `title`, `description`, `benefit`, …), renderizado por `DemosCatalog.tsx` en el home y en `/demos`. Robly lo conoce vía `chatContext.ts`: **mantener ambos sincronizados** al cambiar un estado. Encuadre de negocio (`BusinessCase`, `SavingsCalculator`, `business.ts`, textos `demoBusiness.<id>`) y roadmap en `docs/DEMOS_PLAN.md`. Los valores iniciales de la calculadora son **ejemplos editables, no resultados**.

| id | Ruta | Dónde corre | Estado |
|----|------|-------------|--------|
| `sitechatbot` | `/try-chatbot` | `chatbot-api.robles.ai` (repo `robles.ai-chatbot-api`): crawl acotado → Pinecone (namespace 24 h) → gpt-4o-mini | live |
| `identity` | `/try-identity` | `identity-api.robles.ai` (repo `robles.ai-identity-api`, servicio `identity-server`) | live |
| `rag` | `/try-rag` | `rag-api.robles.ai` (repo `robles.ai-rag-api`); el texto del PDF se extrae en el navegador | live |
| `speech` | `/try-transcription` | `transcription-api.robles.ai` (repo `robles.ai-transcription-api`): WS → Deepgram Nova-3, `/analyze` → OpenAI | live |
| `langchain` | `/try-langchain` | `langchain-api.robles.ai` (repo `robles.ai-langchain-api`) | live |
| `docextract` | `/try-docextract` | `docextract-api.robles.ai` (repo `robles.ai-docextract-api`) | live |
| `tts` | `/try-tts` | `tts-api.robles.ai` (repo `robles.ai-tts-api`): gpt-4o-mini-tts + ffmpeg | live |
| `forecast` | `/try-forecast` | Navegador (`src/lib/forecast.ts`) | live |
| `objectdetection` | `/try-object-detection` | Navegador (TensorFlow.js COCO-SSD `lite_mobilenet_v2`) | live |
| `emotion` | `/try-emotion` | Navegador (`@vladmandic/face-api`, modelos desde jsDelivr) | live |
| `voiceagent`, `anomaly`, `imagegen` | — | — | soon |

- `/try-medical` existe como página "próximamente", sin backend y fuera del catálogo; no sube nada.
- Las APIs escalan a cero: cada página hace warm-up al montar (ping `no-cors` a `/`, `GET /health` en transcription, `POST /rag/warmup` en RAG) y muestra un banner de estado. Overrides de endpoint en dev: `VITE_*_API`.
- Transcription: el API reenvía PCM `linear16` 16 kHz mono a Deepgram e ignora el `encoding` del frame `start`; por eso se captura con `AudioWorklet` (fallback `ScriptProcessorNode`).
- Previews de video y visuales del catálogo: `docs/DEMO_VIDEO_RELEASE.md`, `docs/DEMO_VISUALS.md`, `docs/FIREFLY_CLIPS.md`, material fuente en `creative/`.
- **Tutoriales en video** (`DemoTutorial.tsx`): botón secundario *Ver cómo se usa (45 s)* junto a `how_title` que abre un modal con `<video>` (nunca se reproduce solo); al cerrarlo hace scroll a la demo (`returnToId`). Archivos en `public/videos/tutorials/<ruta>-tutorial-<lang>.mp4` (H.264, `+faststart`) + `-poster-<lang>.jpg`, registrados en `TUTORIALS` por demo e idioma; un idioma sin video oculta el botón. Mide `tutorial_play` / `tutorial_complete` con `trackDemoEvent` (en GTM, añadirlos a la etiqueta GA4 de eventos de demo). Con `variant="featured"` se muestra como tarjeta grande con póster y botón de play (en `/try-chatbot` justo después del hero y en `/try-transcription`, `/try-object-detection` y `/try-emotion` antes del espacio de trabajo, además del botón). Hoy: `/try-object-detection` en inglés y español, `/try-emotion` en español (56 s) e inglés (59 s), `/try-chatbot` en español (59 s) e inglés (58 s) y `/try-transcription` en español (60 s) e inglés (57 s). Briefs en `docs/demo-tutorials/`.
- Convenciones de los repos de APIs: un proyecto GCP por API (misma cuenta de facturación), Cloud Run sin `minScale` y facturación por request, Artifact Registry `<servicio>-api-repo` podado a 3 versiones (`prune_registry.sh`), secretos en Secret Manager rotados con `rotate_secret.sh` (destruye versiones viejas), push a `main` → GitHub Actions → Cloud Run.

---

## 12. Casos de éxito (ilustrativos)

Cuatro casos bilingües en `public/case-studies/content.json` y `caseStudies.items`: Smart City (vigilancia con visión), Salud (reingresos), Finanzas (fraude), Telco (chatbot). Son **ilustrativos**: las métricas llevan "hasta"/"alrededor de" y la UI aclara que muestran resultados potenciales de este tipo de solución, no de un cliente concreto. Se muestran en el home (ya no en la landing). Documentos fuente (PDF/DOCX, EN/ES) en `study-cases/`. **No presentar cifras como resultados de clientes.**

---

## 13. Base de datos (SQLite)

`server/data/dominical.db` (ignorado por git, se preserva entre builds):

| Tabla | Propósito |
|-------|-----------|
| `admin_users` | Autenticación admin (bcrypt) |
| `settings` | Configuración key/value |
| `dominical_reports` | Reportes semanales (texto, estado, scores) |
| `carousel_slides` | Datos por slide del carrusel |
| `platform_publish_status` | Ciclo de publicación por plataforma |
| `analytics_cache` | Caché TTL de GA4, Meta y Ads |
| `chat_conversations`, `chat_messages`, `chat_contacts` | Sesiones, mensajes y contactos de Robly |
| `blog_fts` | Tabla virtual FTS5 |
| `blog_posts_index` | Índice de listado del blog |
| `quiz_leads`, `quiz_verification_tokens` | Leads del quiz y tokens de verificación |
| `contact_submissions` | Formularios de contacto + `attribution` / `ads_click` / `clarity_session` (JSON) |

### Claves de la tabla `settings`

Los secretos se enmascaran en `GET /api/admin/settings` (`settingsSecrets.ts`) y un valor enmascarado nunca se vuelve a guardar.

| Área | Claves |
|------|--------|
| Email | `email_user`, `email_app_password` (secreto enmascarado), `email_to`; en producción se configuran desde Admin → Settings y nunca se leen del `.env` |
| OpenAI / imágenes | `openai_api_key`, `image_provider` (por defecto `dalle3`), `replicate_api_token`, `stability_api_key` |
| Dominical | `dominical_top_n`, `notification_email`, `auto_publish`, `auto_publish_time`, `auto_publish_timezone` |
| Auth admin | `jwt_secret` (se genera si no hay `ADMIN_JWT_SECRET`) |
| LinkedIn | `linkedin_client_id`, `linkedin_client_secret`, `linkedin_access_token`, `linkedin_refresh_token`, `linkedin_token_expires_at`, `linkedin_person_id`, `linkedin_oauth_state` (transitoria) |
| Meta (publicación/insights) | `meta_app_id`, `meta_app_secret`, `instagram_business_account_id` (legado `instagram_user_id`), `instagram_access_token`, `facebook_page_id`, `facebook_page_access_token`, `meta_token_expires_at` |
| Meta Ads | `meta_ad_account_id`, `meta_ads_access_token` |
| Tracking del sitio | `gtm_container_id`, `ga4_measurement_id`, `meta_pixel_id`, `clarity_project_id` (servidos por `GET /api/public/analytics-config`, caché 1 h) |
| Sitio público | `booking_url` (servido por `GET /api/public/site-config`) |
| GA4 Data API | `ga4_property_id` |
| Portal de backends | `hostinger_api_key`, `hostinger_domain` (por defecto `robles.ai`), `gcp_sa_key`, `dns_cname_target` (por defecto `ghs.googlehosted.com.`) |

---

## 14. Specs de features (`.kiro/specs/`)

Specs estilo Kiro (`requirements.md`, `design.md`, `tasks.md` + `tasks.meta.json`), fuente histórica de decisiones de diseño. **No son documentación del proyecto ni deben borrarse.** Directorios: `admin-backend-management`, `ai-chatbot-widget`, `analytics-dashboard`, `blog-fts5-search`, `blog-posts-db-index`, `dominical-carousel-images`, `dominical-ia`, `multi-platform-publishing`, `seo-improvements`, `ux-overhaul`, `whatsapp-widget-time-fix`.

---

## 15. Páginas y rutas del frontend

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Home | Hero, logos de clientes, features, soluciones, catálogo de demos, casos, cursos, testimonios, equipo, contacto |
| `/get-started` | Landing | Landing de tráfico pagado (§6), variantes `?s=` |
| `/diagnostico-ia` | Quiz | Quiz con lead verificado + PDF |
| `/demos` | Demos | Catálogo del laboratorio |
| `/try-chatbot`, `/try-identity`, `/try-rag`, `/try-transcription`, `/try-langchain`, `/try-docextract`, `/try-tts` | Try* | Demos con API en Cloud Run |
| `/try-forecast`, `/try-object-detection`, `/try-emotion` | Try* | Demos 100% en el navegador |
| `/try-medical` | TryMedical | Próximamente (sin backend, fuera del catálogo) |
| `/blog`, `/blog/:slug` | BlogRoute → BlogList / BlogPost | Listado, modal y post |
| `/careers`, `/apply` | Careers, Apply | Vacantes y postulación |
| `/otp` | OTP | Página de código de un solo uso |
| `/admin` | AdminDashboard | Login / setup inicial / dashboard |
| `/admin/settings` | AdminSettings | Integraciones, IDs de tracking, GA4, Meta, Meta Ads, OpenAI, Dominical |
| `/admin/dominical`, `/admin/dominical/:id` | AdminDominicalList / Detail | Reportes, revisión, carrusel, video, publicación |
| `/admin/conversations`, `/admin/conversations/:id` | AdminConversationList / Detail | Inbox de Robly |
| `/admin/quiz-leads` | AdminQuizLeads | Leads del quiz |
| `/admin/analytics` | AdminAnalytics | Overview · Traffic · Behavior · Social · Ads |
| `/admin/backends` | AdminBackends | Portal de backends (§21) |
| `/admin/monitoring` | AdminMonitoring | Logs de PM2 del VPS en vivo, solo lectura, con filtro y secretos enmascarados (`server/services/vpsLogs.ts`) |

---

## 16. API — endpoints

Públicos:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/contact` | Formulario → email (`success: true` solo si el envío fue aceptado); `GET` → 404 |
| POST | `/api/send-application` | Postulación → email |
| POST | `/api/quiz-lead` | Quiz: mensaje GPT, guarda lead, envía verificación |
| GET | `/api/quiz-lead/status?leadId=` | Polling de verificación |
| GET | `/api/quiz-lead/verify?token=` | Enlace de verificación (HTML) |
| POST | `/api/quiz-lead/resend` | Reenvía verificación |
| GET | `/api/quiz-lead/pdf?leadId=` | PDF (solo verificados) |
| GET | `/api/blog`, `/api/blog/:slug`, `/api/blog/search?q=` | Listado (índice SQL), detalle (JSON), búsqueda FTS5 |
| GET | `/api/editors` | Editores |
| GET | `/api/generate-posts?date=YYYY-MM-DD` | Generación manual de posts |
| GET | `/api/test` | Health check |
| GET | `/api/public/analytics-config` | IDs de GTM / GA4 / Meta Pixel |
| GET | `/api/public/site-config` | Ajustes públicos del sitio (`bookingUrl`) |
| GET | `/api/public/slides/:reportId/:position(.png)` | Imagen de slide (para Meta) |
| POST/GET/POST/POST | `/api/chat/session`, `/api/chat/history`, `/api/chat/message` (SSE), `/api/chat/close` | Chat de Robly (cookie `chat_session`) |
| GET | `/sitemap.xml`, `/sitemaps/:filename` | Índice y sitemaps mensuales (`/static-pages.xml` para páginas estáticas) |

Admin (bajo `/api/admin`, requieren cookie `admin_token` salvo `status`, `setup`, `login` y el callback de LinkedIn):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST/POST/POST/GET | `/status`, `/setup`, `/login`, `/logout`, `/me` | Estado de auth y sesión |
| GET/PUT | `/settings` | Leer (enmascarado) / guardar settings |
| GET/POST/POST | `/settings/meta`, `/settings/meta`, `/settings/meta/validate` | Credenciales de publicación Meta |
| GET/POST | `/settings/ga4-status`, `/settings/ga4-service-account` | Credenciales GA4 Data API |
| GET | `/linkedin/auth-url`, `/linkedin/callback` | OAuth de LinkedIn |
| POST | `/reindex-posts` | Reconstruir índices del blog |
| GET/POST | `/dominical`, `/dominical/generate` | Listar / generar reportes |
| GET/PUT | `/dominical/:id` | Detalle / actualización |
| POST | `/dominical/:id/{regenerate-post, regenerate-instagram, regenerate-linkedin, cancel, generate-image}` | Acciones del reporte |
| POST/GET | `/dominical/:id/generate-carousel`, `/dominical/:id/carousel`, `/dominical/:id/carousel/pdf` | Carrusel |
| GET/POST/PUT | `/dominical/:id/carousel/slides/:position/{image, generation-info, regenerate, text}` | Operaciones por slide |
| POST/GET | `/dominical/:id/generate-video`, `/dominical/:id/video`, `/dominical/:id/video/file` | Video narrado |
| POST/GET | `/dominical/:id/publish` (legado LinkedIn), `/publish/:platform`, `/publish-all`, `/publish/:platform/reset`, `/publish-status` | Publicación |
| GET | `/quiz-leads` | Leads del quiz |
| GET | `/conversations`, `/conversations/analytics`, `/conversations/:id` | Inbox de Robly |
| GET | `/analytics/{overview, realtime, traffic, behavior, social/instagram, social/facebook, ads/google, ads/meta}` | Analítica (cacheada) |
| POST | `/analytics/refresh` | Limpia la caché de analítica |
| GET/PUT | `/backends/connections` | Credenciales Hostinger/GCP (write-only) |
| GET | `/backends`, `/backends/:id/cloudrun` | Backends con DNS + actividad; estado Cloud Run |
| POST | `/backends/:id/dns`, `/backends/:id/ping` | Publicar CNAME; ping en vivo opt-in (despierta el servicio) |
| GET | `/monitoring/logs?stream=error\|out&lines=&q=` | Últimas líneas de los logs de PM2 (rutas fijas en el servidor, secretos enmascarados) |
| POST | `/test-ig-linebreaks` | Prueba interna de saltos de línea en Instagram |

---

## 17. Autenticación

- Admin: JWT en cookie httpOnly `admin_token` (7 días); `requireAuth` (`server/auth.ts`) verifica y adjunta el usuario. Usar siempre `requireAuth` en endpoints admin nuevos.
- Secreto JWT: `ADMIN_JWT_SECRET` o, si no existe, `jwt_secret` generado y guardado en `settings`.
- Robly: cookie httpOnly `chat_session` (1 h, se renueva con cada mensaje).
- Passwords con bcrypt; página `/otp` para código de un solo uso.

---

## 18. Variables de entorno y despliegue

### `.env` (no versionado; no hay `.env.example`)

```env
PORT=5173
HOST=0.0.0.0
BASE_URL=https://robles.ai          # URLs absolutas en emails/publicación del Dominical (valor por defecto)
# Solo fallback de desarrollo local; en producción el correo se configura en /admin/settings.
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_TO=...
OPENAI_API_KEY=sk-...               # respaldo si no hay openai_api_key en settings
NEWS_API_KEYS=key1,key2             # rotan; también se acepta NEWS_API_KEY
ADMIN_JWT_SECRET=...                # opcional
# Overrides de endpoints de demos (solo dev, frontend):
# VITE_IDENTITY_API, VITE_RAG_API, VITE_LANGCHAIN_API, VITE_TRANSCRIPTION_API,
# VITE_CHATBOT_API, VITE_DOCEXTRACT_API, VITE_TTS_API
```

- **No** poner `NODE_ENV` en `.env`: `start` lo define inline.
- Solo las variables `VITE_*` llegan al navegador. Los IDs de GA4 / Meta Pixel / GTM **no** son variables de entorno: salen de settings vía `/api/public/analytics-config`.
- La mayoría de integraciones se configuran desde `/admin/settings` y `/admin/backends`.

### CI/CD

```
git push origin main            (o `bash push.sh`, que hace `git add .` y commitea TODO)
        ↓
GitHub Actions (.github/workflows/deploy.yml) → SSH al VPS → bash pull.sh
```

**Ojo con `push.sh`**: commitea todos los cambios del árbol (incluido trabajo sin terminar en `creative/` o `docs/`). Para publicar solo un conjunto de cambios, commitear esos archivos y hacer `git push origin main`.

`pull.sh` hace `git fetch` + `reset --hard origin/main` y solo lo necesario:

| Cambió | Acción |
|--------|--------|
| `package.json` / `package-lock.json` | `npm install` + build + `pm2 restart` |
| `src/`, `server/`, `shared/`, configs, `index.html` | build + restart |
| solo `server/data/` | sync de datos a `dist/` + restart |
| solo docs / `*.sh` / `.gitignore` | nada |
| sin commits nuevos | no-op |

Secretos del repo: `VPS_HOST` (`robles.ai`), `VPS_USER` (`roblesai`), `VPS_SSH_KEY`, `VPS_REPO_PATH` (`/home/roblesai/htdocs/robles.ai`). Generar la llave dedicada:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
ssh-copy-id -i ~/.ssh/github_deploy.pub roblesai@robles.ai
gh secret set VPS_SSH_KEY --repo jroblesluna/robles.ai < ~/.ssh/github_deploy
```

Deploy manual (fallback) en el VPS: `source ~/.nvm/nvm.sh && bash pull.sh`.

| VPS | Valor |
|-----|-------|
| Usuario | `roblesai` |
| Ruta | `~/htdocs/robles.ai` |
| Proceso PM2 | `robles-ai` (`~/.nvm/versions/node/v22.14.0/bin/pm2`) |
| Node | v22.14.0 (NVM) |
| Puerto | 5173 |
| Logs | `~/.pm2/logs/robles-ai-out.log`, `robles-ai-error.log` |

**Bug histórico de NODE_ENV (corregido 29 ago 2026)**: `start` usaba `NODE_ENV=production && node dist/index.js`; el `&&` no pasa la variable a Node y los cron jobs se saltaban como "development". Ahora es `NODE_ENV=production node dist/index.js`.

---

## 19. Convenciones de código

- **Alias** (`vite.config.ts`, `vitest.config.ts`): `@/` → `src/`, `@shared/` → `shared/`.
- **Imports**: servidor en ESM con extensión `.js` en imports relativos (`import db from './db.js'`); frontend con alias y sin extensión; `shared/` es el único código compartido cliente/servidor.
- **Copy**: todo texto público pasa por i18next con paridad en/es (el panel admin es la excepción: inglés sin i18n).
- **UX/A11y** (spec `ux-overhaul`): `.tap-target` (44 px), `.break-anywhere`, token `--header-h` + `scroll-margin`, inputs de 16 px en móvil, `:focus-visible` global, `overflow-x-auto` para tablas/logs/JSON, layouts que apilan en móvil, `useReducedMotion` / `<MotionConfig reducedMotion="user">` y backstop CSS `prefers-reduced-motion`, estados con `LoadingState`/`EmptyState`/`ErrorState` (copys `state.*`).
- **Claims**: casos, industrias y calculadoras son ilustrativos; no publicar cifras como resultados de clientes ni estadísticas sin fuente citada.
- **Persistencia**: nada que deba sobrevivir un deploy dentro de `dist/`; `postbuild` copia `server/data/` sin sobrescribir la base.
- **Testing**: `vitest.config.ts` usa `jsdom` por defecto y `node` para `server/**`; property tests con `fast-check`; integración con `supertest`; tests junto a sus módulos.
  - Si fallan tests de SQLite con `NODE_MODULE_VERSION ...`, recompilar con la misma versión de Node: `npm rebuild better-sqlite3`.
  - Algunos tests leen `server/data/` (posts) y `creative/`; fallan si se corren desde una copia sin esas carpetas. Antes de atribuirle una falla a un cambio, comparar contra `main`.

---

## 20. Requisitos y comandos

- **Node.js ≥ 20** y **npm**. En desarrollo: `http://localhost:5173` (ajustable con `PORT`). La primera visita a `/admin` crea el usuario admin.

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Express con `tsx watch` + middleware de Vite |
| `npm run build` | Build cliente Vite + build SSR de `src/entry-server.tsx` + bundle del servidor con esbuild |
| `postbuild` (automático) | Copia `src`, `shared`, `public` a `dist/` y sincroniza `server/data/` → `dist/data/` sin sobrescribir bases |
| `npm start` | `NODE_ENV=production node dist/index.js` |
| `npm run check` | `tsc` |
| `npm test` | `vitest --run` |
| `npm run fix-sitemap` | Corrige entradas faltantes del sitemap |
| `npm run cleanup-duplicates` | Elimina posts duplicados |
| `npm run detect-gaps` / `npm run fill-gaps` | Detecta / completa días sin posts |
| `npx tsx server/fts/migrate.ts` | Poblar el índice FTS (opcional) |

---

## 21. Portal de administración de backends (`/admin/backends`)

Conecta, monitorea y publica el DNS de los **7 backends** de demos registrados en `server/services/backends/registry.ts`: `chatbot`, `identity` (servicio `identity-server`, sin `-api`), `rag`, `langchain`, `transcription`, `docextract`, `tts`. Spec: `.kiro/specs/admin-backend-management/`. Solo lectura hacia GCP; el sitio nunca despliega Cloud Run (eso lo hacen los scripts y el CI de cada repo).

- **Conexiones**: `hostinger_api_key` y `gcp_sa_key` en `settings`, **write-only** (el `GET` solo informa `connected`). Se cargan desde la UI, no desde `.env`.
- **Estado por backend**: DNS (`ok`/`missing`/`mismatch`/`unknown` para `<sub>-api CNAME ghs.googlehosted.com.`), actividad (En uso/En reposo + última actividad) y Cloud Run (revisión, ready).
- **La lista nunca despierta un backend**: la actividad viene de Cloud Monitoring (`monitoringClient.ts`: `request_count`, `container/instance_count`). Solo el botón *Probar* (`POST /:id/ping`) golpea `GET /health`.
- **Publicar DNS**: `POST /:id/dns` crea/actualiza el CNAME vía Hostinger (idempotente); nombre y destino salen del registry, nunca del body. `DnsProvider` permite un futuro proveedor Cloud DNS (`docs/DEMOS_PLAN.md` §8).
- **Auth GCP** (`googleAuth.ts`): JWT bearer (RS256) desde `gcp_sa_key`, scope `cloud-platform` (el `.read-only` da 403 en la Cloud Run Admin API); la solo-lectura la garantiza IAM.
- **SA `backend-viewer@robles-ai-admin`** (proyecto raíz `robles-ai-admin`, sin billing a propósito) con `roles/run.viewer`, `roles/monitoring.viewer` y `roles/serviceusage.serviceUsageConsumer` en cada proyecto de backend.
- **Billing de Monitoring**: `timeSeries` exige billing en el proyecto que factura; `monitoringClient` envía `x-goog-user-project: <proyecto del backend>`. Sin eso Monitoring devuelve `403 "requires billing to be enabled"` (Cloud Run Admin no lo necesita).

---

## 22. Historial reciente relevante

### Commits recientes (`git log`, más nuevo primero)

| Commit | Fecha | Descripción |
|--------|-------|-------------|
| `3f558c3` | 2026-10-23 | Preserva fuentes creativas y storyboards refinados de las demos |
| `66c7c0c` | 2026-10-24 | Rediseño comercial de `/get-started` a partir de simulaciones de buyer personas |
| `819151d` | 2026-10-24 | Rework de `/get-started` para tráfico pagado (revisión CRO) |
| `6c82e48` | 2026-10-24 | Pestaña Ads en analítica + medición de leads de landing, quiz y `contact_click` |
| `95f9b50` | 2026-10-22 | Leads de contacto confirmados y respuestas dirigidas al visitante (#34) |
| `46573d0` | 2026-10-22 | Videos de demos optimizados con carga en hover/toque (#33) |
| `4cb6cd6` | 2026-10-21 | Límite de 2500 caracteres en prompts de video Firefly (#32) |
| `6aafec1` | 2026-10-21 | Timeline completo del clip de transcripción (#31) |
| `d1f2ef8` | 2026-10-21 | Landmarks faciales internos en los frames de identity (#30) |
| `e84117b` | 2026-10-21 | Frames de inicio y fin para todos los conceptos Firefly (#29) |
| `ca60f03` | 2026-10-19 | Todas las demos en el home + kit Firefly por demo (#26) |
| `0f9321e` | 2026-10-19 | Fotos generadas y previews animados en todas las tarjetas de demos (#23) |
| `bb0aae8` | 2026-10-18 | Admin responsive, diálogos por teclado y cobertura de auditoría (#19) |
| `0e77b67` | 2026-10-18 | Hero profesional en lugar de la mascota (#17) |
| `05f91f9` | 2026-10-18 | Registro de releases SEO verificados (#16) |

### Cambios de octubre 2026

- **Landing `/get-started`** (`819151d`, `66c7c0c`): rehecha para tráfico pagado tras una revisión CRO y simulaciones de buyer personas. Estructura actual en §6. Se eliminaron las estadísticas "Why Now" sin fuente, las secciones duplicadas de proceso, la sección de tecnologías, las fotos de stock, los casos ilustrativos, la lista de "5 preguntas" y la nota de "cupos limitados". Variantes `?s=` completas por grupo de anuncios. El HTML para crawlers (`server/seo/publicContent.ts`) refleja la estructura.
- **Formulario de contacto**: componente `ContactForm` reutilizable (home y landing), selector de objetivo, mensaje opcional, `defaultGoal`, `showNewsletter`, `showTrustNote`, `submitLabelKey`, `titleKey`, `buttonClassName`.
- **Medición** (`6c82e48`): `trackConversion()` genérico con cola; `trackQuizLead()` y `trackContactClick()` nuevos; Robly y el contacto del home también miden clics.
- **Pestaña Ads** (`6c82e48`): `googleAdsReport.ts` (Google Ads vía GA4, consultas independientes con `Promise.allSettled` y advertencias no fatales), `metaAds.ts` (Marketing API), endpoints `/analytics/ads/google|meta`, tarjeta "Meta Ads (Analytics)" en settings; `ga4Client.queryReport` ahora devuelve `currencyCode`.
- **Google Ads**: cuenta nueva *Robles.AI* (EE. UU., USD, Pacífico, persona natural, login `antonio@robles.ai`, `jrobles@sistemas.com.pe` invitado como admin), vinculada a GA4 `492769320`, auto-apply desactivado, `generate_lead` importado como conversión principal. La cuenta antigua *Inversiones On Line* (Perú, cancelada en 2025) no se usa.
- **Leads de contacto confirmados** (`95f9b50`): el contrato completo está en `docs/CONTACT_CONVERSIONS.md`.
- **Demos**: previews de video/foto en todas las tarjetas, carga en hover/toque, kit y clips Firefly (`docs/DEMO_VIDEO_RELEASE.md`, `docs/DEMO_VISUALS.md`, `docs/FIREFLY_CLIPS.md`).
- **Documentación**: `DEMOS_PLAN.md` y `REMOTION_VIDEO_CONTEXT.md` pasaron a `docs/`; README y AGENTS son los únicos `.md` de la raíz.

### Cambios de septiembre 2026 (demos, UX, infra)
- **`TryChatbot` — demo D1 "Tu chatbot en 60 segundos" (2026-09, Fase 2 de `docs/DEMOS_PLAN.md`)**: nueva demo *live*. El visitante pega la URL de su web → el backend la rastrea (crawler de HTML estático, mismo host, `robots.txt`, anti-SSRF, tope 20 páginas) → indexa el texto en un namespace efímero de Pinecone (TTL 24h) → responde preguntas con `gpt-4o-mini` usando solo ese contenido. Página `src/pages/TryChatbot.tsx` (patrón autocontenido, color de marca violeta/índigo, warm-up + `BusinessCase` + `SavingsCalculator`, `ApiCallLog`, `HowItWorks`), ruta `/try-chatbot` en `App.tsx`. El item de catálogo `sitechatbot` pasó de `soon` a `live` (+`href`). `business.ts`: `DemoBusinessId` y `CALCULATOR_DEFAULTS` += `sitechatbot` (test `business.test.ts` actualizado). i18n en/es: bloque `try-chatbot.*` + `demoBusiness.sitechatbot.*`. `chatContext.ts`: descripción, business angle y calculadora para `/try-chatbot`. Backend nuevo: **`robles.ai-chatbot-api`** en Cloud Run (proyecto `robles-ai-chatbot-project`, servicio `chatbot-api-server`, dominio `chatbot-api.robles.ai`), molde de `langchain-api` (FastAPI + OpenAI + Pinecone) sin torch (1Gi). Override de endpoint en dev: `VITE_CHATBOT_API`. Es la demo estrella (mayor potencial de leads); se mide por separado.
- **`TryDocExtract` — demo D2 "Facturas y documentos → datos" (2026-09, Fase 1 de `docs/DEMOS_PLAN.md`)**: nueva demo *live*. El visitante sube una imagen o PDF → se codifica a base64 en el navegador → `POST /extract` → un modelo de visión de OpenAI (`gpt-4o-mini`) en **un único invoke** detecta el tipo de documento y extrae los campos como JSON estructurado (con confianza por campo y bounding boxes opcionales). La página muestra tabla + JSON + overlay de las cajas sobre el documento y permite descargar JSON/CSV/Excel (SpreadsheetML `.xls`, sin librería extra). Página `src/pages/TryDocExtract.tsx` (`/try-docextract`, tono indigo). Backend nuevo autónomo `robles.ai-docextract-api` (FastAPI, molde de `langchain-api`, **sin Pinecone ni LangChain**; pura extracción, sin RAG), Cloud Run `docextract-api.robles.ai` (proyecto `robles-ai-docextract-project`, servicio `docextract-api-server`, 1Gi, `--max-instances=4`, billing temporal `01B173-4B6B66-240F5E` porque la cuenta principal tiene la cuota de proyectos llena). Ítem de catálogo `docextract` → `live`. chatContext actualizado. DNS: el CNAME `docextract-api` → `ghs.googlehosted.com.` ya se publicó en Hostinger (vía la API, mismo patrón que los hermanos); Cloud Run emite el TLS automáticamente al propagar. `docextract-api.robles.ai` es el dominio público del backend.
- **`TryForecast` — demo D6 "Pronóstico con tu CSV" (2026-09, Fase 3 de `docs/DEMOS_PLAN.md`)**: nueva demo *live*, **100% en el navegador (sin backend, sin GCP, sin costo)**. Descomposición aditiva estilo Holt-Winters (nivel + tendencia lineal OLS + perfil estacional promediado con detección automática de la estación por autocorrelación) y bandas de incertidumbre q10/q50/q90 a partir de los residuos en muestra. Presets de ejemplo (estándar/al alza/estacional/volátil) o CSV propio del visitante, horizonte 24 pasos (≈1 día) o 168 (≈1 semana), gráfica recharts (histórico + mediana + banda + tendencia) y descarga CSV. Lógica en `src/lib/forecast.ts` (con tests en `src/lib/__tests__/forecast.test.ts`), página `src/pages/TryForecast.tsx` (`/try-forecast`, tono cyan). Ítem de catálogo `forecast` → `live`. chatContext actualizado.
- **`TryTTS` — demo "Dale voz a tu contenido" (2026-09)**: nueva demo *live*. Texto a voz neural premium con **OpenAI `gpt-4o-mini-tts`**. Dos modos: **Estudio de voz** (`/synthesize`: frase + voz + vibe + velocidad, muestra por voz con botón de preview) y **Narrador de contenido** (`/narrate`: texto largo fragmentado → audio unido con ffmpeg + subtítulos SRT/VTT, con casos precargados marketing/artículo/tutorial/e-learning/IVR). La velocidad se pasa como instrucción (no es control nativo); la voz es generada por IA (banner visible, R8) y no se clonan voces reales. Página `src/pages/TryTTS.tsx` (`/try-tts`, tono rosa/fucsia), ruta en `App.tsx`, ítem de catálogo `tts` → `live` (categoría `audio`), `business.ts` (+`tts`, test actualizado), i18n en/es (`try-tts.*` + `demoBusiness.tts.*`), `chatContext.ts`, y registrado como 7º backend en `server/services/backends/registry.ts`. Backend `robles.ai-tts-api` en Cloud Run (`tts-api.robles.ai`, proyecto `robles-ai-tts-project`, 1Gi + ffmpeg, billing temporal `01B173-4B6B66-240F5E`). Detalles de UX: la muestra de voz dice el nombre ("Hola, soy X y esta es mi voz..."), muestra un spinner y bloquea los demás previews mientras carga (para no acoplar voces), y al terminar de narrar el reproductor inicia el play automáticamente. Override de endpoint en dev: `VITE_TTS_API`.
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
- **Fase 0 de `docs/DEMOS_PLAN.md` (2026-09-21)** — encuadre de negocio del laboratorio de demos:
  - El catálogo (`demosCatalog.items`, en/es) tiene títulos orientados a resultados y un campo nuevo `benefit` (línea de ahorro en cada tarjeta). Los ids *live* son `identity`, `rag`, `speech`, `langchain`, `sitechatbot`, `objectdetection` y `emotion`; el roadmap, `docextract`, `voiceagent`, `anomaly`, `forecast` e `imagegen`. `medical`, `sentiment` y `recommend` salieron del catálogo.
  - `src/components/demo/`: `BusinessCase` (bajo el header de cada demo), `SavingsCalculator` (antes de la sección técnica; volumen × minutos × % automatizable × costo/hora, más los CTA a `/diagnostico-ia` y a contacto) y `business.ts` (valores de ejemplo por demo, `computeSavings`, `useDemoTracking`, `useGoToHomeSection`). Los textos van en i18n bajo `demoBusiness.<id>`. Los valores iniciales de la calculadora son **ejemplos editables, no cifras de resultado**.
  - Analítica: `trackDemoEvent` (`src/lib/analytics.ts`) envía `demo_start`, `demo_complete`, `roi_calculated` y `demo_cta_click` con `demo_id`. Funciona con GTM (`dataLayer`), GA4 directo y Meta Pixel. **Ojo:** el `trackEvent` viejo no hace nada cuando el sitio usa GTM. Con GTM hay que crear la etiqueta GA4 para estos eventos para que aparezcan en GA4.
  - Robly (`chatContext.ts`): cada demo *live* tiene un "business angle" y la instrucción de ofrecer la calculadora y el diagnóstico, sin prometer cifras.
  - `transcription-api`: `/analyze` fallaba con `brain_bad_schema` en conversaciones casuales porque el modelo omitía `summary`. Se corrigió el prompt y el reintento ahora nombra los campos faltantes (los logs incluyen `schema_errors`: ruta del campo y tipo de error, nunca valores).
  - `rag-api` (cold start de ~60 s → ~29 s): los modelos de Hugging Face (MiniLM, monoT5, BGE) se incluyen en la imagen al construirla (`HF_HOME=/opt/hf-cache`), y monoT5/BGE se cargan de forma diferida (getters con lock). `POST /rag/warmup` los carga y corre una inferencia de prueba; `TryRAG` lo llama sin esperar respuesta apenas empieza el upload. Así el rerank tarda ~1.5 s en vez de ~46 s. Dos lecciones de Cloud Run con facturación por request: (1) un thread en segundo plano casi no recibe CPU entre requests, así que el trabajo pesado tiene que ocurrir *dentro* de una request; (2) los pesos van memory-mapped, así que cargar el modelo no alcanza: hasta la primera inferencia no se leen del disco.
- **Documentos nuevos**: `REMOTION_VIDEO_CONTEXT.md` (contexto de marca + brief del video de marketing en Remotion) y `DEMOS_PLAN.md` (roadmap del laboratorio de demos priorizado por efecto wow y ahorro/ROI). Desde oct 2026 viven en `docs/`.
- **UX overhaul (2026-09, spec `.kiro/specs/ux-overhaul/`)**: pasada transversal de responsive + accesibilidad + reduced-motion, más un visor de noticias del blog en modal.
  - **Modal del blog**: las tarjetas de `/blog` ahora abren un modal accesible **en la misma página** (`src/components/BlogModal.tsx`) en vez de navegar. Deep-link con History API a `/blog/:slug` (abrir en pestaña nueva + copiar/compartir con fallback de portapapeles a un input de solo lectura auto-seleccionado), prev/next entre los posts ya traídos, cierre con Esc/backdrop/botón, bloqueo de scroll del body, focus trap y restauración de scroll + foco a la tarjeta de origen. El cold-load / entrada directa a `/blog/:slug` sigue renderizando la página completa `BlogPost` (SEO server-side y sitemaps intactos). Nuevos: `src/hooks/useBlogModalRouting.ts` (routing/estado del modal) y `src/lib/blogModal.ts` (helpers puros de slug/URL/navegación, con tests). El renderizado del artículo se extrajo a `src/components/BlogArticle.tsx`, compartido entre `BlogPost` y el modal para estructura idéntica.
  - **Reduced-motion**: hook `src/hooks/useReducedMotion.ts` + `<MotionConfig reducedMotion="user">` que apaga Hero/`ParticleBackground`/globo del chatbot y las entradas framer-motion cuando el usuario pide menos movimiento.
  - **Convenciones CSS globales** (`src/index.css`): guard de overflow (`html, body { overflow-x: hidden }`), utilidades `.tap-target` (44px) y `.break-anywhere`, token `--header-h` (única fuente de la altura del header) + `scroll-margin` para anclas, `input` a 16px en móvil (evita el auto-zoom de iOS), ring global de `:focus-visible` y un backstop `@media (prefers-reduced-motion: reduce)`.
  - **Componentes de estado compartidos**: `src/components/state/{LoadingState,EmptyState,ErrorState}.tsx` (copys por i18n `state.*`); `ErrorState` con retry se cablea en los fetch del blog (se conserva el redirect 404).
  - **Responsive/A11y transversal**: lazy-loading de imágenes (`loading="lazy"` + reserva de aspect-ratio), landmarks ARIA + `role="dialog"` (incl. `VideoModal`), layouts que apilan en móvil, wrappers `overflow-x-auto` para tablas/logs/JSON/transcripts (demos y admin), tap targets de 44px. Se preserva el patrón de overlay de canvas (`absolute inset-0 h-full w-full`) para que las cajas alineen con el medio escalado.
  - **i18n (en+es)**: bloques nuevos `blogModal.*` y `state.*`, más `nav.primaryLabel`/`nav.footerLabel`, `videoModal.dialogLabel`/`videoModal.close` y `footer.social.*`.
- **CI/CD del sitio**: push a `main` → GitHub Actions (`.github/workflows/deploy.yml`) → SSH al VPS → `pull.sh` (build selectivo por tipo de archivo). Ver §18.

---

## 23. Documentación y referencias

- [`README.md`](README.md): referencia técnica en inglés para humanos.
- `docs/` (todo lo que no es README/AGENTS):

| Archivo | Contenido |
|---------|-----------|
| `docs/DEMOS_PLAN.md` | Roadmap del laboratorio de demos (wow + ROI) con estado por fase |
| `docs/REMOTION_VIDEO_CONTEXT.md` | Contexto de marca y brief del video de marketing en Remotion (60 s, anterior) |
| `docs/REMOTION_SPOT_30S.md` | Prompt del spot de 30 s en Remotion (demos en vivo + Diagnóstico IA) para la web y anuncios; manda sobre el brief de 60 s |
| `docs/demo-tutorials/try-rag/` | Prompt del tutorial en Remotion de `/try-rag` (45 s + corte de 30 s), capturas de Playwright de la demo y script para regenerarlas |
| `docs/demo-tutorials/try-object-detection/` | Ídem para `/try-object-detection`: prompt del tutorial, capturas (con cámara simulada), detecciones medidas (`capture-report.json`) y script |
| `docs/demo-tutorials/try-emotion/` | Ídem para `/try-emotion`, con **duración libre (30–60 s) calculada desde la locución** y reglas de uso responsable (agregado y anónimo, nunca evaluar empleados ni estudiantes) |
| `docs/demo-tutorials/try-chatbot/` | Ídem para `/try-chatbot` (duración libre 30–60 s), con las páginas leídas y las respuestas reales del bot entrenado con `robles.ai` (`capture-report.json`). **El video EN está bloqueado**: el bot responde siempre en español (§0 del prompt) |
| `docs/demo-tutorials/try-transcription/` | Ídem para `/try-transcription` (duración libre 30–60 s), con una llamada de ejemplo a una clínica dental ficticia (dos voces TTS, `audio/` + `make-conversation-audio.mjs`) que alimenta el micrófono falso, y la transcripción y los análisis reales (`capture-report.json`). §0 lista los bugs de la transcripción en vivo (líneas provisionales que no se borran, turnos fuera de orden) |
| `docs/demo-tutorials/try-langchain/` | Ídem para `/try-langchain` (duración libre 30–60 s): documento de ejemplo → RAG → Agente → JSON, con las respuestas reales de los tres modos (`capture-report.json`). **El video EN está bloqueado**: el agente, el JSON y las citas responden en español (§0 del prompt) |
| `docs/DEMO_TUTORIALS_STATUS.md` | Tracker de los tutoriales en video por demo e idioma (ES/EN): qué está hecho y qué falta |
| `docs/CONTACT_CONVERSIONS.md` | Contrato de entrega del contacto y de conversiones (lead/click) + configuración de GTM, GA4, Ads y Meta |
| `docs/ADS_ANALYTICS.md` | Admin Ads/GA4 sources, campaign and submission filters, direct API setup, and validation |
| `docs/DEMO_VIDEO_RELEASE.md` + `docs/DEMO_VIDEO_ASSETS.json` | Release de videos de preview de demos y manifiesto de assets |
| `docs/DEMO_VISUALS.md` | Registro de imágenes y animaciones del catálogo de demos |
| `docs/FIREFLY_CLIPS.md` | Parejas de frames inicio/fin de Firefly para los clips de demos |
| `docs/ADMIN_AUDIT.md` | Auditoría funcional y responsive del panel admin |
| `docs/DESIGN_AUDIT.md` | Auditoría de diseño del sitio público |
| `docs/SEO_AUDIT.md`, `docs/SEO_IMPLEMENTATION_PLAN.md` | Auditoría SEO/GEO técnica y plan de implementación |
| `docs/PENDING_WORK.md` | Backlog de trabajo pendiente |

- `.kiro/specs/*/`: specs de features (§14).
- `creative/`: fuentes de los visuales de demos (`firefly-demo-clips/`, `firefly-demo-pairs-v3/`, con un `README.md` por carpeta).
- Regla: **no crear nuevos `.md` en la raíz**. Planes, auditorías, briefs y notas de release van en `docs/` y se agregan a la tabla de arriba y a la de `README.md`.
