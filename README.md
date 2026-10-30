# Robles.AI — Website (Vite + React + Express)

Public website and internal platform of **Robles.AI**, an AI consulting and implementation studio (Cupertino, CA · US & Latin America). Built with **Vite + React 19 (TypeScript)** on the frontend and **Express 4** as the development/production server, with **SQLite** for persistence.

The platform plays three roles:

1. **Corporate site and paid-traffic landing** — services, case studies, team, an AI demos lab, a diagnostic quiz with verified leads, and the `/get-started` landing for Google/Meta Ads.
2. **AI-generated editorial outlet** — a bilingual blog written by 24 AI editor personas, with FTS5 search.
3. **Internal admin panel** — El Dominical IA newsletter, multi-platform publishing, narrated video, chatbot inbox, quiz leads, analytics (GA4, Meta, Google Ads, Meta Ads) and the demo-backends portal.

> **Documentation map.** This README is the human-oriented technical reference. [`AGENTS.md`](AGENTS.md) (Spanish) is the full context for coding agents and contributors: business, conventions, history and gotchas. These are the only two Markdown files at the repository root; everything else lives in [`docs/`](#documentation-docs) or `.kiro/specs/`.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Repository layout](#repository-layout)
4. [Requirements and scripts](#requirements-and-scripts)
5. [Local development](#local-development)
6. [Environment variables](#environment-variables)
7. [Admin settings (database)](#admin-settings-database)
8. [Database (SQLite)](#database-sqlite)
9. [Architecture](#architecture)
10. [Pages and routes](#pages-and-routes)
11. [API reference](#api-reference)
12. [Landing page `/get-started`](#landing-page-get-started)
13. [Conversion tracking](#conversion-tracking)
14. [Analytics dashboard](#analytics-dashboard-adminanalytics)
15. [Demos lab](#demos-lab)
16. [Robly chatbot](#robly-chatbot)
17. [El Dominical IA](#el-dominical-ia)
18. [Multi-platform publishing](#multi-platform-publishing)
19. [Blog](#blog)
20. [SEO](#seo)
21. [Backends portal](#backends-portal-adminbackends)
22. [Case studies](#case-studies)
23. [Internationalization](#internationalization)
24. [Testing](#testing)
25. [Deployment](#deployment)
26. [Conventions](#conventions)
27. [Documentation (`docs/`)](#documentation-docs)
28. [License and contact](#license-and-contact)

---

## Features

- **SPA** with Vite + React 19 and **wouter** routing; Express serves static assets and integrates Vite middleware in development.
- **Readable first response**: `server/seo/publicContent.ts` renders a plain-HTML version of every public page from the same i18n files (progressive enhancement, replaced by React on startup), plus server-side meta tags, hreflang, canonical and JSON-LD.
- **i18n** (en/es) with i18next; `?lang=es` selects Spanish on any public route.
- **Paid-traffic landing** (`/get-started`): outcome-led hero, three fixed-fee AI Assessment packages (from USD 1,500 / 2,500 / 3,000 for up to 2 / 4 / 6 processes, each with a bonus) or a direct project, live demos, industries, commitments, integrations, security & compliance, founder and US/Peru offices, FAQ, calendar booking link, contact form, sticky mobile CTA, and `?s=chatbots|rag|agents|docs` variants per ad group.
- **Contact form** with a *"What do you want to improve?"* selector, optional message, reply-time/privacy notes; delivered by email (nodemailer) and tracked as `generate_lead` only after the server accepts it.
- **AI Diagnostic Quiz** (`/diagnostico-ia`): scored quiz → GPT result message → email verification → PDF report; leads stored in SQLite and listed in `/admin/quiz-leads`.
- **AI Demos Lab** (`/demos`): 10 live demos (7 backed by Cloud Run APIs, 3 fully in the browser) and 3 coming soon.
- **Robly chatbot widget**: GPT-4o-mini with SSE streaming, page-aware context, contact capture, transcripts and an admin inbox.
- **Blog**: 24 AI editors, bilingual posts as JSON files, hourly generation, SQLite listing index and FTS5 search, accessible in-page modal viewer.
- **El Dominical IA**: weekly newsletter — GPT-4o scoring, LinkedIn/Instagram drafts, 1080×1080 carousels (gpt-image-1 + sharp + pdfkit), narrated video (ffmpeg), auto-publishing to LinkedIn, Instagram and Facebook.
- **Analytics dashboard** (`/admin/analytics`): Overview, Traffic, Behavior, Social and **Ads** (Google Ads via GA4 + Meta Ads via Marketing API), cached in SQLite.
- **Backends portal** (`/admin/backends`): DNS (Hostinger), Cloud Run status and activity (Cloud Monitoring) for the demo APIs, read-only towards GCP.
- **Analytics on the public site**: GTM (preferred) or direct GA4 + Meta Pixel, configured from `/admin/settings` and active only in production.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS, shadcn/ui (Radix), framer-motion, recharts, wouter, TanStack Query |
| Backend | Express 4, Node.js ≥ 20 (production runs v22.14.0), `tsx watch` in dev, esbuild bundle in prod |
| Database | SQLite via `better-sqlite3` (single file `server/data/dominical.db`) |
| AI | OpenAI — GPT-4o, GPT-4o-mini, gpt-image-1; optional image providers (Replicate, Stability) |
| Social / Ads APIs | LinkedIn UGC Posts API + OAuth 2.0, Meta Graph API (Instagram, Facebook, Marketing API) |
| Analytics | Google Analytics Data API (GA4), Meta Graph API insights, GTM / GA4 / Meta Pixel on the site |
| Media | sharp, pdfkit, fluent-ffmpeg (+ `@ffmpeg-installer`, `@ffprobe-installer`) |
| Search | SQLite FTS5 with BM25 ranking |
| In-browser AI | TensorFlow.js + COCO-SSD, `@vladmandic/face-api`, `pdfjs-dist` |
| Auth | JWT in httpOnly cookie + bcrypt; OTP (`otpauth`) page |
| Testing | vitest, fast-check (property-based), supertest, @testing-library/react |
| Deployment | VPS + PM2, GitHub Actions → SSH → `pull.sh` |

---

## Repository layout

```
AGENTS.md / README.md     # The only root-level Markdown files
docs/                     # Plans, audits, briefs and release notes (see "Documentation")
.kiro/specs/              # Feature specs (requirements / design / tasks) — design history
.github/workflows/        # deploy.yml (push to main → SSH → pull.sh)
pull.sh                   # Selective build + PM2 restart on the VPS
push.sh                   # Local helper (git add . + commit + push) — gitignored
__test_pointing_video.ts  # Ad-hoc script: renders a Dominical video with the pointing pose

src/
  App.tsx, Root.tsx, main.tsx, entry-server.tsx
  components/
    Header, Hero, ClientLogos, Features, Solutions, DemosCatalog, CaseStudies, Courses,
    Testimonials, Team, Contact (ContactForm), Footer, BlogArticle, BlogModal,
    BlogSearch, VideoModal, ParticleBackground
    chat/               # ChatbotWidget, ChatPanel, MessageList, MessageInput
    demo/               # ApiCallLog, BusinessCase, SavingsCalculator, business.ts, DemoKit,
                        # DemoNav, DemoTutorial, DemoVideoPreview, DemoVisualPreview, EmotionPreview,
                        # InfoTip, JsonHighlight, StepCard
    quiz/               # Intro, QuestionCard, ProgressBar, Analyzing, ResultPreview,
                        # LeadForm, WaitingVerification, ResultFull, ScoreRing
    admin/              # CarouselPreview, SlideEditor, RegenerateModal,
                        # PlatformPublishStatus, VideoGenerator
    admin/analytics/    # OverviewTab, TrafficTab, BehaviorTab, SocialTab, AdsTab,
                        # KpiCard, DateRangeSelector
    state/              # LoadingState, EmptyState, ErrorState
    ui/                 # shadcn/ui primitives
  pages/                # Home, Landing, Quiz, Demos, Careers, Apply, BlogList, BlogPost,
                        # BlogRoute, OTP, not-found, Try* demo pages
    admin/              # AdminLayout, AdminDashboard, AdminLogin, AdminSetup, AdminSettings,
                        # AdminDominicalList/Detail, AdminConversationList/Detail,
                        # AdminAnalytics, AdminQuizLeads, AdminBackends
  hooks/                # useChatSession, useSearch, useSEO, useScrollRestoration,
                        # useReducedMotion, useBlogModalRouting, useDemoPreviewMotion,
                        # useSpeechInput, useAdminDialog, usePublicDialog, use-toast, use-mobile
  lib/                  # analytics, blogModal, forecast, pageMetadata, publicPost,
                        # queryClient, quizData, utils
  scripts/              # Blog generation, gaps, duplicates, sitemaps, avatars, news/image services
  i18n/locales/{en,es}/translation.json

server/
  index.ts, routes.ts (main router, quiz/blog/editor endpoints, cron jobs), vite.ts,
  publicServing.ts, db.ts, auth.ts
  adminRoutes.ts        # /api/admin/* (mounts chatAdminRoutes)
  chatAdminRoutes.ts    # /api/admin/conversations/*
  analyticsRoutes.ts    # /api/admin/analytics/*
  backendRoutes.ts      # /api/admin/backends/*
  chatRoutes.ts         # /api/chat/*
  contactRoutes.ts      # /api/contact
  publicRoutes.ts       # /api/public/*
  searchRoutes.ts       # /api/blog/search
  seo/                  # metaInjector, slugIndex, metaBuilders, htmlInjector,
                        # publicContent, sitemap, sitemapRoutes
  fts/, listing/        # FTS5 and listing indexers (+ property tests)
  migrations/           # chatTables
  jobs/                 # generateDominical, autoPublishDominical, chatSessionCleanup
  services/
    dominicalScoring, engagementPhrases, imageGeneration, carouselImageGen,
    slideCompositor, carouselGenerator, carouselTypes, pdfExporter, pdfIcons,
    dominicalVideoGen, robotFrames, quizResultMessage, quizVerificationEmail,
    quizLeadPdf, chatEngine, chatContext, chatNotifier, conversationStore,
    ga4Client, googleAdsReport, metaInsights, metaAds, metaGraphApi,
    analyticsCache, settingsSecrets, linkedin
    platforms/          # types, contentFormatter, linkedin/instagram/facebook adapters,
                        # publishingEngine
    backends/           # registry, settingsStore, health
    dns/                # DnsProvider, HostingerDnsProvider
    gcp/                # googleAuth, cloudRunClient, monitoringClient
  data/                 # posts/, editors.json, dominical.db (gitignored), generated media

shared/                 # schema.ts (zod), chatTypes, seoPolicy, seoMetadata, publicContent,
                        # dominicalSelection, disposableEmailDomains
public/                 # images/ (incl. images/clients/), avatars/, robly-avatar/, case-studies/, assets/,
                        # demo-previews/, demo-samples/, videos/, robots.txt, sitemaps
scripts/                # Case-study HTML, demo preview/clip rendering, Firefly kit tooling
study-cases/            # Case study documents (PDF + DOCX, EN + ES)
creative/               # Source material for demo visuals (Firefly prompts and frames)
```

---

## Requirements and scripts

- **Node.js ≥ 20** and **npm**.

| Script | Description |
|--------|-------------|
| `npm run dev` | Express with `tsx watch` + Vite middleware |
| `npm run build` | Vite client build + SSR build of `src/entry-server.tsx` + esbuild server bundle to `dist/` |
| `postbuild` (automatic) | Copies `src`, `shared`, `public` into `dist/` and syncs `server/data/` → `dist/data/` without overwriting databases |
| `npm start` | Production: `NODE_ENV=production node dist/index.js` |
| `npm run check` | TypeScript check (`tsc`) |
| `npm test` | `vitest --run` |
| `npm run fix-sitemap` | Repair missing sitemap entries |
| `npm run cleanup-duplicates` | Remove duplicated blog posts |
| `npm run detect-gaps` / `npm run fill-gaps` | Find / fill missing days of blog posts |

Development server: `http://localhost:5173` (change with `PORT`).

---

## Local development

```bash
npm install
# create .env with the variables below (there is no .env.example)
npm run dev
npx tsx server/fts/migrate.ts   # optional: seed the FTS index
npm run build && npm start      # production build
```

First visit to `/admin` runs the admin setup (creates the admin user). Most integrations (OpenAI, LinkedIn, Meta, GA4, Hostinger, GCP) are configured from `/admin/settings` and `/admin/backends`, not from `.env`.

---

## Environment variables

`.env` at the repository root (not versioned):

```env
# Server
PORT=5173
HOST=0.0.0.0
BASE_URL=https://robles.ai          # absolute URLs in Dominical emails/publishing (default shown)

# Email fallback for local development only. In production, configure these in /admin/settings.
EMAIL_USER=your_gmail_user
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=destination@domain.com

# OpenAI — fallback when openai_api_key is not set in admin settings
OPENAI_API_KEY=sk-xxx

# News (hourly blog generation). Comma-separated keys rotate; NEWS_API_KEY also accepted.
NEWS_API_KEYS=key1,key2

# Admin JWT (if unset, a secret is generated and stored in settings as jwt_secret)
ADMIN_JWT_SECRET=your-secret-here

# Optional dev overrides for demo API endpoints (frontend)
VITE_IDENTITY_API=  VITE_RAG_API=  VITE_LANGCHAIN_API=  VITE_TRANSCRIPTION_API=
VITE_CHATBOT_API=   VITE_DOCEXTRACT_API=  VITE_TTS_API=
```

> Do **not** put `NODE_ENV` in `.env`; the `start` script sets it inline (see [NODE_ENV fix](#node_env-fix-2026-08-29)).
> Only `VITE_*` variables reach the browser. Site analytics IDs (GA4, Meta Pixel, GTM) are **not** env vars: they come from admin settings through `GET /api/public/analytics-config`.

---

## Admin settings (database)

Configuration lives as key/value rows in the `settings` table. Secrets are masked in `GET /api/admin/settings` (`server/services/settingsSecrets.ts`) and masked values are never written back.

The **Email delivery** card configures the Gmail sender, app password and default recipient for contact forms, applications, quiz verification, course requests, chat transcripts and Dominical notifications. In production, email delivery reads these database settings only; `EMAIL_USER`, `EMAIL_PASS` and `EMAIL_TO` are ignored. The app password is returned to the admin UI only as `****` plus its final four characters and is never sent in full to the browser. Outside production, environment variables remain a fallback for local development.

| Area | Keys |
|------|------|
| OpenAI / images | `openai_api_key`, `image_provider` (default `dalle3`), `replicate_api_token`, `stability_api_key` |
| Dominical IA | `dominical_top_n`, `notification_email`, `auto_publish` (on unless `false`/`0`), `auto_publish_time` (default `18:00`), `auto_publish_timezone` (default `America/Lima`) |
| Admin auth | `jwt_secret` (generated when `ADMIN_JWT_SECRET` is unset) |
| LinkedIn | `linkedin_client_id`, `linkedin_client_secret`, `linkedin_access_token`, `linkedin_refresh_token`, `linkedin_token_expires_at`, `linkedin_person_id`, `linkedin_oauth_state` (transient) |
| Meta publishing / insights | `meta_app_id`, `meta_app_secret`, `instagram_business_account_id` (legacy `instagram_user_id`), `instagram_access_token`, `facebook_page_id`, `facebook_page_access_token`, `meta_token_expires_at` |
| Meta Ads (Ads tab) | `meta_ad_account_id`, `meta_ads_access_token` (System User token with `ads_read`) |
| Site tracking | `gtm_container_id`, `ga4_measurement_id`, `meta_pixel_id`, `clarity_project_id` (Microsoft Clarity, loaded by the site with or without GTM) |
| GA4 Data API | `ga4_property_id` (+ service-account JSON stored as `server/data/ga4-service-account.json`) |
| Backends portal | `hostinger_api_key`, `hostinger_domain` (default `robles.ai`), `gcp_sa_key`, `dns_cname_target` (default `ghs.googlehosted.com.`) |

---

## Database (SQLite)

All persistent state lives in `server/data/dominical.db` (gitignored, preserved across builds).

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin authentication (bcrypt) |
| `settings` | Key/value configuration (see above) |
| `dominical_reports` | Weekly Dominical IA reports (text, status, scores) |
| `carousel_slides` | Per-slide data of Dominical carousels |
| `platform_publish_status` | Per-platform publish lifecycle (LinkedIn / Instagram / Facebook) |
| `analytics_cache` | TTL cache for GA4, Meta and Ads responses |
| `chat_conversations` / `chat_messages` / `chat_contacts` | Robly sessions, messages and captured contact data |
| `blog_fts` | FTS5 virtual table for blog search |
| `blog_posts_index` | Listing index for paginated blog queries |
| `quiz_leads` / `quiz_verification_tokens` | Diagnostic quiz leads and email-verification tokens |
| `contact_submissions` | Contact-form submissions (saved before the email is sent) with `attribution`, `ads_click` and `clarity_session` JSON |

Contact submissions carry de-duplicated ad attribution (UTM tags, click IDs, ValueTrack parameters, landing path, external referrer) captured by `src/lib/attribution.ts` and normalised by `shared/attribution.ts`. When a `gclid` is present and the Google Ads API is configured, `/admin/contact-submissions` enriches it from ClickView (campaign, ad group, keyword, ad, device, network and that ad group's search terms for the day).

---

## Architecture

```
┌──────────────────────────── Frontend (React SPA) ────────────────────────────┐
│ Home · Landing · Quiz · Demos + Try* · Blog · Careers · Admin panel           │
│ Robly widget · ContactForm · analytics.ts (GTM / GA4 / Meta Pixel)             │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ fetch / SSE / cookies (admin_token, chat_session)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│ Express                                                                       │
│  routes.ts (quiz, blog, editors, applications, cron) · adminRoutes ·          │
│  analyticsRoutes · backendRoutes · chatRoutes · contactRoutes ·               │
│  publicRoutes · searchRoutes · seo/ (meta injection, public HTML, sitemaps)    │
│ Cron (node-cron): hourly blog · Sat 12:00 Dominical · every 30 min           │
│ auto-publish slot check · every 5 min chat cleanup                           │
└───────┬──────────────────────────────┬───────────────────────────────────────┘
        │                              │
┌───────▼─────────┐   ┌────────────────▼────────────────────────────────────────┐
│ SQLite           │   │ External: OpenAI · LinkedIn · Meta Graph/Marketing API  │
│ dominical.db     │   │ GA4 Data API · NewsAPI · Gmail SMTP · Hostinger DNS ·   │
│ 13 tables        │   │ GCP (Cloud Run Admin, Cloud Monitoring) · demo APIs     │
└──────────────────┘   └─────────────────────────────────────────────────────────┘
```

---

## Pages and routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, client logos, features, solutions, demos catalog, case studies, courses, testimonials, team, contact |
| `/get-started` | Landing | Paid-traffic landing (see below); `?s=` headline variants |
| `/diagnostico-ia` | Quiz | AI-readiness quiz with verified lead + PDF |
| `/demos` | Demos | Demos lab catalog |
| `/try-chatbot` | TryChatbot | Chatbot trained on your website (Cloud Run) |
| `/try-identity` | TryIdentity | Identity verification (Cloud Run) |
| `/try-rag` | TryRAG | Ask your documents (Cloud Run; PDF text extracted in the browser) |
| `/try-transcription` | TryTranscription | Live speech-to-text + diarization + analysis (Cloud Run) |
| `/try-langchain` | TryLangChain | Agent / tools / JSON modes (Cloud Run) |
| `/try-docextract` | TryDocExtract | Documents → structured data (Cloud Run) |
| `/try-tts` | TryTTS | Voice studio + narrator with subtitles (Cloud Run) |
| `/try-forecast` | TryForecast | Demand forecast from a CSV (in the browser) |
| `/try-object-detection` | TryObjectDetection | Object detection (in the browser) |
| `/try-emotion` | TryEmotion | Emotion recognition (in the browser) |
| `/try-medical` | TryMedical | Coming soon page; not in the catalog, nothing is uploaded |
| `/blog`, `/blog/:slug` | BlogRoute → BlogList / BlogPost | Blog listing, modal viewer and post pages |
| `/careers`, `/apply` | Careers, Apply | Job listings and application form |
| `/otp` | OTP | One-time-password page |
| `/admin` | AdminDashboard | Login / first-time setup / dashboard |
| `/admin/settings` | AdminSettings | Integrations, tracking IDs, GA4, Meta, Meta Ads, OpenAI, Dominical |
| `/admin/dominical`, `/admin/dominical/:id` | AdminDominicalList / Detail | Reports, review, carousel, video, publishing |
| `/admin/conversations`, `/admin/conversations/:id` | AdminConversationList / Detail | Robly inbox and transcripts |
| `/admin/quiz-leads` | AdminQuizLeads | Quiz leads |
| `/admin/analytics` | AdminAnalytics | Overview · Traffic · Behavior · Social · Ads |
| `/admin/backends` | AdminBackends | Demo backends portal |
| `/admin/monitoring` | AdminMonitoring | Live read-only PM2 logs from the VPS, with a filter and masked secrets (`server/services/vpsLogs.ts`) |

---

## API reference

Public:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/contact` | Contact form → email (`{ success: true }` only after the mail is accepted); `GET` returns 404 |
| POST | `/api/send-application` | Job application → email |
| POST | `/api/quiz-lead` | Quiz submission: result message, stores lead, sends verification email |
| GET | `/api/quiz-lead/status?leadId=` | Verification polling |
| GET | `/api/quiz-lead/verify?token=` | Email verification link (HTML) |
| POST | `/api/quiz-lead/resend` | Resend verification email |
| GET | `/api/quiz-lead/pdf?leadId=` | PDF report (verified leads only) |
| GET | `/api/blog`, `/api/blog/:slug`, `/api/blog/search?q=` | Listing (SQL index), detail (JSON file), FTS5 search |
| GET | `/api/editors` | Editor personas |
| GET | `/api/generate-posts?date=YYYY-MM-DD` | Manual blog generation trigger |
| GET | `/api/test` | Health check |
| GET | `/api/public/analytics-config` | GTM / GA4 / Meta Pixel IDs for the site |
| GET | `/api/public/site-config` | Public site settings (`bookingUrl`) |
| GET | `/api/public/slides/:reportId/:position(.png)` | Carousel slide image (for Meta) |
| POST | `/api/chat/session` · GET `/api/chat/history` · POST `/api/chat/message` (SSE) · POST `/api/chat/close` | Robly chat (`chat_session` cookie) |
| GET | `/sitemap.xml`, `/sitemaps/:filename` | Sitemap index and monthly blog sitemaps (`/static-pages.xml` for static pages) |

Admin (all under `/api/admin`, `admin_token` cookie required except `status`, `setup`, `login` and the LinkedIn OAuth callback):

| Method | Path | Description |
|--------|------|-------------|
| GET / POST / POST / POST / GET | `/status`, `/setup`, `/login`, `/logout`, `/me` | Auth state and session |
| GET / PUT | `/settings` | Read (masked) / write settings |
| GET / POST / POST | `/settings/meta`, `/settings/meta`, `/settings/meta/validate` | Meta publishing credentials |
| GET / POST | `/settings/ga4-status`, `/settings/ga4-service-account` | GA4 Data API credentials |
| GET | `/linkedin/auth-url`, `/linkedin/callback` | LinkedIn OAuth |
| POST | `/reindex-posts` | Rebuild blog indexes |
| GET / POST | `/dominical`, `/dominical/generate` | List / generate reports |
| GET / PUT | `/dominical/:id` | Report detail / update |
| POST | `/dominical/:id/{regenerate-post, regenerate-instagram, regenerate-linkedin, cancel, generate-image}` | Report actions |
| POST / GET | `/dominical/:id/generate-carousel`, `/dominical/:id/carousel`, `/dominical/:id/carousel/pdf` | Carousel generation, metadata, PDF |
| GET / POST / PUT | `/dominical/:id/carousel/slides/:position/{image, generation-info, regenerate, text}` | Per-slide operations |
| POST / GET | `/dominical/:id/generate-video`, `/dominical/:id/video`, `/dominical/:id/video/file` | Narrated video |
| POST / GET | `/dominical/:id/publish` (legacy LinkedIn), `/publish/:platform`, `/publish-all`, `/publish/:platform/reset`, `/publish-status` | Publishing |
| GET | `/quiz-leads` | Quiz leads |
| GET | `/conversations`, `/conversations/analytics`, `/conversations/:id` | Robly inbox |
| GET | `/analytics/{overview, realtime, traffic, behavior, social/instagram, social/facebook, ads/google, ads/meta}` | Analytics (cached) |
| POST | `/analytics/refresh` | Clear analytics cache |
| GET / PUT | `/backends/connections` | Hostinger / GCP credentials (write-only) |
| GET | `/backends`, `/backends/:id/cloudrun` | Backend list with DNS + activity; Cloud Run status |
| POST | `/backends/:id/dns`, `/backends/:id/ping` | Publish CNAME; opt-in live health ping (wakes the service) |
| GET | `/monitoring/logs?stream=error\|out&lines=&q=` | Latest PM2 log lines (fixed server-side paths, secrets masked) |
| POST | `/test-ig-linebreaks` | Internal Instagram formatting test |

Auth: admin JWT in httpOnly cookie `admin_token` (7 days); Robly uses httpOnly cookie `chat_session` (1 hour, refreshed per message).

---

## Landing page `/get-started`

Source: `src/pages/Landing.tsx`; copy under `landing.v2.*` (plus `landing.cta.*`, `landing.whatsapp.*`, `landing.diagnostico.*`, `landing.howWeWork.quote`) in both locales. Sections, top to bottom:

1. **Hero** — outcome headline, *Book your AI Diagnosis* (`#contacto`), WhatsApp button, links to live demos (`#demos`), *request a proposal* (`#diagnostico`) the 2-minute test and, when `booking_url` is set, *Book a 30-minute call*; trust row (incl. US/Peru offices); side card with *What you get in 2 weeks*, *From USD 1,500* and a **quick form** (`#info-form`: compact `ContactForm` with `sendInfo`; name, email, goal) that also emails the visitor the three packages, the booking link and WhatsApp (`server/services/contactInfoEmail.ts`; at most 1 per address per day and 5 per IP per hour).
2. **Client logos** (`#clients`) — `ClientLogos` (see below).
3. **What we build — try it yourself** (`#demos`) — chatbots, knowledge assistants, agents and document AI, each linked to its live demo (`demosCatalog.items`).
4. **Where it fits in your business** — industry starting points, explicitly labelled as examples, not client results.
5. **Where AI usually pays back first** — three patterns, then a CTA.
6. **How we work** — four steps.
7. **Pricing** (`#diagnostico`) — three fixed-fee AI Assessment packages (`landing.v2.packages.items`): Essential *from USD 1,500* (up to 2 processes, bonus: 30 days of roadmap Q&A), Advanced *USD 2,500* (up to 4, highlighted, bonus: working demo of the top use case), Complete *USD 3,000* (up to 6, bonus: 2-hour executive workshop); shared deliverables; then the direct-project option (`landing.v2.paths.project`).
8. **What you can count on** — roadmap/code/data ownership, no training on your data, human review.
9. **Integrations** (`landing.v2.integrations.groups`) — ERP, CRM, channels, documents, data/BI, cloud & models.
10. **Security and compliance** (`landing.v2.security.items`, 9 items) — NDA, encryption in transit/at rest, SSO and roles, models in the client's cloud, audit log, retention/deletion, Peru Ley 29733 / US privacy, AI safeguards, vendor onboarding.
11. **Who you'll work with** — founder (`team.members[0]`) + **local presence**: offices from `PUBLIC_OFFICES` (Cupertino, CA and Lima, Peru; labels in `landing.v2.presence`).
12. **FAQ** — includes implementation cost and *why not build it ourselves*.
13. **Contact** (`#contacto`) — `ContactForm` (green submit, no newsletter, optional `defaultGoal`) + calendar booking / email / phone (`tel:`) / WhatsApp.
14. **Phone bottom dock** (`.landing-dock`, below `md`) — opaque bar so nothing covers the text: WhatsApp, the CTA (appears after the hero, hides when the form is visible) and a smaller Robly, whose greeting balloon is not shown on phones here. `index.css` keeps its height free on `body`.
15. **Floating WhatsApp bubble** (`md` and up) — always on screen at the bottom left of the page (Robly holds the right), gently bobbing (`contact_click`, `link_location=landing_floating`).

**30-second spot** (`src/components/BrandSpot.tsx`, brief in [`docs/REMOTION_SPOT_30S.md`](docs/REMOTION_SPOT_30S.md) §13): a band right after the `/get-started` hero (`landing.v2.spot.*` + diagnosis CTA + `#demos` link) and inside the home demos section, between the heading and the cards. Muted loop, loaded only near the viewport and paused off screen; with reduced motion it shows the poster with a play button; *Watch with sound* restarts it once with audio. Files: `public/videos/robles-ai-spot-{es,en}.{webm,mp4}` + `robles-ai-spot-poster-{es,en}.jpg`, registered per language in `SPOTS` (Spanish and English); a language without a video hides the section. Uncompressed 16:9 masters (`videos-creados/`) are gitignored. Tracked as `spot_sound_on` / `spot_complete` (`demo_id: brand_spot`, `placement`).

Every link that leaves `/get-started` (demos, quiz, header, footer, Robly, external) opens in a new tab; same-page anchors, language switches, `mailto:`, `tel:` and the header logo (marked `data-same-tab`, goes home in the same tab) do not.

**Client logos**: `src/components/ClientLogos.tsx` renders `CLIENT_LOGOS` (`shared/publicContent.ts`, files in `public/images/clients/`) as two slow rows drifting in opposite directions (`.logo-marquee` in `index.css`; pauses on hover, static with `prefers-reduced-motion`), in full color on white tiles (`large: true` for logos with built-in padding, e.g. Mibanco); copy `clients.title` / `clients.note`. Used on the landing (dark) and on the home page right after the hero (light). They are enterprise software clients of the team since 2011 (not AI-project clients); add new logos by dropping the file and appending an entry.

**Calendar booking**: Admin → Settings → *Calendar booking* stores `booking_url`; `GET /api/public/site-config` returns it (http/https only; falls back to `PUBLIC_CONTACT.bookingUrl`, the Google Calendar page https://calendar.app.google/oR9yeJveKiKpBqF49) and `useBookingUrl()` (`src/lib/siteConfig.ts`) shows the *Book a call* links (hero, pricing, contact), tracked as `contact_click` with `contact_method=calendar`.

`?s=chatbots|rag|agents|docs` swaps the hero copy, side card, CTA, contact title/submit, pre-selected form goal and pre-filled WhatsApp message (`landing.v2.variants.*`). Ad URLs: `/get-started` (EN) or `/get-started?lang=es` (ES), plus `s=` to match the ad group. The crawler HTML for this route is built in `server/seo/publicContent.ts` from the same keys.

---

## Conversion tracking

`src/lib/analytics.ts` loads trackers only in production and never on `/admin`. When `gtm_container_id` is set, **GTM is the only tracker** (events go to `dataLayer`); otherwise GA4 and Meta Pixel are loaded directly. Conversions are queued until trackers initialise and contain no visitor data.

| Function | GA4 event | Meta | Fired when |
|----------|-----------|------|------------|
| `trackContactLead()` | `generate_lead` (`form_id: contact`, `method: contact_form`) | `Lead` | `POST /api/contact` returns `success: true` |
| `trackQuizLead()` | `generate_lead` (`form_id: quiz`, `method: quiz`) | `Lead` | `POST /api/quiz-lead` returns a `leadId` |
| `trackContactClick(channel, location)` | `contact_click` (`contact_method`, `link_location`) | `Contact` | WhatsApp / email / phone / calendar link clicks (landing, home contact, Robly) |
| `trackDemoEvent(event, demoId)` | `demo_start`, `demo_complete`, `roi_calculated`, `demo_cta_click` | custom | Demo funnel |

**Microsoft Clarity** (session recordings and heatmaps): set `clarity_project_id` in Admin → Settings → Analytics & Tracking. The site loads it itself (production only, never on `/admin`), tags sessions with `traffic_source`, `campaign`, `keyword`, `landing_variant` and, once a lead is accepted, `lead_id` (`contact-<id>` / `quiz-<id>`). Contact submissions store the Clarity user/session IDs so `/admin/contact-submissions` links to the recording. Contact and quiz forms are masked (`data-clarity-mask`).

Google Ads (account *Robles.AI*, USD, Pacific time) imports `generate_lead` from GA4 property `492769320` as the primary *Submit lead form* conversion; `contact_click` is meant to be a secondary conversion. Details and external setup: [`docs/CONTACT_CONVERSIONS.md`](docs/CONTACT_CONVERSIONS.md).

---

## Analytics dashboard (`/admin/analytics`)

| Tab | Source | Content |
|-----|--------|---------|
| Overview | GA4 Data API | Users, sessions, page views, bounce rate, avg. duration vs previous period, daily trend, real-time users |
| Traffic | GA4 | Top pages, channel groups, countries, devices |
| Behavior | GA4 | Landing pages, new vs returning |
| Social | Meta Graph API | Instagram and Facebook page insights and recent posts |
| Ads | GA4 (`googleAdsReport.ts`) + Meta Marketing API (`metaAds.ts`) | Google Ads spend, clicks, impressions, CPC, key events per campaign and per day (requires the Ads account linked to GA4); paid vs organic channels; Meta Ads spend, clicks, leads per campaign and per day |

Caching (`analytics_cache`): real-time 30 s, ranges ending today 5 min, historical ranges 1 h, Meta 30 min. *Refresh* clears the cache. GA4 needs `ga4_property_id` and the service-account JSON (uploaded in settings); Meta Ads needs `meta_ad_account_id` + `meta_ads_access_token`.

---

## Demos lab

Catalog data: `demosCatalog.items` in both translation files (`id`, `href`, `status`, `title`, `description`, `benefit`, …), rendered by `DemosCatalog.tsx` on the home page and `/demos`. Robly knows the catalog through `server/services/chatContext.ts` — keep both in sync. Business framing (`BusinessCase`, `SavingsCalculator`, `business.ts`) is documented in [`docs/DEMOS_PLAN.md`](docs/DEMOS_PLAN.md).

| Catalog id | Route | Runs on | Status |
|-----------|-------|---------|--------|
| `sitechatbot` | `/try-chatbot` | `chatbot-api.robles.ai` (repo `robles.ai-chatbot-api`): crawl → Pinecone (24 h namespace) → gpt-4o-mini | live |
| `identity` | `/try-identity` | `identity-api.robles.ai` (repo `robles.ai-identity-api`, service `identity-server`) | live |
| `rag` | `/try-rag` | `rag-api.robles.ai` (repo `robles.ai-rag-api`) | live |
| `speech` | `/try-transcription` | `transcription-api.robles.ai` (repo `robles.ai-transcription-api`): WebSocket → Deepgram Nova-3, `/analyze` → OpenAI | live |
| `langchain` | `/try-langchain` | `langchain-api.robles.ai` (repo `robles.ai-langchain-api`) | live |
| `docextract` | `/try-docextract` | `docextract-api.robles.ai` (repo `robles.ai-docextract-api`) | live |
| `tts` | `/try-tts` | `tts-api.robles.ai` (repo `robles.ai-tts-api`): gpt-4o-mini-tts + ffmpeg | live |
| `forecast` | `/try-forecast` | Browser (`src/lib/forecast.ts`) | live |
| `objectdetection` | `/try-object-detection` | Browser (TensorFlow.js COCO-SSD) | live |
| `emotion` | `/try-emotion` | Browser (`@vladmandic/face-api`) | live |
| `voiceagent`, `anomaly`, `imagegen` | — | — | soon |

- **Cold starts**: Cloud Run APIs scale to zero; each page warms its API on mount and shows a status banner.
- **Transcription audio**: the API forwards raw PCM `linear16` 16 kHz mono to Deepgram, so `TryTranscription` captures PCM with an `AudioWorklet` (ScriptProcessor fallback).
- **Demo API conventions** (sibling repos): one GCP project per API, scale to zero with request-based billing, Artifact Registry `<service>-api-repo` pruned to 3 versions, secrets in Secret Manager rotated with `rotate_secret.sh`, push to `main` deploys via GitHub Actions.
- Preview videos and visuals: [`docs/DEMO_VIDEO_RELEASE.md`](docs/DEMO_VIDEO_RELEASE.md), [`docs/DEMO_VISUALS.md`](docs/DEMO_VISUALS.md), [`docs/FIREFLY_CLIPS.md`](docs/FIREFLY_CLIPS.md).
- **Tutorial videos** (`DemoTutorial.tsx`): a secondary *Watch how it works (45 s)* button next to the "how it works" heading opens a modal `<video>` (never autoplays on the page) and scrolls to the demo on close. Files live in `public/videos/tutorials/<route>-tutorial-<lang>.mp4` (H.264, `+faststart`) plus a `-poster-<lang>.jpg`, registered per demo and language in `TUTORIALS`; a language without a video hides the button. Tracked as `tutorial_play` / `tutorial_complete`. `variant="featured"` renders it as a large poster card with a play button (used on `/try-chatbot` right after the hero and on `/try-transcription` before the workspace, in addition to the button). Currently: `/try-object-detection` in English and Spanish, `/try-emotion` in Spanish (56 s) and English (59 s), `/try-chatbot` in Spanish (59 s) and English (58 s), and `/try-transcription` in Spanish (60 s) and English (57 s). Briefs in `docs/demo-tutorials/`.

---

## Robly chatbot

`src/components/chat/ChatbotWidget.tsx` (GPT-4o-mini, `server/services/chatEngine.ts`):

- Shown on all public pages (hidden on `/admin/*` and in print). Entrance: bubble on mount, typing dots at 3 s, greeting at 5 s (auto-hidden after 8 s on phones); the open/closed state persists across reloads. Animated SVG moods in `public/robly-avatar/`.
- SSE streaming, page-aware context (`chatContext.ts`: blog posts, home, demos with business angle), natural contact capture, tool calls.
- Sessions stored in SQLite; transcript email to `EMAIL_TO` on close; idle sessions closed every 5 minutes.
- Admin inbox at `/admin/conversations`; WhatsApp buttons (`https://wa.me/14085900153`) tracked as `contact_click`.

---

## El Dominical IA

- **Saturday 12:00 (America/Lima)** — `generateDominical`: reads the last 7 days of posts, scores them with GPT-4o (novelty, people impact, economic impact, narrative potential), keeps the top N (`dominical_top_n`, default 5), drafts LinkedIn and Instagram texts, stores the report as `pending_review`, emails `notification_email`, then generates the carousel (`natural` palette, `cinematic-scene` style).
- **Review** (`/admin/dominical/:id`): edit texts, regenerate posts, 1080×1080 carousel (cover + articles + CTA; gpt-image-1 backgrounds, SVG overlay via sharp, per-slide regenerate/edit, PDF via pdfkit), narrated video with Robly poses (`dominicalVideoGen.ts`, `robotFrames.ts`, `VideoGenerator.tsx`), publish status per platform, manual publish or cancel.
- **Auto-publish** — a cron runs every 30 minutes and publishes only on **Sunday** at `auto_publish_time` (default 18:00) in `auto_publish_timezone` (default America/Lima), unless `auto_publish` is `false`/`0`. Platforms with valid credentials and `not_published` status are published in sequence (5 s apart, failures isolated) and a summary email is sent.

---

## Multi-platform publishing

Adapters in `server/services/platforms/` behind `publishingEngine.ts`:

| Platform | API | Format |
|----------|-----|--------|
| LinkedIn | UGC Posts API (OAuth 2.0 + refresh) | PDF carousel (≥ 2 slides) or text + image |
| Instagram | Meta Graph API | Carousel (PNG → JPEG) |
| Facebook | Meta Graph API | Multi-photo post |

`platform_publish_status`: `not_published → publishing → published | failed`. Meta fetches slide images from `/api/public/slides/...`. Graph API version is pinned in `server/services/metaGraphApi.ts`.

---

## Blog

- Posts: `server/data/posts/YYYY/MM/DD/*.json` (`slug`, `date`, `image?`, `editorId`, `categories`, `keywords`, `translations.en/es` with `slug`, `title`, `excerpt`, `content[{heading, body}]`, `sources`).
- **24 editor personas** in `server/data/editors.json` (ids 1–24; specialty, system prompt, profile, signature, palette, temperature/top_p ranges); avatars in `public/avatars/`.
- Hourly cron generates posts (NewsAPI topics) and updates the FTS5 and listing indexes; `detect-gaps`, `fill-gaps`, `cleanup-duplicates` scripts.
- `/blog` opens posts in an accessible modal (`BlogModal`, `useBlogModalRouting`, `lib/blogModal.ts`) with History-API deep links; a direct load of `/blog/:slug` renders the full `BlogPost` page.

---

## SEO

- `server/seo/metaInjector.ts`: title, description, Open Graph, Twitter Card, canonical, hreflang (en/es/x-default) and JSON-LD for blog posts and static pages, in dev and production.
- `server/seo/publicContent.ts`: readable HTML body for each public route (home, landing, quiz, demos, careers, try pages, blog) from the same locale files.
- `SlugIndex` maps EN and ES slugs to files; sitemaps with `xhtml:link` alternates (`/sitemap.xml`, `/static-pages.xml`, monthly `/sitemaps/*`).
- Audits and plan: [`docs/SEO_AUDIT.md`](docs/SEO_AUDIT.md), [`docs/SEO_IMPLEMENTATION_PLAN.md`](docs/SEO_IMPLEMENTATION_PLAN.md).

---

## Backends portal (`/admin/backends`)

Connects, monitors and publishes DNS for the 7 demo APIs registered in `server/services/backends/registry.ts` (`chatbot`, `identity`, `rag`, `langchain`, `transcription`, `docextract`, `tts`). Spec: `.kiro/specs/admin-backend-management/`.

- Credentials (write-only): Hostinger API key and the GCP service-account JSON (`backend-viewer@robles-ai-admin`, roles `run.viewer`, `monitoring.viewer`, `serviceusage.serviceUsageConsumer` on each backend project).
- Listing never wakes a service: activity comes from Cloud Monitoring (billed to the backend project via `x-goog-user-project`); only the explicit *Test* button pings `/health`.
- DNS: `POST /:id/dns` upserts `<sub>-api CNAME ghs.googlehosted.com.` through Hostinger; names come from the server registry, never from the request body. `DnsProvider` allows a future Cloud DNS provider.

---

## Case studies

Four bilingual cases in `public/case-studies/content.json` and `caseStudies.items` (Smart City, Healthcare, Finance, Telco). They are **illustrative**: metrics are labelled "up to"/"about" and the UI states they show potential results of this kind of solution, not results from a specific client. Source documents (PDF/DOCX, EN/ES) are in `study-cases/`.

---

## Internationalization

- `src/i18n/locales/{en,es}/translation.json`, initialised before render; keep key parity between locales.
- Main namespaces: `nav`, `hero`, `features`, `solutions`, `demosCatalog`, `demoBusiness`, `try-*`, `caseStudies`, `clients`, `courses`, `testimonials`, `team`, `contact`, `landing` (`landing.v2` for the current landing), `quiz`, `quizPromo`, `chatbotWidget`, `chatInput`, `whatsappWidget`, `apiLog`, `blogModal`, `blogSearch`, `state`, `videoModal`, `seo`, `footer`, `careers`.
- The admin panel UI is English-only (not translated).

---

## Testing

```bash
npm test
```

- vitest with `jsdom` by default and `node` for `server/**`; fast-check property tests; supertest integration tests; tests are co-located with their modules (`__tests__/`, `*.test.ts(x)`).
- Useful suites: `server/__tests__/chatRoutes.integration.test.ts`, `server/__tests__/contactRoutes.test.ts`, `server/seo/__tests__/`, `server/fts/*.property.test.ts`, `server/listing/*.test.ts`, `server/services/__tests__/{googleAdsReport,metaAds}.test.ts`, `src/components/__tests__/Contact.conversion.test.tsx`, `src/lib/__tests__/analytics.ssr.test.ts`.
- If SQLite tests fail with `NODE_MODULE_VERSION ...`, rebuild the native module with the Node you run tests with: `npm rebuild better-sqlite3`.
- Some suites read `server/data/` and `creative/`; they fail when run from a copy without those folders.

---

## Deployment

VPS with PM2 (user `roblesai`). Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) → SSH → `bash pull.sh`.

```
git push origin main   (or the local helper `bash push.sh`, which commits EVERYTHING with `git add .`)
        ↓
GitHub Actions → SSH to VPS → pull.sh (fetch, reset to origin/main, selective install/build, pm2 restart)
```

| Changed files | `pull.sh` action |
|---------------|------------------|
| `package.json` / `package-lock.json` | `npm install` + build + restart |
| `src/`, `server/`, `shared/`, configs, `index.html` | build + restart |
| only `server/data/` | sync data into `dist/` + restart |
| only docs / `*.sh` / `.gitignore` | nothing |
| no new commits | no-op |

Secrets: `VPS_HOST` (`robles.ai`), `VPS_USER` (`roblesai`), `VPS_SSH_KEY`, `VPS_REPO_PATH` (`/home/roblesai/htdocs/robles.ai`). Manual fallback on the VPS: `source ~/.nvm/nvm.sh && bash pull.sh`.

| VPS setting | Value |
|-------------|-------|
| App path | `~/htdocs/robles.ai` |
| PM2 process | `robles-ai` (`~/.nvm/versions/node/v22.14.0/bin/pm2`) |
| Node | v22.14.0 (NVM) |
| Port | 5173 |
| Logs | `~/.pm2/logs/robles-ai-out.log`, `robles-ai-error.log` |

### NODE_ENV fix (2026-08-29)

`start` used to run `NODE_ENV=production && node dist/index.js`, which never passed the variable to Node; cron jobs then skipped themselves as "development". It is now `NODE_ENV=production node dist/index.js`.

---

## Conventions

- **Aliases** (`vite.config.ts`, `vitest.config.ts`): `@/` → `src/`, `@shared/` → `shared/`.
- **Imports**: server code is ESM with `.js` extensions on relative imports; frontend uses aliases without extensions; `shared/` is the only cross-boundary code.
- **Copy**: all public copy goes through i18next with en/es parity.
- **UX/a11y** (spec `ux-overhaul`): `.tap-target` (44 px), `.break-anywhere`, `--header-h` token, `overflow-x-auto` for wide content, `useReducedMotion` / `MotionConfig reducedMotion="user"`, shared `LoadingState`/`EmptyState`/`ErrorState`.
- **Persistence**: never store data that must survive deploys inside `dist/`; `postbuild` copies `server/data` without overwriting databases.
- **Claims**: case studies and demo calculators are illustrative; do not publish numbers presented as client results.

---

## Documentation (`docs/`)

| File | Content |
|------|---------|
| [`DEMOS_PLAN.md`](docs/DEMOS_PLAN.md) | Demos lab roadmap prioritised by wow effect and ROI, with phase status |
| [`REMOTION_VIDEO_CONTEXT.md`](docs/REMOTION_VIDEO_CONTEXT.md) | Brand context and brief for the Remotion marketing video (60 s, older) |
| [`REMOTION_SPOT_30S.md`](docs/REMOTION_SPOT_30S.md) | Prompt for the 30-second Remotion spot (live demos + AI Diagnosis) for the site and ads; supersedes the 60 s brief |
| [`demo-tutorials/try-rag/`](docs/demo-tutorials/try-rag/REMOTION_TUTORIAL_PROMPT.md) | Remotion tutorial prompt for `/try-rag` (45 s + 30 s cut), Playwright screenshots of the demo and the script to regenerate them |
| [`demo-tutorials/try-object-detection/`](docs/demo-tutorials/try-object-detection/REMOTION_TUTORIAL_PROMPT.md) | Same for `/try-object-detection`: tutorial prompt, screenshots (with a simulated webcam), measured detections (`capture-report.json`) and script |
| [`demo-tutorials/try-emotion/`](docs/demo-tutorials/try-emotion/REMOTION_TUTORIAL_PROMPT.md) | Same for `/try-emotion`, with a **free 30–60 s length computed from the voice-over** and responsible-use rules (aggregated and anonymous, never for evaluating employees or students) |
| [`demo-tutorials/try-chatbot/`](docs/demo-tutorials/try-chatbot/REMOTION_TUTORIAL_PROMPT.md) | Same for `/try-chatbot` (free 30–60 s length), with the pages read and the bot's real answers when trained on `robles.ai` (`capture-report.json`). **The EN video is blocked**: the bot always answers in Spanish (§0 of the prompt) |
| [`demo-tutorials/try-transcription/`](docs/demo-tutorials/try-transcription/REMOTION_TUTORIAL_PROMPT.md) | Same for `/try-transcription` (free 30–60 s length), with a sample call to a fictional dental clinic (two TTS voices, `audio/` + `make-conversation-audio.mjs`) fed to the fake microphone, and the real transcript and analyses (`capture-report.json`). §0 lists the live-transcript bugs (interim lines that never clear, out-of-order turns) |
| [`demo-tutorials/try-langchain/`](docs/demo-tutorials/try-langchain/REMOTION_TUTORIAL_PROMPT.md) | Same for `/try-langchain` (free 30–60 s length): sample document → RAG → Agent → JSON, with the real answers of the three modes (`capture-report.json`). **The EN video is blocked**: `/agent` fails in English and JSON/citations come back in Spanish (§0 of the prompt) |
| [`DEMO_TUTORIALS_STATUS.md`](docs/DEMO_TUTORIALS_STATUS.md) | Tracker of demo tutorial videos per demo and language (ES/EN): done vs. pending |
| [`CONTACT_CONVERSIONS.md`](docs/CONTACT_CONVERSIONS.md) | Contact delivery, lead/click conversion contract and Ads/GTM/Meta setup |
| `docs/ADS_ANALYTICS.md` | Admin Ads/GA4 sources, campaign and submission filters, direct API setup, and validation |
| [`DEMO_VIDEO_RELEASE.md`](docs/DEMO_VIDEO_RELEASE.md) + `DEMO_VIDEO_ASSETS.json` | Demo preview videos release notes and asset manifest |
| [`DEMO_VISUALS.md`](docs/DEMO_VISUALS.md) | Demo catalog images and animations log |
| [`FIREFLY_CLIPS.md`](docs/FIREFLY_CLIPS.md) | Firefly start/end frame pairs for demo clips |
| [`ADMIN_AUDIT.md`](docs/ADMIN_AUDIT.md) | Functional and responsive audit of the admin panel |
| [`DESIGN_AUDIT.md`](docs/DESIGN_AUDIT.md) | Professional design audit of the public site |
| [`SEO_AUDIT.md`](docs/SEO_AUDIT.md), [`SEO_IMPLEMENTATION_PLAN.md`](docs/SEO_IMPLEMENTATION_PLAN.md) | Technical SEO / GEO audit and implementation plan |
| [`PENDING_WORK.md`](docs/PENDING_WORK.md) | Pending work backlog |

Feature specs (requirements/design/tasks) live in `.kiro/specs/`: `admin-backend-management`, `ai-chatbot-widget`, `analytics-dashboard`, `blog-fts5-search`, `blog-posts-db-index`, `dominical-carousel-images`, `dominical-ia`, `multi-platform-publishing`, `seo-improvements`, `ux-overhaul`, `whatsapp-widget-time-fix`.

---

## License and contact

MIT © 2025 Robles.AI · https://robles.ai · info@robles.ai · +1 (408) 590-0153 (phone/WhatsApp) · 20380 Stevens Creek Blvd, Suite 205, Cupertino, CA 95014
