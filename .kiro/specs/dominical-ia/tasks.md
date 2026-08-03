# Tasks: El Dominical IA

## Phase 1: Infrastructure + Admin Auth

- [x] 1. Remove dead dependencies: uninstall `drizzle-orm`, `drizzle-zod`; delete `shared/schema.ts`; remove `db:push` script from package.json
- [x] 2. Install new dependencies: `better-sqlite3`, `@types/better-sqlite3`, `jsonwebtoken`, `@types/jsonwebtoken`, `bcrypt`, `@types/bcrypt`
- [x] 3. Create `server/db.ts`: open/create SQLite DB at `server/data/dominical.db`, create tables (admin_users, settings, dominical_reports) with `CREATE TABLE IF NOT EXISTS`
- [x] 4. Add `server/data/dominical.db` to `.gitignore`
- [x] 5. Create `server/auth.ts`: `generateToken()`, `verifyToken()`, `requireAuth` middleware (reads cookie `admin_token`, verifies JWT, attaches user to req)
- [x] 6. Create `server/adminRoutes.ts` with initial endpoints: `GET /api/admin/status`, `POST /api/admin/setup`, `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`
- [x] 7. Register admin routes in `server/routes.ts` (import and mount)
- [x] 8. Create frontend pages: `src/pages/admin/AdminSetup.tsx` (email + password + confirm), `src/pages/admin/AdminLogin.tsx` (email + password)
- [x] 9. Create `src/pages/admin/AdminLayout.tsx` (sidebar with nav links, wraps authenticated content)
- [x] 10. Create `src/pages/admin/AdminDashboard.tsx` (simple overview page)
- [x] 11. Add routes in `App.tsx`: `/admin`, `/admin/settings`, `/admin/dominical`, `/admin/dominical/:id`
- [x] 12. Build + verify all auth flows work end-to-end

## Phase 2: Settings Panel

- [x] 13. Add endpoints to `server/adminRoutes.ts`: `GET /api/admin/settings` (returns all, masks secrets), `PUT /api/admin/settings` (batch update)
- [x] 14. Add LinkedIn OAuth endpoints: `GET /api/admin/linkedin/auth-url`, `GET /api/admin/linkedin/callback`
- [x] 15. Create `src/pages/admin/AdminSettings.tsx` with sections: LinkedIn, Image Provider, Dominical preferences, OpenAI key
- [x] 16. Implement LinkedIn OAuth flow: generate auth URL → redirect → callback exchanges code → stores tokens
- [x] 17. Build + verify settings save/load and LinkedIn connect works

## Phase 3: Dominical Generation (Saturday Job)

- [x] 18. Create `server/services/dominicalScoring.ts`: function that reads last 7 days of posts, sends to GPT-4o for scoring, returns sorted array with scores and reasons
- [x] 19. Create `server/jobs/generateDominical.ts`: orchestrates scoring → post generation → DB insert → email notification
- [x] 20. Create LinkedIn post generation prompt: takes selected news, generates Spanish post in Dominical IA format (hook + opinions + closing + hashtags)
- [x] 21. Register Saturday cron in `server/routes.ts`: `cron.schedule('0 12 * * 6', ..., { timezone: 'America/Lima' })`
- [x] 22. Add manual trigger endpoint: `POST /api/admin/dominical/generate`
- [x] 23. Send notification email using existing nodemailer setup
- [x] 24. Build + verify: trigger manually, check DB record created, email received

## Phase 4: Dominical Review Panel

- [x] 25. Add CRUD endpoints: `GET /api/admin/dominical` (list), `GET /api/admin/dominical/:id` (detail), `PUT /api/admin/dominical/:id` (update), `POST /api/admin/dominical/:id/cancel`
- [x] 26. Create `src/pages/admin/AdminDominicalList.tsx`: table of reports with status badges, click to open detail
- [x] 27. Create `src/pages/admin/AdminDominicalDetail.tsx`: split view (news list left, post editor right), image section, action buttons
- [x] 28. Implement news selection UI: checkboxes on news items, highlight selected, show score/reason
- [x] 29. Implement image section: upload file, paste URL input, "Generate with AI" button
- [x] 30. Add `POST /api/admin/dominical/:id/generate-image` endpoint
- [x] 31. Build + verify: can view, edit, save report; image upload/generation works

## Phase 5: Auto-Publish + LinkedIn + Image Generation

- [x] 32. Create `server/services/linkedin.ts`: `publishPost(text, imageUrl?, accessToken)` using LinkedIn UGC Posts API, with token refresh logic
- [x] 33. Create `server/services/imageGeneration.ts`: multi-provider switch (DALL-E 3, Stability AI, Replicate FLUX), generates image from news themes
- [x] 34. Create `server/jobs/autoPublishDominical.ts`: Sunday 12pm logic (check status → publish or skip → update DB → notify on failure)
- [x] 35. Register Sunday cron: `cron.schedule('0 12 * * 0', ..., { timezone: 'America/Lima' })`
- [x] 36. Add `POST /api/admin/dominical/:id/publish` endpoint (manual publish button)
- [x] 37. Implement token refresh flow: detect expired token → refresh → retry publish → if refresh fails → email admin
- [x] 38. Build + verify full cycle: generate Saturday → review → auto-publish Sunday (or manual publish)
