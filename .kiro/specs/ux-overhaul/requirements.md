# Requirements Document

## Introduction

This spec defines a UX overhaul for the public `robles.ai` React SPA (Vite + React 19 + TypeScript + Tailwind + Radix/shadcn + framer-motion + wouter + i18next). The overhaul covers three confirmed areas plus a set of non-functional constraints:

1. **Responsive / mobile audit AND fix** — every public page, every Home section, all live `Try*` demos, and the `/admin` panel must render and function correctly on small screens (320/375/414 px), with no horizontal overflow, readable type, adequate tap targets, scrollable (not overflowing) tables/logs/JSON, scalable media, and non-obstructive sticky/fixed elements.
2. **News/blog in-page modal viewer** — on `/blog`, clicking a news card opens the article in an in-page modal overlay (instead of navigating away), with History-API URL updates to `/blog/:slug`, open-in-new-tab and copy/share buttons, previous/next navigation across the currently-fetched posts, scrollable content, Esc/backdrop/close-button dismissal, body-scroll lock, focus management, and scroll-position restore. Direct/cold loads of `/blog/:slug` still fall back to the full `BlogPost` page, and existing server-side SEO meta injection for `/blog/:slug` must keep working for crawlers.
3. **Additional cross-cutting UX improvements** — keyboard accessibility and visible focus states, ARIA labels, consistent loading/skeleton and empty/error states, `prefers-reduced-motion` support for heavy framer-motion/particle animations, consistent touch targets, scroll restoration, image lazy-loading and alt text, color contrast, and demo-specific rough edges (API logs and canvas/video demos on small screens).

This document specifies **what** the overhaul must achieve. Implementation choices (specific components, CSS classes, refactors) are deferred to the design phase. No code is written in this phase.

### Scope of pages and components

- **Standalone pages:** Home (`/`), Landing (`/get-started`), Quiz (`/diagnostico-ia`), Careers (`/careers`), Apply (`/apply`), BlogList (`/blog`), BlogPost (`/blog/:slug`), Demos (`/demos`).
- **Home sections:** Hero, Features, Solutions, CaseStudies, Courses, Team, Testimonials, Contact, DemosCatalog.
- **Live `Try*` demos:** TryIdentity, TryRAG, TryLangChain, TryTranscription, TryChatbot, TryDocExtract, TryForecast, TryObjectDetection, TryEmotion. `TryMedical` is `"soon"` (selector only, no backend) and is in scope only for basic responsive correctness.
- **Global chrome:** Header (desktop nav + mobile menu), Footer, floating ChatbotWidget.
- **Admin:** AdminLayout and all admin sub-pages (`/admin`, `/admin/settings`, `/admin/dominical`, `/admin/dominical/:id`, `/admin/analytics`, `/admin/conversations`, `/admin/conversations/:id`, `/admin/quiz-leads`, `/admin/backends`).

### Out of scope

- New UI dependencies (unless strictly necessary and justified in design).
- Server-side rendering changes beyond preserving existing `/blog/:slug` SEO meta injection.
- Backend/API changes to the seven demo Cloud Run services.
- Redesign of the visual brand, color system, or information architecture beyond responsive/accessibility corrections.

## Glossary

- **Site**: The public `robles.ai` React SPA and its Express host that serves it.
- **Responsive_Layout**: The set of layout behaviors that adapt the Site to a given viewport width.
- **Mobile_Viewport**: A browser viewport with a CSS width in the set {320, 375, 414} px, representing the responsive audit targets.
- **Public_Page**: Any page listed in "Scope of pages and components" that is not under `/admin`.
- **Admin_Page**: `AdminLayout` and its authenticated sub-pages under `/admin`.
- **Try_Demo**: One of the nine live demo pages listed in scope (TryMedical excluded except for basic responsive correctness).
- **Tap_Target**: An interactive element (button, link, input control, icon control) that a touch user activates.
- **Header**: The global `Header` component, including the desktop navigation and the mobile menu.
- **Footer**: The global `Footer` component.
- **Chatbot_Widget**: The global floating `ChatbotWidget` component and its bubble, notification balloon, and chat panel.
- **Api_Log**: The shared `ApiCallLog` component and its expandable JSON detail used by live-API demos.
- **Blog_Modal**: The new in-page overlay component that displays a single blog article over the `/blog` list.
- **Blog_Card**: A clickable card in the `/blog` list representing one post.
- **Fetched_Posts**: The array of posts currently loaded in `BlogList` state for the active page and filters.
- **Blog_Post_Page**: The full-page `BlogPost` route component rendered for `/blog/:slug`.
- **SEO_Injection**: The existing Express server-side middleware that injects `<title>`, meta, Open Graph, Twitter Card, hreflang, canonical, and JSON-LD into the HTML for `/blog/:slug` before serving crawlers.
- **Reduced_Motion**: The user preference expressed by the CSS media query `prefers-reduced-motion: reduce`.
- **Focus_Indicator**: A visible outline or style that marks the currently keyboard-focused element.
- **I18n_System**: The `i18next` / `react-i18next` translation system with `en` and `es` locales under `src/i18n/locales/{en,es}/translation.json`.
- **Horizontal_Overflow**: A rendered layout wider than the viewport that produces a horizontal scrollbar on the document root or forces sideways panning.
- **CI_Pipeline**: The GitHub Actions workflow (`.github/workflows/deploy.yml`) plus the VPS `pull.sh` deploy step.

---

## Requirements

### Area 1: Responsive / Mobile

### Requirement 1: No horizontal overflow on mobile

**User Story:** As a mobile visitor, I want every page to fit my screen width, so that I never have to scroll or pan sideways to read content.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render every Public_Page without Horizontal_Overflow at document-root level.
2. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render every Home section (Hero, Features, Solutions, CaseStudies, Courses, Team, Testimonials, Contact, DemosCatalog) without Horizontal_Overflow.
3. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render every Try_Demo without Horizontal_Overflow.
4. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render every Admin_Page without Horizontal_Overflow.
5. IF a content block is intrinsically wider than a Mobile_Viewport, THEN THE Site SHALL confine the horizontal scrolling to that block rather than the document root.

### Requirement 2: Readable typography on mobile

**User Story:** As a mobile visitor, I want text sized for a small screen, so that I can read content without zooming.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render body copy on every Public_Page at a computed font size of at least 14 px.
2. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render each heading at a font size that does not force the heading text to overflow its container.
3. WHERE the viewport is a Mobile_Viewport, THE Site SHALL wrap long words and unbroken strings (URLs, tokens, hashes) so that no single string forces Horizontal_Overflow.

### Requirement 3: Adequate tap targets on mobile

**User Story:** As a touch user, I want controls large enough to tap accurately, so that I do not mis-tap adjacent controls.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render each primary Tap_Target with a touch area of at least 44 by 44 CSS pixels.
2. WHERE two Tap_Targets are adjacent on a Mobile_Viewport, THE Site SHALL provide spacing sufficient to prevent overlap of their 44 by 44 pixel touch areas.
3. WHERE an icon-only control appears on a Mobile_Viewport, THE Site SHALL expose an accessible name for that control.

### Requirement 4: Header and mobile navigation

**User Story:** As a mobile visitor, I want a usable navigation menu, so that I can reach any page from my phone.

#### Acceptance Criteria

1. WHILE the viewport width is below 768 px, THE Header SHALL present the mobile menu toggle in place of the desktop navigation.
2. WHEN a visitor activates the mobile menu toggle, THE Header SHALL open a navigation panel that lists every top-level navigation group and its items.
3. WHEN a visitor selects a navigation item in the mobile menu, THE Header SHALL close the mobile menu and navigate to the selected destination.
4. WHILE the mobile menu is open, THE Header SHALL render the panel without Horizontal_Overflow and SHALL allow vertical scrolling when the panel content exceeds the viewport height.
5. WHEN the viewport width crosses from below 768 px to 768 px or greater, THE Header SHALL close the mobile menu.
6. WHILE the mobile menu is open, THE Chatbot_Widget SHALL be hidden so that it does not overlap the menu.

### Requirement 5: Footer on mobile

**User Story:** As a mobile visitor, I want the footer links stacked and tappable, so that I can use footer navigation on a phone.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Footer SHALL stack its link columns vertically without Horizontal_Overflow.
2. WHERE the viewport is a Mobile_Viewport, THE Footer SHALL render each footer link and social icon as a Tap_Target of at least 44 by 44 CSS pixels.

### Requirement 6: Chatbot widget on mobile

**User Story:** As a mobile visitor, I want the chatbot to stay out of my way, so that it never covers the content I am trying to read or the controls I need.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Chatbot_Widget SHALL render its bubble and panel within the viewport bounds without Horizontal_Overflow.
2. WHILE the Chatbot_Widget panel is open on a Mobile_Viewport, THE Chatbot_Widget SHALL keep the panel close control reachable within the viewport.
3. WHERE the Chatbot_Widget notification balloon is shown on a Mobile_Viewport, THE Chatbot_Widget SHALL constrain the balloon width so that it does not cause Horizontal_Overflow.

### Requirement 7: Forms usable on mobile

**User Story:** As a mobile visitor, I want forms to be easy to complete on a phone, so that I can contact the company, apply for a job, or take the quiz.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render each form field on the Contact, Apply, Quiz, and Landing pages at full available width without Horizontal_Overflow.
2. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render each form input control with a computed font size of at least 16 px so that the platform does not auto-zoom on focus.
3. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render each form submit control as a Tap_Target of at least 44 by 44 CSS pixels.
4. WHILE a form control is focused on a Mobile_Viewport, THE Site SHALL keep the focused control and its validation message visible within the viewport.

### Requirement 8: Tables, logs, and JSON scroll instead of overflowing

**User Story:** As a mobile visitor using a demo, I want wide data (tables, API logs, JSON) to scroll within its container, so that it never breaks the page layout.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Api_Log SHALL confine any content wider than the viewport to a horizontally scrollable region within the log container.
2. WHERE the viewport is a Mobile_Viewport, THE Site SHALL confine JSON payloads rendered by the demos to a scrollable region rather than causing document-root Horizontal_Overflow.
3. WHERE the viewport is a Mobile_Viewport, THE Site SHALL confine any tabular data on Admin_Pages and Try_Demos to a scrollable region rather than causing document-root Horizontal_Overflow.

### Requirement 9: Media scales on mobile

**User Story:** As a mobile visitor, I want images, canvases, and video to fit the screen, so that media never overflows or gets clipped.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Site SHALL scale each image to fit within its container width without Horizontal_Overflow.
2. WHERE the viewport is a Mobile_Viewport, THE Site SHALL scale the camera/canvas surfaces of TryObjectDetection and TryEmotion to fit within the viewport width while preserving aspect ratio.
3. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render embedded video (including the video modal) within the viewport bounds without Horizontal_Overflow.

### Requirement 10: Sticky and fixed elements do not obscure content

**User Story:** As a mobile visitor, I want fixed headers, back-to-top buttons, and floating widgets to not hide the content I need, so that I can read and interact fully.

#### Acceptance Criteria

1. WHILE the fixed Header is displayed, THE Site SHALL offset page content so that the top of the primary content is not hidden behind the Header.
2. WHEN a visitor navigates to an in-page anchor target, THE Site SHALL position the target below the fixed Header so that the target heading is visible.
3. WHERE fixed controls (back-to-top button, Chatbot_Widget) are displayed on a Mobile_Viewport, THE Site SHALL position them so that they do not permanently cover primary interactive content.

---

### Area 2: News/Blog In-Page Modal Viewer

### Requirement 11: Open article in an in-page modal

**User Story:** As a blog reader, I want clicking a news card to open the article in an overlay without leaving the list, so that I can read and return to my place instantly.

#### Acceptance Criteria

1. WHEN a visitor activates a Blog_Card on the `/blog` page, THE Site SHALL open the Blog_Modal displaying that post's article content over the list instead of performing a full navigation away from `/blog`.
2. WHEN the Blog_Modal opens, THE Site SHALL render the article using the post's `translations` content for the active `I18n_System` language, falling back to the `en` translation when the active language is unavailable.
3. WHEN the Blog_Modal opens, THE Site SHALL render the article heading blocks and body paragraphs in the same content structure used by the Blog_Post_Page.
4. WHILE the Blog_Modal is open, THE Blog_Modal SHALL make its article content vertically scrollable when the content exceeds the modal height.

### Requirement 12: URL updates via History API for deep-linking

**User Story:** As a blog reader, I want the address bar to reflect the open article, so that I can copy, share, or bookmark a direct link to it.

#### Acceptance Criteria

1. WHEN the Blog_Modal opens for a post, THE Site SHALL push a history entry with the path `/blog/:slug` for that post while keeping the `/blog` list mounted beneath the modal.
2. WHEN the visitor closes the Blog_Modal, THE Site SHALL restore the `/blog` list URL without triggering a full-page navigation.
3. WHEN the visitor triggers browser back navigation while the Blog_Modal is open, THE Site SHALL close the Blog_Modal and return to the `/blog` list state.
4. WHEN the visitor navigates between posts in the Blog_Modal, THE Site SHALL update the address-bar path to the `/blog/:slug` of the currently displayed post.

### Requirement 13: Cold-load fallback to the full page preserves SEO

**User Story:** As a visitor or a crawler that loads a shared article link directly, I want the full article page to render, so that deep links and search indexing keep working.

#### Acceptance Criteria

1. WHEN `/blog/:slug` is loaded directly or reloaded without a prior `/blog` list state, THE Site SHALL render the full Blog_Post_Page for that slug.
2. THE Site SHALL preserve the existing server-side SEO_Injection for `/blog/:slug` responses served to crawlers.
3. THE Site SHALL keep the existing sitemap generation for blog URLs unchanged.
4. IF the requested slug does not exist, THEN THE Site SHALL render the existing not-found behavior for that route.

### Requirement 14: Open-in-new-tab and copy/share controls

**User Story:** As a blog reader, I want to open the article in a new tab or copy its link, so that I can share it or keep it while continuing to browse.

#### Acceptance Criteria

1. WHILE the Blog_Modal is open, THE Blog_Modal SHALL present a control that opens the current article's `/blog/:slug` in a separate browser tab.
2. WHILE the Blog_Modal is open, THE Blog_Modal SHALL present a control that copies the current article's absolute `/blog/:slug` link to the clipboard.
3. WHEN the visitor activates the copy-link control, THE Blog_Modal SHALL confirm the copy action with a visible, transient status indication.
4. IF the clipboard operation fails, THEN THE Blog_Modal SHALL automatically display the shareable `/blog/:slug` link in a text field and pre-select (highlight) its text as soon as the failure is detected, so the visitor can copy it manually without any additional action.

### Requirement 15: Previous/next navigation within the modal

**User Story:** As a blog reader, I want to move to the previous or next article without closing the overlay, so that I can browse several articles in a row.

#### Acceptance Criteria

1. WHILE the Blog_Modal is open, THE Blog_Modal SHALL present previous and next controls that move to the adjacent post within the Fetched_Posts.
2. WHEN the visitor activates the next control, THE Blog_Modal SHALL display the next post in the Fetched_Posts order and update the address-bar path accordingly.
3. WHEN the visitor activates the previous control, THE Blog_Modal SHALL display the previous post in the Fetched_Posts order and update the address-bar path accordingly.
4. WHILE the first post in the Fetched_Posts is displayed, THE Blog_Modal SHALL disable the previous control.
5. WHILE the last post in the Fetched_Posts is displayed, THE Blog_Modal SHALL disable the next control.
6. WHEN the visitor navigates to a different post in the Blog_Modal, THE Blog_Modal SHALL reset the article scroll position to the top of the new article.

### Requirement 16: Dismissal, body-scroll lock, focus, and scroll restore

**User Story:** As a blog reader, I want the overlay to behave like a proper accessible dialog, so that keyboard and screen-reader use is correct and my list position is preserved.

#### Acceptance Criteria

1. WHEN the visitor presses the Escape key while the Blog_Modal is open, THE Blog_Modal SHALL close.
2. WHEN the visitor activates the backdrop outside the modal content, THE Blog_Modal SHALL close.
3. WHILE the Blog_Modal is open, THE Blog_Modal SHALL present a close control that dismisses the modal.
4. WHILE the Blog_Modal is open, THE Site SHALL lock document body scrolling so that the underlying list does not scroll.
5. WHEN the Blog_Modal opens, THE Blog_Modal SHALL move keyboard focus into the modal and SHALL confine Tab focus traversal to the modal content while open.
6. WHEN the Blog_Modal closes, THE Site SHALL restore the `/blog` list scroll position that was active before the modal opened and SHALL return focus to the Blog_Card that opened it.

---

### Area 3: Additional Cross-Cutting UX Improvements

### Requirement 17: Visible keyboard focus states

**User Story:** As a keyboard user, I want to see which element is focused, so that I can navigate the Site without a mouse.

#### Acceptance Criteria

1. WHEN an interactive element receives keyboard focus on any Public_Page, THE Site SHALL display a visible Focus_Indicator on that element.
2. THE Site SHALL make every primary interactive control reachable using the Tab key in a logical order.
3. WHERE a custom control replaces a native control, THE Site SHALL provide an equivalent visible Focus_Indicator for that custom control.

### Requirement 18: Accessible names and ARIA labels

**User Story:** As a screen-reader user, I want every control and image to be described, so that I can understand and operate the Site.

#### Acceptance Criteria

1. THE Site SHALL provide an accessible name for every icon-only control on Public_Pages.
2. THE Site SHALL provide descriptive alternative text for every content image, and SHALL mark purely decorative images so that assistive technology can ignore them.
3. WHERE a component acts as a dialog (Blog_Modal, video modal), THE Site SHALL expose it with a dialog role and an accessible name.
4. WHERE navigation landmarks exist (Header navigation, main content, Footer), THE Site SHALL expose them with appropriate landmark roles.

### Requirement 19: Consistent loading, empty, and error states

**User Story:** As a visitor, I want clear feedback while content loads, when there is nothing to show, and when something fails, so that I always know the Site's state.

#### Acceptance Criteria

1. WHILE a Public_Page or Try_Demo is fetching its primary content, THE Site SHALL display a loading indicator or skeleton for that content region.
2. WHEN a fetch for list or article content returns no items, THE Site SHALL display an empty-state message.
3. IF a fetch for primary content fails, THEN THE Site SHALL display an error state that informs the visitor and offers a retry or alternative action.
4. THE Site SHALL express all loading, empty, and error state text through the I18n_System in both `en` and `es`.

### Requirement 20: Respect prefers-reduced-motion

**User Story:** As a visitor sensitive to motion, I want animations reduced when I request it, so that the Site does not trigger discomfort.

#### Acceptance Criteria

1. WHERE Reduced_Motion is requested, THE Site SHALL disable or substantially reduce non-essential entrance, parallax, and looping animations across Public_Pages.
2. WHERE Reduced_Motion is requested, THE Site SHALL stop the particle background animation and render a static or non-animated background instead.
3. WHERE Reduced_Motion is requested, THE Site SHALL suppress looping decorative motion in the Chatbot_Widget notification balloon.
4. WHERE Reduced_Motion is requested, THE Site SHALL still allow essential state-change transitions needed to convey meaning (such as a control's open/closed state).

### Requirement 21: Image lazy-loading

**User Story:** As a visitor on a slow connection, I want off-screen images to defer loading, so that pages become usable faster.

#### Acceptance Criteria

1. WHERE an image is below the initial viewport on a Public_Page, THE Site SHALL defer loading that image until it approaches the viewport.
2. THE Site SHALL reserve layout space (e.g., via intrinsic width/height or aspect-ratio) for every deferred image as a standing obligation, independent of whether a layout shift occurs in any given case, so that content the visitor is reading is not displaced.

### Requirement 22: Color contrast

**User Story:** As a low-vision visitor, I want sufficient text contrast, so that I can read the Site's content.

#### Acceptance Criteria

1. THE Site SHALL render normal-size body text on Public_Pages with a contrast ratio of at least 4.5 to 1 against its background.
2. THE Site SHALL render large-size text and meaningful non-text UI indicators on Public_Pages with a contrast ratio of at least 3 to 1 against their background.
3. WHERE a control conveys state through color, THE Site SHALL also convey that state through a non-color cue.

### Requirement 23: Demo-specific mobile rough edges

**User Story:** As a mobile visitor trying the demos, I want the interactive demo surfaces to work on my phone, so that I can evaluate the products without a desktop.

#### Acceptance Criteria

1. WHERE the viewport is a Mobile_Viewport, THE Site SHALL render the two-column demo layouts (input panel and Api_Log/result panel) as a single stacked column without Horizontal_Overflow.
2. WHERE the viewport is a Mobile_Viewport, THE Site SHALL keep the demo control affordances (upload, record, run, download, preview) reachable as Tap_Targets of at least 44 by 44 CSS pixels.
3. WHERE the viewport is a Mobile_Viewport and a demo renders bounding-box or landmark overlays over media (TryObjectDetection, TryEmotion, TryDocExtract), THE Site SHALL align the overlay coordinates to the scaled media surface.
4. WHERE the viewport is a Mobile_Viewport, THE Site SHALL confine demo result artifacts (subtitles, transcripts, extracted tables, forecast charts) to scrollable regions rather than causing document-root Horizontal_Overflow.

### Requirement 24: Scroll restoration consistency

**User Story:** As a visitor, I want the Site to remember or reset my scroll position appropriately, so that navigation feels predictable.

#### Acceptance Criteria

1. WHEN a visitor performs a new forward navigation to a Public_Page, THE Site SHALL position the new page at the top.
2. WHEN a visitor performs browser back or forward navigation, THE Site SHALL restore the previously saved scroll position for that entry.
3. WHEN the Blog_Modal opens and closes, THE Site SHALL preserve the `/blog` list scroll position as specified in Requirement 16.

---

## Non-Functional Requirements

### Requirement 25: Stack and dependency constraints

**User Story:** As a maintainer, I want the overhaul to stay within the current stack, so that the codebase remains consistent and lean.

#### Acceptance Criteria

1. THE Site SHALL implement the overhaul using the existing stack: Tailwind CSS, Radix/shadcn components, framer-motion, wouter, and the I18n_System.
2. THE Site SHALL NOT introduce a new UI or animation dependency unless the design phase documents that no existing dependency can meet a specific requirement.
3. THE Blog_Modal SHALL reuse the existing modal interaction pattern (framer-motion presence, Escape handling, body-overflow lock) established by the existing video modal component.

### Requirement 26: Internationalization parity

**User Story:** As a bilingual visitor, I want all new copy in both English and Spanish, so that the Site reads correctly in my language.

#### Acceptance Criteria

1. THE Site SHALL express every new user-facing string through the I18n_System rather than as a hard-coded literal.
2. THE Site SHALL provide both `en` and `es` values for every new translation key, following the existing `translation.json` structure.
3. WHERE new copy is added, THE Site SHALL keep the `en` and `es` key sets in parity so that neither locale is missing a key present in the other.

### Requirement 27: No regression of SEO, sitemaps, and chatbot

**User Story:** As a stakeholder, I want existing capabilities preserved, so that the overhaul does not break search visibility or the chatbot.

#### Acceptance Criteria

1. THE Site SHALL preserve the existing server-side SEO_Injection for `/blog/:slug` and for the other routes it currently covers.
2. THE Site SHALL preserve the existing sitemap endpoints and their content for blog URLs.
3. THE Site SHALL preserve the existing Chatbot_Widget behavior on Public_Pages, including its hidden state on Admin_Pages and during printing.

### Requirement 28: Verification and delivery

**User Story:** As a maintainer, I want the overhaul verified end-to-end and shipped green, so that I can trust it in production.

#### Acceptance Criteria

1. WHEN the overhaul is submitted, THE Site SHALL build successfully with the project build command.
2. WHEN the overhaul is submitted, THE Site SHALL pass the existing test suite and lint checks.
3. WHEN changes are pushed to `main`, THE CI_Pipeline SHALL complete successfully through the VPS `pull.sh` deploy step.
4. WHEN the deploy completes, IF the affected Public_Page production URLs do not respond successfully, THEN THE release SHALL be treated as failed and SHALL trigger rollback or alerting rather than being considered done; and WHEN the affected Public_Page production URLs respond successfully, THE release SHALL be considered verified.
