# Robles.AI – Website (Vite + React + Express)

Public website of **Robles.AI**, built with **Vite + React (TypeScript)** on the frontend and **Express** as the development/production server. It includes internationalization (**i18next**), UI components (Tailwind + shadcn), demo pages (RAG, Identity, LangChain, Medical), a static blog with JSON posts, and optional analytics (GA4 + Facebook Pixel).

---

## 🚀 Features
- **SPA with Vite + React** and routing via **wouter**.
- **Express server** serving static assets and integrating Vite middleware in development.
- **i18n** (en/es) with asynchronous `translation.json` loading per locale.
- **Modern UI** with Tailwind, framer-motion, and shadcn components (buttons, inputs, toasts).
- **Demo pages**: `/try-identity`, `/try-rag`, `/try-langchain`, `/try-medical`.
- **Static blog**: sections and posts in `server/data/posts/YYYY/MM/DD/*.json` with translations.
- **Forms** with validation (zod) and email delivery via **nodemailer** (on server).
- **Optional analytics**: GA4 and Facebook Pixel (active only in production build).
- **Sitemaps** and files like `robots.txt`, `sitemap.xml`, `static-pages.xml` in `public/`.

---

### Key Directories
- **src/**: React components, pages, hooks, i18n, utilities, and styles.
- **server/**: Express (`index.ts`), routes (`routes.ts`), Vite integration (`vite.ts`), and data (`data/`).
- **public/**: public static assets (robots, sitemaps).
- **shared/**: types/schemas shared between client/server.
- **tailwind.config.ts** and **postcss.config.js**: styling configuration.
- **vite.config.ts**: bundling and plugin config (React, SVGR).

---

## ⚙️ Requirements
- **Node.js ≥ 20** (recommended)
- **pnpm / npm / yarn** (any; examples use npm)

---

## ▶️ Scripts (package.json)
- `npm run dev` → start Express with `tsx watch server/index.ts` and integrate Vite in dev mode.
- `npm run build` → compile frontend (Vite) and bundle server (`esbuild`) to `dist/`.
- `npm run postbuild` → copy `src/`, `shared/`, `public/`, and `server/data/` to `dist/` (for serving static/JSON).
- `npm start` → run **production**: `node dist/index.js`.
- `npm run check` → `tsc` (type check).
- `npm run db:push` → Drizzle commands (if database is used).

> In development, typically available at `http://localhost:5173` (port can be adjusted with `PORT`).

---

## 🔧 Environment Variables
Both Express server and frontend use environment variables. Create a `.env` file in root (do not commit):

```
# Server
PORT=5173
HOST=0.0.0.0

# Email (forms)
EMAIL_HOST=smtp.your_provider.com
EMAIL_PORT=587
EMAIL_USER=your_user
EMAIL_PASS=your_password
EMAIL_TO=destination@domain.com

# Analytics (production only)
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_FACEBOOK_PIXEL_ID=1234567890

# Other (if applicable)
NODE_ENV=development
```

> **Frontend (Vite)** only exposes variables prefixed with `VITE_`. The rest are used on the server.

---

## 🌍 Internationalization (i18n)
- Folder: `src/i18n/`  
- Files: `locales/en/translation.json` and `locales/es/translation.json`  
- Async initialization in `src/i18n/index.ts` with `initI18n()` before rendering in `src/main.tsx`.

To add a language:
1. Create `src/i18n/locales/<lng>/translation.json`.
2. Register it in `initI18n()`.
3. Use `useTranslation()` in components and keys like `t("hero.title")`.

---

## 🧩 Components & Pages
- **Components** in `src/components/` (Header, Footer, Hero, Features, Solutions, Pricing, Contact, CaseStudies, Testimonials, Team, Newsletter, LanguageSwitcher, etc.).
- **Pages** in `src/pages/` (Home, Careers, Apply, OTP, BlogList, BlogPost, TryIdentity, TryLangChain, TryRAG, TryMedical, not-found).  
- **Routing** with **wouter**, defined in `src/App.tsx`.

### Forms
- Validation with **zod** (and `@hookform/resolvers` / `react-hook-form` on client).
- Email sending via **nodemailer** on server (`server/routes.ts`).  
- Configure `EMAIL_*` in `.env`.

---

## 📰 Static Blog
- Location: `server/data/posts/YYYY/MM/DD/*.json`
- Post structure: categories, keywords, and `translations` (`en`, `es`) with `slug`, `title`, `excerpt`, `content`.
- Blog listing and detail in `src/pages/BlogList.tsx` and `src/pages/BlogPost.tsx`.
- Sitemaps in `server/data/sitemaps/` and public output in `public/`.

> Posts can be generated/updated programmatically via scripts in `src/scripts/` or `cron` tasks (see `server/routes.ts`).

---

## 🧪 Demos (Try*)
- **/try-identity**: frontend uploads file to **Firebase Storage** and hits `https://identity-api.robles.ai` (or `http(s)://HOST:8080` in dev) for verification. Adjust API base according to environment.
- **/try-rag**, **/try-langchain**, **/try-medical**: example UIs for queries and results.

> **Firebase**: config is in `src/lib/firebaseConfig.ts`. It’s recommended to move keys to public env variables `VITE_...` and configure secure Storage rules.

---

## 🎯 Analytics
- Initialized only in **production** (build) via `src/lib/analytics.ts`.
- Supports **GA4** (`VITE_GA_MEASUREMENT_ID`) and **Facebook Pixel** (`VITE_FACEBOOK_PIXEL_ID`).

---

## 🧰 Local Development
```bash
# 1) Install dependencies
npm install

# 2) Environment variables
cp .env.example .env   # (if you create one) and adjust EMAIL_*, VITE_*

# 3) Run dev environment
npm run dev

# 4) Production build
npm run build
npm start
```

> In production, Express serves statics from `dist/public` and exposes endpoints defined in `server/routes.ts` (contact, sitemaps, cron, etc.).

---

## 🏗️ Architecture at a Glance
- **Client**: React + Vite + Tailwind + i18next + framer-motion + shadcn.
- **Server**: Express with middlewares, JSON response logging, and email delivery.
- **Build**: Vite for frontend, `esbuild` for server. Post-build copies resources into `dist/`.
- **Routing**: wouter in client; utility endpoints in `server/routes.ts`.
- **Data**: Blog JSON and sitemaps in `server/data/` copied to `dist/` on build.

---

## 🔒 Security & Best Practices
- Move credentials (Firebase, email) to `.env` with `VITE_` prefix for client when needed, and **do not commit** them.
- Enable CORS only when necessary.
- Validate inputs with zod both on client and server.
- Review Firebase Storage rules to prevent unauthorized access.

---

## 📄 License
MIT © 2025 Robles.AI

---

## 📬 Contact
- Website: https://robles.ai
- Email: antonio@robles.ai
- Location: Cupertino, CA
