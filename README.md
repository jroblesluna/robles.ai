# Robles.AI – Website (Vite + React + Express)

Public website of **Robles.AI**, built with **Vite + React (TypeScript)** on the frontend and **Express** as the development/production server. Includes internationalization (**i18next**), a bilingual ad landing page, an AI chatbot widget (Robly), a full admin panel, an automated weekly newsletter (El Dominical IA), multi-platform social publishing (LinkedIn, Instagram, Facebook), a static blog with FTS5 full-text search, server-side SEO meta injection, an analytics dashboard (GA4 + Meta), an AI-readiness diagnostic quiz with verified lead capture, and an interactive AI demos lab.

---

## Features

- **SPA with Vite + React** and routing via **wouter**.
- **Express server** serving static assets and integrating Vite middleware in development.
- **i18n** (en/es) with asynchronous `translation.json` loading per locale.
- **Modern UI** with Tailwind, framer-motion, shadcn, and recharts.
- **Ad Landing Page** (`/get-started`): bilingual (EN/ES) conversion-focused page with process steps, services, technologies, pricing, roadmap table, Why Now stats, and CTA. All images served locally.
- **AI Chatbot Widget (Robly)**: floating widget replacing the old WhatsApp bubble. GPT-4o-mini powered with SSE streaming, page-context awareness, contact data collection, and conversation storage. Features Robly SVG avatar with 4 animated moods (idle/listening/thinking/speaking). Entrance sequence at 10s/20s/22s.
- **AI Demos Lab** (`/demos`, catalog in `DemosCatalog.tsx`): seven live demos — `/try-identity`, `/try-rag`, `/try-langchain`, `/try-transcription` (real-time speech-to-text + diarization + AI analysis), `/try-chatbot` (a chatbot trained on your own website: paste a URL → crawl → chat) backed by Cloud Run APIs, plus `/try-object-detection` and `/try-emotion` running fully in the browser. `/try-medical` is **coming soon** (no backend yet; nothing is uploaded). See [Demos](#demos).
- **AI Diagnostic Quiz** (`/diagnostico-ia`): scored AI-readiness quiz → GPT-generated result → email verification → downloadable PDF report. Leads are stored in SQLite and listed in `/admin/quiz-leads`.
- **Static blog**: posts in `server/data/posts/YYYY/MM/DD/*.json` with bilingual translations and FTS5 full-text search.
- **Server-side SEO**: Express middleware injects correct `<title>`, `<meta>`, Open Graph, Twitter Card, hreflang, canonical, and JSON-LD tags before serving HTML to crawlers — no JavaScript needed.
- **Admin Panel** (`/admin`): JWT-authenticated dashboard with: El Dominical IA management, multi-platform publishing, carousel image and narrated video generation, conversation inbox, quiz leads, and analytics.
- **El Dominical IA**: automated weekly newsletter. GPT-4o scores blog posts (multidimensional: novelty, people impact, economic impact, narrative potential), generates a LinkedIn/Instagram post draft, creates 1080×1080 carousel slides (gpt-image-1 + sharp + SVG overlay + pdfkit PDF), and publishes to LinkedIn, Instagram, and Facebook via their respective APIs.
- **Analytics Dashboard**: GA4 traffic metrics and Meta (Instagram/Facebook) insights with SQLite caching, displayed in Overview/Traffic/Behavior/Social tabs using recharts.
- **Forms** with validation (zod) and email delivery via **nodemailer**.
- **Optional analytics**: GA4 and Facebook Pixel (active only in production).
- **Sitemaps** with hreflang annotations (`sitemap.xml`, monthly per-language XML files).

---

## Key Directories

```
src/
  components/           # Reusable UI components
    DemosCatalog.tsx    # Demos lab catalog (home section + /demos page)
    chat/               # ChatbotWidget, ChatPanel, MessageList, MessageInput
    demo/               # Shared demo UI: JsonHighlight, InfoTip, StepCard
    admin/              # CarouselPreview, SlideEditor, PlatformPublishStatus, VideoGenerator
    admin/analytics/    # OverviewTab, TrafficTab, BehaviorTab, SocialTab, KpiCard
  pages/
    admin/              # AdminLayout, AdminDashboard, AdminSettings, AdminDominicalList,
                        # AdminDominicalDetail, AdminConversationList, AdminConversationDetail,
                        # AdminAnalytics, AdminQuizLeads, AdminLogin, AdminSetup
  hooks/                # useChatSession, useSearch, useSEO
  scripts/              # Blog post generation, cleanup, gap detection, sitemaps
  i18n/                 # locales/en/ and locales/es/

server/
  adminRoutes.ts        # All /api/admin/* endpoints
  analyticsRoutes.ts    # /api/admin/analytics/* endpoints
  chatRoutes.ts         # /api/chat/* (SSE streaming, session management)
  chatAdminRoutes.ts    # /api/admin/conversations/* endpoints
  publicRoutes.ts       # /api/public/slides/* (no auth — Meta API image access)
  searchRoutes.ts       # /api/blog/search (FTS5 BM25 search)
  auth.ts               # JWT middleware (generateToken, verifyToken, requireAuth)
  db.ts                 # SQLite connection + all table creation
  vite.ts               # Vite integration + slug index singleton
  fts/                  # FTS5 indexer, migrate script, property tests
  listing/              # blog_posts_index indexer, property tests
  migrations/           # chatTables migration
  seo/                  # MetaInjector, SlugIndex, metaBuilders, htmlInjector, types
  jobs/
    generateDominical.ts      # Saturday 12pm: score + generate + notify
    autoPublishDominical.ts   # Sunday 12pm: publish or skip
    chatSessionCleanup.ts     # Every 5min: close timed-out chat sessions
  services/
    dominicalScoring.ts       # GPT-4o multidimensional scoring
    imageGeneration.ts        # gpt-image-1 cover image generation
    linkedin.ts               # Re-export (thin wrapper for backward compat)
    engagementPhrases.ts      # GPT-4o batch engagement phrase generation
    carouselImageGen.ts       # gpt-image-1 background per slide
    slideCompositor.ts        # sharp + SVG overlay → 1080×1080 PNG
    carouselGenerator.ts      # Carousel orchestration (generate + regenerate)
    pdfExporter.ts            # pdfkit → PDF Buffer
    carouselTypes.ts          # Shared carousel interfaces
    dominicalVideoGen.ts      # Narrated Dominical video (ffmpeg + robot frames)
    robotFrames.ts            # Robly robot SVG poses for the video
    quizResultMessage.ts      # GPT result message for the diagnostic quiz
    quizVerificationEmail.ts  # Verification email for quiz leads
    quizLeadPdf.ts            # pdfkit quiz report (+ pdfIcons.ts)
    chatEngine.ts             # GPT-4o-mini SSE streaming + tool calls
    chatContext.ts            # Page-aware context builder (blog/home/demo)
    chatNotifier.ts           # Email transcript notification
    conversationStore.ts      # SQLite CRUD for conversations/messages/contacts
    ga4Client.ts              # Google Analytics Data API client
    metaInsights.ts           # Meta Graph API (Instagram + Facebook insights)
    analyticsCache.ts         # SQLite-backed TTL cache for analytics responses
    platforms/
      types.ts                # PlatformName, PlatformStatus, PlatformAdapter interface
      contentFormatter.ts     # Text truncation, hashtag preservation, format selection
      linkedinAdapter.ts      # LinkedIn UGC Posts API + token refresh
      instagramAdapter.ts     # Meta Graph API carousel publishing
      facebookAdapter.ts      # Meta Graph API multi-photo post publishing
      publishingEngine.ts     # Orchestrates multi-platform publish with isolation

public/
  images/               # Landing page images (local serving)
  avatars/              # Editor headshots (38 editors)
  robly-avatar/         # Robly SVGs: idle, listening, speaking, thinking, pointing, dominical, standby
  case-studies/         # content.json (4 bilingual case studies HTML) + images

study-cases/            # PDF + DOCX case study documents (EN + ES)
scripts/                # generateCaseStudyContent.js (case study HTML generation)
DEMOS_PLAN.md           # Demos lab roadmap: prioritization for wow + ROI
REMOTION_VIDEO_CONTEXT.md # Brand context + brief for the Remotion marketing video
```

---

## Requirements

- **Node.js >= 20** (recommended)
- **npm**

---

## Scripts (package.json)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express with `tsx watch` and Vite in dev mode |
| `npm run build` | Compile frontend (Vite) + bundle server (esbuild) to `dist/` |
| `npm start` | Run production: `NODE_ENV=production node dist/index.js` (inline env — NOT `&&`) |
| `npm run check` | TypeScript type check (`tsc`) |
| `npm test` | Run all tests with `vitest --run` |

> In development, available at `http://localhost:5173` (adjust with `PORT`).

---

## Environment Variables

Create a `.env` file in root (do not commit):

```env
# Server
PORT=5173
HOST=0.0.0.0

# Email (forms + chatbot notifications + Dominical notifications)
EMAIL_USER=your_gmail_user
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=destination@domain.com

# Analytics (production only)
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_FACEBOOK_PIXEL_ID=1234567890

# OpenAI (blog generation, chatbot, Dominical scoring, image generation)
OPENAI_ORGANIZATION=org-xxx
OPENAI_API_KEY=sk-xxx

# News (blog post generation cron)
NEWS_API_KEY=xxx

# Admin JWT (auto-generated and stored in DB if not set)
ADMIN_JWT_SECRET=your-secret-here
```

> **Important**: Do NOT add `NODE_ENV` to `.env`. The `start` script sets it explicitly.
> **Frontend (Vite)** only exposes variables prefixed with `VITE_`. The rest are server-side only.

---

## Database (SQLite)

All persistent state lives in `server/data/dominical.db` (gitignored). Tables:

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin authentication (bcrypt passwords) |
| `settings` | Key-value store for API keys, tokens, preferences |
| `dominical_reports` | Weekly Dominical IA reports (text, status, scores) |
| `carousel_slides` | Per-slide data for Dominical carousel images |
| `platform_publish_status` | Per-platform publish lifecycle (linkedin/instagram/facebook) |
| `analytics_cache` | TTL-cached responses from GA4 and Meta APIs |
| `chat_conversations` | Chatbot sessions (open/closed) |
| `chat_messages` | Individual messages per conversation |
| `chat_contacts` | Visitor contact data captured during chat |
| `blog_fts` | FTS5 virtual table for full-text blog search |
| `blog_posts_index` | Listing index for fast paginated blog queries |
| `quiz_leads` | Diagnostic quiz leads (answers, score, profile, result message, verified flag) |
| `quiz_verification_tokens` | Email verification tokens for quiz leads (expiry, used_at) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  SPA pages: Home, Landing, Blog, Demos, Admin panel             │
│  Components: ChatbotWidget (Robly), BlogSearch, CarouselPreview │
│  Admin tabs: Dominical, Settings, Conversations, Analytics      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / SSE / fetch + JWT cookie
┌──────────────────────────────▼──────────────────────────────────┐
│                       Express Server                             │
│  server/routes.ts       ← main router + cron jobs               │
│  server/adminRoutes.ts  ← /api/admin/* (auth required)          │
│  server/chatRoutes.ts   ← /api/chat/* (SSE streaming)           │
│  server/analyticsRoutes.ts ← /api/admin/analytics/*             │
│  server/searchRoutes.ts ← /api/blog/search (FTS5)               │
│  server/publicRoutes.ts ← /api/public/slides/* (no auth)        │
├──────────────────────────────────────────────────────────────────┤
│  SEO Middleware (server/seo/)                                    │
│  MetaInjector → SlugIndex → BlogMetaBuilder / StaticMetaBuilder │
│  → HtmlInjector → serves modified HTML to crawlers              │
├──────────────────────────────────────────────────────────────────┤
│  Cron Jobs (node-cron, America/Lima timezone)                   │
│  - Hourly:     generate blog posts + FTS/listing index update   │
│  - Saturday 12pm: generateDominical (score → post → notify)     │
│  - Sunday 12pm:   autoPublishDominical (LinkedIn/IG/FB)         │
│  - Every 5min:    chatSessionCleanup (timeout idle sessions)     │
├──────────────────────────────────────────────────────────────────┤
│  External APIs                                                   │
│  OpenAI (GPT-4o, GPT-4o-mini, gpt-image-1)                      │
│  LinkedIn UGC Posts API + OAuth 2.0                             │
│  Meta Graph API (Instagram carousel + Facebook multi-photo)     │
│  Google Analytics Data API (GA4)                                │
│  NewsAPI (blog post topic discovery)                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  SQLite (server/data/dominical.db)                               │
│  13 tables: admin, settings, dominical, carousel, platform,      │
│             analytics_cache, chat×3, fts5, listing_index, quiz×2│
└─────────────────────────────────────────────────────────────────┘
```

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, solutions, courses, case studies, team |
| `/get-started` | Landing | Bilingual AI diagnosis landing page |
| `/diagnostico-ia` | Quiz | AI-readiness diagnostic quiz with verified lead capture + PDF report |
| `/demos` | Demos | AI Demos Lab catalog (live + coming soon) |
| `/careers` | Careers | Job listings |
| `/apply` | Apply | Application form |
| `/blog` | BlogList | Paginated blog + FTS5 search |
| `/blog/:slug` | BlogPost | Individual post with server-injected SEO |
| `/try-identity` | TryIdentity | Identity verification demo (Cloud Run → `identity-api.robles.ai`) |
| `/try-langchain` | TryLangChain | LangChain demo (Cloud Run → `langchain-api.robles.ai`) |
| `/try-rag` | TryRAG | RAG pipeline demo (Cloud Run → `rag-api.robles.ai`) |
| `/try-medical` | TryMedical | **Coming soon** — modality picker only; no backend, nothing uploaded |
| `/try-transcription` | TryTranscription | Real-time speech-to-text + diarization + AI analysis (Cloud Run → `transcription-api.robles.ai`) |
| `/try-chatbot` | TryChatbot | Chatbot trained on your website: paste URL → crawl → chat (Cloud Run → `chatbot-api.robles.ai`) |
| `/try-object-detection` | TryObjectDetection | Object detection (in-browser, COCO-SSD) |
| `/try-emotion` | TryEmotion | Emotion recognition (in-browser, face-api.js) |
| `/otp` | OTP | OTP second-factor page |
| `/admin` | AdminPage | Login / first-time setup |
| `/admin/settings` | AdminSettings | LinkedIn, Meta, OpenAI, Dominical preferences |
| `/admin/dominical` | AdminDominicalList | Weekly report listing |
| `/admin/dominical/:id` | AdminDominicalDetail | Review, edit, carousel, narrated video, publish |
| `/admin/quiz-leads` | AdminQuizLeads | Diagnostic quiz leads |
| `/admin/conversations` | AdminConversationList | Chat inbox with filters + analytics |
| `/admin/conversations/:id` | AdminConversationDetail | Full transcript + contact data |
| `/admin/analytics` | AdminAnalytics | GA4 + Meta dashboard (4 tabs) |

---

## Demos

The AI Demos Lab (`/demos`) lists every demo with a `live` / `soon` status. The catalog data lives in the i18n files (`demosCatalog.items` in `src/i18n/locales/{en,es}/translation.json`); `DemosCatalog.tsx` renders it on the home page and on `/demos`. Robly knows the catalog through `server/services/chatContext.ts` — keep both in sync when a status changes.

| Demo | Route | Where it runs | Status |
|------|-------|---------------|--------|
| Identity verification | `/try-identity` | Cloud Run `identity-api.robles.ai` (repo `robles.ai-identity-api`) | live |
| RAG pipeline | `/try-rag` | Cloud Run `rag-api.robles.ai` (repo `robles.ai-rag-api`); PDF text extracted in the browser with `pdfjs-dist` | live |
| LangChain agent | `/try-langchain` | Cloud Run `langchain-api.robles.ai` (repo `robles.ai-langchain-api`) | live |
| Speech-to-text + diarization | `/try-transcription` | Cloud Run `transcription-api.robles.ai` (repo `robles.ai-transcription-api`): WebSocket → Deepgram Nova-3, `/analyze` → OpenAI | live |
| Your chatbot in 60 seconds | `/try-chatbot` | Cloud Run `chatbot-api.robles.ai` (repo `robles.ai-chatbot-api`): crawl a URL (static HTML, same-host, robots.txt, anti-SSRF) → Pinecone (ephemeral namespace, 24h TTL) → gpt-4o-mini | live |
| Object detection | `/try-object-detection` | In the browser: TensorFlow.js COCO-SSD (`lite_mobilenet_v2`) | live |
| Emotion recognition | `/try-emotion` | In the browser: `@vladmandic/face-api` (models from jsDelivr) | live |
| Medical image analysis | `/try-medical` | **No backend** — modality picker only; images never leave the browser | soon |

**Cold starts.** The Cloud Run APIs scale to zero, so each demo page pings its API on mount (warm-up) and shows a status banner. `rag-api` is the slowest to wake (can exceed 45 s).

**Transcription audio format.** The transcription API forwards audio to Deepgram as raw PCM `linear16`, 16 kHz, mono — it ignores the `encoding` declared in the `start` frame. `TryTranscription.tsx` therefore captures PCM with an `AudioWorklet` (ScriptProcessor fallback) instead of `MediaRecorder`, whose WebM/Opus output Deepgram would read as noise.

**Demo backend infra conventions** (all four API repos share them):

- One GCP project per API, all on the same billing account; Cloud Run with no `minScale` (scale to zero) and request-based billing.
- Artifact Registry repo named `<service>-api-repo`. `prune_registry.sh` keeps the 3 newest versions per package and registers a cleanup policy; it runs at the end of `update_docker.sh`, `deploy_fresh_gcp.sh` and in CI.
- Secrets live in Secret Manager and Cloud Run binds them as `:latest`. `rotate_secret.sh` pushes new values from `.env`, reloads Cloud Run and destroys every older version (Secret Manager bills per active version).
- Push to `main` → GitHub Actions builds on the runner and deploys to Cloud Run.

---

## AI Chatbot Widget (Robly)

Global floating widget (`src/components/chat/ChatbotWidget.tsx`) powered by GPT-4o-mini:

- Appears on all non-admin pages with a timed entrance sequence (bubble at 10s, typing dots at 20s, greeting at 22s)
- Robly avatar with 4 SVG moods: idle, listening, thinking, speaking (in `public/robly-avatar/`)
- SSE streaming for real-time token delivery
- Page-context awareness: reads blog post content, homepage services, demo descriptions
- Naturally collects visitor contact data (name, email/phone) during conversation
- Each session stored in SQLite with full transcript
- Email notification sent to `EMAIL_TO` when a session closes
- Admin inbox at `/admin/conversations` with filters, analytics, and detail view
- WhatsApp fallback button inside the chat panel (`https://wa.me/14085900153`)
- Hidden on `/admin/*` routes and during print

---

## El Dominical IA

Automated weekly newsletter system managed from `/admin/dominical`:

**Saturday 12:00pm (America/Lima)** — generation job:
1. Reads all blog posts from last 7 days
2. Sends to GPT-4o for multidimensional scoring (novelty, people impact, economic impact, narrative potential, 1–100 scale)
3. Selects top N posts (configurable, default 5)
4. Generates LinkedIn post draft (hook + opinions + hashtags, Spanish)
5. Generates Instagram-specific post text variant
6. Stores report in `dominical_reports` with status `pending_review`
7. Sends notification email to admin

**Admin review panel** (`/admin/dominical/:id`):
- Split view: scored news list (left) + editable post text (right)
- Carousel image generation: 1080×1080 PNG slides (cover + article×N + CTA)
  - Background images: gpt-image-1 conceptual vector illustrations
  - Composition: SVG overlay with white band header, logo, 3-line title, engagement phrase, category labels, color palette selector
  - Individual slide regeneration, text editing (re-compose without re-generating background)
  - Download PDF carousel (pdfkit)
- Multi-platform publish status panel (LinkedIn/Instagram/Facebook)
- Manual publish or cancel

**Sunday 12:00pm (America/Lima)** — auto-publish job:
- Publishes to all platforms with valid credentials and `not_published` status
- 5-second delay between platform attempts
- Per-platform failure isolation
- Notification email with results summary

---

## Multi-Platform Publishing

Platform adapter pattern in `server/services/platforms/`:

| Platform | API | Content Format |
|----------|-----|---------------|
| LinkedIn | UGC Posts API | PDF carousel (≥2 slides) or text+image |
| Instagram | Meta Graph API | Multi-image carousel (PNG slides, converted to JPEG) |
| Facebook | Meta Graph API | Multi-photo post (uploaded photos + feed post) |

`platform_publish_status` table tracks independent status per platform: `not_published → publishing → published / failed`.

Credentials configured in `/admin/settings` (Meta App ID/Secret, Instagram Business Account ID, Facebook Page ID + access tokens).

---

## SEO (Server-Side Meta Injection)

`server/seo/metaInjector.ts` intercepts HTML requests before serving:

- **Blog posts** (`/blog/:slug`): injects title, description (≤160 chars), Open Graph, Twitter Card, canonical URL, hreflang (en/es/x-default), BlogPosting JSON-LD, BreadcrumbList JSON-LD
- **Static pages** (`/`, `/blog`, `/careers`, `/get-started`): injects page-specific meta from i18n translations, WebSite JSON-LD on home
- **Slug resolution**: `SlugIndex` maps both EN and ES slugs to file paths with O(1) lookup, rebuilt lazily on first request
- Works in both dev (Vite transform) and production (reads built `dist/index.html`)
- Sitemaps include `xhtml:link` hreflang annotations (one file per month, both languages combined)

---

## Analytics Dashboard (`/admin/analytics`)

Four-tab dashboard at `/admin/analytics`:

| Tab | Data Source | Key Metrics |
|-----|-------------|-------------|
| Overview | GA4 Data API | Users, page views, session duration, bounce rate, daily trend chart, real-time active users |
| Traffic | GA4 Data API | Top pages, traffic sources (pie), countries table, device distribution, social platform traffic |
| Behavior | GA4 Data API | Pages/session, avg duration, top landing pages, new vs returning users (donut) |
| Social | Meta Graph API | Instagram followers/reach/impressions, Facebook fans/page views/engagement, recent posts with per-post metrics |

All API responses cached in SQLite with TTL (today: 5min, historical: 24h). Cache cleared via "Refresh" button. GA4 Service Account JSON uploaded through admin settings.

---

## Blog

- Location: `server/data/posts/YYYY/MM/DD/*.json`
- Post structure: `slug`, `date`, `editorId`, `categories`, `keywords`, `translations` (en/es), `sources`
- **38 editor personas** defined in `server/data/editors.json`
- Blog listing backed by `blog_posts_index` SQLite table (fast SQL pagination, O(1) filter by `editorId`, `category`)
- Full-text search via FTS5 virtual table with BM25 ranking (title-weighted), highlight snippets with `<mark>` tags
- Hourly cron generates new posts and updates both FTS and listing indexes incrementally
- Utility scripts: `detectGaps.ts` (find missing posts), `fillGaps.ts` (auto-complete gaps), `cleanupDuplicates.ts`

---

## Case Studies

Four bilingual (EN/ES) case studies in `public/case-studies/content.json`:

| Industry | Case | Key Result |
|----------|------|------------|
| Smart City | AI Security Surveillance System | 27% crime reduction, 42% faster emergency response |
| Health | Predictive Analytics for Patient Care | 87% readmission prediction accuracy, 23% reduction in readmissions |
| Finance | Fraud Detection for Financial Services | 99.2% accuracy, $4.5M+ annual savings, <300ms response |
| Telco | AI Chatbot for Customer Service | 78% autonomous resolution, 85% faster response, 32% CSAT increase |

Full case study documents (PDF + DOCX, EN + ES) in `study-cases/`.

---

## Testing

```bash
npm test          # Run all tests (vitest --run)
```

Test infrastructure:
- **vitest** + **fast-check** (property-based) + **supertest** (integration)
- Tests co-located with modules: `server/fts/*.test.ts`, `server/listing/*.test.ts`, `server/__tests__/*.ts`
- Property tests verify universal invariants: description truncation, hreflang symmetry, FTS ranking, pagination completeness, publish isolation, text truncation, etc.

Key test files:
- `server/__tests__/chatRoutes.integration.test.ts` — full SSE chat flow
- `server/__tests__/fullChatFlow.integration.test.ts` — session lifecycle
- `server/fts/search.property.test.ts` — BM25 ranking properties
- `server/listing/listingApi.property.test.ts` — pagination/filter properties
- `server/seo/__tests__/` — meta injection properties

---

## Internationalization (i18n)

- Folder: `src/i18n/`
- Files: `locales/en/translation.json` and `locales/es/translation.json`
- Async initialization via `initI18n()` before rendering

Translation namespaces:
- `nav`, `hero`, `footer` — site-wide UI
- `landing.*` — ad landing page content
- `chat.*` — chatbot UI strings
- `seo.*` — server-side meta tags for static pages

---

## Local Development

```bash
# 1) Install dependencies
npm install

# 2) Environment variables
cp .env.example .env   # adjust EMAIL_*, OPENAI_*, API keys

# 3) Run dev environment
npm run dev

# 4) (Optional) Seed FTS index
npx tsx server/fts/migrate.ts

# 5) Production build
npm run build
npm start
```

---

## Deployment

The project runs on a VPS with PM2 under user `roblesai`. Deployment is
automated with **GitHub Actions**:

```
bash push.sh (local)  →  git commit + push to main
                             ↓
        GitHub Actions (.github/workflows/deploy.yml)
                             ↓
        SSH into VPS  →  bash pull.sh (fetch + selective build + pm2 restart)
```

After the one-time setup, the full cycle is just `bash push.sh` — the deploy
runs automatically.

### `pull.sh` — selective build by change type

`pull.sh` fetches `origin/main` and inspects **which files changed** to do only
the work that's justified:

| Changed files | Action |
|---------------|--------|
| `package.json` / `package-lock.json` | `npm install` + build + pm2 restart |
| `src/`, `server/`, `shared/`, configs, `index.html` | build + pm2 restart |
| only `server/data/` (blog posts) | sync data into `dist/` + pm2 restart (no compile) |
| only docs / `*.sh` / `.gitignore` | nothing (server left running) |
| no new commits | no-op |

It handles: `git fetch` → `git reset --hard origin/main` → (npm install) →
(build) → pm2 restart. It requires NVM loaded (the script sources
`~/.nvm/nvm.sh`).

### CI/CD setup (GitHub Secrets)

The workflow authenticates to the VPS via SSH key. Four repo secrets are needed
(Settings → Secrets and variables → Actions): `VPS_HOST` (`robles.ai`),
`VPS_USER` (`roblesai`), `VPS_SSH_KEY` (private SSH key authorized on the VPS),
`VPS_REPO_PATH` (`/home/roblesai/htdocs/robles.ai`).

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
ssh-copy-id -i ~/.ssh/github_deploy.pub roblesai@robles.ai
gh secret set VPS_SSH_KEY --repo jroblesluna/robles.ai < ~/.ssh/github_deploy
# + VPS_HOST, VPS_USER, VPS_REPO_PATH
```

### Manual deploy (fallback)

```bash
# On the VPS, or via SSH from your Mac:
source ~/.nvm/nvm.sh && bash pull.sh
```

### Known VPS configuration

| Setting | Value |
|---------|-------|
| User | `roblesai` |
| App path | `~/htdocs/robles.ai` |
| PM2 process name | `robles-ai` |
| PM2 binary | `~/.nvm/versions/node/v22.14.0/bin/pm2` |
| Node version | v22.14.0 (via NVM) |
| Port | 5173 |
| PM2 logs | `~/.pm2/logs/robles-ai-out.log` / `robles-ai-error.log` |

### NODE_ENV bug (fixed Aug 29 2026)

The `start` script previously used `NODE_ENV=production && node dist/index.js`. The `&&` operator does **not** pass the variable to the child process — it runs `NODE_ENV=production` as a no-op command, then runs `node` with `NODE_ENV` undefined. Express defaults undefined `NODE_ENV` to `"development"`, which caused all cron jobs (blog generation, Dominical IA) to be skipped via their dev-mode guards.

Fixed to: `NODE_ENV=production node dist/index.js` (inline assignment, POSIX-standard).

---

## Architecture Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind + framer-motion + shadcn + recharts + wouter |
| Backend | Express 4 + Node.js 20 + tsx (dev) / esbuild (prod) |
| Database | SQLite via better-sqlite3 (10 tables) |
| AI | OpenAI GPT-4o, GPT-4o-mini, gpt-image-1 |
| Social APIs | LinkedIn UGC, Meta Graph API (Instagram + Facebook) |
| Analytics | Google Analytics Data API (GA4) + Meta Graph API |
| Image Processing | sharp (resize/composite) + pdfkit (PDF export) |
| Search | SQLite FTS5 with BM25 ranking |
| Testing | vitest + fast-check + supertest |
| Deployment | VPS + PM2 + pull.sh |

---

## Code Assistant Reference

This section documents conventions and non-obvious patterns essential for making correct changes.

### Path Aliases

Configured in both `vite.config.ts` and `vitest.config.ts`:

| Alias | Resolves to |
|-------|------------|
| `@/` | `src/` |
| `@shared/` | `shared/` |

Use `@/components/...`, `@/pages/...`, `@shared/schema` in frontend and test files. Server files use relative imports with `.js` extensions (ESM).

### Import Conventions

Server files use **ESM with `.js` extensions** even for `.ts` source files:
```ts
// server files — always .js extension in imports
import db from './db.js';
import { requireAuth } from './auth.js';
import { generateDominicalReport } from './jobs/generateDominical.js';
```

Frontend files use path aliases or relative imports without extensions:
```ts
import { useChatSession } from '../../hooks/useChatSession.js'; // hooks: .js ok
import { Button } from '@/components/ui/button';
```

`shared/schema.ts` is the only cross-boundary file — imported as `@shared/schema` from both client and server.

### Blog Post JSON Format

Posts live at `server/data/posts/YYYY/MM/DD/*.json`. Schema:

```jsonc
{
  "slug": "2025-03-28-00-00-00-base-slug",   // date-prefixed base slug
  "date": "2025-03-28",
  "image": "/images/optional-cover.jpg",      // optional
  "editorId": 3,                              // 1–24, references editors.json
  "categories": ["Deep Learning", "NLP"],
  "keywords": ["transformer", "fine-tuning"],
  "translations": {
    "en": {
      "slug": "2025-03-28-00-00-00-english-slug",
      "title": "English Title",
      "excerpt": "Short description (≤160 chars for SEO)",
      "content": [
        { "heading": "Section Heading", "body": "Paragraph text..." }
      ]
    },
    "es": {
      "slug": "2025-03-28-00-00-00-slug-en-espanol",
      "title": "Título en Español",
      "excerpt": "Descripción corta",
      "content": [
        { "heading": "Encabezado", "body": "Texto del párrafo..." }
      ]
    }
  },
  "sources": [
    { "title": "Source Title", "url": "https://...", "source": "Publisher Name" }
  ]
}
```

The `Detail_API` (`GET /api/blog/:slug`) reads directly from JSON files. The listing API (`GET /api/blog`) reads from the `blog_posts_index` SQLite table.

### Blog Editors

24 AI journalist personas defined in `server/data/editors.json` under key `editors`. Each has: `id`, `name`, `specialty`, `systemPrompt`, `profile`, `signature`, `colorPalette`, `min/max_temperature`, `min/max_top_p`.

| IDs | Specialties |
|-----|------------|
| 1–5 | Smart Cities, Robotics, Deep Learning, Computer Vision, NLP |
| 6–10 | Big Data, Quantum Computing, Edge Computing, Streaming Media, Autonomous Vehicles |
| 11–15 | AI Ethics/Diversity, Quantum AI, Neuroscience, Infrastructure/Cloud, AI Governance |
| 16–20 | Healthcare AI, Music AI, Cybersecurity, AR/VR, Animation AI |
| 21–24 | AI Art, Telecommunications, Climate/AI, Blockchain/AI |

Avatar images: `public/avatars/{id}.png` and `public/avatars/{id}-headshot.png`.

### API Routes Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/contact` | No | Contact form → email |
| POST | `/api/send-application` | No | Job application → email |
| GET | `/api/blog` | No | Paginated blog listing (SQL index) |
| GET | `/api/blog/:slug` | No | Blog post detail (JSON file) |
| GET | `/api/blog/search?q=` | No | FTS5 full-text search |
| GET | `/api/editors` | No | Editor list |
| GET | `/api/generate-posts?date=YYYY-MM-DD` | No | Manual post generation trigger |
| GET | `/api/test` | No | Health check |
| GET | `/sitemap.xml` | No | Sitemap index |
| GET | `/sitemaps/:filename` | No | Monthly blog sitemaps |
| GET | `/api/public/slides/:reportId/:position` | No | Carousel slide image (for Meta API) |
| POST | `/api/quiz-lead` | No | Submit quiz: GPT result message, store lead, send verification email |
| GET | `/api/quiz-lead/status?leadId=` | No | Polled while waiting: verified / expired |
| GET | `/api/quiz-lead/verify?token=` | No | Email verification link (HTML page) |
| POST | `/api/quiz-lead/resend` | No | Resend verification email |
| GET | `/api/quiz-lead/pdf?leadId=` | No | PDF report (only once verified) |
| POST | `/api/chat/session` | No | Create chat session (sets cookie) |
| GET | `/api/chat/history` | Cookie | Restore conversation |
| POST | `/api/chat/message` | Cookie | Send message (SSE stream) |
| POST | `/api/chat/close` | Cookie | End session |
| GET | `/api/admin/status` | No | Check auth/setup state |
| POST | `/api/admin/setup` | No | First-time admin setup |
| POST | `/api/admin/login` | No | Admin login |
| POST | `/api/admin/logout` | Yes | Admin logout |
| GET/PUT | `/api/admin/settings` | Yes | Get/set all settings |
| GET | `/api/admin/dominical` | Yes | List Dominical reports |
| GET/PUT | `/api/admin/dominical/:id` | Yes | Report detail/update |
| POST | `/api/admin/dominical/generate` | Yes | Manual Dominical generation |
| POST | `/api/admin/dominical/:id/publish` | Yes | Publish (legacy, LinkedIn) |
| POST | `/api/admin/dominical/:id/publish/:platform` | Yes | Publish to specific platform |
| POST | `/api/admin/dominical/:id/publish-all` | Yes | Publish to all platforms |
| GET | `/api/admin/dominical/:id/publish-status` | Yes | Per-platform status |
| POST | `/api/admin/dominical/:id/generate-carousel` | Yes | Generate carousel images |
| GET | `/api/admin/dominical/:id/carousel` | Yes | Carousel metadata |
| GET | `/api/admin/dominical/:id/carousel/pdf` | Yes | Download PDF |
| POST | `/api/admin/dominical/:id/generate-video` | Yes | Generate narrated Dominical video |
| GET | `/api/admin/quiz-leads` | Yes | Quiz lead list |
| GET | `/api/admin/conversations` | Yes | Chat conversation list |
| GET | `/api/admin/conversations/:id` | Yes | Conversation detail |
| GET | `/api/admin/conversations/analytics` | Yes | Chat analytics |
| GET | `/api/admin/analytics/overview` | Yes | GA4 overview KPIs |
| GET | `/api/admin/analytics/traffic` | Yes | GA4 traffic data |
| GET | `/api/admin/analytics/behavior` | Yes | GA4 behavior data |
| GET | `/api/admin/analytics/social/instagram` | Yes | Instagram insights |
| GET | `/api/admin/analytics/social/facebook` | Yes | Facebook insights |
| POST | `/api/admin/analytics/refresh` | Yes | Clear analytics cache |
| POST | `/api/admin/reindex-posts` | Yes | Force blog index rebuild |

### Authentication

Admin routes use JWT in an httpOnly cookie named `admin_token` (7-day expiry). The `requireAuth` middleware in `server/auth.ts` reads this cookie, verifies the JWT, and attaches `req.user`. Always use `requireAuth` for new admin endpoints.

Chat routes use a separate httpOnly cookie named `chat_session` (1-hour TTL, refreshed on each message).

### Settings Table Keys

All config stored as `key/value` in the `settings` SQLite table. Key names used in code:

```
openai_api_key, linkedin_client_id, linkedin_client_secret,
linkedin_access_token, linkedin_refresh_token, linkedin_token_expires_at,
linkedin_person_id, image_provider, dominical_notification_email,
dominical_auto_publish, dominical_top_n, admin_jwt_secret,
meta_app_id, meta_app_secret, instagram_business_account_id,
instagram_access_token, facebook_page_id, facebook_page_access_token,
meta_token_expires_at
```

### Cron Schedule (America/Lima)

| Schedule | Job | Guard |
|----------|-----|-------|
| `0 * * * *` (hourly) | Generate blog posts + update FTS + listing index | Skipped in dev unless explicitly triggered |
| `0 12 * * 6` (Sat 12pm) | Generate Dominical IA report | Skipped in dev |
| `0 12 * * 0` (Sun 12pm) | Auto-publish Dominical to all platforms | Skipped in dev |
| `*/5 * * * *` (every 5min) | Close timed-out chat sessions | Always runs |

### Testing Environment

`vitest.config.ts` sets `environment: 'jsdom'` globally but overrides to `node` for all `server/**/*.test.ts` files. This means:
- Frontend component tests use jsdom (JSDOM + `@testing-library/react`)
- Server tests use Node (no DOM, real `better-sqlite3`)
- Property tests use `fast-check` with ≥100 iterations
- Integration tests use `supertest` against the Express app

> **Known local gotcha:** if SQLite-backed tests fail with `NODE_MODULE_VERSION ... was compiled against a different Node.js version`, the `better-sqlite3` native binary was built for another Node than the one running vitest. Run `npm rebuild better-sqlite3` with the same Node version you use for `npm test`. This accounts for most failures seen locally (Sep 2026) and is not a code bug.

### Build & Data Persistence

`dist/` is fully regenerated on each build (Vite + esbuild). The postbuild step copies `server/data/` into `dist/data/` **without overwriting** existing files — so the SQLite database, blog posts, carousel images, and sitemaps persist across deployments. Do NOT store anything that needs to survive builds inside `dist/` directly.

---

## License

MIT (c) 2025 Robles.AI

---

## Contact

- Website: https://robles.ai
- Email: info@robles.ai
- Phone/WhatsApp: +1 (408) 590-0153
- Location: Cupertino, CA
