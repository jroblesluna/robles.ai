# Robles.AI – Website (Vite + React + Express)

Public website of **Robles.AI**, built with **Vite + React (TypeScript)** on the frontend and **Express** as the development/production server. It includes internationalization (**i18next**), UI components (Tailwind + shadcn), demo pages (RAG, Identity, LangChain, Medical), a static blog with JSON posts, an ad landing page, a global WhatsApp chat widget, and optional analytics (GA4 + Facebook Pixel).

---

## Features
- **SPA with Vite + React** and routing via **wouter**.
- **Express server** serving static assets and integrating Vite middleware in development.
- **i18n** (en/es) with asynchronous `translation.json` loading per locale.
- **Modern UI** with Tailwind, framer-motion, and shadcn components (buttons, inputs, toasts).
- **Ad Landing Page** (`/get-started`): bilingual (EN/ES) conversion-focused page with process steps, services, technologies, pricing, and CTA.
- **Global WhatsApp Chat Widget**: floating bubble that appears on all pages with context-aware messages based on current route and language. Popup triggers after 10 seconds.
- **Demo pages**: `/try-identity`, `/try-rag`, `/try-langchain`, `/try-medical`.
- **Static blog**: sections and posts in `server/data/posts/YYYY/MM/DD/*.json` with translations.
- **Forms** with validation (zod) and email delivery via **nodemailer** (on server).
- **Optional analytics**: GA4 and Facebook Pixel (active only in production build).
- **Sitemaps** and files like `robots.txt`, `sitemap.xml`, `static-pages.xml` in `public/`.

---

## Key Directories
- **src/**: React components, pages, hooks, i18n, utilities, and styles.
- **src/components/**: Reusable components (Header, Footer, Hero, WhatsAppBubble, etc.).
- **src/pages/**: Route pages (Home, Landing, Careers, BlogList, BlogPost, Try*, etc.).
- **server/**: Express (`index.ts`), routes (`routes.ts`), Vite integration (`vite.ts`), and data (`data/`).
- **public/**: Static assets (images, robots, sitemaps, avatars, videos).
- **public/images/**: Locally-served images including landing page visuals.
- **shared/**: Types/schemas shared between client/server.

---

## Requirements
- **Node.js >= 20** (recommended)
- **npm** (examples use npm)

---

## Scripts (package.json)
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express with `tsx watch` and Vite in dev mode |
| `npm run build` | Compile frontend (Vite) + bundle server (esbuild) to `dist/` |
| `npm start` | Run production: `NODE_ENV=production node dist/index.js` |
| `npm run check` | TypeScript type check (`tsc`) |

> In development, available at `http://localhost:5173` (adjust with `PORT`).

---

## Environment Variables
Create a `.env` file in root (do not commit):

```env
# Server
PORT=5173
HOST=0.0.0.0

# Email (forms)
EMAIL_USER=your_user
EMAIL_PASS=your_password
EMAIL_TO=destination@domain.com

# Analytics (production only)
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_FACEBOOK_PIXEL_ID=1234567890

# OpenAI
OPENAI_ORGANIZATION=org-xxx
OPENAI_API_KEY=sk-xxx

# News
NEWS_API_KEY=xxx
```

> **Important**: Do NOT add `NODE_ENV` to `.env`. Vite manages this automatically (`production` during build, `development` during dev). The `start` script sets it explicitly for the Express server.

> **Frontend (Vite)** only exposes variables prefixed with `VITE_`. The rest are server-side only.

---

## Internationalization (i18n)
- Folder: `src/i18n/`
- Files: `locales/en/translation.json` and `locales/es/translation.json`
- Async initialization in `src/i18n/index.ts` with `initI18n()` before rendering.

Translation namespaces include:
- `nav`, `hero`, `footer` — site-wide UI
- `landing.*` — ad landing page content
- `whatsappWidget.*` — context-aware WhatsApp messages per route

To add a language:
1. Create `src/i18n/locales/<lng>/translation.json`.
2. Register it in `initI18n()`.
3. Use `useTranslation()` in components.

---

## Pages & Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Main homepage with hero, solutions, courses, case studies |
| `/get-started` | Landing | Ad landing page — AI diagnosis service |
| `/careers` | Careers | Job listings |
| `/apply` | Apply | Application form |
| `/blog` | BlogList | Blog listing |
| `/blog/:slug` | BlogPost | Individual post |
| `/try-identity` | TryIdentity | Identity verification demo |
| `/try-langchain` | TryLangChain | LangChain demo |
| `/try-rag` | TryRAG | RAG pipeline demo |
| `/try-medical` | TryMedical | Medical image analysis demo |

---

## WhatsApp Chat Widget
Global floating widget (`src/components/WhatsAppBubble.tsx`) that:
- Appears on all pages (rendered in `App.tsx`)
- Shows a green WhatsApp bubble after 1 second
- Pops open a chat window after 10 seconds with a context-specific greeting
- Pre-fills a WhatsApp message based on the current route:
  - Home: "I'm interested in your AI solutions"
  - Landing: "I'm interested in an AI Diagnosis"
  - Blog: "I have a question about one of your articles"
  - Careers: "I'm interested in career opportunities"
  - Demos: "I just tried one of your demos"
- All messages are bilingual (EN/ES) via `whatsappWidget.*` translation keys

---

## Static Blog
- Location: `server/data/posts/YYYY/MM/DD/*.json`
- Post structure: categories, keywords, and `translations` (`en`, `es`) with `slug`, `title`, `excerpt`, `content`.
- Sitemaps in `server/data/sitemaps/` and public output in `public/`.

---

## Demos (Try*)
- **/try-identity**: Upload file to Firebase Storage, verify via external API.
- **/try-rag**: PDF upload, chunking, embedding, and QA pipeline demo.
- **/try-langchain**: LangChain integration demo.
- **/try-medical**: Medical image classification demo.

---

## Analytics
- Initialized only in **production** via `src/lib/analytics.ts`.
- Supports **GA4** (`VITE_GA_MEASUREMENT_ID`) and **Facebook Pixel** (`VITE_FACEBOOK_PIXEL_ID`).
- Page views tracked automatically on route changes.

---

## Local Development
```bash
# 1) Install dependencies
npm install

# 2) Environment variables
cp .env.example .env   # adjust EMAIL_*, VITE_*, API keys

# 3) Run dev environment
npm run dev

# 4) Production build
npm run build
npm start
```

---

## Architecture
- **Client**: React + Vite + Tailwind + i18next + framer-motion + shadcn + wouter
- **Server**: Express with middlewares, JSON logging, email delivery
- **Build**: Vite (frontend) + esbuild (server). Post-build copies resources to `dist/`
- **Data**: Blog JSON and sitemaps in `server/data/` copied to `dist/` on build
- **Images**: All landing page images served locally from `public/images/`

---

## Deployment
The project runs on a VPS with PM2:
```bash
# Pull, build, restart
./pull.sh
```

The `pull.sh` script handles: `git pull` → `npm install` → `npm run build` → PM2 restart.

---

## License
MIT (c) 2025 Robles.AI

---

## Contact
- Website: https://robles.ai
- Email: info@robles.ai
- Phone/WhatsApp: +1 (408) 590-0153
- Location: Cupertino, CA
