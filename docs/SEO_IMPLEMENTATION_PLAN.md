# Robles.AI SEO implementation plan

> **Estado de cierre — 18 octubre 2026:** POST-03/POST-04 implementados en PR #7 y verificados tras despliegue correcto. Sin observaciones abiertas en los recorridos bilingües comprobados; ver registro final. Las propuestas y gates anteriores se conservan como historial.

Prepared October 17, 2026, America/Los_Angeles. Companion: [SEO_AUDIT.md](SEO_AUDIT.md).

**Estado actual — 18 octubre 2026:** lotes 1–4 autorizados, fusionados mediante PR #5 y desplegados; corrección bilingüe adicional autorizada, fusionada mediante [PR #6](https://github.com/jroblesluna/robles.ai/pull/6) y desplegada con commit de fusión `1c3a39b8d846a35b714eacb1f9a0483535a3bef2`. Repo activo: `~/Dev/robles.ai`. La nueva auditoría confirma HTTP/sitemaps/modal y CTA Hero/Landing, pero descubre POST-03 (anchor de tarjeta) y POST-04 (CTA de otros componentes). Sus lotes propuestos están al final y no se implementaron durante la auditoría. Las propuestas originales siguientes conservan su contexto histórico; no implican aprobación automática de fases nuevas.

## Execution principles and release gates

Use small, separately reviewable batches. Keep React/Vite/Express, existing metadata modules, routing, authentication, APIs, rate limits, CORS, SSRF/domain protections and business behavior. No new dependency is necessary for the initial corrections. Every production deployment, infrastructure modification, publishing change or new tracking installation requires explicit authorization; approval of this plan should specify the approved batches and whether deployment is included.

Before coding, record the correct repository/deployed revisions, public route inventory, canonical/language contract, build layout and current production content inventory. Verify potential public-data exposure first. Preserve production SQLite, JSON articles, generated media and settings through build/release operations. Do not run migrations, publishing endpoints, cleanup scripts, `pull.sh` or cron jobs as diagnostics.

For each batch: capture before fixtures; implement in the real checkout; run focused tests against isolated fixtures; review the diff; build and test the production artifact without background jobs or external credentials; obtain deployment authorization; verify public responses after release; monitor errors, leads and indexing cohorts. Roll back code using the owner's established deployment process, preserving runtime data. Do not assume a code rollback restores old cache state or production data.

Effort estimates are engineering days unless stated otherwise. Account access, expert review, content production and release coordination can dominate elapsed time.

## Batch 0 — establish security, source and measurement baseline

### POT-SEC-01 — Verify and restrict the public build/data boundary

- **Priority:** P0 verification; CRITICAL incident response only if production exposure is confirmed.
- **Files to inspect:** `package.json` (`postbuild`), `server/vite.ts`, `server/db.ts`, `pull.sh`; production proxy configuration (location unknown, not in inspected repo).
- **Proposed implementation:** owner first inspects deployed file inventory and access configuration locally. Build copies all server data to the publicly served `dist` tree; determine whether SQLite snapshots or other nonpublic data are present. If unsafe, restrict static serving to intended public assets; stop copying private state into public roots; retain private runtime paths separately. A public-only build directory is an option after checking package layout. Do not delete or relocate live data without a separately reviewed migration/backup plan.
- **Dependencies:** owner/server access, explicit containment/deployment authorization. No HTTP request for database contents is needed.
- **Risks:** breaking public generated media or accidentally moving state; incident credential actions may be required if exposure is demonstrated, but are not authorized here.
- **Validation:** local artifact manifest denies private data/server bundles/source paths; isolated HTTP fixture confirms such paths return 404/403 while approved assets work. Owner verifies proxy behavior without disclosing private files. Review auth/security regression suite.
- **Expected outcome:** verified public/private boundary and no private state served through static middleware.
- **Effort:** 0.5–1 day verification; remediation/incident scope based on findings.

### POT-01 / POT-07 / SEO-17 — Establish authoritative baseline

- **Priority:** P0 access/baseline, P2 instrumentation after review.
- **Files to modify initially:** none. Later tracking files are listed in Batch 7.
- **Proposed work:** owner provides read access/exports for GSC, Bing, GA4, GTM and CRM; verify DNS/file-based ownership rather than adding redundant verification tags. Export 90-day query/page/device/country and lead cohorts; record sitemap submission/indexing errors, selected canonicals and deployments. Inspect GTM history/page/form triggers and existing key events before adding application events.
- **Dependencies:** owner-approved account access; no settings changes.
- **Risks:** misattributing seasonal changes or duplicate events; exporting personal data unnecessarily.
- **Validation:** reconcile landing-session totals and lead definitions; document date range, consent coverage and data gaps.
- **Expected outcome:** measurable baseline, no fabricated rankings/index counts and no duplicate tracking.
- **Effort:** 0.5–1 day once access exists.

## Batch 1 — repair serving order, resource paths and cache policy

### SEO-01 — Route homepage through existing metadata injection

- **Priority:** P1.
- **Files:** `server/vite.ts`, `server/seo/metaInjector.ts`; existing `server/seo/__tests__/metaInjector.integration.test.ts`; proposed new `server/__tests__/publicHtmlServing.integration.test.ts`.
- **Implementation:** configure public static handling so automatic `index.html` handling does not intercept `/`; route known public HTML to the existing injector while retaining asset delivery and API precedence. Coordinate with POT-SEC-01 public-file allowlist. Reuse homepage builder; do not introduce another head manager.
- **Dependencies:** actual production build layout; Batch 0 security decision and Batch 1 resource-path fix.
- **Risks:** incorrect middleware order can break assets or API routes; root must remain functional for both languages.
- **Validation:** production-artifact requests to `/`, `/?lang=es`, known assets and API fixtures. Assert canonical, intended nonempty title, correct language alternates and Organization/WebSite graph, with asset/API types unchanged.
- **Expected outcome:** consistent initial homepage metadata and functioning existing SEO branch.
- **Effort:** 0.5–1 day with SEO-02/03.

### SEO-02 — Apply cache policies by resource class

- **Priority:** P1.
- **Files:** `server/vite.ts`; proposed public-serving integration test above. Proxy changes only if owner inspection establishes header overrides; exact external file is unknown.
- **Implementation:** HTML revalidates (`no-cache` or explicitly equivalent policy); content-hashed assets retain long immutable caching. Define revalidation/shorter policies for robots, sitemap/static XML, manifest and unversioned media. Never cache authenticated/private responses publicly.
- **Dependencies:** serving classification in SEO-01; proxy/cache behavior review.
- **Risks:** higher requests from removing caching indiscriminately; old immutable HTML already held by clients may persist until separately addressed.
- **Validation:** GET/HEAD and conditional requests by resource class; normal and compressed responses; simulate a second release with changed asset hashes; check headers at public origin after deployment.
- **Expected outcome:** fresh HTML without sacrificing efficient versioned-asset caching.
- **Effort:** 0.25–0.5 day plus release observation.

### SEO-03 — Correct runtime SEO data paths, fallbacks and route coverage

- **Priority:** P1.
- **Files:** `server/seo/metaInjector.ts`, `server/seo/types.ts`, `server/seo/metaBuilders.ts`, `server/vite.ts`, `src/hooks/useSEO.ts`, `src/i18n/locales/en/translation.json`, `src/i18n/locales/es/translation.json`; `package.json` only if resource packaging needs adjustment; existing static/meta/middleware tests.
- **Implementation:** inject explicitly resolved posts/editor/translation locations or immutable translation data rather than assuming source-relative paths survive esbuild. Use real nonempty route-specific fallbacks; log data-load failures without private content and allow recovery rather than caching empty results forever. Register quiz/catalog and indexable demo routes; give each demo unique metadata reflecting actual capabilities. Correct outdated generic demo description advertising medical analysis. Keep utility/private page intent separate.
- **Dependencies:** public route classification, build layout, EN/ES parity. Coordinate URL contract in Batch 2.
- **Risks:** translation drift, misleading demo/service claims; generic fallback masking persistent load errors.
- **Validation:** test actual bundled production layout plus development source layout; deliberately missing translations/editors; all registered routes in both languages; assert unique intended title/description, OG/Twitter consistency and no empty strings or untranslated keys.
- **Expected outcome:** useful raw metadata across major public routes and diagnosable failures.
- **Effort:** 1–2 days.

### SEO-04 — Correct robots sitemap directive

- **Priority:** P1, independent quick win.
- **Files:** `public/robots.txt`; proposed new `server/__tests__/robotsSitemap.integration.test.ts`.
- **Implementation:** remove erroneous `Arma` suffix and use the exact public sitemap URL with a final newline. Retain current crawler policy pending the owner's separate search/training decision.
- **Dependencies:** none for text correction; release authorization to publish.
- **Risks:** accidental crawler-policy changes; cached robots response.
- **Validation:** parse exact Sitemap directive; GET target returns XML and correct root; compare wildcard rules before/after. Do not equate successful retrieval with indexing.
- **Expected outcome:** correct automatic sitemap discovery.
- **Effort:** under 0.25 day.

## Batch 2 — unify URLs, language and HTTP statuses

### SEO-06 — Share canonical and metadata policy across navigation paths

- **Priority:** P1.
- **Files:** `server/seo/metaBuilders.ts`, `server/seo/types.ts`, `src/pages/BlogPost.tsx`, `src/hooks/useSEO.ts`, `src/components/BlogModal.tsx`, `src/hooks/useBlogModalRouting.ts`, `src/lib/blogModal.ts`; proposed new `shared/seoPolicy.ts`; related existing builder/modal tests.
- **Implementation:** pure shared URL helpers with no server-only imports. Canonical articles use the existing clean translated slug per language. Raw HTML, DOM, modal and sitemap use identical canonical/alternate targets. Preserve/restore metadata on modal open/next/previous/close. Normalize legacy `?lang=` article variants to the matching translated URL under SEO-08. Static ES query URLs remain supported; pagination policy is separate.
- **Dependencies:** owner accepts URL contract, slug inventory and language mapping.
- **Risks:** loss of Spanish content from overaggressive query stripping; stale modal metadata; browser Back regressions; redirect loops.
- **Validation:** EN/ES raw versus rendered parity; direct, client and modal transitions; one canonical; reciprocal alternates including intentional x-default; OG URL/schema IDs agree; legacy backlinks preserve intended translation.
- **Expected outcome:** one consistent consolidation signal per language URL.
- **Effort:** 1–2 days, coordinated with SEO-07/08.

### SEO-07 — Make explicit URL language authoritative

- **Priority:** P1.
- **Files:** `src/i18n/index.ts`, `src/App.tsx`, `src/components/Header.tsx`, `src/pages/BlogPost.tsx`, `server/seo/htmlInjector.ts`, `server/seo/types.ts`, `server/seo/metaInjector.ts`, `shared/seoPolicy.ts` (proposed); locale files where required; existing/new language tests.
- **Implementation:** normalize `en-US`/`es-*` to supported content language; explicit query for static pages and translated article slug determine page language before body/metadata rendering. Use browser/storage preference only where no explicit URL language exists. Server writes correct initial HTML lang. Language links navigate to discoverable equivalent URLs and preserve meaningful page state. Reject or normalize contradictory query/slug combinations consistently.
- **Dependencies:** SEO-06 URL contract; avoid asynchronous title/content races.
- **Risks:** unexpected preference behavior; reload loops; visible language flicker; split metadata/UI state.
- **Validation:** clean browser, stored EN/ES conflicts, browser locales en-US/es-PE, direct ES URLs, switch/reload/back, article/modal/list flows; compare title/body/canonical/lang and reciprocal alternates before and after JavaScript.
- **Expected outcome:** independently discoverable bilingual pages whose content matches URLs.
- **Effort:** 2–3 days.

### SEO-08 / POT-02 — Return truthful errors and normalize aliases

- **Priority:** P1.
- **Files:** `server/seo/metaInjector.ts`, `server/seo/slugIndex.ts`, `server/vite.ts`, `server/routes.ts`, `src/pages/BlogPost.tsx`, `src/pages/not-found.tsx`, `shared/seoPolicy.ts` (proposed); existing slug/middleware tests and proposed public-serving tests.
- **Implementation:** allowlist known SPA/public utility routes; unknown pages/articles return HTTP 404, missing assets return actual 404 without HTML substitution, internal failures return controlled 5xx. Do not redirect article-not-found through another 200 shell. Anchor article slug matching to valid complete paths; replace timestamp-only fuzzy aliases with validated known aliases. Permanently normalize slash/legacy article language variants while preserving query intent and existing valid links.
- **Dependencies:** complete route inventory and SEO-06/07 contract; preserve API/admin/auth routing.
- **Risks:** valid SPA deep links mistakenly rejected; useful legacy links lost; search utility routes incorrectly indexed; error details leaked.
- **Validation:** public route matrix including careers/apply/quiz/admin shell/OTP, valid and unknown articles, malformed suffixes, missing JS/images/XML, slash variants, invalid lang, campaign query, deep http/www path preservation where proxy access permits. Distinguish 404 and unavailable-data 5xx. Confirm existing security tests.
- **Expected outcome:** fewer duplicate shells and soft-404 signals, debuggable asset failures.
- **Effort:** 1–2 days. External redirect policy changes require separately authorized proxy configuration work.

## Batch 3 — rebuild discovery from an authoritative inventory

### SEO-05 — Consolidate sitemap generation and backfill safely

- **Priority:** P1.
- **Files:** `src/scripts/sitemapService.ts`, `src/scripts/generateSitemaps.ts`, `src/scripts/fixSitemapMissing.ts`, `public/static-pages.xml`, `server/routes.ts`, `src/scripts/generateHistoricalPosts.ts`; existing sitemap unit/property tests; proposed `server/__tests__/robotsSitemap.integration.test.ts`. Runtime sitemap files are generated artifacts, not manually edited application source.
- **Implementation:** read-only inventory/dry-run first; compare all production publication records with current files, indexes and sitemap locations. Use one writer/output directory and shared URL contract, both language locations and reciprocal alternate annotations, meaningful lastmod only when known. Publish atomically to avoid partial XML/lost concurrent updates. Include approved commercial/catalog/demo destinations; decide utility-page inclusion explicitly. Retire redundant script behavior only after confirming actual operators/jobs. Backfill requires explicit production-data/output approval.
- **Dependencies:** canonical/language decisions, production content access, article validity checks, SEO-04.
- **Risks:** generated data overwrite, partial output, bad timestamps, accidental inclusion of drafts/private utility URLs; reconciled inventory may reveal missing content requiring separate recovery.
- **Validation:** dry-run diff; XML/schema and encoding checks; no duplicate locations, each intended translation represented, no redirect/404/private targets, reciprocal pairs, per-file protocol limits. Compare approved inventory count, not current API total alone. Validate all advertised files and a stratified live URL sample after release.
- **Expected outcome:** complete consistent discovery signals for approved published content.
- **Effort:** 2–4 days plus inventory access. Never run cleanup/remove scripts automatically.

### SEO-12 — URL-addressable archive pagination and linked search results

- **Priority:** P1.
- **Files:** `src/pages/BlogList.tsx`, `src/components/BlogSearch.tsx`, `src/hooks/useSearch.ts`, `server/seo/metaInjector.ts`, `server/seo/metaBuilders.ts`, `shared/seoPolicy.ts` (proposed); relevant browser/Testing Library fixtures.
- **Implementation:** initialize pagination from stable URL, render true previous/next anchors, preserve page on reload/back; page-specific self-canonical/title where useful. Search-result destinations become real links. Keep modal enhancement for normal article clicks and new-tab behavior. Define search/filter combinations intentionally to prevent an unbounded indexable URL space; retain discovery links to articles.
- **Dependencies:** SEO-06/07, then initial archive rendering in Batch 5.
- **Risks:** modal close losing page/filter state; crawl traps; accidental page-2 canonical to page 1; duplicated analytics.
- **Validation:** GET/browser page 2, refresh/back, pagination links until boundary, language switch, filter reset, modified-click behavior. Ensure each archive page exposes distinct article anchors and sensible canonical policy.
- **Expected outcome:** discoverable archives beyond the first page.
- **Effort:** 1–2 days.

## Batch 4 — schema, images, navigation and low-risk trust corrections

### SEO-09 — Correct article dates and entity attribution

- **Priority:** P1.
- **Files:** `server/seo/metaBuilders.ts`, `server/seo/metaInjector.ts`, `server/seo/types.ts`, `src/scripts/generateHistoricalPosts.ts`, `src/pages/BlogPost.tsx`, `src/components/BlogModal.tsx`; proposed shared date helper if needed; existing builder/property tests.
- **Implementation:** serialize validated ISO dates with timezone, distinguish publication/update provenance and avoid claiming every original date is the last modification. Align actual human/organization roles with visible attribution and AI assistance; stable publisher/author IDs and verified biography links. Repair production data only after review/dry-run approval. Do not invent human review history.
- **Dependencies:** owner defines authorship/review policy; build-aware editor loading from SEO-03.
- **Risks:** inventing historical timestamps; changing public chronology; treating fictional assistants as people; inconsistent modal/detail byline.
- **Validation:** malformed/missing/timezone date fixtures, chronological consistency, JSON parsing plus schema semantics, visible byline comparison, Rich Results Test before release. Change existing tests that assert invalid timestamps.
- **Expected outcome:** truthful, machine-readable article identity and dates.
- **Effort:** 1–2 days, historical reconciliation additional.

### SEO-10 — Repair share and publisher image URLs

- **Priority:** P1 quick win.
- **Files:** `server/seo/metaBuilders.ts`, `index.html`; `src/pages/BlogPost.tsx` only if visible representative-image policy changes; existing image/builder tests. New branded share artwork optional, separately approved.
- **Implementation:** use existing verified PNG as a safe interim brand default; use meaningful representative images where actually available. Align schema/social assets; add known dimensions/alt properties where supported. No invented article photos or unlicensed source images.
- **Dependencies:** SEO-08 missing-resource behavior; asset rights/content review.
- **Risks:** inappropriate crop or misleading article imagery; share caches retain old URLs.
- **Validation:** image GET returns actual image MIME and valid dimensions, schema/OG/Twitter point to correct assets, representative visible image agrees; inspect previews with appropriate tools.
- **Expected outcome:** working image metadata and share previews.
- **Effort:** 0.25–0.5 day, artwork separate.

### SEO-13 — Replace placeholders and correct fragment destinations

- **Priority:** P1 for known broken fragment/profile links, P2 for new policy content.
- **Files:** `src/components/Footer.tsx`, `src/components/Team.tsx` only if anchor standardization needed, locale JSON; proposed `src/pages/Policy.tsx` and `src/App.tsx` only for owner-approved real policy pages; metadata registry/static sitemap when pages are added.
- **Implementation:** About targets existing `#about`; add verified corporate URLs only; remove empty placeholder links or link approved meaningful content. Route services to appropriate content when Batch 6 pages exist. Owner supplies/approves policy text rather than generating implied legal commitments.
- **Dependencies:** verified corporate destinations, owner/legal review for policies.
- **Risks:** confusing personal/corporate identity; publishing inaccurate privacy practices; broken legacy fragment links.
- **Validation:** rendered internal-link/fragment check, verified external destination review, keyboard names, policy routes 200 with appropriate metadata. No fake press/trust material.
- **Expected outcome:** credible usable navigation and reduced contact/privacy uncertainty.
- **Effort:** 0.25–0.5 day known links; policies 1–3 days plus review.

### SEO-14 — Fix responsive and keyboard navigation

- **Priority:** P1.
- **Files:** `src/components/Header.tsx`, `src/index.css`, locale JSON if labels change; proposed `src/components/__tests__/Header.accessibility.test.tsx`.
- **Implementation:** true disclosure controls with click/keyboard/Escape and expanded/controls semantics; closed items hidden from focus; anchors for route destinations, buttons for disclosure/actions. Choose breakpoint/layout based on actual content fit; prevent contact/locale CTA clipping. Preserve mobile menu close/focus behavior and reduced motion.
- **Dependencies:** URL-aware language links from SEO-07.
- **Risks:** focus loss, hover/touch conflicts, regressions across language lengths and zoom.
- **Validation:** keyboard-only open/close/tab/escape, focus order and restoration; 360/390/768/823/1024/1440px layouts, both languages, 200% zoom; ensure CTAs and logo do not overlap or fall outside viewport. Include automated semantics and manual visual checks.
- **Expected outcome:** accessible service/language/contact navigation at intermediate widths.
- **Effort:** 1–2 days.

### SEO-18 — Label blog search

- **Priority:** P1 quick win.
- **Files:** `src/components/BlogSearch.tsx`, locale JSON; proposed `src/components/__tests__/BlogSearch.accessibility.test.tsx`.
- **Implementation:** explicit translated accessible name and appropriate search landmark/input semantics; announce result/loading state without overwhelming screen readers.
- **Dependencies:** none; coordinate link changes in SEO-12.
- **Risks:** overly frequent live-region announcements.
- **Validation:** accessible-name assertion, keyboard search/clear/results, debounce/abort regression, English/Spanish screen-reader check.
- **Expected outcome:** understandable search control for assistive technology.
- **Effort:** under 0.5 day.

## Batch 5 — progressively expose public content in initial HTML

### SEO-11 — Pilot shared rendering for landing, archive and articles

- **Priority:** P2 architecture, after P1 metadata corrections.
- **Existing files:** `server/vite.ts`, `server/seo/metaInjector.ts`, `server/seo/htmlInjector.ts`, `server/seo/types.ts`, `src/main.tsx`, `src/pages/{Landing,BlogList,BlogPost}.tsx`, `src/components/BlogArticle.tsx`, `package.json` only if build entry changes.
- **Proposed new files:** `server/seo/publicContentRenderer.ts`, `shared/publicPageData.ts`, `server/seo/__tests__/publicContentRenderer.test.ts`. Final names can be adjusted during design; these do not exist yet.
- **Implementation:** short prototype comparing prerendered static commercial pages and request-rendered article/list content with current client interaction boundaries. Share structured content and escaping; render visible H1/body/links/identity in initial HTML for all users. Select a safe takeover/hydration strategy before rollout; do not append hidden duplicate text or let createRoot briefly erase visible content. Keep expensive demos client-side and preserve interactions. Do not load browser-only packages into server renderer. Validate SearchAction target or omit it until a true URL-search interface exists.
- **Dependencies:** shared metadata/locale contract, route data isolation from jobs/database writes, article content provenance, prototype review.
- **Risks:** XSS from unsafe templates/JSON-LD, hydration mismatch, increased TTFB, duplicate body content, mismatched language/content, accidental startup jobs and stale prerendered content.
- **Validation:** no-JS GET contains meaningful content and links; compare rendered text/metadata before/after JS; escaping adversarial fixtures (including `</script>`), API outage and missing article behavior, modal/quiz/form regression, mobile layout and measured TTFB/LCP. No bot-specific content fork.
- **Expected outcome:** public company/service/article information readable by HTML-only fetchers with retained React functionality. No indexing/citation guarantee.
- **Effort:** 5–10 days pilot; rollout estimate after prototype. No new framework approved.

## Batch 6 — editorial quality and commercial architecture

### SEO-15 / POT-05 / POT-06 — Add evidence-based editorial controls

- **Priority:** P2, with prompt owner review of live accuracy inconsistencies.
- **Files:** `src/scripts/{generateHistoricalPosts,postPrompt,postUtils,newsService}.ts`, `server/routes.ts`, `server/seo/types.ts`, `src/pages/BlogPost.tsx`, `src/components/BlogModal.tsx`; proposed `shared/editorialPolicy.ts` and `src/scripts/__tests__/editorialPolicy.test.ts`. Admin review UI/API files only if an approved editorial workflow requires them; scope separately.
- **Implementation:** define evidence/review status, source-to-claim references, real modification timestamps and reviewer roles; reject insufficient source material rather than filling facts to satisfy quotas. Implement actual recent-topic memory and duplicate-candidate review. New draft content should not enter public indexes/sitemaps until approved under the agreed policy. Review A's date/market-count inconsistencies and relevant marketing statistics before edits. Make technical claims match available services. Remove public token-debug stats only if owner approves UX cleanup.
- **Dependencies:** human editor/expert availability, owner approves publishing cadence/workflow, production data migration/backfill approval if fields change. No unsupported legacy data rewrite.
- **Risks:** interrupting scheduled publishing, inventing review metadata, inaccurate automatic fact checks, stripping legitimate content, changing publication status at scale.
- **Validation:** schema/evidence checks with sparse sources, fabricated quotes/numbers, invalid dates, duplicate topics, bilingual parity, draft visibility across API/slug/listing/FTS/sitemap and successful approved publication. Stratified expert review of historical/live corpus; content retention decisions reviewed individually/cohort-wise.
- **Expected outcome:** accountable useful content with fewer unsupported claims and repeated topics.
- **Effort:** 3–5 engineering days plus ongoing editorial work; CMS/admin expansion separately estimated.

### SEO-16 — Launch differentiated commercial content in small increments

- **Priority:** P2.
- **Existing files:** `src/pages/Landing.tsx`, `src/App.tsx`, `src/components/{Solutions,Footer,Header,DemosCatalog}.tsx`, locale JSON, `server/seo/types.ts`, `server/seo/metaBuilders.ts`, `public/static-pages.xml`; relevant approved blog content only after editorial review.
- **Proposed new files:** `src/pages/Service.tsx`, `shared/serviceContent.ts` (or equivalent structured bilingual content), associated route/content tests. Reuse templates rather than one duplicated component per keyword.
- **Implementation:** C1 improve `/get-started` as consulting offer; C2 `/services/custom-ai-development`; C3 `/services/enterprise-rag`; C4 `/services/ai-agents-automation` after evidence validation. C5 `/services/computer-vision` only as second-wave option. Detailed audience/title/H1/outlines and linking briefs are in the audit. Integrate appropriate Service/WebPage/Breadcrumb schema using verified visible content. Do not launch separate generative AI, MLOps, ML, automation and integration pages until distinct demand/evidence is established.
- **Dependencies:** expert-reviewed claims, buyer/SERP/query validation, owner approves enterprise versus SME positioning, EN/ES review, metadata/sitemap/rendering fixes.
- **Risks:** cannibalization, unsupported enterprise/security promises, diluted service positioning, thin translations, demo being mistaken for production/customer proof.
- **Validation:** each page has distinct buyer intent and useful original content, one H1/title/canonical per language, route/schema/link checks, working relevant demo and consultation destinations, no fabricated evidence. Compare conversions and query/page overlap after 28/56/90 days.
- **Expected outcome:** clear enterprise service discovery and qualified consultation paths.
- **Effort:** 1–3 engineering/content days per initial page plus review; C1 first, C2/C3 next, C4 conditional, C5 separately approved. Not a commitment to launch five pages at once.

## Batch 7 — measure conversion and optimize demonstrated bottlenecks

### SEO-17 — Consistent events with existing approved analytics

- **Priority:** P2.
- **Files:** `src/lib/analytics.ts`, `src/App.tsx`, `src/components/Contact.tsx`, `src/pages/{Quiz,Landing}.tsx`, `src/hooks/useBlogModalRouting.ts`, existing demo event callers if contract changes; proposed `src/lib/__tests__/analytics.test.ts`. GTM changes are external settings and need explicit approval.
- **Implementation:** inspect account/container first. Define one owner for page views; shared consent-aware event contract in GTM/direct modes, queued initialization if needed, modal history behavior, successful contact submission, verified quiz lead and qualified-lead CRM stage. CTA clicks are separate from actual leads. Keep existing demo events and deduplication. Never send names/email/phone/message/token/prompt content to analytics.
- **Dependencies:** Batch 0 account review; event naming/qualification definitions; CRM approval. No new third-party tracker.
- **Risks:** doubled page views/key events, event loss during initialization, PII leakage, changed attribution.
- **Validation:** mocked GTM/direct/disabled modes; Tag Assistant/GA4 DebugView under approved account access, success versus failure/double-submit, route/modal/back transitions; compare backend successful lead counts and CRM qualification without collecting sensitive data in diagnostics.
- **Expected outcome:** trustworthy organic-to-qualified-lead funnel and release attribution.
- **Effort:** 1–2 days plus account/configuration work.

### POT-04 — Trace-led performance optimization

- **Priority:** P2 baseline; P3 optimization once measured.
- **Files to consider only after trace:** `src/App.tsx`, `src/main.tsx`, `src/i18n/index.ts`, `src/pages/Home.tsx`, `src/components/Hero.tsx`, `src/components/chat/ChatbotWidget.tsx`, `src/pages/BlogPost.tsx`, `vite.config.ts`, `index.html`, `server/vite.ts`; actual LCP/media files identified by trace. Do not edit a guessed media asset.
- **Implementation:** obtain controlled Lighthouse/DevTools runs and available field data; identify LCP element, long tasks and shifts. Reduce only proven eager-loading work; keep heavy demo/model packages route-local; right-size responsive images/fonts and reserve dimensions; adjust chat/analytics scheduling only where measurement supports it. HTML cache fix is already in Batch 1.
- **Dependencies:** owner/browser diagnostic environment; package installation approval if no existing runner; field data/account access. New RUM tracking also requires approval.
- **Risks:** worsening LCP by lazy-loading hero, removing needed preloads, delayed consent/tracking, language flicker, demo failures from chunk changes.
- **Validation:** three cold/warm runs per route/device under fixed settings; compare bytes, CPU/long tasks, LCP/CLS and interaction traces; field p75 LCP≤2.5s, INP≤200ms, CLS≤0.1 when sample sufficient. Lab results are never labeled field data.
- **Expected outcome:** measured improvement in actual bottlenecks without unnecessary architecture changes.
- **Effort:** 1 day baseline, then 1–3 days per demonstrated optimization batch.

### POT-03 / POT-08 — Browser and crawler regression verification

- **Priority:** P2/P3.
- **Files:** existing modal tests, `src/components/BlogModal.tsx`, `src/hooks/useBlogModalRouting.ts`, production-artifact tests proposed above; optional browser test files only if approved runner is available. External WAF/proxy configuration location unknown.
- **Implementation:** verify modal metadata/analytics with real navigation and back/close; inspect verified crawler errors from owner-provided logs. Change code/config only for reproduced defects. Preserve auth/rate limits/CORS/SSRF; do not use broad user-agent bypasses.
- **Dependencies:** existing approved browser/CI tools; server log access for bot conclusions.
- **Risks:** trusting spoofed bots or weakening security; unnecessary changes for unconfirmed problems.
- **Validation:** modal transition matrix, verified IP/UA traffic error comparisons, public-page availability while protected paths stay protected.
- **Expected outcome:** proven public discoverability and stable navigation without security regression.
- **Effort:** 0.5–1 day verification, remediation scoped by evidence.

## Batch 8 — optional GEO experiments

### GEO-EXP-01 — Capability summary / llms.txt experiment

- **Priority:** P3 optional, not a search requirement.
- **Files:** proposed `public/llms.txt`, optionally approved technical-guide content and metadata/sitemap entries; `public/robots.txt` only for an explicit owner-selected crawler-policy change.
- **Implementation:** concise factual company/service/source links maintained from the same approved content inventory. Treat llms.txt as an experiment, separately from mandatory SEO fixes. Owner may choose to allow search crawlers while restricting training agents; do not change policy automatically.
- **Dependencies:** P1 correctness, verified public service pages and ownership of crawler policy.
- **Risks:** stale/contradictory summaries, implied unsupported capabilities, no measurable benefit.
- **Validation:** link/content parity, no private URLs, correct text response, dated manual citation/query benchmark and attributable referral/lead trends. Record that inclusion/citations are not guaranteed.
- **Expected outcome:** maintainable optional discovery summary and evidence about utility, not a promised ranking lift.
- **Effort:** under 0.5 day initial file after approved content, periodic review.

### GEO-EXP-02 — Original technical evidence and citation monitoring

- **Priority:** P3 editorial/measurement.
- **Files:** approved original post content under the existing content system; exact slugs/data paths determined only after topic approval. No automatic production publishing.
- **Implementation:** reproducible RAG/agent/document/CV benchmarks with methods, version/date, evaluation data rights, results and limits. Track a fixed set of buyer questions across relevant search/AI products, recording date/platform/citation correctness and qualified referrals.
- **Dependencies:** expert time, publication rights, factual review, analytics baseline.
- **Risks:** exposing customer data, invented benchmark results, treating volatile manual answers as comprehensive visibility.
- **Validation:** independent reproduction, source/data permission review, clearly separated lab/demo/client outcomes, editorial approval and stable service links.
- **Expected outcome:** citable technical credibility and useful buyer evidence.
- **Effort:** 1–3 weeks per substantial original study; monitoring ongoing.

## Proposed automated test coverage

| Contract | Existing foundation | Required additions / acceptance |
|---|---|---|
| Metadata | `server/seo/__tests__/metaBuilders.test.ts`, `staticMeta.property.test.ts` | Nonempty route registry, unique intent, real EN/ES resources and fallbacks. |
| Serving and cache | `metaInjector.integration.test.ts` mocks middleware | New `server/__tests__/publicHtmlServing.integration.test.ts`: built-layout/static ordering, cache classes, private/static exclusions, meaningful no-JS response. |
| Canonical/redirect/status | Slug/meta tests | Clean/legacy/lang/slash/query matrix, unknown page/article/asset, exact alias validation, API precedence and preserved deep links. |
| HTML/schema | `htmlInjector.test.ts`, property tests | Lang injection, semantic date/authorship/image checks, escaping including script terminators, one canonical and visible schema parity. |
| Sitemap/robots | `src/scripts/sitemapService.test.ts`, property tests | Production-inventory dry-run, bilingual reciprocity/coverage, atomic writes, all advertised XML targets and exact robots pointer. |
| Language/navigation | Existing component/modal tests | Locale normalization and explicit URL precedence, storage/browser conflicts, direct/render/modal equivalence, keyboard/viewport tests. |
| Internal links | Rendered DOM + inventory fixture | Destination status, anchors/fragments, archive page links, no placeholder destinations or private/draft sitemap URLs. |
| Analytics | Existing analytics interfaces | Proposed isolated `analytics.test.ts`: GTM/direct/disabled modes, queue/dedup, page/modal transitions and no sensitive fields. |

Run focused Vitest/Supertest/Testing Library tests in an existing installed checkout; do not install dependencies or boot cron/database services without approval. CLI Playwright is not declared in package dependencies. Use available browser automation for manual acceptance or obtain approval before adding it to CI. Rich Results Test and field/Search Console inspection remain separate from unit-test success.

## Exact application files and artifacts requiring review/change

Existing paths below are the proposed change set, grouped by purpose; not every optional file must change. The issue-level entries determine scope. There are no local application copies to link from this workspace.

- Serving/build/security: `server/vite.ts`, `server/seo/metaInjector.ts`, `package.json` if packaging changes, `pull.sh` only if the approved build/data boundary requires it; inspect `server/db.ts` but do not move live state casually.
- SEO: `server/seo/metaBuilders.ts`, `server/seo/htmlInjector.ts`, `server/seo/types.ts`, `server/seo/slugIndex.ts`, `src/hooks/useSEO.ts`, `index.html`, `public/robots.txt`, `public/static-pages.xml`.
- URL/language/UI: `src/i18n/index.ts`, `src/App.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/Team.tsx` if needed, `src/index.css`, both `src/i18n/locales/{en,es}/translation.json`.
- Blog/discovery/editorial: `src/pages/BlogPost.tsx`, `src/pages/BlogList.tsx`, `src/pages/not-found.tsx`, `src/components/BlogModal.tsx`, `src/components/BlogArticle.tsx`, `src/components/BlogSearch.tsx`, `src/hooks/useBlogModalRouting.ts`, `src/hooks/useSearch.ts`, `src/lib/blogModal.ts`, `server/routes.ts`, `src/scripts/sitemapService.ts`, `src/scripts/generateSitemaps.ts`, `src/scripts/fixSitemapMissing.ts`, `src/scripts/generateHistoricalPosts.ts`, `src/scripts/postPrompt.ts`, `src/scripts/postUtils.ts`, `src/scripts/newsService.ts`.
- Commercial/conversion: `src/pages/Landing.tsx`, `src/pages/Quiz.tsx`, `src/components/Solutions.tsx`, `src/components/DemosCatalog.tsx`, `src/components/Contact.tsx`, `src/lib/analytics.ts`.
- Rendering/performance only after design/trace: `src/main.tsx`, `src/pages/Home.tsx`, `src/components/Hero.tsx`, `src/components/chat/ChatbotWidget.tsx`, `vite.config.ts` and identified media/font assets.
- Existing tests: `server/seo/__tests__/*` relevant to changed contracts, `src/scripts/sitemapService*.test.ts` and existing modal/component tests. `.github/workflows/deploy.yml` only if approved checks are integrated after code fixes; do not trigger deployment during audit.
- Proposed new files: `shared/seoPolicy.ts`, `server/__tests__/publicHtmlServing.integration.test.ts`, `server/__tests__/robotsSitemap.integration.test.ts`, `src/components/__tests__/Header.accessibility.test.tsx`, `src/components/__tests__/BlogSearch.accessibility.test.tsx`, `src/lib/__tests__/analytics.test.ts`; optional rendering `server/seo/publicContentRenderer.ts`, `shared/publicPageData.ts`, renderer test; optional editorial `shared/editorialPolicy.ts`, editorial test; optional services `src/pages/Service.tsx`, `shared/serviceContent.ts`; owner-approved policies `src/pages/Policy.tsx`; optional `public/llms.txt`.
- Production generated sitemaps, historical posts, GTM/GSC/Bing settings and proxy files are separate approved operational artifacts. Their exact server paths/configuration must be verified by the owner before modification; never guess them from this audit.

## Approval checkpoint

Recommended first authorization: Batch 0 owner verification and Batches 1–4 application corrections in a real isolated checkout, with no production deployment until review. Rendering, editorial workflow, new service pages, analytics changes and GEO experiments should be approved as separate scopes. Current work stops here: only the two requested audit documents have been created.


## Local implementation record — October 18, 2026

The owner approved the proposed isolated implementation of Batches 1–4. Changes are in `implementation/`, a separate clone of `jroblesluna/robles.ai`, branch **`codex/seo-technical-corrections`**, based on **`f55d59ab6a24d7ed3d66acc6f3f9b4d8761d6605`**. At completion of local validation, there were **no commits, pushes, pull requests or production deployments**. Subsequent publication follows the owner’s explicit authorization. The audit's live findings remain historical observations of production; local corrections are not evidence of production remediation.

| Batch | Local outcome | Remaining operational gate |
|---|---|---|
| P0 source boundary | Public static serving restricted to built assets and the intentionally public tree. Private bundle/source/data paths return real 404s in isolated HTTP tests; future postbuild copies exclude SQLite files. | Owner must inspect the actual deployed filesystem/proxy and determine whether any historic exposure occurred. No private production URL was fetched. No live data moved/deleted. |
| 1 | Homepage enters metadata injector; production resource paths are explicit, bundled nonempty translations provide fallbacks; HTML revalidates, hashed assets retain immutable caching; public demo metadata and robots pointer corrected. | Review proxy headers and existing client caches after an explicitly authorized release. |
| 2 | Shared canonical/language policy; clean translated article URLs and legacy redirects; URL language governs content; real unknown-page/article/asset statuses; modal metadata matches direct articles and restores on close. | Real backend and production redirect smoke checks after release; proxy deep-path behavior was not changed. |
| 3 | Complete monthly XML responds from the existing article index, with both language locations, reciprocal alternates and URL/size partitioning. Pagination and search use real links. Writer snapshots are atomic/serialized; CLI defaults to dry-run. | Production inventory/coverage verification after release. No production sitemap files/backfill were executed. Legacy paired language-map URLs remain supported where corresponding months exist. |
| 4 | Schema dates converted from recorded values without inventing modification dates; organization authorship avoids fictional-person attribution; valid existing image fallback; accessible responsive disclosures/search; correct About fragment and language-preserving footer; placeholder legal/social/press links removed. | Owner-approved real legal/corporate destinations and any historical date/authorship provenance review. No legal policies or new corporate profiles were invented. |

### Validation actually completed

- **120 passing tests in 19 suites**, covering real isolated Express/Supertest HTTP serving, metadata builders and property tests, canonical/language policy, robots/sitemaps, atomic/concurrent sitemap writes, modal routing, browser metadata restoration, header/search/footer semantics and JSON-LD script-termination escaping. Generated `dist` copies are explicitly excluded from test discovery.
- **`npm run build` passed**, including Vite, esbuild and postbuild. Existing large CV-demo chunk warnings remain; performance optimization beyond the approved batches was not attempted.
- **`git diff --check` passed.** No tracked article/data files changed. No package dependency or lockfile changes; existing lockfile dependencies were installed with owner approval using `npm ci --ignore-scripts`.
- **`npm run check` remains blocked by 13 pre-existing TypeScript diagnostics in six unrelated files** (baseline had 17). Comparing file/error signatures found **zero new diagnostics**. Remaining files: `src/pages/api/send-application.ts`, `src/pages/TryForecast.tsx`, `src/pages/TryIdentity.tsx`, `src/scripts/cleanupDuplicates.ts`, `src/scripts/fillGaps.ts`, `src/scripts/generateHistoricalPosts.ts`. These were not broadened into unrelated repairs. Full application/native-database integration tests were not claimed.
- **Read-only inventory dry-run** recognized all **801 local article files / 1,602 language URLs**, grouped into March–May 2025. This is the repository corpus, not the 12,156 production records observed in the audit. No production publishing API, migration, cleanup job or generation endpoint ran.
- **Browser verification against the built frontend and a compiled public middleware preview**, with fixture APIs, no database/jobs and analytics disabled: Spanish landing title/H1/body/lang/canonical matched; archive page 2 had real next/previous URLs and a self-canonical; opening a Spanish article modal produced clean translated canonical/schema; closing restored page 2/title/focus. Header had no overflow at the observed 1,280px and 676px widths; the mobile menu opened and closed with Escape. Footer navigation was rechecked to preserve Spanish. This is not a complete mobile/assistive-technology/CWV certification.

Reproducible focused test command (requires installed existing dependencies and permission to open temporary local HTTP sockets):

```sh
npm test -- server/seo src/scripts/sitemapService shared/__tests__/seoPolicy.test.ts src/components/BlogModal.test.tsx src/hooks/useBlogModalRouting.test.ts src/lib/blogModal src/components/__tests__ src/lib/__tests__/pageMetadata.test.ts
```

Do not run the full development/production entry point solely for SEO verification: it initializes state and schedules jobs. The temporary preview used only public middleware and fixture APIs. Source SSR/prerendering, new service pages, editorial workflow, analytics configuration and GEO experiments remain outside this implementation scope.

### Exact local application change inventory

All paths below are relative to `implementation/`. Files below comprise the locally validated implementation change set:

- `index.html`
- `package.json`
- `public/robots.txt`
- `public/static-pages.xml`
- `server/publicServing.ts` (new)
- `server/routes.ts`
- `server/seo/__tests__/htmlSafety.test.ts` (new)
- `server/seo/__tests__/metaBuilders.property.test.ts`
- `server/seo/__tests__/metaBuilders.test.ts`
- `server/seo/__tests__/metaInjector.integration.test.ts`
- `server/seo/htmlInjector.ts`
- `server/seo/metaBuilders.ts`
- `server/seo/metaInjector.ts`
- `server/seo/sitemap.ts` (new)
- `server/seo/sitemapRoutes.ts` (new)
- `server/seo/slugIndex.ts`
- `server/seo/types.ts`
- `server/vite.ts`
- `shared/__tests__/seoPolicy.test.ts` (new)
- `shared/seoMetadata.ts` (new)
- `shared/seoPolicy.ts` (new)
- `src/App.tsx`
- `src/components/BlogModal.tsx`
- `src/components/BlogSearch.tsx`
- `src/components/Footer.tsx`
- `src/components/Header.tsx`
- `src/components/__tests__/BlogSearch.accessibility.test.tsx` (new)
- `src/components/__tests__/Footer.navigation.test.tsx` (new)
- `src/components/__tests__/Header.accessibility.test.tsx` (new)
- `src/hooks/useBlogModalRouting.ts`
- `src/hooks/useSEO.ts`
- `src/hooks/useSearch.ts`
- `src/i18n/index.ts`
- `src/i18n/locales/en/translation.json`
- `src/i18n/locales/es/translation.json`
- `src/lib/__tests__/pageMetadata.test.ts` (new)
- `src/lib/blogModal.ts`
- `src/lib/pageMetadata.ts` (new)
- `src/pages/BlogList.tsx`
- `src/pages/BlogPost.tsx`
- `src/pages/not-found.tsx`
- `src/scripts/fixSitemapMissing.ts`
- `src/scripts/generateSitemaps.ts`
- `src/scripts/sitemapService.property.test.ts`
- `src/scripts/sitemapService.test.ts`
- `src/scripts/sitemapService.ts`
- `vitest.config.ts`


## Correcciones pendientes tras auditoría de PROD del PR #6

### Estado de aceptación

- POST-01 (colisiones): nueve pares de URLs HTTP/canonical/schema/sitemap correctos y modal correcto; queda el anchor real del archivo, POST-03. No marcar el recorrido entero como terminado hasta corregirlo.
- POST-02 (Hero/Landing): confirmado resuelto mediante navegación real ES → landing ES → diagnóstico ES; catálogo y DemoNav también conservan ES. CTA residuales de otros componentes: POST-04.
- Sin nuevas dependencias, migraciones, ediciones de registros históricos o cambios de infraestructura necesarios para los dos fixes.

### Lote A — POST-03: usar la política compartida en la tarjeta renderizada

- **Prioridad / severidad:** P1 / MEDIUM; complejidad baja, 1–3 horas estimadas.
- **Archivos:** `src/pages/BlogList.tsx`; prueba adyacente de integración de BlogList, por ejemplo `src/pages/BlogList.localeLinks.test.tsx`. Reusar `src/lib/blogModal.ts` sin introducir otra política.
- **Implementación:** importar y usar `listPostPath(post, lang)` en el href de las tarjetas. Preservar el comportamiento de clic normal del modal y los eventos modificados/middle click nativos.
- **Dependencias:** helper ya desplegado en PR #6; fixtures con traducciones distintas y slug coincidente, además de fixtures de slugs diferentes y listados incompletos.
- **Riesgos:** abrir dos vistas en un clic, interferir con Ctrl/Cmd/middle click, cambiar rutas históricas o idioma cuando el listado aún no contiene slugs de traducción.
- **Validación:** renderizar **BlogList real** con respuesta API fixture y slug coincidente; verificar href EN `?lang=en`, ES limpio, y hrefs normales sin colisión. Probar clic normal, handler con modificadores, URL/canonical/schema del modal, enlace para abrir en pestaña nueva y restauración del archivo/foco. Las pruebas de helper aisladas no bastan para este defecto. Tras deploy, inspeccionar el anchor de Shivoo en `/blog?page=2`, abrirlo en otra pestaña y comprobar H1/lang/canonical EN; repetir ES y un artículo normal.
- **Resultado esperado:** tarjeta, modal, compartir, canonical, alternates y sitemap usan el mismo destino para cada idioma.

### Lote B — POST-04: completar conservación de idioma en CTA compartidos

- **Prioridad / severidad:** P1 / MEDIUM; 0.25–0.5 día estimado.
- **Archivos:** `src/components/CaseStudies.tsx`, `src/components/demo/SavingsCalculator.tsx`, `src/components/demo/business.ts`; pruebas de componentes existentes o adyacentes. Reusar `shared/seoPolicy.ts`. Revisar consumidores de la calculadora para inventario, sin ejecutar backends para modificar datos.
- **Implementación:** formar CTA de diagnóstico con el idioma activo normalizado; formar navegación al contacto como ruta de home localizada y hash correcto, preservando scroll/teclado. Revisar cada CTA de CaseStudies, incluidos diseños responsive y modal si procede.
- **Dependencias:** contrato estático existente EN limpio / ES `?lang=es`. No depende de SSR, nuevas páginas comerciales, GSC ni nuevas traducciones.
- **Riesgos:** perder fragmentos, navegar antes de que home se monte, resetear ES a EN por el efecto de App, romper comportamiento de smooth scroll o reduced motion, cambios involuntarios en tracking existente.
- **Validación:** renderizar componentes reales en ambos idiomas; verificar todos sus hrefs, no solo helper. Caso real portada ES → CTA CaseStudies → diagnóstico ES. Forecast ES → diagnóstico de calculadora ES. CTA contacto de calculadora → home ES con sección contacto enfocada/visible según contrato. Verificar apertura de enlaces con modificadores y reduced motion sin enviar eventos a proveedores reales en tests.
- **Resultado esperado:** continuidad del idioma en los puntos de conversión restantes, sin agregar tracking ni enviar formularios de prueba a producción.

### Lote C — diagnóstico posterior y cierre

- **Prioridad:** P1; depende de A/B aprobados, probados y desplegados.
- **Archivos de documentación:** `docs/SEO_AUDIT.md`, `docs/SEO_IMPLEMENTATION_PLAN.md`.
- **Procedimiento:** registrar SHA y resultado del workflow; repetir GET de los nueve pares, comprobación de unicidad/reciprocidad de sitemap y navegación real de las tarjetas/CTA. Revisar regresiones de parámetros UTM, barra final, 404, caches y modal. Distinguir siempre verificación de interfaz de procesamiento de formularios/inferencias.
- **Riesgos / resultado:** evitar declarar cierre basándose solo en tests del helper. No hay nuevos cambios de aplicación, commits o publicación autorizados por la actualización de este plan en sí; se requiere la instrucción correspondiente del propietario para implementar/publicar estos lotes.

SSR/prerender selectivo, contenido comercial/editorial, métricas de campo y experimentos GEO siguen separados en el roadmap original. No bloquear estos pequeños arreglos por una migración de arquitectura.


## Ejecución del ciclo de cierre POST-03/POST-04

Implementación/publicación y auditoría iterativa autorizadas por el propietario. Rama `codex/complete-bilingual-navigation`. Los lotes A/B anteriores están implementados localmente y validados con 159 pruebas en 26 suites. Se amplió el barrido a búsqueda FTS, Team → Careers → Apply (conservando job), enlace de QuizResultFull → landing y helper de URLs con query/hash. Sin dependencias nuevas ni migraciones. Se corrigió la sincronización de refs de `useBlogModalRouting` antes de activar tarjetas recién renderizadas.

Gate de producción pendiente en este commit: workflow correcto para el SHA fusionado; auditoría HTTP completa de sitemap y nueve pares; navegador sobre anchor nativo/carga directa/modal/cierre; CTA de casos y calculadora EN/ES y contacto; búsqueda EN/ES; empleos y postulación sin enviar formularios. Registrar los resultados después del despliegue. No cerrar POST-03/POST-04 solo por tests locales.


## Registro de cierre en producción — PR #7

**Lotes A/B/C de POST-03/POST-04 completados** dentro de navegación bilingüe. Código fusionado en `78bb1bd4ec92ac9559f38a704dc673b0cce867cd`; [PR #7](https://github.com/jroblesluna/robles.ai/pull/7), [workflow exitoso](https://github.com/jroblesluna/robles.ai/actions/runs/39151534769). Se esperó despliegue antes de auditar.

- Tarjeta real → nueva pestaña EN, modal, compartir y cierre/foco: verificados. ES mantiene su ruta limpia.
- CTA de casos (ambos layouts y viewer), calculadora, contacto y empleo/postulación: verificados en producción, manteniendo idioma, parámetros y fragmento.
- Barrido adicional de FTS, equipo, ofertas de empleo y enlace de informe del quiz implementado; búsqueda EN/ES y postulación ES verificados en producción. El informe del quiz se verifica con fixture, sin crear datos de lead.
- 159 tests en 26 suites y build final aprobados; 13 errores TypeScript preexistentes, cero nuevos. Sin dependencias, migraciones o cambios de datos/infrastructura.
- Auditoría HTTP final: 21 sitemaps, 24,366 URLs únicas, nueve pares EN/ES, 34 estáticas, metadatos/schema/errores/cache correctos en las muestras. Evidencia y límites completos en el apartado final de `SEO_AUDIT.md`.

**No quedan observaciones abiertas de estos recorridos bilingües.** No hace falta otro release de aplicación dentro de este alcance con la evidencia actual. SSR, contenido, medición externa y validación integral de formularios/backends se mantienen separados; no se presentan como terminados. Este registro posterior solo modifica documentación y no requiere repetir compilación/tests del código ya validado.


## Lote autorizado POST-05 — HTML público inicial y verificación de métricas

Autorizado por el usuario el 18 octubre 2026, incluido commit/push/PR a main/fusión, espera de Actions y auditoría posterior. Los gates de aprobación de secciones anteriores pertenecen a sus propuestas históricas.

| ID | Prioridad / estado | Archivos exactos | Implementación / validación / resultado esperado |
| --- | --- | --- | --- |
| POST-05 | P1 / implementado; validación live al final | `server/seo/publicContent.ts`, `server/seo/metaInjector.ts`, `shared/publicContent.ts`, `src/components/Team.tsx`, `src/components/Contact.tsx`, `src/lib/publicPost.ts`, `src/pages/BlogPost.tsx` | Componer cuerpo visible desde locales y JSON públicos; paginar archivo; conservar cabecera/seguridad; bootstrap público de artículo para evitar petición redundante. Validar GET/HEAD, H1/texto/enlaces, EN/ES, metadata, XSS y montaje de SPA. Resultado: contenido principal consultable sin ejecutar JS, conservando UI interactiva. |
| POST-05-T | P1 / pruebas | `server/seo/__tests__/publicContent.test.ts`, `server/seo/__tests__/metaInjector.integration.test.ts`, `src/lib/__tests__/publicPost.test.ts`, `src/pages/BlogPost.language.test.tsx` | Fixtures aislados, contenido y paginación, URLs de idioma compartido, escape HTML/JSON/fuentes, campos públicos, artículo inmediato sin llamada redundante. Regresión con suites de SEO/metadatos/sitemap/modal/CTA existentes. |
| MEASURE-01 | P1 / bloqueado por acceso externo | Ningún archivo de aplicación; evidencia en `docs/SEO_AUDIT.md` | Sesión disponible sin acceso a propiedad de Search Console. Propietario abre cuenta autorizada; luego URL Inspection y Search Analytics con fechas/cohortes. Riesgo: confundir rastreabilidad con indexación o posición media con ranking fijo. |
| MEASURE-02 | P1 / consultado, muestra pública insuficiente | Ningún archivo de aplicación; evidencia en `docs/SEO_AUDIT.md` | PSI devuelve No Data de campo; medir laboratorio por separado tras release. Dependencia: muestra CrUX suficiente o informe existente de GSC. Si hace falta RUM, proponer lote posterior con consentimiento/instrumentación oficial, sin añadir tracking como sustituto de resultados históricos. |

**Riesgos y dependencias POST-05:** cuerpo inicial y montaje de React no son hidratación completa; vigilar composición visual y CLS. Archivo lee como máximo 30 artículos por respuesta tras el índice existente; revisar latencia en producción. Los controles interactivos siguen requiriendo JS. No se modifica infraestructura, datos, generación, DNS o seguridad. Reversión: revertir este lote de código con el flujo habitual, preservando runtime data. Estimación del lote: 1–2 jornadas con validación; datos/recrawl pueden tardar semanas y los permisos dependen del propietario.

**Orden:** pruebas/build → revisión de diff → commit y PR → main → Actions completo → confirmar nuevo bundle/cuerpo por HTTP fresco → comprobar DOM y navegación EN/ES → repetir PSI y documentar diferencias de laboratorio sin afirmar causalidad → actualizar ambos documentos con resultados. Ningún estado de «sin pendientes» debe ocultar MEASURE-01/02.


## Lote POST-06 — Validación posterior a producción

| ID / prioridad | Archivos | Implementación | Dependencias y riesgos | Validación / resultado esperado |
| --- | --- | --- | --- | --- |
| POST-06-LCP / P1 | `shared/publicContent.ts`, `server/seo/publicContent.ts`, `src/components/Hero.tsx`, `server/seo/__tests__/publicContent.test.ts` | Imagen real LCP presente en HTML inicial, prioridad alta/tamaño explícito, misma URL que React; evitar fade de entrada del contenido principal. | Evidencia del elemento LCP en PSI. Cambia sólo presentación inicial; no garantiza score ni percentiles de campo. | HTTP muestra imagen antes de JS, navegador conserva imagen/diapositivas, repetir lab tras deploy. |
| POST-06-A11Y / P1 | `src/components/Hero.tsx`, `Solutions.tsx`, `CaseStudies.tsx`, `Footer.tsx`, `Team.tsx`, `src/components/__tests__/LocalizedContentLinks.test.tsx` | Dots en botones 44×44; grupos y botones `aria-pressed` en selectores; copyright legible; nombres de perfiles inequívocos. | Mantener selección, reduced-motion, vídeos y enlaces de idioma. No convertir controles en tabs sin su interacción completa. | Prueba de selección/estado y perfiles; navegador móvil mide targets, teclado/foco y nueva auditoría ARIA/contraste. |
| POST-06-VERIFY / P1 | `docs/SEO_AUDIT.md`, `docs/SEO_IMPLEMENTATION_PLAN.md` | Registrar PR #9/Actions, 155 diagnósticos, cifras de sitemap y mediciones antes/después sin mezclar lab/campo. | GSC sigue sin acceso y CrUX sin muestra pública. Auth 401 del historial anónimo se conserva. | Cerrar sólo defectos verificados; mantener dependencias externas en una lista final para el propietario. |

Esfuerzo del lote: 0,5–1 jornada con pruebas y publicación. Mismo ciclo autorizado de rama/PR/main/Actions/auditoría. No requiere nueva infraestructura, datos ni tracking.


## Lote POST-07 — SSR e hidratación de portada con arquitectura existente

El resultado real de POST-06 confirma accesibilidad automática 100 y LCP de laboratorio aún alto. Se amplía a SSR únicamente la portada; el resto ya entrega contenido público semántico inicial. No se reemplaza el framework ni se supone un fallo de indexación por CSR.

| ID / prioridad | Archivos exactos | Implementación y resultado esperado | Dependencias / riesgos | Validación |
| --- | --- | --- | --- | --- |
| POST-07-SSR / P1 | `src/Root.tsx`, `src/entry-server.tsx`, `src/main.tsx`, `src/App.tsx`, `server/publicServing.ts`, `server/seo/metaInjector.ts`, `server/seo/publicContent.ts`, `server/seo/types.ts` | Render React real por petición; mismo árbol en servidor/cliente; marca controlada para `hydrateRoot`; mantener fallback semántico y rutas CSR. Evitar reconstruir el contenido principal de portada tras descargar JS. | React/Vite existentes, artefacto SSR completo, Node compatible. Aislar estado de i18n/query por petición; nunca SSR rutas privadas. Riesgos de mismatch/CPU/payload; medir antes de ampliar. | Suites de SSR/hidratación, HTTP real, nodos conservados, EN/ES concurrente, 503 seguro, privacidad y navegador sin avisos. |
| POST-07-BUILD / P1 | `package.json`, `vite.config.ts`, `server/vite.ts` | Build cliente + SSR + Express; modo producción explícito, manualChunks sólo cliente, public sólo en build cliente; desarrollo con ssrLoadModule. | Ningún paquete nuevo. Usar flujo de despliegue existente; package.json puede activar su verificación normal de dependencias. No instalar nuevas dependencias como diagnóstico. | `npm run build`, vista previa pública aislada y modo desarrollo aislado, artefactos SSR inaccesibles por HTTP. |
| POST-07-VISIBLE / P1 | `src/components/Features.tsx`, `Solutions.tsx`, `DemosCatalog.tsx`, `CaseStudies.tsx`, `Courses.tsx`, `Team.tsx`, `Contact.tsx`, `Footer.tsx`, `Header.tsx`, `src/hooks/useReducedMotion.ts`, `src/i18n/index.ts` | Contenido sin entrada oculta, primer estado determinista, año UTC, idiomas cargados en paralelo; datos del navegador después de hidratación. | Conservar interacción y movimiento reducido. Cambia sólo las entradas decorativas, no textos/cálculos/servicios. | No-JS con markup construido, hidratación EN/ES, teclado/selección y regresiones de enlaces/movimiento. |
| POST-07-FORM / P1 | `src/components/Contact.tsx`, `src/i18n/locales/en/translation.json`, `src/i18n/locales/es/translation.json` | POST explícito y submit deshabilitado antes de JS, aviso localizado y contacto por mailto/tel. | No modificar API ni enviar mensajes en pruebas de producción. Evitar datos en URLs y conservar validación/asíncrono existente. | SSR muestra disabled/POST; hidratación habilita submit; pruebas no envían correo real. |
| POST-07-ANALYTICS / P1 | `src/lib/analytics.ts`, `src/lib/__tests__/analytics.ssr.test.ts` | SDKs de navegador importados condicionalmente; conservar exclusión GTM/directo y de administración. | No tracking nuevo ni cambios de configuración de cuentas. | Pruebas con SDKs/config simulados; renderer Node no inicia peticiones/SDKs. |
| POST-07-TEST / P1 | `server/seo/__tests__/homeSSR.test.tsx`, `server/seo/__tests__/metaInjector.integration.test.ts`, `src/Root.hydration.test.tsx` y suites SEO/enlaces/chat/movimiento existentes | Aislamiento, frontera HTTP, hidratación sin reemplazo del H1, privacidad de errores y rutas. | Usar dependencias existentes y observadores simulados sólo para APIs ausentes de jsdom; verificar también navegador real. | 197 pruebas/33 suites previas; build aprobado; mismos 13 errores TS preexistentes. Repetir HTTP/navegador/PSI tras Actions. |

**Orden y cierre:** revisión de diff → PR/main/Actions por autorización vigente → comprobar bundle y marca SSR live, contenido/metadata/idiomas/sitemaps/404, privacidad de SSR y controles → repetir PSI conservando informe y límites estadísticos → actualizar los dos documentos. No declarar indexación/rankings/CWV de campo a partir de esas comprobaciones. Reversión por el flujo de código habitual, sin tocar datos de runtime. Dependencias finales de cuenta/muestra permanecen al propietario.
