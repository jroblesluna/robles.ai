
# Robles.AI – Website (Vite + React + Express)

Sitio web público de **Robles.AI**, construido con **Vite + React (TypeScript)** en el frontend e **Express** como servidor de desarrollo/producción. Incluye internacionalización (**i18next**), componentes UI (Tailwind + shadcn), páginas de demo (RAG, Identity, LangChain, Medical), blog estático con posts en JSON y analítica opcional (GA4 + Facebook Pixel).

---

## 🚀 Características
- **SPA con Vite + React** y rutas mediante **wouter**.
- **Servidor Express** que sirve estáticos y, en desarrollo, integra el middleware de Vite.
- **i18n** (en/es) con carga asíncrona de `translation.json` por locale.
- **UI moderna** con Tailwind, framer-motion y componentes shadcn (botones, inputs, toasts).
- **Páginas de demo**: `/try-identity`, `/try-rag`, `/try-langchain`, `/try-medical`.
- **Blog estático**: secciones y posts en `server/data/posts/YYYY/MM/DD/*.json` con traducciones.
- **Formularios** con validación (zod) y envío por correo vía **nodemailer** (en servidor).
- **Analytics** opcional: GA4 y Facebook Pixel (activas solo en build de producción).
- **Sitemaps** y archivos `robots.txt`, `sitemap.xml`, `static-pages.xml` en `public/`.

---

### Directorios clave
- **src/**: componentes React, páginas, hooks, i18n, utilidades y estilos.
- **server/**: Express (`index.ts`), rutas (`routes.ts`), integración con Vite (`vite.ts`) y datos (`data/`).
- **public/**: assets estáticos públicos (robots, sitemaps).
- **shared/**: tipos/esquemas compartidos entre cliente/servidor.
- **tailwind.config.ts** y **postcss.config.js**: configuración de estilos.
- **vite.config.ts**: config de bundling y plugins (React, SVGR).

---

## ⚙️ Requisitos
- **Node.js ≥ 20** (recomendado)
- **pnpm / npm / yarn** (cualquiera; en ejemplos usaré npm)

---

## ▶️ Scripts (package.json)
- `npm run dev` → inicia Express con `tsx watch server/index.ts` e integra Vite en modo desarrollo.
- `npm run build` → compila el frontend (Vite) y bundlea el servidor (`esbuild`) a `dist/`.
- `npm run postbuild` → copia `src/`, `shared/`, `public/` y `server/data/` a `dist/` (para servir estáticos/JSON).
- `npm start` → ejecuta **producción**: `node dist/index.js`.
- `npm run check` → `tsc` (chequeo de tipos).
- `npm run db:push` → comandos de Drizzle (si usas base de datos).

> En desarrollo, accede típicamente vía `http://localhost:5173` (el puerto se puede ajustar con `PORT`).

---

## 🔧 Variables de entorno
El servidor Express y el frontend usan variables de entorno. Crea un archivo `.env` en la raíz (no lo comitees):

```
# Servidor
PORT=5173
HOST=0.0.0.0

# Correo (formularios)
EMAIL_HOST=smtp.tu_proveedor.com
EMAIL_PORT=587
EMAIL_USER=tu_usuario
EMAIL_PASS=tu_password
EMAIL_TO=destino@dominio.com

# Analytics (solo producción)
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_FACEBOOK_PIXEL_ID=1234567890

# Otros (si aplica)
NODE_ENV=development
```

> **Frontend (Vite)** solo expone variables prefijadas con `VITE_`. Las demás se usan en el servidor.

---

## 🌍 Internacionalización (i18n)
- Carpeta: `src/i18n/`  
- Archivos: `locales/en/translation.json` y `locales/es/translation.json`  
- Inicialización asíncrona en `src/i18n/index.ts` con `initI18n()` antes del render en `src/main.tsx`.

Para agregar un idioma:
1. Crea `src/i18n/locales/<lng>/translation.json`.
2. Regístralo en `initI18n()`.
3. Usa `useTranslation()` en componentes y claves como `t("hero.title")`.

---

## 🧩 Componentes y Páginas
- **Componentes** en `src/components/` (Header, Footer, Hero, Features, Solutions, Pricing, Contact, CaseStudies, Testimonials, Team, Newsletter, LanguageSwitcher, etc.).
- **Páginas** en `src/pages/` (Home, Careers, Apply, OTP, BlogList, BlogPost, TryIdentity, TryLangChain, TryRAG, TryMedical, not-found).  
- **Ruteo** con **wouter** definido en `src/App.tsx`.

### Formularios
- Validación con **zod** (y `@hookform/resolvers` / `react-hook-form` en cliente).
- Envío por correo vía **nodemailer** en el servidor (`server/routes.ts`).  
- Configura `EMAIL_*` en `.env`.

---

## 📰 Blog estático
- Ubicación: `server/data/posts/YYYY/MM/DD/*.json`
- Estructura por post: categorías, keywords y `translations` (`en`, `es`) con `slug`, `title`, `excerpt`, `content`.
- Los listados y el detalle del blog están en `src/pages/BlogList.tsx` y `src/pages/BlogPost.tsx`.
- Sitemaps en `server/data/sitemaps/` y salida pública en `public/`.

> Puedes generar/actualizar posts programáticamente con los scripts en `src/scripts/` o tareas `cron` (ver `server/routes.ts`).

---

## 🧪 Demos (Try*)
- **/try-identity**: front que sube archivo a **Firebase Storage** y golpea `https://identity-api.robles.ai` (o `http(s)://HOST:8080` en dev) para verificación. Ajusta la base de la API según entorno.
- **/try-rag**, **/try-langchain**, **/try-medical**: UIs de ejemplo para consultas y visualización de resultados.

> **Firebase**: la configuración está en `src/lib/firebaseConfig.ts`. Recomendado mover claves a variables de entorno públicas `VITE_...` y configurar reglas seguras de Storage.

---

## 🎯 Analytics
- Se inicializa solo en **producción** (build) mediante `src/lib/analytics.ts`.
- Soporta **GA4** (`VITE_GA_MEASUREMENT_ID`) y **Facebook Pixel** (`VITE_FACEBOOK_PIXEL_ID`).

---

## 🧰 Desarrollo local
```bash
# 1) Instalar dependencias
npm install

# 2) Variables de entorno
cp .env.example .env   # (si creas uno de ejemplo) y ajusta EMAIL_*, VITE_*

# 3) Ejecutar entorno de desarrollo
npm run dev

# 4) Build de producción
npm run build
npm start
```

> En producción, Express sirve los estáticos desde `dist/public` y expone los endpoints definidos en `server/routes.ts` (contacto, sitemaps, cron, etc.).

---

## 🏗️ Arquitectura en breve
- **Cliente**: React + Vite + Tailwind + i18next + framer-motion + shadcn.
- **Servidor**: Express con middlewares, logging de respuestas JSON y envío de correos.
- **Build**: Vite para frontend, `esbuild` para server. Post-build copia recursos a `dist/`.
- **Rutas**: wouter en cliente; endpoints de utilidades en `server/routes.ts`.
- **Datos**: JSON de blog y sitemaps en `server/data/` copiados a `dist/` en el build.

---

## 🔒 Seguridad y buenas prácticas
- Mover credenciales (Firebase, correo) a `.env` con prefijo `VITE_` para el cliente cuando sea necesario y **no** comitearlas.
- Habilitar CORS solo cuando corresponda.
- Validar inputs con zod tanto en cliente como en servidor.
- Revisar reglas de Firebase Storage para prevenir accesos no autorizados.

---

## 📄 Licencia
MIT © 2025 Robles.AI

---

## 📬 Contacto
- Web: https://robles.ai
- Email: antonio@robles.ai
- Ubicación: Cupertino, CA
