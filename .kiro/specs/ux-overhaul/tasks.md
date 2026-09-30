# Implementation Plan: UX Overhaul

## Overview

This plan converts the `ux-overhaul` design into an incremental, code-focused checklist for the `robles.ai` SPA (Vite + React 19 + TypeScript + Tailwind + Radix/shadcn + framer-motion + wouter + i18next).

The order is deliberate and unblocking:

1. **Group A — Shared primitives** (global CSS, `useReducedMotion`, shared state components, extracted `BlogArticle`) come first because everything else depends on them.
2. **Group B — Area 2 (Blog modal)** builds on `BlogArticle` + i18n keys to deliver the in-page modal, routing hook, and `BlogList` integration.
3. **Group C — Area 1 (Responsive)** applies the shared primitives across Header, Footer, Chatbot, forms, the nine `Try*` demos, admin, media, and fixed-header offsets.
4. **Group D — Area 3 remaining** wires reduced-motion into Hero/particles/chatbot, lazy-loading, ARIA/landmarks/dialog roles, contrast, and scroll-restoration.
5. **Group E — i18n** adds `blogModal.*` and `state.*` keys in en + es with parity.
6. **Group F — Verification & delivery** runs type-check/lint/tests/build, updates docs, commits, pushes, watches CI to green, and verifies production URLs.

Conventions used below:

- Non-test sub-tasks are **required** and MUST be implemented in order.
- Test sub-tasks are marked with `*` and are **optional** (the user will opt to run them). Property-based tests use `fast-check` (≥100 iterations); DOM/example tests use Vitest + `@testing-library/react` (jsdom).
- Every task references the requirement numbers it satisfies and, where relevant, the design section.
- All new user-facing copy MUST flow through i18next (Req 26.1); never hard-code literals.

---

## Tasks

- [ ] 1. Shared primitives: global CSS foundation
  - [ ] 1.1 Add global overflow guard and long-string wrapping to `src/index.css`
    - Add `html, body { max-width: 100%; overflow-x: hidden; }` as the document-root overflow backstop.
    - Add a `.break-anywhere` utility (`overflow-wrap: anywhere; word-break: break-word;`) for URLs/tokens/hashes.
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.3_
    - _Design: Area 1 — 1a Global overflow guard_

  - [ ] 1.2 Add tap-target utility and mobile 16px input rule to `src/index.css`
    - Add `.tap-target` under `@layer utilities` (`min-width:44px; min-height:44px;` inline-flex centered).
    - Add a `@media (max-width: 767px)` rule forcing `font-size: 16px` on `input:not([type=checkbox]):not([type=radio])`, `select`, `textarea` to prevent iOS auto-zoom.
    - _Requirements: 3.1, 3.2, 5.2, 7.2, 7.3, 23.2_
    - _Design: Area 1 — 1b Shared utility conventions_

  - [ ] 1.3 Add fixed-header token and anchor scroll-margin to `src/index.css`
    - Introduce `--header-h: 68px` in `:root` as the single source of truth for header height.
    - Add `:target { scroll-margin-top: calc(var(--header-h) + 16px); }` and `[id] { scroll-margin-top: calc(var(--header-h) + 16px); }` so anchor targets land below the fixed header.
    - _Requirements: 10.1, 10.2, 4.4_
    - _Design: Area 1 — 1c Fixed-header offset and anchor scroll_

  - [ ] 1.4 Add global focus-visible ring and reduced-motion CSS backstop to `src/index.css`
    - Add a `:where(a, button, [role="button"], input, select, textarea, [tabindex]):focus-visible` rule with a visible `outline` using `hsl(var(--ring))`.
    - Add a `@media (prefers-reduced-motion: reduce)` block that near-zeroes `animation-duration`/`transition-duration`, sets `animation-iteration-count: 1`, `scroll-behavior: auto`, and disables `.animated-bg` animation.
    - _Requirements: 17.1, 17.3, 20.1, 20.2, 20.4_
    - _Design: Area 3 — 3a Visible focus states, 3b CSS-level backstop_

- [ ] 2. Shared primitives: hooks and components
  - [ ] 2.1 Create `useReducedMotion` hook (`src/hooks/useReducedMotion.ts`)
    - Track `matchMedia('(prefers-reduced-motion: reduce)')`; subscribe to its `change` event and clean up on unmount.
    - Default to `false` (full motion) when `matchMedia` is unavailable.
    - _Requirements: 20.1, 20.2, 20.3, 20.4_
    - _Design: Area 3 — 3b useReducedMotion hook_

  - [ ]* 2.2 Write DOM tests for `useReducedMotion`
    - Assert it returns the `matchMedia` value, updates on the `change` event, and defaults `false` when `matchMedia` is absent.
    - _Requirements: 20.1_
    - _Design: Testing Strategy — Example-based / DOM tests_

  - [ ] 2.3 Create shared state components (`src/components/state/`)
    - Add `LoadingState` (spinner/skeleton), `EmptyState` (localized message), and `ErrorState` (localized message + retry/alternative action).
    - All copy read from i18next keys (`state.*`); no hard-coded literals.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 26.1_
    - _Design: Area 3 — 3d Consistent loading / empty / error states_

  - [ ] 2.4 Extract the shared `BlogArticle` renderer out of `BlogPost` (`src/components/BlogArticle.tsx`)
    - Move the heading-block + paragraph body rendering (including the paragraph-splitting logic) from `src/pages/BlogPost.tsx` into a presentational `BlogArticle` component.
    - Update `BlogPost.tsx` to import and render `BlogArticle`, preserving the exact current full-page content structure.
    - _Requirements: 11.3_
    - _Design: Area 2 — 2a (shared BlogArticle for identical content structure)_

  - [ ]* 2.5 Write DOM test for `BlogArticle`
    - Assert it renders heading blocks and paragraphs from a sample post's `content` array in the same structure as the full page.
    - _Requirements: 11.3_
    - _Design: Testing Strategy — Example-based / DOM tests_

- [ ] 3. Checkpoint — shared primitives
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. i18n keys for the modal and shared states
  - [ ] 4.1 Add `blogModal.*` and `state.*` keys to `src/i18n/locales/en/translation.json`
    - `blogModal`: `close`, `prev`, `next`, `openInNewTab`, `copyLink`, `copied`, `copyFallbackLabel`.
    - `state`: `loading`, `empty`, `error`, `retry`.
    - _Requirements: 26.1, 26.2, 19.4, 14.x, 15.x, 16.3_
    - _Design: i18n Plan_

  - [ ] 4.2 Add the same `blogModal.*` and `state.*` keys to `src/i18n/locales/es/translation.json`
    - Provide Spanish values for every key added in 4.1; keep the en/es key sets in exact parity.
    - _Requirements: 26.2, 26.3_
    - _Design: i18n Plan_

- [ ] 5. Area 2 — Blog modal core logic
  - [ ] 5.1 Create `useBlogModalRouting` hook (`src/hooks/useBlogModalRouting.ts`)
    - Implement `openIndex` state plus `openAt(i)` (push `/blog/:slug`), `goToIndex(i)` (replaceState `/blog/:slug` for prev/next), and `close()` (restore `/blog` via `history.back()`/`pushState`).
    - Tag the pushed entry with `{ blogModal: true }`; add a `popstate` listener so browser back closes the modal and lands on `/blog`.
    - Derive the language-appropriate slug from `translations[activeLang] ?? translations.en`; recompute on language switch.
    - Degrade gracefully (fall back to full-page link behavior) if `history.pushState` throws.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 15.2, 15.3_
    - _Design: Area 2 — 2b Routing hook_

  - [ ] 5.2 Add pure URL/slug helpers used by the modal
    - Add an `absoluteUrl(slug)` builder and a slug→post lookup over `Fetched_Posts` with `en` fallback, colocated with the routing hook or a small `src/lib` util.
    - _Requirements: 11.2, 12.1, 12.4, 14.1, 14.2_
    - _Design: Area 2 — 2a/2b; Correctness Properties 3, 4_

  - [ ]* 5.3 Write property test — prev/next bounds and disabled ends
    - `// Feature: ux-overhaul, Property 1: Prev/next stays within bounds`
    - fast-check ≥100 iterations over random `Fetched_Posts` and valid indices: next/prev stay in `[0, length-1]`; next disabled iff `i === length-1`; prev disabled iff `i === 0`.
    - **Validates: Requirements 15.1, 15.4, 15.5**
    - _Design: Correctness Properties — Property 1_

  - [ ]* 5.4 Write property test — navigation moves exactly one adjacent post
    - `// Feature: ux-overhaul, Property 2: Navigation moves exactly one adjacent post`
    - fast-check ≥100 iterations: enabled next selects `posts[i+1]`, enabled prev selects `posts[i-1]`, preserving order.
    - **Validates: Requirements 15.2, 15.3**
    - _Design: Correctness Properties — Property 2_

  - [ ]* 5.5 Write property test — URL/slug round-trip
    - `// Feature: ux-overhaul, Property 3: URL/slug derivation round-trips to the correct post`
    - fast-check ≥100 iterations over random posts and `L in {en, es}` (with missing `es` to exercise fallback): the built link resolves to `/blog/<translations[L].slug>` and looking that slug up returns the displayed post.
    - **Validates: Requirements 12.1, 12.4, 14.1, 14.2, 11.2**
    - _Design: Correctness Properties — Property 3_

  - [ ]* 5.6 Write property test — language fallback selects a defined translation
    - `// Feature: ux-overhaul, Property 4: Language fallback selects a defined translation`
    - fast-check ≥100 iterations: chosen content is `translations[L]` when present else `translations.en`, and is never `undefined`.
    - **Validates: Requirements 11.2**
    - _Design: Correctness Properties — Property 4_

  - [ ]* 5.7 Write DOM tests for `useBlogModalRouting`
    - Assert `openAt` pushes `/blog/:slug`, `goToIndex` replaces the URL, `close` restores `/blog`, and a simulated `popstate` (back) closes the modal.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
    - _Design: Testing Strategy — Example-based / DOM tests_

- [ ] 6. Area 2 — BlogModal component
  - [ ] 6.1 Create `BlogModal` component (`src/components/BlogModal.tsx`)
    - Reuse the VideoModal interaction pattern (framer-motion `AnimatePresence` + `motion`, Escape handler, `document.body.style.overflow` lock).
    - Props `{ posts, index, onIndexChange, onClose }`; render `posts[index]` via `BlogArticle` using `translations[activeLang] ?? translations.en`.
    - Article region `max-h-[85vh] overflow-y-auto` with `.scrollbar-thin`; dialog frame `max-w-3xl w-full mx-4` (fits 320px).
    - Expose `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the article `<h1>` id.
    - Gate entrance/exit animation with `useReducedMotion` (fade-only when reduce is on).
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 18.3, 20.1, 20.4, 25.3, 9.3_
    - _Design: Area 2 — 2a BlogModal component_

  - [ ] 6.2 Add prev/next navigation with disabled ends and scroll reset
    - Prev/Next controls call `onIndexChange(index ± 1)`; disable prev at `index === 0` and next at `index === length - 1` (convey via `disabled` attribute + reduced opacity, a non-color cue).
    - On index change reset the article scroll container `scrollTop = 0`.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 22.3_
    - _Design: Area 2 — 2a Prev/next_

  - [ ] 6.3 Add open-in-new-tab and copy/share with clipboard fallback
    - Open-in-new-tab anchor `href={absoluteUrl(slug)}` `target="_blank" rel="noopener"`.
    - Copy-link uses `navigator.clipboard.writeText`; on success show a transient aria-live "copied" status (auto-dismiss ~2s).
    - On clipboard failure/unavailability, immediately render a read-only text input with the absolute link and call `.select()` on it with no extra user action.
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
    - _Design: Area 2 — 2a Open-in-new-tab / copy-share_

  - [ ] 6.4 Add dialog dismissal, body-scroll lock, and focus trap
    - Esc closes; backdrop click closes (ref-equality); a Close (X) control with `aria-label` closes.
    - Lock body scroll on mount / restore on unmount; add `overscroll-behavior: contain` on the scroll area (and position-fix body if needed for iOS).
    - Move focus into the modal on open; trap Tab within the modal (wrap first/last focusable); fall back to the dialog container if none.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
    - _Design: Area 2 — 2d Dialog behaviors_

  - [ ]* 6.5 Write DOM tests for `BlogModal`
    - Opens with correct post; Esc/backdrop/close-button all close; body-scroll lock applied on open and released on close; focus moves into modal on open; prev/next disabled at ends; prev/next resets article scroll to top; copy shows transient status; clipboard-failure path renders and selects the fallback text field.
    - _Requirements: 11.1, 11.4, 14.3, 14.4, 15.4, 15.5, 15.6, 16.1, 16.2, 16.3, 16.4, 16.5_
    - _Design: Testing Strategy — Example-based / DOM tests_

- [ ] 7. Area 2 — BlogList integration and cold-load fallback
  - [ ] 7.1 Wire `useBlogModalRouting` + `BlogModal` into `BlogList` with card-click interception
    - Pass `Fetched_Posts` (`posts` state) to `useBlogModalRouting`; render `<BlogModal .../>` when `openIndex !== null`.
    - Keep each `Blog_Card` as an `<a href="/blog/:slug">` but intercept plain left-click with `preventDefault` → `openAt(cardIndex)` (preserves middle/cmd-click to open the real page).
    - Capture `window.scrollY` + the triggering card `ref` before opening; on close restore `window.scrollTo(0, savedY)` and `.focus()` the originating card.
    - _Requirements: 11.1, 12.1, 16.6, 24.3_
    - _Design: Area 2 — 2c BlogList integration_

  - [ ] 7.2 Confirm cold-load fallback route is intact in `App.tsx`
    - Verify `<Route path="/blog/:slug" component={BlogPost} />` remains before/within the `<Switch>` so a direct/reloaded `/blog/:slug` renders the full `BlogPost` (with existing not-found redirect on 404).
    - Do not alter the server SEO middleware or sitemap routes.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 27.1, 27.2_
    - _Design: Area 2 — 2e Cold-load fallback + SEO_

- [ ] 8. Checkpoint — blog modal end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Area 1 — Global chrome responsiveness
  - [ ] 9.1 Make Header mobile menu use the header token and tap targets (`src/components/Header.tsx`)
    - Align the mobile panel `top`/height to `--header-h`; wrap the menu toggle in `.tap-target`; keep `overflow-y-auto`.
    - Ensure panel content uses `min-w-0`/`.break-anywhere`; confirm the existing resize listener closes the menu at ≥768px and items close the menu then navigate.
    - Add a `focus-visible` ring where `focus:outline-none` currently has no replacement (e.g. logo).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 3.1, 17.1_
    - _Design: Area 1 — 1d Header row_

  - [ ] 9.2 Swap the fixed-header magic number to the token in `App.tsx`
    - Replace `pt-[68px]` on `<main>` with `pt-[var(--header-h)]`; confirm `ChatbotWidget` still receives `hideForMobileMenu={isMobileMenuOpen}`.
    - _Requirements: 10.1, 4.6_
    - _Design: Area 1 — 1c/1d App.tsx row_

  - [ ] 9.3 Make Footer links/socials tap targets with accessible names (`src/components/Footer.tsx`)
    - Wrap footer links and each social `<a>` in `.tap-target`; add `aria-label` to icon-only social links; confirm columns stack on mobile without overflow.
    - _Requirements: 5.1, 5.2, 3.3, 18.1_
    - _Design: Area 1 — 1d Footer row_

  - [ ] 9.4 Constrain ChatbotWidget bubble/panel to viewport (`src/components/chat/ChatbotWidget.tsx`)
    - Clamp panel width to `min(calc(100vw - 2rem), 380px)`; ensure the close control stays within the viewport; confirm balloon `max-w` clamp prevents overflow at 320px.
    - _Requirements: 6.1, 6.2, 6.3_
    - _Design: Area 1 — 1d ChatbotWidget row_

- [ ] 10. Area 1 — Forms responsiveness
  - [ ] 10.1 Make Contact/Apply/Quiz/Landing form fields mobile-friendly
    - Apply `w-full` to fields and `min-w-0` to form containers; ensure submit controls use `.tap-target`; ensure the focused field and its validation message scroll into view on mobile.
    - Files: `src/pages/Contact.tsx` (or Home Contact section), `src/pages/Apply.tsx`, `src/pages/Quiz.tsx`, `src/pages/Landing.tsx`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - _Design: Area 1 — 1d Forms row_

- [ ] 11. Area 1 — Demo shared components and layout
  - [ ] 11.1 Make `ApiCallLog` and `JsonHighlight` scroll instead of overflow
    - Wrap `JsonHighlight` output in `overflow-x-auto` + `.break-anywhere`; confirm `ApiCallLog` rows keep `truncate` on the path and confine wide detail to a scrollable region.
    - Files: `src/components/demo/ApiCallLog.tsx`, `src/components/demo/JsonHighlight.tsx`.
    - _Requirements: 8.1, 8.2, 23.4_
    - _Design: Area 1 — 1d ApiCallLog/JsonHighlight row_

  - [ ] 11.2 Make the nine Try* demos stack and scroll wide artifacts (part 1)
    - For `TryIdentity`, `TryRAG`, `TryLangChain`, `TryTranscription`, `TryChatbot`: ensure outer container uses `px-*` + `min-w-0`; confirm two-column grid stacks on mobile; wrap logs/JSON/transcripts/tables in `overflow-x-auto`; make control buttons `.tap-target`.
    - _Requirements: 1.3, 8.1, 8.2, 8.3, 23.1, 23.2, 23.4_
    - _Design: Area 1 — 1d Demo pages row_

  - [ ] 11.3 Make the nine Try* demos stack and scroll wide artifacts (part 2, incl. canvas overlays)
    - For `TryDocExtract`, `TryForecast`, `TryObjectDetection`, `TryEmotion` (and basic responsive correctness for `TryMedical`): stack layout, wrap extracted tables/forecast charts in scrollable regions, `.tap-target` controls, and preserve the canvas shrink-wrap + `absolute inset-0 h-full w-full` overlay pattern so overlay coordinates align to the scaled media.
    - _Requirements: 1.3, 9.2, 23.1, 23.2, 23.3, 23.4_
    - _Design: Area 1 — 1d Demo pages / Media-canvas rows_

- [ ] 12. Area 1 — Admin tables and media scaling
  - [ ] 12.1 Wrap admin tables and charts in scrollable containers
    - Wrap every `<table>` in the admin sub-pages (`AdminAnalytics`, `AdminConversationList`, `AdminQuizLeads`, `AdminDominical*`, `AdminBackends`) in an `overflow-x-auto min-w-0` container; verify recharts charts use a responsive container; confirm `AdminLayout` mobile drawer has no overflow.
    - _Requirements: 1.4, 8.3_
    - _Design: Area 1 — 1d Admin pages row_

  - [ ] 12.2 Enforce media scaling conventions site-wide
    - Ensure content images use `max-w-full h-auto`; ensure embedded video and the video modal render within viewport bounds; confirm back-to-top/chatbot fixed controls do not permanently cover primary interactive content on mobile.
    - _Requirements: 9.1, 9.3, 10.3_
    - _Design: Area 1 — 1d Media/back-to-top rows_

- [ ] 13. Checkpoint — responsive pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Area 3 — Reduced-motion wiring
  - [ ] 14.1 Gate Hero and scroll-entrance animations with `useReducedMotion`
    - In `Hero.tsx`, pause the auto-advance interval and render the slide as crossfade/static when reduce is requested; make `animations.ts` consumers render final/visible state immediately under reduce; preserve essential state transitions.
    - _Requirements: 20.1, 20.4_
    - _Design: Area 3 — 3b Gating strategy_

  - [ ] 14.2 Gate ParticleBackground and Chatbot balloon with `useReducedMotion`
    - In `ParticleBackground.tsx`, skip the `requestAnimationFrame` loop and render a static backdrop under reduce; in `ChatbotWidget.tsx`, replace the looping balloon bounce with a single settle (or none) under reduce.
    - _Requirements: 20.2, 20.3, 20.4_
    - _Design: Area 3 — 3b Particle background / Chatbot balloon_

- [ ] 15. Area 3 — Lazy-loading, ARIA/landmarks, contrast, scroll consistency
  - [ ] 15.1 Add image lazy-loading and aspect-ratio reservation
    - Add `loading="lazy"` + `decoding="async"` to below-the-fold content images (blog card avatars, editor headshots, case-study images, team photos, demo sample thumbnails); keep above-the-fold hero imagery eager.
    - Reserve layout space via intrinsic `width`/`height` or `aspect-[w/h]` on the container for every deferred image (standing obligation).
    - _Requirements: 21.1, 21.2_
    - _Design: Area 3 — 3c Image lazy-loading_

  - [ ] 15.2 Add ARIA landmarks, accessible names, alt text, and dialog role on VideoModal
    - Ensure `Header` nav is a landmark with `aria-label`, `<main>` present, `Footer` is `<footer>`; add `aria-label`s to distinguish primary vs footer nav.
    - Audit icon-only controls for accessible names; give content images descriptive `alt` and decorative images `alt=""`.
    - Add `role="dialog"` + `aria-modal="true"` + accessible name to `VideoModal` (`src/components/VideoModal.tsx`).
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
    - _Design: Area 3 — 3e ARIA, landmarks, alt text_

  - [ ] 15.3 Audit and fix color contrast with non-color state cues
    - Bump low-contrast body text (borderline `text-gray-400`/`text-gray-500` on light backgrounds) to meet ≥4.5:1; ensure large text/meaningful indicators meet ≥3:1; ensure any state conveyed by color also has a non-color cue (icon/shape/text). Limit to failing tokens (no brand redesign).
    - _Requirements: 22.1, 22.2, 22.3_
    - _Design: Area 3 — 3e Color contrast_

  - [ ] 15.4 Verify scroll-restoration consistency and wire error states into blog fetches
    - Confirm `useScrollRestoration` still puts forward navigation at top and restores position on back/forward, and that the modal's `/blog/:slug` pushes don't desync it (underlying list key stays `/blog`).
    - Replace `BlogList`/`BlogPost` silent-finish/hard-redirect on non-404 fetch failure with the shared `ErrorState` (retry); keep the 404 not-found redirect.
    - _Requirements: 24.1, 24.2, 24.3, 19.3_
    - _Design: Area 3 — 3f Scroll restoration; Error Handling_

  - [ ]* 15.5 Write a structural responsive smoke test (jsdom)
    - Where feasible, assert the overflow-guard structural contract: wide-content wrappers carry `overflow-x-auto`, form inputs render at the base 16px class, and demo two-column layouts render a single stacked column structure. (Pixel-level overflow is verified manually in Group F.)
    - _Requirements: 1.3, 7.2, 8.1, 23.1_
    - _Design: Testing Strategy — Responsive smoke_

- [ ] 16. Checkpoint — cross-cutting pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Verification & delivery
  - [ ] 17.1 Type-check, lint, and run the relevant test suite
    - Run `npm run check` (type-check) and lint; fix any errors introduced by this feature.
    - Run the front-end tests for this feature (`BlogModal`, `useBlogModalRouting`, `useReducedMotion`, `BlogArticle`, demo/state tests). Note the better-sqlite3 gotcha: if server tests must run, `npm rebuild better-sqlite3` with the same Node that runs `npm test`, or scope Vitest to the relevant front-end test files; compare any failure against `main` before attributing it to this change.
    - Verify en/es `translation.json` key parity for the new keys.
    - _Requirements: 28.2, 26.3_
    - _Design: Testing Strategy — Lint & build / Local test gotcha_

  - [ ] 17.2 Run the production build
    - Run `npm run build` and confirm it succeeds; fix any build failures.
    - _Requirements: 28.1_
    - _Design: Testing Strategy — Lint & build_

  - [ ] 17.3 Update documentation
    - Update `README.md` and `AGENTS.md` where relevant (new `BlogModal`/`BlogArticle` components, `useReducedMotion`/`useBlogModalRouting` hooks, shared state components, new i18n `blogModal.*`/`state.*` keys, global CSS conventions). Keep to exactly the two docs.
    - _Requirements: 26.2_
    - _Design: Delivery pipeline_

  - [ ] 17.4 Commit and push to trigger CI
    - `git add` all changed files, commit with a descriptive message, and push to `main` (via `bash push.sh` or `git push`).
    - _Requirements: 28.3_
    - _Design: Risks, Rollback, and Delivery — Delivery pipeline_

  - [ ] 17.5 Watch CI to green and verify production URLs
    - Watch GitHub Actions (`.github/workflows/deploy.yml` → SSH → VPS `pull.sh` → `pm2 restart`) through to a successful deploy; if it fails, read the failing step logs, fix the root cause, and iterate until green.
    - Verify affected Public_Page production URLs respond `200` and render: `https://robles.ai/` (home), `/demos`, `/blog` (list), a real `/blog/<slug>` (cold load → full page), and a couple of `Try*` pages.
    - `curl` a `/blog/:slug` and assert the server-injected `<title>`/Open Graph tags are present (SEO no-regression); assert `/sitemap.xml` still returns the index. If any affected URL fails, treat the release as failed and iterate rather than considering it done.
    - _Requirements: 28.3, 28.4, 13.2, 27.1, 27.2_
    - _Design: CI / production verification_

## Notes

- Tasks marked with `*` are optional test sub-tasks; the user opts to run them (property-based + DOM/example + structural smoke).
- Non-test tasks are required and build incrementally: shared primitives → blog modal → responsive → cross-cutting → verification.
- Property tests (5.3–5.6) cover the four Correctness Properties from the design and each cite `Feature: ux-overhaul, Property N` plus the requirements they validate.
- No new UI/animation dependencies are introduced (Req 25); the modal reuses the VideoModal pattern.
- The definition of done is CI green **and** verified production URLs (Req 28.3, 28.4).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.4", "4.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.5", "5.1", "5.2"] },
    { "id": 3, "tasks": ["5.3", "5.4", "5.5", "5.6", "5.7", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["6.5", "7.1", "7.2"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4", "10.1", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "12.1", "12.2"] },
    { "id": 8, "tasks": ["14.1", "14.2", "15.1", "15.2", "15.3"] },
    { "id": 9, "tasks": ["15.4", "15.5"] },
    { "id": 10, "tasks": ["17.1"] },
    { "id": 11, "tasks": ["17.2"] },
    { "id": 12, "tasks": ["17.3"] },
    { "id": 13, "tasks": ["17.4"] },
    { "id": 14, "tasks": ["17.5"] }
  ]
}
```
