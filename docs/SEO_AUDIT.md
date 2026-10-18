# Robles.AI technical SEO, content, architecture and GEO audit

> **Actualización autorizada — 18 octubre 2026:** se implementa HTML público inicial y reutilización del artículo en React. La validación de producción de este lote se registra al final. Search Console no concede acceso a la propiedad con la sesión disponible; PageSpeed sí fue consultado y devuelve «No Data» de campo. No se declara indexación, rankings ni aprobación de CWV sin evidencia.

> **Cierre de producción — PR #7, 18 octubre 2026:** POST-03 y POST-04 corregidos y verificados después del despliegue. No se detectaron observaciones abiertas en los recorridos de navegación bilingüe comprobados. Véase el apartado final “Cierre verificado de navegación bilingüe”. Los hallazgos anteriores se conservan como historial; SSR/contenido/medición permanecen fuera de este ciclo.

> **Verificación anterior — PR #6, 18 octubre 2026, 17:35–17:39 UTC:** PR #6 desplegado correctamente. Las URLs bilingües de los nueve artículos y sus sitemaps funcionan; los CTA del Hero y landing conservan español. La revisión descubrió un consumidor pendiente en las tarjetas del blog y CTA residuales en otras secciones. Consulte **“Nueva auditoría de producción tras PR #6”** al final. Las observaciones originales siguientes son históricas y no representan automáticamente defectos actuales.

Audit date: October 17, 2026, America/Los_Angeles. Public responses were collected around 21:53–22:00 PDT (October 18 UTC). Audit only: no application changes, deployments, commits, data writes, account changes or dependency installations.

## Executive Summary

Robles.AI has working bilingual content, real interactive demonstrations, a commercial diagnosis offer, crawlable article URLs, and an existing server metadata system with tests. The main problem is inconsistency between that system, static serving, client metadata, language selection, and publishing outputs. Repair these integrations before replacing architecture or increasing content volume.

The most urgent confirmed defects are blank server metadata on important pages, homepage HTML cached immutably for a year, a malformed robots sitemap pointer, incomplete sitemap coverage, conflicting article canonicals, nonstandard structured-data dates, and image metadata pointing to HTML responses. Important page text is absent from sampled initial HTML but available after JavaScript rendering. This is an accessibility limitation for fetchers that do not render JavaScript, not proof of Google indexing failure.

Production `/api/blog?page=1&limit=30` reported **12,156 records**; the browser showed **406 pages**. All eight referenced sitemap files parsed, but together contained only **4,214 unique URL locations**, including language/query variants. Twenty-eight of the latest 30 English article URLs were absent from those locations. This is a discovery defect; it does not establish that those articles are unindexed.

The existing `/get-started` landing page already explains diagnosis, implementation stages, service categories, pricing and contact options. Preserve and improve it. Add a small number of differentiated enterprise service pages supported by demonstrations and verified delivery evidence. Do not turn every technology into a service page.

No confirmed CRITICAL production incident was established. A potentially critical **public build/data boundary** concern requires prompt owner verification without downloading sensitive files (POT-SEC-01).

## Scope, provenance and limitations

- The selected local workspace was an empty Git repository: no application files and no commits. After clarification, the owner supplied [jroblesluna/robles.ai](https://github.com/jroblesluna/robles.ai).
- Inspected a temporary snapshot at revision **`f55d59ab6a24d7ed3d66acc6f3f9b4d8761d6605`**. Source references below are repository-relative paths at that revision, not files present in this workspace. Example: [server/vite.ts](https://github.com/jroblesluna/robles.ai/blob/f55d59ab6a24d7ed3d66acc6f3f9b4d8761d6605/server/vite.ts#L79). Exact production deployment SHA was not independently verified.
- Inventoried archive paths across the repository, read architecture instructions, relevant frontend/backend/SEO/publishing/deployment modules, and inspected existing tests. The snapshot contains 801 historical post JSON files, not the complete production corpus. Binary media were not exhaustively inspected.
- Live evidence: ordinary public HTTP GET responses, headers, XML parsing, asset byte counts, browser-rendered DOM/accessibility trees and a layout screenshot. No forms, uploads, email links, publishing endpoints, generation endpoints or admin actions were submitted. Demo backend functionality was not exercised.
- Search Console, Bing Webmaster Tools, GA4 reporting, GTM configuration, CRM, authenticated server logs, nginx configuration and Cloud Run projects were unavailable. Actual indexed pages, organic traffic, rankings, lead quality and crawler visits are unverified.
- Initial web extraction could not read robots/sitemap; direct HTTP subsequently succeeded. Browser automation succeeded. No local Lighthouse installation or project dependencies were present; no Lighthouse, CrUX, INP, LCP or CLS results are claimed. Full keyboard/mobile/contrast certification and Google Rich Results Test were not performed.
- Documentation is the only persistent workspace output. HTTP/source snapshots are temporary diagnostics outside the workspace. No private database or credential resource was requested.

## Architecture Overview

### Verified implementation

| Layer | Source evidence | Status and implication |
|---|---|---|
| UI | `package.json`, `src/main.tsx`, `src/App.tsx` | React 19, Vite 6, TypeScript, Tailwind, Radix/shadcn components, framer-motion, wouter. `createRoot`, not hydration. |
| Routing | `src/App.tsx`, `src/pages/BlogRoute.tsx` | Home, commercial landing, quiz, careers/apply, blog/list/detail, demos and admin routes. Most secondary routes use `React.lazy`; Home and blog routing are eager. |
| Backend | `server/index.ts`, `server/routes.ts` | Express 4, Node, REST APIs, SQLite/better-sqlite3, SSE chat, scheduled jobs. Registering the full application starts jobs and can initialize/write the database: do not start it casually for SEO tests. |
| Rendering | `server/vite.ts`, `server/seo/*` | Production static serving followed by metadata injection. Injects head only, explicitly preserves empty root/body. No implemented full-page SSR or SSG was found in the inspected entry paths. |
| Content | `server/data/posts`, `server/listing/*`, `server/fts/*` | JSON content source; SQLite listing index and FTS5 search. Production content grows beyond tracked snapshot. |
| Publishing | `server/routes.ts`, `src/scripts/generateHistoricalPosts.ts`, `postPrompt.ts`, `postUtils.ts` | Hourly generation workflow, 24 AI editorial personas, English/Spanish output, JSON save, sitemap update, index refresh. Weekly Dominical/social/video workflows are separate. |
| SEO | `server/seo/{metaInjector,metaBuilders,htmlInjector,slugIndex,types}.ts`, `src/hooks/useSEO.ts`, `src/pages/BlogPost.tsx` | Existing canonical/hreflang/OG/Twitter/JSON-LD implementations; overlapping client/server policies need consolidation. |
| Language | `src/i18n/index.ts`, locale JSON, Header, BlogPost | English/Spanish, browser detection and stored preference; article slugs translated, static alternatives use `?lang=es`. Language switch primarily changes client state. |
| Analytics | `src/lib/analytics.ts`, `server/analyticsRoutes.ts`, `server/services/ga4Client.ts` | Dynamic public analytics configuration, GTM preference with direct GA4/Meta fallback, protected reporting dashboard. Live browser loaded GTM, GA4 and Meta scripts. Collection/report correctness unverified. |
| Deployment | `.github/workflows/deploy.yml`, `pull.sh`, package build scripts | Main-branch push triggers SSH deployment to VPS and PM2. Live nginx/Express headers support this architecture; server configuration itself was unavailable. |
| External AI demos | `src/pages/Try*.tsx`, `server/services/backends/registry.ts` | References to separate Cloud Run backends, and browser-local CV/forecasting implementations. This repo does not establish the actual deployed backend internals, IAM or Secret Manager configuration. |

The current site's deployment is VPS-based in source. Do not describe the main website as Cloud Run-hosted merely because its demos use Cloud Run. Artifact Registry, Terraform, Azure, SageMaker and other stated business capabilities are not evidence of this site's implementation. `TryMedical` is a coming-soon UI, not an operational medical AI service. Firebase is absent from current dependencies. `Testimonials` is imported but commented out of Home rendering. Legacy sitemap scripts coexist with the current writer; their continued operational use is not established.

### What crawlers receive

1. An ordinary request to `/` is fulfilled by `express.static(distPath, {maxAge:'1y', immutable:true})` before metadata injection.
2. Non-file routes reach `createMetaInjector`: known static routes get translated head metadata; article routes resolve JSON via `SlugIndex` and inject article metadata.
3. Every sampled HTML page still contains `<div id="root"></div>`. There is no article text, H1, navigation or service copy in that root before JavaScript.
4. Browser execution initializes i18next, mounts React, requests blog/editor/config APIs and renders visible content. Client effects modify title, description and sometimes canonical/hreflang.
5. Unknown routes and failed article resolution return the generic shell with HTTP 200. Missing asset paths also fall through to HTML.

This is **client-rendered content with server-side head injection**, rather than content SSR, static generation or bot-specific dynamic rendering. Google can render JavaScript; rendering alone is not a confirmed indexing defect. Initial HTML would improve robustness for non-rendering search/AI fetchers and remove reliance on multiple APIs for basic content. [Google's JavaScript processing documentation](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) explains the distinction.

## Live inspection evidence

All paths below are on `https://robles.ai` unless stated otherwise. No sampled successful public HTML response included an `X-Robots-Tag` or meta robots exclusion; absence of an exclusion is not proof of index inclusion.

| URL/type | Raw HTTP/initial HTML | Browser result or comparison |
|---|---|---|
| `/` and `/?lang=es` | 200; Spanish default title/description, `lang=en`, no canonical/hreflang, Organization only; empty root; immutable one-year cache | `/` rendered English, `lang=en-US`, English title and service/demo/team/contact content. |
| `/get-started` | 200; empty title/description; canonical and en/es/x-default links; empty root | `/get-started?lang=es` rendered English title/body with `lang=en-US`, while canonical retained `?lang=es`. |
| `/blog`, `/blog?lang=es` | 200; empty title/description; route canonical and language alternates; empty root | English index has H1, 30 linked cards and button pagination showing page 1 of 406. |
| `/careers` | 200; empty server title, empty application root | HTTP inspected; full browser flow not tested. |
| `/diagnostico-ia`, `/demos`, `/try-rag` | 200; generic Spanish homepage metadata; no route canonical; empty root | Diagnosis/catalog discovered through rendered links. No demo API execution test. |
| English crypto article A | 200; appropriate title/excerpt, clean canonical, en/es/x-default, Organization + BlogPosting + BreadcrumbList | Article renders, but client canonical adds `?lang=en`; sources and human publisher/AI assistant displayed. |
| Spanish translation A-es | 200; Spanish title/excerpt, clean Spanish canonical; initial `lang=en` | Spanish article body with English interface and `lang=en-US`; client canonical adds `?lang=es`. |
| Energy article B | 200; route-specific metadata/schema, empty root | HTTP only; no article accuracy assessment. |
| Legacy August article with English slug + `?lang=es` | 200; Spanish metadata, canonical points to translated Spanish slug | Establishes legacy URL support at HTTP level; not a browser language correctness test. |
| `/blog/` | 200; generic homepage head, no canonical | Different from `/blog`; trailing slash not normalized. |
| `/seo-audit-nonexistent-20261017`, `/blog/seo-audit-nonexistent-20261017` | 200; generic homepage shell | Source supplies client not-found behavior; HTTP status is already incorrect. |
| `/assets/seo-audit-nonexistent-20261017.js` | 200, `text/html`, homepage shell | Confirms asset fallback problem. |
| `/og-image.png`, `/logo.png` | 200, `text/html`, homepage shell | These are metadata/schema image URLs, not usable images. `/images/logo.png` returns actual PNG. |
| `http://robles.ai/`, `https://www.robles.ai/` | Each 301 directly to `https://robles.ai/` | Root variants verified; deep-path redirect preservation not tested. |

Article A: `/blog/2026-10-16-23-00-00-ai-secures-cryptocurrency-startups`.

A-es: `/blog/2026-10-16-23-00-00-ai-seguridad-criptomonedas-innovaciones`.

B: `/blog/2026-10-16-22-00-00-ai-data-centers-energy-impact-and-global-diplomacy`.

### Sitemap inventory

`/robots.txt` returned exactly `User-agent: *`, `Allow: /`, and `Sitemap: https://robles.ai/sitemap.xmlArma ` (trailing space). The advertised malformed path itself returns the generic HTML shell. `/sitemap.xml` was accessible directly and parsed as XML.

| Referenced file | URL locations |
|---|---:|
| `/static-pages.xml` | 4 |
| `/sitemaps/2025-06-en.xml` | 705 |
| `/sitemaps/2025-06-es.xml` | 705 |
| `/sitemaps/2025-07-en.xml` | 725 |
| `/sitemaps/2025-07-es.xml` | 725 |
| `/sitemaps/2025-08-en.xml` | 674 |
| `/sitemaps/2025-08-es.xml` | 674 |
| `/sitemaps/2026-10.xml` | 2 |
| **Unique locations** | **4,214** |

Older Spanish maps use English slugs with `?lang=es`; the current map uses clean English locations with English/Spanish alternate annotations, but does not include reciprocal Spanish `<url>` entries. Referenced XML is syntactically valid. Coverage and language relationships are separate defects from XML syntax. No sitemap index or additional sitemap was advertised beyond these files. The complete internal link graph was not crawled; orphan counts and all broken links remain unverified.

## Confirmed Findings

Severity: CRITICAL = demonstrated severe incident/site-wide loss; HIGH = material discovery, correctness or conversion defect; MEDIUM = narrower defect or maintainability risk; LOW = smaller quality issue. These are engineering priorities, not measured ranking losses. Complexity estimates exclude approvals/deployment and assume an engineer familiar with the repo.

### SEO-01 — Homepage bypasses metadata injection

- **Category / severity:** metadata/rendering; HIGH. **Evidence:** live `/` and `/?lang=es` return original Spanish head without canonical/hreflang or the intended WebSite schema; browser changes title to English. `server/vite.ts:79` mounts static serving first, including automatic index handling.
- **Affected URLs:** homepage language/query variants.
- **Source:** `server/vite.ts`, `server/seo/metaInjector.ts`, `index.html`.
- **Explanation / implication:** static index handling shadows the existing homepage SEO branch. Different consumers receive different language/identity metadata.
- **Recommendation:** serve HTML through the existing metadata pipeline, restrict static handling to intended public assets, and validate both languages. Do not add a second metadata plugin.
- **Complexity:** small–medium, 0.5–1 day, coordinated with SEO-02/03/06.

### SEO-02 — HTML has a one-year immutable cache policy

- **Category / severity:** performance/stability; HIGH. **Evidence:** homepage and `/?lang=es` headers contain `Cache-Control: public, max-age=31536000, immutable`.
- **Affected URLs:** homepage and other unversioned files served by the same blanket policy.
- **Source:** `server/vite.ts:79`.
- **Explanation / implication:** returning visitors can retain outdated HTML and references to removed hashed assets after deployment. Actual stale-client failures were not reproduced.
- **Recommendation:** revalidate HTML; reserve long immutable caching for content-hashed assets. Assign deliberate shorter/revalidation policies to robots, manifests and unversioned media. Preserve compression/security headers.
- **Complexity:** small, 0.25–0.5 day plus deployment/cache verification.

### SEO-03 — Important static routes emit blank or generic metadata

- **Category / severity:** metadata; HIGH. **Evidence:** `/blog`, `/get-started`, `/careers` return empty `<title>` and description; demos/quiz/RAG return the generic home title. Client effects later fix some titles.
- **Affected URLs:** listed routes and analogous unregistered demo routes.
- **Source:** `server/seo/metaInjector.ts:18–57`, `server/seo/metaBuilders.ts:176`, `server/seo/types.ts:69`, `src/hooks/useSEO.ts`, both locale files, `package.json`.
- **Explanation / implication:** translation-read failures are cached as empty objects; static registry omits demos/quiz. After esbuild flattens server code into `dist/index.js`, module-relative translation/editor paths resolve differently from the original source layout. This source path mismatch explains the observed fallbacks, although production filesystem paths were not inspected. Demo client metadata also shares a single generic route key.
- **Recommendation:** explicit build-aware paths or supplied translation data, nonempty validated fallbacks, observable errors, complete route metadata registry and distinct intent-specific demo titles.
- **Complexity:** medium, 1–2 days. Verify the actual bundled production artifact, not just unit builders.

### SEO-04 — robots.txt advertises a malformed sitemap URL

- **Category / severity:** discovery; HIGH. **Evidence:** live and source contain `sitemap.xmlArma`; that path returns HTML.
- **Affected URLs:** `/robots.txt`, advertised sitemap.
- **Source:** `public/robots.txt`.
- **Implication / solution:** sitemap auto-discovery through this directive points to the wrong resource. Correct the URL and validate the target's XML/content type. Current `Allow: /` itself does not block search crawlers.
- **Complexity:** small, under 0.25 day.

### SEO-05 — Sitemap inventory is incomplete and uses conflicting language conventions

- **Category / severity:** discovery/multilingual; HIGH. **Evidence:** complete referenced inventory above; API total 12,156; 28/30 current English URLs absent; static sitemap omits `/get-started`, quiz and demos. Current writer emits only English `<loc>` entries with bilingual annotations.
- **Affected URLs:** blog archive, translated articles, commercial landing and selected public routes.
- **Source:** `public/static-pages.xml`, `src/scripts/sitemapService.ts`, `generateSitemaps.ts`, `fixSitemapMissing.ts`, `server/routes.ts:954–1030`.
- **Explanation / implication:** legacy and current writers target different directories and URL styles. Runtime historical sitemaps are not rebuilt from the current publication inventory. This weakens discovery, especially with button-only pagination.
- **Recommendation:** one canonical URL policy and one inventory-driven sitemap writer; reconcile production data first; include both language URLs with reciprocal annotations; accurate publication/update timestamps; atomic generation. Do not run existing fix/delete scripts blindly or include every utility page by default.
- **Complexity:** medium–large, 2–4 days plus full inventory validation. [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) supports canonical URL inclusion; sitemap inclusion is not indexing assurance.

### SEO-06 — Server and client article canonicals conflict

- **Category / severity:** canonicalization; HIGH. **Evidence:** article A raw canonical is clean, browser canonical adds `?lang=en`; Spanish similarly adds `?lang=es`. Client removes x-default and server alternate links.
- **Affected URLs:** article detail pages, including A/A-es.
- **Source:** `src/pages/BlogPost.tsx:95–137`, `server/seo/metaBuilders.ts`, `src/components/BlogModal.tsx`, `src/hooks/useBlogModalRouting.ts`.
- **Implication / solution:** inconsistent consolidation signals across responses, rendered state and legacy sitemaps. Share one URL/metadata policy between server and client. Prefer existing translated clean article slugs, normalize legacy query variants without losing Spanish content. Keep modal and cold-load metadata equivalent, restoring list metadata on close.
- **Complexity:** medium, 1–2 days plus modal regression tests.

### SEO-07 — URL language, rendered language and HTML lang disagree

- **Category / severity:** multilingual/accessibility; HIGH. **Evidence:** `/get-started?lang=es` rendered English body/title and `lang=en-US` while canonical remained Spanish; A-es rendered Spanish body but English interface and `lang=en-US`; initial Spanish HTML is `lang=en`.
- **Affected URLs:** static Spanish query variants and translated articles; results depend on saved/browser language.
- **Source:** `src/i18n/index.ts`, `src/App.tsx`, `src/components/Header.tsx`, `src/pages/BlogPost.tsx:86–90,192–194`, `server/seo/htmlInjector.ts`, `server/seo/types.ts`.
- **Explanation / implication:** browser/local storage detection and strict `en`/`es` comparisons diverge; static pages do not consistently honor the server's query-language convention. Switching language changes state without consistently updating URL.
- **Recommendation:** URL language takes precedence for indexable pages; normalize locale variants; synchronize body, metadata, lang and switch destinations. Retain `?lang=es` for static pages and translated article slugs initially. Reciprocal self-referencing alternates must resolve to the intended language. No routing framework migration is required. [Localized-page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions).
- **Complexity:** medium, 2–3 days including preference/locale matrix tests.

### SEO-08 — Unknown URLs/assets return successful homepage HTML

- **Category / severity:** indexability/status; HIGH. **Evidence:** missing page, missing article and missing `.js` all returned 200 with generic HTML. `/blog/` also bypasses exact static registration.
- **Affected URLs:** unknown paths, unknown article slugs, missing assets, slash variants.
- **Source:** `server/seo/metaInjector.ts:165–182,236–245`, `server/vite.ts`, `src/pages/BlogPost.tsx`, `src/pages/not-found.tsx`, `server/routes.ts:907–946`.
- **Implication / solution:** soft-404 risk, duplicate shells and opaque asset failures. Use explicit public route classification, real 404s, deliberate 5xx for internal failures, proper asset fallthrough, and permanent slash normalization preserving meaningful queries. Validate article aliases against the slug index rather than the API's timestamp-prefix fuzzy match. Do not turn every SPA route into a 404.
- **Complexity:** medium, 1–2 days.

### SEO-09 — Article structured data has invalid dates and inconsistent attribution

- **Category / severity:** structured data/trust; MEDIUM. **Evidence:** A and B use `datePublished`/`dateModified` such as `2026-10-16-23-00-00`; live `author` is `Person` named `Robles.AI`, while visible page names Antonio Robles as publisher and Felipe Mesh as AI assistant. JSON syntax parses; semantic correctness is the defect.
- **Affected URLs:** generated article detail schema.
- **Source:** `server/seo/metaBuilders.ts:60–105`, `server/seo/metaInjector.ts:18–39`, `src/scripts/generateHistoricalPosts.ts`, `src/pages/BlogPost.tsx`, `server/seo/__tests__/metaBuilders.test.ts:93–99`.
- **Recommendation:** truthful ISO 8601 publication times with timezone, separate real modification tracking, appropriate Organization authorship or confirmed human authorship/review roles aligned with visible disclosures. Do not describe AI personas as credentialed people. Stable entity IDs can relate publisher, website, author and article. Existing tests explicitly accept malformed dates and need correction.
- **Complexity:** medium, 1–2 days; historical dates require provenance review. [Article schema guidance](https://developers.google.com/search/docs/appearance/structured-data/article) recommends dates/authors/images but does not require every property or guarantee rich results.

### SEO-10 — Article social/schema images point to HTML

- **Category / severity:** image metadata; MEDIUM. **Evidence:** default `/og-image.png` and publisher `/logo.png` return 200 `text/html`; `/images/logo.png` is a real PNG. Raw and rendered article tags retain invalid defaults.
- **Affected URLs:** article pages and metadata-injected static pages using defaults.
- **Source:** `server/seo/metaBuilders.ts:5,86`, `index.html`, `src/pages/BlogPost.tsx`.
- **Implication / solution:** broken preview/schema images. Use verified existing assets immediately, then appropriate licensed article/brand share images with explicit dimensions and alt metadata. Align social/schema image with representative visible imagery; return actual 404s for missing files.
- **Complexity:** small, 0.25–0.5 day; custom artwork optional later.

### SEO-11 — Main content is absent from sampled initial HTML

- **Category / severity:** rendering/GEO; MEDIUM. **Evidence:** all sampled raw HTML roots empty; browser renders homepage, landing, list and articles. Injector explicitly guarantees unchanged body; frontend uses `createRoot`.
- **Affected URLs:** homepage, landing, blog/list/detail, public demos and quiz shells.
- **Source:** `src/main.tsx`, `server/seo/htmlInjector.ts`, `server/vite.ts`, `src/pages/BlogPost.tsx`.
- **Implication / solution:** consumers that fetch HTML without JavaScript cannot read service/article copy or internal links. This does not prove Google render failure. Add initial public content incrementally using a shared, safe renderer or controlled prerendering integrated with current architecture; preserve React interactions and avoid duplicate visible text. Pilot landing/articles before broader adoption. Do not introduce crawler-specific content differences. [Google's rendering guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering) favors sustainable rendering over a bot-specific workaround.
- **Complexity:** large, 5–10 days for a tested pilot, broader rollout separately scoped.

### SEO-12 — Archive pagination and search navigation lack crawlable links

- **Category / severity:** internal discovery; HIGH given archive/sitemap gaps. **Evidence:** blog shows 406 pages, previous/next are buttons, `page` is component state only; search results use buttons. Ordinary list cards do have real article anchors, a positive.
- **Affected URLs:** `/blog` archive/search and older articles reachable only via these interfaces or sitemaps.
- **Source:** `src/pages/BlogList.tsx`, `src/components/BlogSearch.tsx`, `src/hooks/useSearch.ts`.
- **Recommendation:** stable paginated URLs with real next/previous anchors and self-canonicals; refresh/back should restore page state. Keep transient filter/search combinations out of the index as appropriate without blocking article discovery. Render initial archive links with SEO-11. Avoid canonicalizing all archive pages to page 1.
- **Complexity:** medium, 1–2 days before rendering work.

### SEO-13 — Footer has placeholder links and an incorrect team fragment

- **Category / severity:** linking/conversion/trust; MEDIUM. **Evidence:** privacy, terms, cookies, ethics, press and corporate socials point to `/#` or `#`; About points to `/#team`, while Team section is `id="about"`. Six service labels all point to `/#solutions`.
- **Affected URLs:** every page containing Footer.
- **Source:** `src/components/Footer.tsx`, `src/components/Team.tsx:82`, `src/components/Solutions.tsx`.
- **Recommendation:** correct known fragment; link verified profiles; owner-approved policy pages or remove misleading placeholder affordances. Link service labels to specific relevant detail content when available. Existing personal profiles are not automatically corporate profiles. Policy text needs owner/legal review; no legal compliance conclusion is made here.
- **Complexity:** small for links; 1–3 days plus content approval for policies.

### SEO-14 — Desktop navigation is hover-only and clipped at intermediate width

- **Category / severity:** accessibility/conversion; HIGH. **Evidence:** Header dropdown parent buttons have no click/keyboard/focus handlers or expanded state; visibility uses hover opacity/pointer-events without removing hidden buttons from keyboard order. A live screenshot at document width 823px showed clipped navigation; contact button bounds were x=938–1059, outside viewport. Clicking Language produced no open state in the inspected tree.
- **Affected URLs:** shared desktop header, especially widths above 768px but below the full navigation width.
- **Source:** `src/components/Header.tsx:143–234`, `src/index.css`.
- **Recommendation:** accessible disclosure behavior, focus management, Escape support, correct aria-expanded/controls and truly hidden closed items; use anchors for destinations. Adapt breakpoint/layout to measured content width so contact/language remain usable. Respect reduced motion. No aesthetic redesign is needed.
- **Complexity:** medium, 1–2 days; full keyboard and width matrix required.

### SEO-15 — Blog publishing bypasses factual review and recent-topic memory is a stub

- **Category / severity:** content/trust; HIGH. **Evidence:** generation parses model JSON then immediately saves and updates sitemap; `listRecentTopics` always returns `[]`; news retrieval falls back to sparse sources when its content filter fails. Article A contains a 50-market expansion statement while its linked source title says 40; it also assigns June 26, 2023 to a GPT 5.6-family event. These are concrete inconsistencies requiring fact-checking, not proof every underlying story is false.
- **Affected URLs:** generated blog corpus; A is live content example.
- **Source:** `src/scripts/{generateHistoricalPosts,postPrompt,postUtils,newsService}.ts`, `server/routes.ts` generation job.
- **Recommendation:** source-backed claim checks, explicit review status and accountable reviewer, minimum evidence completeness, real recent-topic/semantic duplication review, factual-date validation, and a publication gate. Reject fabricated statistics/quotes and claims about Robles.AI's services. Word-count quotas are not quality controls; neither AI generation nor short length alone establishes a search penalty. [Google spam policy](https://developers.google.com/search/docs/essentials/spam-policies) concerns low-value scaled manipulation, not the mere use of AI.
- **Complexity:** medium–large, 3–5 days for controls plus ongoing human editorial work. No automated removals recommended.

### SEO-16 — Commercial service intent lacks dedicated depth and links

- **Category / severity:** information architecture; MEDIUM. **Evidence:** route registry has no dedicated enterprise service pages; landing describes six services briefly; footer routes every service to one generic section; A's business-fit prose includes no specific service link. Existing demos supply valuable proof-of-capability, not proof of client outcomes.
- **Affected URLs:** `/`, `/get-started`, `/demos`, blog articles.
- **Source:** `src/App.tsx`, `src/pages/Landing.tsx`, `src/components/{Footer,Solutions,DemosCatalog}.tsx`, locale files.
- **Recommendation:** strengthen current consulting offer and create only differentiated RAG, custom AI and agent/workflow pages as evidence and demand justify. Contextual article→service→demo→diagnosis paths. See Content Strategy.
- **Complexity:** medium per page, 1–3 engineering/content days plus expert review.

### SEO-17 — Application tracking omits GTM page/custom-event delivery and lead-success hooks

- **Category / severity:** measurement; MEDIUM. **Evidence:** live GTM is active. `trackPageView`/`trackEvent` send only when direct GA/Meta flags are set; GTM branch returns before setting those flags. `trackDemoEvent` does push to dataLayer. Contact success, quiz and landing CTAs have no equivalent application-owned lead-success event hooks in inspected sources.
- **Affected URLs:** SPA routes, contact/quiz/landing funnel, article modal navigation.
- **Source:** `src/lib/analytics.ts`, `src/App.tsx`, `src/components/Contact.tsx`, `src/pages/{Quiz,Landing}.tsx`, `src/hooks/useBlogModalRouting.ts`.
- **Implication / recommendation:** app cannot independently guarantee complete measurement under its live mode. GTM may already implement history/form triggers, so actual lost or duplicate events are unverified. Inspect GTM/GA4 first, then use one deduplicated event contract across modes, success-based lead events and qualified-lead CRM feedback. No PII or user prompts in analytics; no new tracker without approval.
- **Complexity:** medium, 1–2 days plus account access.

### SEO-18 — Search field lacks an explicit accessible label

- **Category / severity:** accessibility; MEDIUM. **Evidence:** browser accessibility tree showed an unnamed text field; `BlogSearch` input provides placeholder but no label, aria-label or labelledby.
- **Affected URLs:** `/blog` search.
- **Source:** `src/components/BlogSearch.tsx`.
- **Recommendation:** translated explicit label, appropriate search semantics, accessible result/loading announcement; preserve debounce/abort behavior.
- **Complexity:** small, under 0.5 day.

## Potential Issues — additional verification required

| ID / priority | Evidence and uncertainty | Required next verification |
|---|---|---|
| **POT-SEC-01 / P0 verification** | `postbuild` copies all `server/data/` to `dist/data/`; `server/db.ts` puts SQLite with settings, admin and conversation data in `server/data`; `express.static` exposes the whole `dist` root. Source establishes an unsafe potential boundary; production file presence and nginx restrictions were not inspected. | Owner checks deployed file inventory and proxy/static access rules locally without downloading/exposing database contents. If a database snapshot is public, treat as a CRITICAL security incident and secure it before SEO work; remediation/rotation scope requires explicit owner authorization. Restrict public files rather than relying on robots.txt. |
| POT-01 / P1 | Indexing, selected canonicals, manual actions and render failures unknown. | Search Console URL Inspection/Page Indexing/Sitemaps and Bing URL Inspection; verified bot logs. |
| POT-02 / P1 | Root redirects verified, not deep paths, combined http+www or marketing parameter normalization. Article API accepts timestamp-prefix aliases; HTML resolver differs. | Small route matrix and full canonical inventory; preserve campaign parameters where needed, canonicalize them only according to intent. |
| POT-03 / P2 | Modal changes address bar while preserving list mount; no equivalent full metadata update found in BlogModal. | Browser open/next/previous/back/close test comparing title, OG, canonical, schema, language and analytics. Source risk, no live modal failure asserted. |
| POT-04 / P2 | LCP/INP/CLS and real mobile experience unknown; homepage eager modules and animations, translations before React mount, external fonts and tracking can add work. | Mobile/desktop Lighthouse and DevTools trace in controlled lab; CrUX/Search Console field data, real interactions for INP. |
| POT-05 / P2 | Some numbers in landing marketing lack visible adjacent citations; case studies show illustrative results and explicitly disclose they are not client results. | Owner substantiates landing claims, biographies, business establishment/date, address and comparative savings. Keep illustrative disclosure; do not mark examples as verified customer results. |
| POT-06 / P2 | Repository contains repeated headline groups, generic news breadth, no modification/reviewer fields in historical sample. No full production similarity audit. | Export production read-only inventory, stratified expert review and near-duplicate similarity analysis before merging, noindexing or removing anything. |
| POT-07 / P2 | No Google/Bing verification markers or integration located in inspected code. | DNS/file-based verification may exist outside source. Owner verifies property ownership/access; absence of source tags is not a defect. |
| POT-08 / P2 | No CDN configuration available; no proven WAF crawler exclusion; general security audit not performed. | Owner reviews edge/proxy, verified bot logs, cache and security tests. Do not weaken WAF/auth/CORS for crawler access. |

## Blog and content assessment

The snapshot's 801 historical English bodies ranged from 282 to 813 whitespace-counted words (median 477); 515 were under 500, one under 300. Two normalized title groups repeat, but no exact English body hash repeated. This is **historical source-only evidence**, not current corpus counts or proof of low quality. All 801 lacked top-level image, author, reviewer and modification-date fields; some attribution is supplied separately by UI/editor data. Current article A visibly reports 799 English words and 997 Spanish words. Increased length alone will not solve accuracy or originality.

Positives: article H1 and H2 body sections, table of contents, visible sources, bilingual content, dates, AI-assistant disclosure and real article anchors in the listing. Problems: generic multi-story news can dilute relevance to enterprise buyers; A mixes crypto security, Sony startup products and stablecoin expansion. Its business-fit section claims capabilities without linking to a relevant implementation page. The generation prompt mandates numerical facts/quotes and a 2,000-word minimum without a verified evidence gate. Replace quotas with answer completeness and verifiable claims; never invent missing facts to meet a prompt.

Recommended editorial rubric: factual correctness and source provenance; original engineering explanation; audience/job relevance; clear attribution and review date; reproducible implementation or useful decision framework; appropriate commercial next step. Score a sample by month, topic, language and traffic before setting retain/update/consolidate decisions. Preserve URLs while correcting content where possible; no mass deletion/noindex based on generation method.

Publish fewer, stronger technical pieces: RAG retrieval evaluation with released test cases; agent tool-permission and human-approval patterns; document extraction precision/recall with labeled samples; Cloud Run cold-start measurements with reproducible environment; ERP connector failure handling; model cost/latency tradeoffs with date/model/settings. Separate measured results, lab demonstrations and illustrative scenarios. Publish code, methodology, limitations and citations when permission permits. Connect each to a relevant service and demo with descriptive anchors.

## Content Strategy — commercial search intent hypotheses

No paid keyword tool, search-volume export or difficulty data was available. Recommendations below are **intent/business hypotheses**, not volume-backed keyword research. Validate with Search Console queries, sales interviews and a focused SERP review before final URLs/copy. Existing public claims are not independently verified commercial delivery evidence.

### Service portfolio decision

| Candidate | Decision | Overlap and reason |
|---|---|---|
| AI consulting | Improve existing `/get-started` | Own diagnosis, prioritization and roadmap intent; do not launch a competing consulting page initially. |
| Custom AI development | First dedicated engineering page | Covers implementation lifecycle and production delivery; distinct from advisory/diagnosis. |
| Enterprise RAG | First specialist page | Existing RAG/document demo provides specific technical depth; enterprise permissions/evaluation need expert evidence. |
| Agentic AI | Conditional first-wave page | Combine agents, workflow automation and integration around governed actions. Separate from retrieval-only RAG. |
| Generative AI applications | Supporting topic under custom AI | Separate generic page would overlap heavily with custom development and RAG/agents. |
| MLOps consulting | Defer standalone | Need buyer demand and credible operating/monitoring evidence; include production operations in custom development. |
| ML engineering | Defer standalone | Predictive ML/forecasting section under custom development initially; split when use cases and demand warrant. |
| Computer vision | Conditional second wave | Working browser demos justify capability explanation; require deployment/data/privacy evidence before promising enterprise outcomes. |
| AI workflow automation | Merge with agent/integration offer | Avoid separate near-identical agent and automation pages. |
| Enterprise AI integration | Cross-cutting topic initially | Show integrations on development/agent/RAG pages; separate only for distinct ERP/connectors buyer demand. |

### Proposed page briefs

**C1 — Existing consulting/diagnosis landing (SEO-16).** Audience: enterprise sponsors, operations leaders and IT decision makers in US/LatAm. Intent: evaluate an AI consultant and reduce project uncertainty. Primary topic: enterprise AI consulting/diagnosis; supporting topics: readiness, data/process audit, prioritization, security, roadmap and delivery governance. **URL:** retain `/get-started`, Spanish `?lang=es`. **Title:** “Enterprise AI Consulting & Roadmaps | Robles.AI”. **H1:** “Enterprise AI Consulting: From Diagnosis to Delivery”. Outline: buyer problems and qualification; diagnosis deliverables; four-stage process; sample clearly illustrative roadmap; who performs/reviews work; verified experience; engagement scope/pricing if owner approves; FAQs grounded in real buying questions; diagnosis/contact CTA. Links: homepage, proposed custom/RAG/agent pages, `/diagnostico-ia`, relevant technical guides. Relevance: strongest existing conversion offer; owner decides whether SME pricing/scope matches enterprise positioning.

**C2 — Custom AI development (SEO-16).** Audience: CTOs, product and engineering leaders. Intent: procure a delivery partner. Primary topic: production custom AI applications; supporting topics: discovery, model/API selection, cloud architecture, secure integration, evaluation, observability and handover. **URL:** proposed `/services/custom-ai-development`. **Title:** “Custom AI Development for Enterprise Systems | Robles.AI”. **H1:** “Custom AI Applications Built for Your Enterprise Workflows”. Outline: problems and qualification; delivery stages and acceptance criteria; architectures and integration boundaries; verified technologies in context; evaluations/security and operations; working demos; evidence/limitations; engagement CTA. Links: RAG, agents, consulting, document extraction and forecasting demos, implementation articles. Relevance: broad delivery umbrella, avoids a second generic generative-AI page.

**C3 — Enterprise RAG (SEO-16).** Audience: knowledge-management, support, legal/operations and IT platform teams. Intent: implement trusted search/answers over internal information. Primary topic: enterprise RAG solutions; supporting topics: connectors, ingestion/chunking, retrieval/reranking, permission filtering, citations, evaluation, freshness and operating cost. **URL:** proposed `/services/enterprise-rag`. **Title:** “Enterprise RAG Solutions & Knowledge Assistants | Robles.AI”. **H1:** “Enterprise RAG with Traceable Answers from Your Data”. Outline: suitable/unsuitable problems; architecture and supported sources; permission and tenancy model; evaluation methodology; live demo with limits; pilot deliverables; production monitoring; consultation CTA. Links: `/try-rag`, `/try-docextract`, custom development, agent integration, original retrieval benchmarks. Relevance: demonstrated capability with a clear enterprise problem; do not imply the public demo already implements every enterprise control.

**C4 — Agents, automation and integration (SEO-16).** Audience: operations/IT teams automating multi-step workflows. Intent: buy agents that act safely in enterprise systems. Primary topic: governed AI agent development; supporting topics: tools/MCP, APIs/ERP, approvals, least privilege, audit logs, reliability, workflow evaluation and fallback. **URL:** proposed `/services/ai-agents-automation`. **Title:** “AI Agent Development & Workflow Automation | Robles.AI”. **H1:** “AI Agents That Connect and Execute Business Workflows”. Outline: use-case qualification; distinguish workflow/agent/chatbot; tool and approval design; integration architecture; measurable evaluation; demo limitations; phased delivery and human escalation; CTA. Links: `/try-langchain`, chatbot and transcription demos where relevant, RAG retrieval component, consulting, secure-agent technical guides. Relevance: consolidates overlapping commercial topics; launch only with expert-reviewed capability evidence.

**C5 — Conditional computer vision page (SEO-16).** Audience: manufacturing/retail/logistics operations and engineering. Intent: evaluate image/video inspection and counting systems. Primary topic: enterprise computer vision; supporting topics: data collection, annotation, precision/recall, edge/cloud deployment, latency, privacy, human review. **URL:** proposed `/services/computer-vision`. **Title:** “Computer Vision Solutions for Business Operations | Robles.AI”. **H1:** “Computer Vision for Inspection, Counting and Operational Insight”. Outline: selected problems; data needs; evaluation by operating conditions; browser demo versus production architecture; limitations/privacy; pilot acceptance criteria; CTA. Links: object-detection demo, custom development, evaluation guides; do not market emotion inference or medical analysis as validated outcomes. Relevance: useful specialist capability, secondary to consulting/RAG/custom until delivery evidence is available.

Information architecture: homepage → consulting and three focused service pillars → relevant demos and original technical guides → diagnosis/contact. The blog remains informational; demos remain hands-on proof. Avoid city/industry doorway pages, technology keyword inventories and near-identical English/Spanish pages generated without review. Industry pages require distinct, substantiated expertise and useful content first.

## Structured-data architecture recommendations

Keep existing Organization, BlogPosting and BreadcrumbList machinery. Add stable `@id` relationships and WebSite/WebPage context where useful. Service schema belongs on an actual service page and must match visible scope. Person belongs only to real accountable people with verified biographies; Organization is appropriate for organizational authorship. FAQs must be visibly useful and genuine; no FAQ rich-result promise. No ratings, reviews, certifications, awards, customer results or addresses should be inferred or fabricated. Address text already appears publicly, but business validation is required before expanding structured claims. SearchAction should only describe a working URL-search interface; `useSearch` currently initializes from empty state, so test `/blog?q=...` before emitting it.

## GEO Strategy

### Established foundations

Fix the same content, language, canonical and discovery issues that affect ordinary search. State clearly who Robles.AI serves, what it delivers, its process, named accountable experts and demonstrable limits. Initial service/article HTML, semantic headings, descriptive links, verified entity profiles and precise source citations improve machine interpretation. Real demos are a differentiator; publish explanations of architecture and measured behavior beside them. Do not use illustrative case metrics as client results or create invented testimonials.

Current robots wildcard permits crawling generally, including search and training agents; there is no specific AI-agent block in the inspected file. This is a policy observation, not proof that agents have crawled or cited the site.

| Agent | Purpose / policy implication |
|---|---|
| Googlebot / Bingbot | Search discovery/indexing. Current wildcard allows; actual fetch/render/index outcomes require logs and webmaster tools. |
| OAI-SearchBot | ChatGPT search crawler. Preserve public search access if that is the owner's intent; permission does not guarantee citation. |
| GPTBot | Potential foundation-model training collection. Its policy can differ from search access; owner should choose intentionally. |
| ChatGPT-User | User-triggered fetches, not automatic search crawling; robots restrictions may not apply. |
| PerplexityBot | Search discovery/linking, not foundation-model training according to vendor documentation. |
| Perplexity-User | User-triggered retrieval; vendor says it generally ignores robots.txt. |

OpenAI's search, training and user-fetch controls are distinct. [Official crawler documentation](https://developers.openai.com/api/docs/bots). Perplexity documents the analogous search/user distinction. [Perplexity crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers). Do not automatically allow additional training agents or weaken authentication/WAF to satisfy discovery. Any owner-selected policy should be validated against current official agents and verified traffic; robots.txt is not access control.

### Experiments, separately scoped

Optional `llms.txt`, concise human-readable capability summaries, and a repeatable question/citation monitoring set can be tested after core corrections. No evidence here establishes that llms.txt is required by search or that it improves inclusion. Record query, platform, date, answer, cited URL and factual correctness; volatile manual observations are not a ranking score. Google's [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) emphasizes the existing SEO foundation; no single markup or GEO tactic guarantees results.

## Performance audit

### Actual network observations

Single unthrottled curl transfers from this audit environment; these are resource diagnostics, not browser lab scores or field metrics.

| Resource | Decoded size | Transferred compressed body |
|---|---:|---:|
| Main `index-CaFpm2sA.js` | 512,582 bytes | 150,578 bytes |
| Four modulepreloaded JS chunks, combined | 346,408 bytes | 103,996 bytes |
| **Main plus preload JS** | **858,990 bytes** | **254,574 bytes** |
| Main stylesheet | 175,948 bytes | 25,092 bytes |

JS/CSS responses used gzip and immutable caching. Single-request TTFB was roughly 0.29s for main JS and 0.31s for CSS; this is not page LCP. Totals exclude route chunks, translation chunks, fonts, images and third-party scripts. No assertion about parse/CPU cost can be made from transfer sizes alone.

Positives: route lazy loading, manual vendor chunks, font preconnect and `display=swap`, lazy/async decoding on many noncritical images, reserved hero containers, reduced-motion support and HTTP compression. Risks to measure: eager Home sections and blog routing in the shared entry; both locale imports awaited before render; Google Fonts stylesheet; globally loaded chat/analytics; motion work; heavy CV/PDF modules on demo routes. Do not eager-load model weights on unrelated pages or remove all preloads without a trace. Correct HTML caching before cache tuning elsewhere.

Targets after a field baseline: 75th-percentile LCP ≤2.5s, INP ≤200ms and CLS ≤0.1, segmented mobile/desktop. These are [Core Web Vitals thresholds](https://web.dev/articles/vitals), not measurements of Robles.AI. Capture three controlled cold/warm lab runs per representative route and field distributions where sufficient traffic exists. Prioritize the measured LCP element, layout shifts, long tasks and API waterfalls; avoid indiscriminate architectural complexity.

## Accessibility and conversion UX

Confirmed issues are SEO-14 and SEO-18; language mismatch in SEO-07 also affects assistive technology. Positives in source include a main landmark, labeled footer/primary nav, form labels/error components, image alt text, reduced-motion support and a blog modal with focus-trap/restore logic. Confirm actual behavior with keyboard and assistive-technology testing; source intent is not an accessibility pass.

The 823px screenshot establishes a real header clipping issue. Mobile menu presence was observed in narrower browser states, but precise 360/390/768px regression, 200% zoom, contrast ratios and all form error states were not measured. Test without submitting production leads. Keep clear consultation/diagnosis CTAs, link phone/email directly where useful, explain data treatment next to demos/forms, and connect legal/trust links to real content. Substantiate pricing comparisons and experience claims; keep illustrative results labeled. Do not add friction or visual redesign without a measurable conversion hypothesis.

## Quick Wins

1. Correct robots sitemap pointer (SEO-04).
2. Repair existing metadata path/fallback handling and route coverage (SEO-03).
3. Let homepage use existing injector and revalidate HTML (SEO-01/02).
4. Align clean article canonicals and locale state (SEO-06/07; test together).
5. Replace broken image URLs with verified existing assets (SEO-10).
6. Correct footer fragment, verified profile destinations and search label (SEO-13/18).
7. Fix header keyboard behavior and clipping (SEO-14).

Sitemap backfill is high impact but depends on production inventory and canonical policy. It is not a safe one-command quick fix. All listed changes remain proposals awaiting approval.

## Architectural Recommendations

- Keep React/Vite/Express. Consolidate existing metadata rather than adding parallel head managers.
- Establish a single public route/locale/canonical contract shared by raw HTML, browser navigation and publishing.
- Restrict public static exposure, separate HTML/hashed asset cache policies, and make unknown routes/errors truthful.
- Pilot server-visible content for the consulting page, archive and article templates using shared content and escaping. Adopt hydration or a carefully scoped static-content enhancement only after compatibility testing; no hidden SEO duplicate bodies.
- Generate sitemaps from publication inventory; keep content, FTS/listing/slug indexes and sitemap publishing consistent and observable.
- Add factual/editorial gates and real update provenance before accelerating publishing.
- Add production-artifact integration checks to deployment workflow. Existing middleware mocks do not exercise static ordering or bundled file paths.

## Measurement Plan

| Metric | Authority/source | Baseline and success assessment |
|---|---|---|
| Impressions, clicks, CTR, average position | Search Console; Bing Webmaster Tools | Export 90-day baseline by query/page/country/device; group branded/nonbranded and commercial/informational. Compare 28-day periods with seasonality and release annotations; no promised rank lift. |
| Indexed pages and selected canonical | Search Console Page Indexing/URL Inspection; Bing inspection | Cohort known public URLs, exclude intentional utility/private pages. Record coverage, exclusions, last crawl and rendered output. Sitemap counts are not index counts. |
| Organic landing engagement | GA4 under existing approved configuration | Session source/medium + landing page + language; audit SPA page views, modal paths, duplicates and consent behavior before relying on trends. |
| Lead conversion | Successful contact submission, quiz email verification, consultation CTA; CRM qualification | Distinguish clicks, submitted leads, verified leads and qualified opportunities. Deduplicate event IDs, exclude admin/tests/bots; never transmit message bodies, email or tokens. |
| Business results | CRM/sales with owner access | Qualified organic leads, opportunity rate and pipeline where attribution is supportable; content traffic alone is not the business objective. |
| Technical correctness | Release HTTP/browser checks | Nonempty intended metadata, consistent canonicals/languages, real 404s, valid sitemap inventory and image responses. Target zero regressions in release samples. |
| Performance | Lab traces + CrUX/Search Console field data | Route/device cohorts, p75 CWV when sample sufficient; compressed bytes and long tasks before/after, not invented PageSpeed scores. |
| AI discovery | Verified crawler logs; manual citation sample; referral analytics | Access/error trends and attributable qualified visits. Citation presence is variable and cannot prove total visibility. |

Review release checks immediately, technical/indexing cohorts after recrawl, and business/content trends at 28/56/90 days. Establish numerical growth goals only after baseline and lead-volume review. Search Console/Bing settings and new third-party tracking are outside current authorization.

## Testing strategy

Use existing Vitest, Supertest, fast-check, jsdom and Testing Library where installed in the real checkout. The snapshot has 76 test files; SEO tests include builders, HTML injector, slug index, middleware and sitemap tests. **No project test suite was executed** because no dependencies/build were available and starting the application can write data/run jobs. Python standard-library XML parsing, JSON parsing and HTTP response comparisons were performed as diagnostics.

- Add production-bundle integration fixtures for root/static/article serving, paths, language and cache headers; isolate DB/jobs and use temporary fixtures. Never import full route registration into an uncontrolled test.
- Assert one nonempty title/description/canonical per public route, correct OG/Twitter URLs, matching server/client metadata after navigation and modal close.
- Test EN/ES slugs, legacy queries, locale variants, saved preference conflicts, reciprocal alternates and initial/rendered `lang`.
- Validate sitemap XML, escaping, inventory coverage, canonical-only locations and reciprocal language entries; reject missing assets/redirect targets and private/utility routes. Validate exact robots sitemap target.
- Test known/missing article, missing asset, unknown page, trailing slash, legacy aliases, and redirect query/path preservation; distinguish 404 from 5xx.
- Parse JSON-LD; check valid dates, real authorship, entity URLs, actual image content types and visible-content consistency. Use Rich Results Test/Schema.org validator manually before release; semantic validation exceeds JSON parsing.
- Test real link destinations/fragments, page-2 reload/back behavior and accessible header/search interactions.
- Browser automation is available through the audit browser; standalone Playwright is not an existing package dependency. Add a browser package only with approval if needed for CI. Do not install unnecessary packages.

## Implementation Roadmap

| Phase | Scope / IDs | Dependencies | Estimated effort |
|---|---|---|---|
| **P0 — verify critical boundaries** | POT-SEC-01 owner checks; production SHA/data/deployment inventory; baseline exports | Owner/server read access; no sensitive HTTP downloads | 0.5–1 day verification; incident work separately scoped if confirmed |
| **P1 — technical corrections** | SEO-01–10, SEO-12, SEO-14, SEO-18; production-path tests and public/static boundary correction if needed | Canonical/language contract, correct checkout, isolated artifact test, approved release | ~7–12 engineering days in small batches; sitemap/content inventory may add time |
| **P2 — content and architecture** | SEO-11, SEO-13, SEO-15–17; consulting/3 service pilots, internal links, editorial gates and measurement | Expert/owner review, GTM/GSC/Bing/CRM access, rendering prototype and security review | ~3–6 weeks across engineering/editorial; optional pages separately scheduled |
| **P3 — measured optimization/GEO experiments** | POT-03–08; trace-led performance, original benchmarks, optional llms.txt/citation monitoring | Correct P1 baseline and trustworthy measurement | 1–3 weeks initially, then periodic review |

Estimates overlap and are not additive guarantees. No critical indexing outage is confirmed; P0 is a verification gate. See [SEO_IMPLEMENTATION_PLAN.md](SEO_IMPLEMENTATION_PLAN.md) for issue-level files, risks, tests and outcomes. Application implementation and production changes require owner approval; this audit stops at documentation.


## Post-audit implementation note — October 18, 2026

The owner subsequently authorized local implementation of Batches 1–4 in an isolated checkout. See the implementation record in [SEO_IMPLEMENTATION_PLAN.md](SEO_IMPLEMENTATION_PLAN.md) for the exact changed files, passing checks and remaining baseline TypeScript errors. Production has not been deployed or reclassified as fixed. Actual deployed data exposure, indexing, field performance and account metrics remain unverified.


## Nueva auditoría de producción tras PR #6

### Executive summary actualizado

**El sitio está operativo en los recorridos públicos comprobados y el despliegue está confirmado. La corrección bilingüe está parcialmente cerrada: HTTP, schema, sitemap y modal funcionan, pero la tarjeta del archivo todavía construye su href por separado.** Hero, landing, catálogo y DemoNav conservan idioma. Los CTA de CaseStudies y SavingsCalculator requieren una pasada adicional.

- **Release:** [PR #6](https://github.com/jroblesluna/robles.ai/pull/6), commit de cambio `399a437f8c60e66baf1a8db06ffc5479f4640d84`, commit de fusión `1c3a39b8d846a35b714eacb1f9a0483535a3bef2`.
- **Despliegue:** [Deploy to VPS](https://github.com/jroblesluna/robles.ai/actions/runs/39147363968), `completed / success`, mismo SHA de fusión.
- **Fecha y método:** 18 octubre 2026, aproximadamente 17:35–17:39 UTC (10:35–10:39 PDT). HTTP público con curl y TLS validado, XML/JSON/HTML analizados con biblioteca estándar, navegador real y contraste con fuente en `~/Dev/robles.ai`.
- **Alcance:** 155 resultados conservados en el diagnóstico HTTP principal, incluido muestreo de compresión; un HEAD adicional de asset inexistente; 21 sitemaps completos; 34 URLs estáticas; 59 respuestas de artículos (incluido un variante UTM). Navegación a 1280 px por portada ES, landing ES, diagnóstico ES, artículo con colisión EN/ES, archivo EN página 2, modal, RAG ES y Forecast ES. Los artículos fuera de los nueve casos se muestrearon, no se rastreó individualmente todo el corpus.
- **Acciones:** solo lectura de producción y actualización de estos dos documentos. Sin fixes de aplicación, commit, push, PR, merge, deploy, cambios de datos o configuración durante esta auditoría.

### Resultado de los dos puntos solicitados

| Punto | Estado actual en producción | Evidencia y límite |
| --- | --- | --- |
| Nueve slugs EN/ES compartidos | **Corregidos HTTP, canonical, alternates, schema y sitemap; modal correcto. Cierre parcial hasta POST-03.** | Las 18 URLs (9 EN con `?lang=en`, 9 ES limpias) responden 200 con idioma y canonical propios. Los nueve `?lang=es` redirigen 308 a su ES limpio. El archivo aún enlaza por separado al slug limpio en una tarjeta EN comprobada. |
| CTA del Hero y landing pierden ES | **Corregido en esos componentes.** | Todos los slides del Hero inspeccionados; clic real portada → `/get-started?lang=es` → `/diagnostico-ia?lang=es`, con H1, lang y canonical ES. El catálogo y DemoNav también conservan ES. Otros componentes no incluidos en esos CTA mantienen el defecto: POST-04. |

### Comprobaciones técnicas actuales

| Área | Resultado verificado |
| --- | --- |
| Inventario de sitemap | `sitemap.xml` referencia **21 hijos**: estático y 20 mensuales. Todos 200 y XML parseable. **24,366 loc y 24,366 URLs distintas**, cero duplicados. **34 estáticas + 24,332 URLs de artículos**, equivalentes a **12,166 pares**. API pública de listado reporta `total: 12166` en esa ventana. Es coherencia de conteos, no reconciliación registro a registro ni cifra de indexación. |
| Comparación con revisión anterior | La revisión anterior tenía 24,364 entradas pero 24,355 destinos únicos. Ahora hay 24,366 destinos únicos: los nueve pares ya se distinguen, además de un registro adicional en el inventario. No se atribuye a esto una mejora medida de rankings o tráfico. |
| Idiomas en XML | Todas las entradas revisadas tienen EN/ES/x-default, autorreferencia, destinos incluidos y relaciones recíprocas. EN y ES ya no comparten el mismo destino. Mayor XML observado: 810,449 bytes / 1,450 URL, por debajo de los límites de tamaño/cantidad. |
| Páginas estáticas | Las **34 URLs publicadas** responden 200 y canonical/lang coherentes con su entrada del sitemap. Descripciones y principales OG/Twitter no vacíos, únicos dentro de cada respuesta en los campos comprobados. No se observaron errores de estas aserciones en las muestras 200. |
| Artículos y JSON-LD | **59 respuestas de artículos 200**: BlogPosting presente con `inLanguage`, `mainEntityOfPage` y canonical coherentes; fecha publicada con sintaxis ISO y zona horaria. Cero fallos de JSON.parse en schema. Esto no equivale a una certificación de rich results ni validación factual del contenido. |
| Canonical del caso compartido | `.../2026-10-15-18-00-00-shivoo-studios-reality-reframe-podcast?lang=en` conserva EN y devuelve título inglés; la ruta limpia conserva ES y título español. La versión con UTM sigue EN, conserva el parámetro en la respuesta y canonicaliza al EN sin UTM. |
| Compatibilidad | Un artículo con slugs distintos mantiene 308 de EN + `?lang=es` a ES limpio y de ES + `?lang=en` a EN limpio. Las rutas con barra final comprobadas redirigen 308 conservando parámetros. |
| Archivo y modal | `/blog?page=2` mantiene título “Page 2”, canonical y paginación real. El modal del caso compartido muestra EN, conserva `?lang=en`, canonical/alternates y enlace de abrir en pestaña nueva correctos. Sus enlaces de idioma apuntan a las dos versiones actuales. Cerrar restaura archivo página 2, metadatos y foco en tarjeta. **El href de la tarjeta restaurada sigue incorrecto**, POST-03. |
| Robots | 200; `Sitemap: https://robles.ai/sitemap.xml` correcto. `User-agent: * / Allow: /` conservado; no se añadieron políticas específicas de entrenamiento o búsqueda. |
| Indexación de utilidades | `/blog?q=rag` y `/try-medical` anuncian `noindex,follow`; la demo médica sigue “Coming Soon” y fuera del sitemap. Ausencia de meta robots en páginas indexables es compatible con la conducta predeterminada, no un fallo. |
| Errores | Página inexistente, artículo inexistente y sitemap inexistente: 404. Las páginas HTML de error incluyen noindex. HEAD de un JS inexistente también 404 `text/plain`, sin sustitución por shell 200. |
| Dominio | Raíz HTTP y www HTTPS: 301 a `https://robles.ai/`, cuyo GET es 200. No se probó cada combinación de dominio, ruta y parámetros. |
| Frontera pública | HEAD a `/index.js`, `/server/index.js`, `/shared/seoPolicy.ts`, `/src/i18n/locales/en/translation.json`, `/data/dominical.db`: 404. No se descargaron cuerpos potencialmente privados. No demuestra ausencia de copias adicionales ni resuelve exposición histórica. |
| Interfaz y accesibilidad | H1/idioma/canonical consistentes en recorridos de landing, diagnóstico y artículo EN/ES. Modal conserva foco al cerrar. Sin overflow horizontal observado a 1280 px en las páginas comprobadas; RAG terminó sin imágenes fallidas. No se observaron errores de consola en las consultas de archivo/modal y RAG. No se certifica accesibilidad completa ni todos los tamaños móviles. |
| Renderizado | Las **99 respuestas HTML 200** del diagnóstico inicial carecen de H1 en HTML fuente; el navegador sí renderiza contenido. Se mantiene CSR con inyección del head, no SSR de contenido. Esto limita fetchers sin JS, pero no demuestra falta de indexación por Google. |

### Los nueve pares comprobados

Para cada sufijo siguiente bajo `/blog/`, **ruta limpia = ES / 200 / canonical propio** y **misma ruta + `?lang=en` = EN / 200 / canonical propio**:

- `2026-07-11-11-00-00-china-quantum-dim-mak`
- `2026-08-30-09-00-00-elon-musk-starlink-grok-bot-robotaxis`
- `2026-08-31-08-00-00-howard-stern-hbo-max-netflix-meta`
- `2026-09-01-20-00-00-burning-man-ai-atlas-manchester-city`
- `2026-09-03-04-00-00-nvidia-hugging-face-anker-mindbase-philips-hue`
- `2026-09-08-03-00-00-meta-muse-pentagon-ai-apple-watch`
- `2026-10-01-18-00-00-meta-vr-glasses-vs-apple-vision-pro`
- `2026-10-12-05-00-00-apple-home-siri-ai-fitbit-edge`
- `2026-10-15-18-00-00-shivoo-studios-reality-reframe-podcast`

### POST-03 — El href de la tarjeta inglesa no usa la política compartida

- **Categoría / severidad / prioridad:** multilingual, internal linking y UX; **MEDIUM / P1**. Omisión de la implementación del PR #6; no fallo general del servidor ni del sitemap.
- **Evidencia de producción:** en `https://robles.ai/blog?page=2`, la tarjeta de “Shivoo Studios Launches Reality Reframe to Demystify XR for Business Leaders” tiene `href="/blog/2026-10-15-18-00-00-shivoo-studios-reality-reframe-podcast"`. Ese destino responde español, confirmado por HTTP y navegador. Su clic normal es interceptado y abre correctamente el modal EN, que sí cambia a `?lang=en`; la acción de compartir/abrir desde el modal también es correcta. Cerrar restaura el foco al anchor con el href incorrecto.
- **Afectados:** tarjetas EN de los registros con slug compartido; una tarjeta comprobada en DOM. La misma expresión de fuente se aplica a los otros ocho casos, aunque no se inspeccionó su tarjeta individual en cada archivo paginado.
- **Fuente / causa:** `src/pages/BlogList.tsx:335` construye `/blog/${post.translations[lang].slug}` directamente. No consume `listPostPath` de `src/lib/blogModal.ts`, que sí contiene la corrección. Las pruebas anteriores cubrieron el helper y el modal, pero no el href renderizado de BlogList: falta esa prueba de integración.
- **Implicación:** abrir tarjeta en pestaña nueva, copiar su enlace o seguir el anchor desde un crawler lleva a ES pese al contexto EN. No implica que EN esté inaccesible: su URL explícita está presente en sitemap y alternates.
- **Solución:** usar `listPostPath(post, lang)` para el href real de BlogList y probar el componente con slug coincidente, idiomas distintos y acciones de enlace nativas. Mantener el handler de clic normal del modal y su restauración de foco/historial.
- **Complejidad:** baja, aproximadamente 1–3 horas incluidas pruebas y comprobación posterior de producción. No requiere editar slugs, datos históricos o routing.

### POST-04 — CaseStudies y calculadora mantienen CTA sin idioma

- **Categoría / severidad / prioridad:** multilingual y conversión; **MEDIUM / P1** para el recorrido comercial.
- **Evidencia de producción:** en portada ES, “Haz tu diagnóstico gratis” de Casos de Estudio enlaza a `/diagnostico-ia`. Clic real termina en URL sin parámetro, `lang=en` y H1 “Discover which AI solution your company needs”. En `/try-forecast?lang=es`, el CTA visible “Diagnóstico gratis” de la calculadora también tiene href `/diagnostico-ia`; el header de esa misma página sí tiene `?lang=es`.
- **Afectados:** portada ES y Forecast ES confirmados. La calculadora es compartida con otras demos, varias condicionadas a obtener un resultado. No se ejecutaron inferencias para mostrar esos estados; el alcance adicional se deriva de sus consumidores en fuente.
- **Fuentes:** `src/components/CaseStudies.tsx:471,661,691`; `src/components/demo/SavingsCalculator.tsx:321`. `src/components/demo/business.ts`, `useGoToHomeSection`, también navega a `/` sin idioma: riesgo de pérdida de ES en el CTA de contacto, confirmado por lectura de código y pendiente de interacción en ese estado.
- **Implicación:** continuidad lingüística y conversión inconsistente fuera de los CTA ya corregidos. Se trata de un alcance residual, no de una regresión observada en Hero/Landing.
- **Solución:** aplicar `normalizeLanguage`/`staticPagePath` existentes a CaseStudies y calculadora; preservar idioma y fragmento al navegar al contacto desde `useGoToHomeSection`. Barrer enlaces internos de los componentes públicos activos para evitar más implementaciones independientes.
- **Complejidad:** baja a media, 0.25–0.5 día con pruebas en ambas lenguas, incluyendo navegación real a destino y hash correcto.

### Rendimiento, arquitectura, contenido y GEO: estado actual

Mediciones de transferencia HTTP de esta ventana, realizadas desde un único cliente y sin caché previa controlada; **no son Core Web Vitals, Lighthouse ni datos de campo**:

| Recurso público | Sin comprimir | Transferencia con gzip | Política actual |
| --- | ---: | ---: | --- |
| JS principal `index-CgZ6p9Ag.js` | 518,728 bytes | 153,348 bytes | `public, max-age=31536000, immutable` |
| CSS principal `index-DZ96IyBO.css` | 175,003 bytes | 25,025 bytes | `public, max-age=31536000, immutable` |
| HTML de portada | No se usa como presupuesto de contenido: es un shell con head inyectado | 1,081 bytes | `no-cache` |

La respuesta HTML comprimida tuvo TTFB de 0.130 s en esa petición; no permite concluir desempeño de usuarios reales. Los recursos de la página completa, imágenes, chunks secundarios y terceros no están incluidos en esos dos presupuestos. El SHA-256 del JS público es `0e60a7d6d36d886ade2ab493a69307d61178a0e4fa9b5794c7ca4634d906b218`; se registra para trazabilidad, sin afirmar igualdad con un build de otro entorno.

Siguientes mejoras del roadmap original, independientes de los dos pequeños fixes anteriores:

1. **P2 — Contenido inicial útil:** evaluar prerender/SSR selectivo de portada, landing y artículos, conservando el injector y React/Vite existentes. Incluir contenido visible equivalente, no texto oculto para bots. Validar fresh content, fallbacks y preservación de APIs antes de cambiar arquitectura.
2. **P2 — Evidencia comercial/editorial:** conservar `/get-started` como oferta de diagnóstico y roadmap; priorizar páginas diferenciadas de desarrollo personalizado, RAG y agentes/integración solo con evidencia de capacidad y aprobación editorial. Revisar utilidad, fuentes y declaraciones del blog. No se efectuó una nueva investigación de keywords/volúmenes ni un examen factual completo de 12,166 artículos.
3. **P2 — Medición:** baseline GSC/Bing, landing pages orgánicas y leads calificados en analítica/CRM; sin acceso a cuentas no se certifican indexación, posiciones, CTR ni conversiones. No añadir otro proveedor de tracking.
4. **P2/P3 — Rendimiento y GEO:** medir LCP/INP/CLS de campo y perfiles de carga antes de optimizar más bundles; reforzar contenido técnico original, identidad verificable y servicio específico. El head y XML son más coherentes; el cuerpo sigue necesitando JS. `llms.txt` y experimentos de GEO no sustituyen estos fundamentos ni garantizan inclusión/citas.

### Límites y criterio de cierre

No se enviaron formularios, leads o correos, ni se subieron archivos o activaron cámara/micrófono. Se revisó la carga de interfaces, no el resultado final de todos los servicios de IA. No se indujeron fallos 503 ni se probaron autenticación, administración, pagos, jobs o base de datos. No hubo SSH, cambio de DNS/proxy, invalidación de caché o revisión de filesystem del VPS. No se accedió a GSC/Bing/GA4/CRM ni a métricas privadas.

No se confirmó una incidencia CRITICAL ni caída general. **Para cerrar por completo el trabajo bilingüe, corregir POST-03 y POST-04 y verificar sus recorridos en producción**, manteniendo separados los pendientes originales de contenido/renderizado/medición. La actualización de esta auditoría no implementa ni publica esos fixes.


## Ciclo de cierre autorizado — POST-03 y POST-04

El propietario autorizó corregir, publicar, fusionar y repetir la auditoría una vez desplegado, iterando sobre los defectos de navegación bilingüe. Rama: `codex/complete-bilingual-navigation`. Implementación local: href real de BlogList mediante `listPostPath`; CTA de CaseStudies y calculadora localizados; contacto con idioma y fragmento; barrido adicional de FTS, empleos/postulación, equipo y enlace del informe del diagnóstico. FTS conserva idioma explícito porque solo proporciona el slug original. Parámetros de aplicación como `job` se preservan.

Las pruebas renderizan componentes reales y cubren EN/ES, slugs coincidentes y distintos, clic normal/modificado, modal, foco/historial, detalle de caso de estudio, diagnóstico y contacto de calculadora, empleos y enlace final del quiz. Se ajustó la sincronización de refs del modal antes de interacción con tarjetas recién comprometidas. **159 pruebas / 26 suites aprobadas**; el estado de producción se verificará después del despliegue. Los fallos iniciales intermitentes de apertura/cierre motivaron revisar esa sincronización, no omitir las pruebas. Sin cambios en datos de producción, APIs, dependencias o infraestructura.

Este ciclo cierra navegación bilingüe; no implica que SSR, contenido editorial, Core Web Vitals de campo o acceso a Search Console se hayan resuelto.


## Cierre verificado de navegación bilingüe

**Resultado:** POST-03 y POST-04 cerrados en producción. No se detectaron defectos adicionales en los recorridos de navegación bilingüe comprobados tras este release. No es una certificación de ausencia absoluta de defectos en todo el sitio ni cierre del roadmap general de SEO.

### Release y validación

- Código: [PR #7](https://github.com/jroblesluna/robles.ai/pull/7), commit `6a20f7552b73a1be43ad27623aacd8aaefe2eaf3`, fusión `78bb1bd4ec92ac9559f38a704dc673b0cce867cd`.
- [Despliegue del release](https://github.com/jroblesluna/robles.ai/actions/runs/39151534769): `completed / success` para ese SHA; se esperó su finalización antes de auditar.
- Local: **159 pruebas aprobadas en 26 suites**, build final aprobado. TypeScript: los mismos **13 errores preexistentes**, sin firmas nuevas. Se corrigió la sincronización de las refs del modal antes de la interacción con tarjetas recién renderizadas; después pasó el conjunto completo, incluidas apertura/cierre y pruebas del BlogList real.
- Auditoría HTTP posterior: 18 octubre 2026, aproximadamente 17:54 UTC; navegador hasta aproximadamente 17:58 UTC. Sin instalaciones, migraciones, cambios de datos de producción, tracking nuevo o cambios de infraestructura.

### Evidencia de cierre de POST-03

En `/blog?page=2`, el anchor real de Shivoo tiene `/blog/2026-10-15-18-00-00-shivoo-studios-reality-reframe-podcast?lang=en`. Se abrió ese destino en otra pestaña real y mostró H1, idioma y canonical ingleses. El clic normal conservó el modal EN, su URL explícita y enlace para nueva pestaña; cerrar restauró página 2, canonical y foco en la tarjeta con href correcto. En `/blog?lang=es&page=2`, la tarjeta usa el ES limpio. No se depende de que el handler del modal corrija un anchor equivocado.

### Evidencia de cierre de POST-04 y barrido relacionado

| Recorrido | Resultado posterior al despliegue |
| --- | --- |
| Portada ES / CaseStudies | Los dos enlaces de los diseños responsive contienen `?lang=es`; clic real llega a diagnóstico ES con H1 español. |
| Detalle de caso ES | Abierto mediante teclado; el CTA del viewer contiene `?lang=es` y su activación llega a diagnóstico ES. |
| Calculadora Forecast ES → diagnóstico | “Diagnóstico gratis” enlaza y llega a `/diagnostico-ia?lang=es`, H1 y `lang=es`. |
| Calculadora → contacto ES | URL `/?lang=es#contact`, canonical español y título “Contáctanos”. Tras asentarse el scroll, sección con top aproximado 84 px y H2 a 148 px dentro del viewport de 720 px. No se ejecutó el formulario. |
| Calculadora EN | Enlace de diagnóstico limpio `/diagnostico-ia`; CTA de contacto llega a `/#contact`, `lang=en`, canonical raíz y “Contact Us”. |
| Búsqueda FTS EN/ES | Resultado real de Shivoo conserva `?lang=en` / `?lang=es`. La búsqueda ES abre el artículo español y normaliza su canonical a URL ES limpia. Idioma explícito evita ambigüedad del slug original de FTS. |
| Equipo → Empleos ES | Navegación a `/careers?lang=es`; los cuatro enlaces de postulación conservan `job` y `lang=es`. |
| Postulación ES | Clic en oferta Full Stack llega a `/apply?job=fullstack&lang=es`, muestra “Postular Ahora — Desarrollador Full Stack” y canonical `/apply?lang=es`. Sin enviar datos ni currículum. |
| Enlace final del informe del quiz | Cubierto con fixture del componente real en EN/ES; no se generó un lead real para forzar la pantalla privada de resultado en producción. |
| Barrido de portada ES | Cero anchors internos de páginas estáticas públicas sin `lang=es`, excluyendo los selectores de idioma deliberados. Búsqueda de fuente de enlaces/navegación públicos cubrió las rutas modificadas; los endpoints de descarga API y enlaces externos no se transformaron. |

Los primeros intentos de interacción por coordenadas implícitas con contenido en movimiento se volvieron a inspeccionar antes de decidir; se repitió la navegación con la página asentada/teclado. No se clasificaron errores de selector o etiquetas de automatización incorrectas como fallos del producto.

### Auditoría técnica de regresión posterior

- **21 sitemaps**, todos 200 y XML parseable: **24,366 loc y 24,366 URLs únicas**, **34 URLs estáticas** y **12,166 pares de artículos**. API de listado: `12166`. Cero errores de reciprocidad, autorreferencia o destinos de idioma idénticos.
- **Nueve pares con slug compartido:** las 18 URLs canónicas EN/ES devuelven 200 con idioma/canonical correctos; compatibilidad de redirecciones y variante UTM conservada.
- **59 respuestas de artículos** con comprobaciones de idioma/schema/canonical: cero fallos; JSON-LD parseable. No equivale a rich results ni validación factual de cada artículo.
- Cero errores nuevos en las aserciones HTTP de metadatos, locale o red. Los 404 y 308 de prueba son los esperados; no se observaron 5xx en las muestras.
- Cache HTML `no-cache`; JS/CSS con hash mantienen cache inmutable y gzip. JS principal observado `index-S4tn7sms.js`, transferencia gzip **153,361 bytes**; CSS gzip **25,025 bytes**. No son LCP/INP/CLS ni presupuesto total de la página.
- HEAD de las rutas privadas comprobadas mantiene 404; no se descargó contenido potencialmente privado. Cero errores de consola en las consultas efectuadas sobre el recorrido final.

### Límites que se mantienen

Se verificaron recorridos concretos de frontend/HTTP, no cada interacción posible. No se enviaron formularios/lead/correo ni archivos, no se ejecutaron inferencias de pago o procesos de publicación, y no se revisaron administración o credenciales. Pruebas con fixtures cubren los estados que requerirían producir datos reales, especialmente el enlace del informe del quiz. La comprobación visual de esta ronda fue a 1280 px; no certifica todos los dispositivos ni accesibilidad integral.

SSR/prerender de contenido, revisión editorial, estrategia de servicios, métricas de campo y estado real de indexación siguen siendo trabajo independiente del roadmap original. No se accedió a cuentas de GSC/Bing/GA4/CRM, ni se cambiaron configuraciones de producción. No se declara que estas correcciones garanticen rankings o inclusión en buscadores de IA.


## Nueva iteración: HTML público y medición real — 18 octubre 2026

### POST-05 — Contenido inicial dependiente de JavaScript

- **Categoría / severidad:** renderizado y descubrimiento / MEDIUM; P1 de robustez, sin evidencia de un fallo general de indexación.
- **Evidencia anterior:** HTML HTTP de portada, landing, catálogo, archivo y artículos contenía metadatos pero un `#root` vacío. Google puede ejecutar JavaScript; eso no implica automáticamente que aquellas páginas no estuvieran indexadas. Otros clientes no ejecutan JavaScript.
- **Solución aplicada:** `server/seo/publicContent.ts` compone contenido semántico visible para cualquier visitante, sin detección de bots, dentro del mismo `#root`. Usa los locales y registros públicos existentes. `server/seo/metaInjector.ts` lo incorpora después del inyector de cabecera existente, conservando canonical, hreflang, estado HTTP y políticas de caché.
- **Alcance:** H1 y descripción por tipo de página pública, secciones comerciales de portada y landing, equipo visible y contactos compartidos con la SPA, cursos y casos con su advertencia de carácter ilustrativo, catálogo con enlaces válidos, ofertas de empleo, archivo paginado con 30 resúmenes y enlaces y texto completo de artículos con sus fuentes HTTP(S). Formularios, filtros/búsqueda y demostraciones continúan requiriendo JavaScript; las variantes filtradas del archivo siguen `noindex` y no presentan resultados sin filtrar como coincidencias.
- **Artículo directo:** se serializa exclusivamente su forma pública, escapando `<` en JSON. `src/lib/publicPost.ts` acepta el registro sólo para alguno de sus slugs. `BlogPost.tsx` lo usa de inmediato sin una segunda descarga del artículo; la atribución editorial opcional se obtiene por la API existente.
- **Arquitectura exacta:** HTML inicial semántico seguido por montaje de la SPA con `createRoot`; no es hidratación de todo el árbol ni SSR completo de los componentes interactivos. El montaje puede cambiar la composición visual; se debe medir CLS/LCP después de cada release, no asumir que mejora por entregar más HTML.
- **Seguridad:** textos y atributos escapados; fuentes limitadas a HTTP(S); prueba de cierre de script, HTML inyectado y campo extra privado; sin servir archivos JSON privados, sin modificar bases, trabajos, autenticación, CSP ni endpoints de generación.
- **Complejidad:** media; no incorpora framework, dependencias ni tracking nuevo.
- **Validación:** pruebas HTTP en layout de producción y fixtures aislados, HTML bilingüe, cuerpo y canonical coherentes, paginación, slugs compartidos, fuentes y bootstrap de artículo; build y revisión de diff. Resultado y comprobación live en el registro de despliegue posterior.

### MEASURE-01 — Indexación y posiciones reales: acceso externo pendiente

**Confirmado en interfaz de Google Search Console**, 18 octubre 2026: la propiedad de dominio `robles.ai` devuelve «Oops, you don't have access to this property» con la sesión disponible y el selector no muestra propiedades. No se intentó verificar propiedad ni cambiar permisos; se solicitó al propietario abrir una cuenta con acceso. Puede existir una propiedad de prefijo en otra cuenta: no se deduce que la organización carezca de Search Console.

No hay datos autorizados de cobertura, URL Inspection ni Search Analytics. Por tanto, **no están verificadas** la indexación real, el canonical elegido por Google, las impresiones, clics, CTR o posiciones por consulta. HTTP 200, sitemap, Lighthouse SEO 100 y búsquedas `site:` no sustituyen esos datos. Tampoco se inventan rankings a partir de resultados personalizados.

Con acceso: registrar 90 días con fechas exactas, consultas/páginas/dispositivo/país, separar EN/ES y marca/no marca; inspeccionar portada, landing, archivo y muestra de artículos EN/ES, incluido slug compartido. Conservar verdict de indexación y canonical de Google. Comparar cohortes a 28/56/90 días del release; posición media de Search Console describe ese conjunto, no una posición universal fija. No pedir indexación masiva ni modificar ajustes como diagnóstico.

### MEASURE-02 — Core Web Vitals de campo: consulta realizada, datos no disponibles

**Medición real consultada:** [PageSpeed Insights, móvil, portada](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Frobles.ai%2F&form_factor=mobile), informe del 18 octubre 2026 a las 11:04 PDT. La sección «Discover what your real users are experiencing» devuelve **No Data**. Su explicación: CrUX no tiene suficientes datos reales de velocidad para esta página. Esto verifica la indisponibilidad de la muestra pública; no establece que los CWV aprueben o fallen.

**Laboratorio anterior al lote POST-05:** Lighthouse 13.5.0, Moto G Power emulado, Slow 4G, carga inicial de una página: Performance **68**, Accessibility **92**, Best Practices **96**, SEO **100**; FCP **2,9 s**, LCP **3,2 s**, TBT **780 ms**, CLS **0,002**, Speed Index **3,8 s**. TBT no es INP de campo. Una ejecución no constituye un percentil de usuarios ni demuestra un cambio causal por release.

CrUX utiliza una ventana móvil de 28 días y mínimos de muestra/eligibilidad. No es posible fabricar ni acelerar retrospectivamente ese histórico mediante código. Con acceso a Search Console, revisar su informe de CWV por grupos/dispositivo. Si sigue sin muestras, diseñar RUM con la implementación oficial de Web Vitals y el sistema de medición ya aprobado, revisando consentimiento, muestreo, retención y umbral mínimo por cohorte antes de desplegarlo. **No se añadió tracking ni se instalaron dependencias en este lote.** Hasta entonces el resultado correcto de campo es «sin datos suficientes», no «resuelto/aprobado».

### Fuentes técnicas oficiales

- [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): Google puede renderizar JS; entregar contenido inicialmente sigue siendo útil para usuarios y otros crawlers.
- [Google: dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering): no se adopta una respuesta distinta por bot.
- [PageSpeed: datos de campo, laboratorio y elegibilidad](https://developers.google.com/speed/docs/insights/v5/about).
- [Search Console: URL Inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect): consulta del estado en el índice, distinta de un test HTTP live.

Los registros históricos anteriores se conservan; una observación anterior sobre ausencia de HTML no describe automáticamente la versión desplegada después de POST-05. Las dependencias externas de medición permanecen explícitas y no impiden validar el código o el HTTP público.

**Validación previa al release POST-05:** 168 pruebas aprobadas en 28 suites. Build de producción aprobado con `NODE_ENV=production npm run build`; bundle del servidor reconstruido tras el último ajuste. `npm run check -- --incremental false` conserva los mismos 13 errores preexistentes de `send-application`, `TryForecast`, `TryIdentity` y scripts de mantenimiento; no se añaden errores nuevos. Vista previa pública aislada sin DB/jobs/API de artículos: un artículo real se monta con H1 y 4.113 caracteres de cuerpo desde el bootstrap público.
