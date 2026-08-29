# Design: El Dominical IA

## Architecture Overview

```
┌────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  /admin/setup  /admin/login  /admin/settings        │
│  /admin/dominical  /admin/dominical/:id             │
└──────────────────────┬─────────────────────────────┘
                       │ fetch() + JWT cookie
┌──────────────────────▼─────────────────────────────┐
│                Express Server                        │
│  server/routes.ts (existing)                        │
│  server/adminRoutes.ts (new)                        │
│  server/auth.ts (middleware)                        │
│  server/db.ts (SQLite connection)                   │
├─────────────────────────────────────────────────────┤
│  Cron Jobs (node-cron)                              │
│  - Existing: hourly news generation                 │
│  - New: Saturday 12pm → generateDominical           │
│  - New: Sunday 12pm → autoPublishDominical          │
├─────────────────────────────────────────────────────┤
│  Services                                           │
│  server/services/linkedin.ts                        │
│  server/services/dominicalScoring.ts                │
│  server/services/imageGeneration.ts                 │
└──────────────────────┬─────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────┐
│  SQLite (server/data/dominical.db)                  │
│  Tables: admin_users, settings, dominical_reports   │
└─────────────────────────────────────────────────────┘
```

---

## Data Model

### admin_users
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK AUTOINCREMENT |
| email | TEXT | NOT NULL UNIQUE |
| password_hash | TEXT | NOT NULL |
| status | TEXT | DEFAULT 'active' |
| created_at | TEXT | NOT NULL (ISO 8601) |
| last_login_at | TEXT | nullable |

### settings
| Column | Type | Constraints |
|--------|------|-------------|
| key | TEXT | PK |
| value | TEXT | nullable |
| updated_at | TEXT | nullable |

### dominical_reports
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK AUTOINCREMENT |
| week_start | TEXT | NOT NULL (YYYY-MM-DD) |
| week_end | TEXT | NOT NULL (YYYY-MM-DD) |
| selected_news | TEXT | JSON string |
| all_news | TEXT | JSON string (includes score + 4 dimension scores per article, sorted DESC) |
| post_text | TEXT | nullable (LinkedIn text) |
| post_text_instagram | TEXT | nullable (Instagram-adapted text) |
| image_url | TEXT | nullable |
| status | TEXT | DEFAULT 'pending_review' |
| created_at | TEXT | NOT NULL (ISO 8601) |
| last_edited_at | TEXT | nullable |
| published_at | TEXT | nullable |
| linkedin_post_id | TEXT | nullable (backward compat; platform_publish_status is source of truth) |
| error_log | TEXT | nullable |

---

## Authentication Flow

```
User → GET /admin → Frontend checks GET /api/admin/status
  ├─ { setup_required: true } → Show Setup Form
  │    └─ POST /api/admin/setup { email, password, confirmPassword }
  │         └─ Creates user, returns JWT cookie → Redirect /admin
  ├─ { setup_required: false, authenticated: false } → Show Login
  │    └─ POST /api/admin/login { email, password }
  │         └─ Returns JWT cookie → Redirect /admin
  └─ { setup_required: false, authenticated: true } → Show Dashboard
```

- JWT payload: `{ userId, email, iat, exp }`
- Cookie: `admin_token`, httpOnly, secure (prod), sameSite: 'strict', maxAge: 7d
- bcrypt: 12 salt rounds
- JWT secret: from `ADMIN_JWT_SECRET` env var, or generated and stored in settings table

---

## Dominical Generation Sequence (Saturday)

```
12:00pm Saturday (America/Lima)
  │
  ├─ 1. Read all JSON files from server/data/posts/ for last 7 days
  │     └─ Collect: slug, title (en+es), date, editorId, excerpt
  │     └─ Cap at 30 posts to stay within GPT-4o context window
  │
  ├─ 2. Send to GPT-4o for MULTIDIMENSIONAL scoring (scale 1-100)
  │     Four dimensions per article:
  │       • novelty_score: how new/fresh the topic is
  │       • people_impact_score: direct impact on professionals/consumers
  │       • economic_impact_score: business/economic relevance
  │       • narrative_potential_score: engagement potential for LinkedIn
  │     Combined into a single score. Returns JSON array with:
  │       slug, score, reason (one line), individual dimension scores
  │     Model: gpt-4o, temperature: 0.3
  │     Parsing: recursive array search in GPT response to handle
  │              single-object vs array variations in output format
  │
  ├─ 3. Select top N (from settings.dominical_top_n, default 5)
  │     Sort all_news by score DESC for UI display
  │
  ├─ 4. Generate LinkedIn post draft
  │     Prompt: Spanish post for 'El Dominical IA'
  │              Format: hook → opinions per news (with blog links) → CTA + hashtags
  │              Max 2800 chars.
  │     Model: gpt-4o, temperature: 0.7
  │
  ├─ 4b. Generate Instagram post text variant
  │     Stored in dominical_reports.post_text_instagram (separate column)
  │     Adapted tone and format for Instagram (2200 char limit)
  │
  ├─ 5. INSERT INTO dominical_reports (...)
  │     Also initializes platform_publish_status rows (linkedin/instagram/facebook)
  │     via PublishingEngine.initializeStatuses()
  │
  └─ 6. Send notification email
```

---

## LinkedIn Integration

### OAuth 2.0 Flow
1. Admin saves `client_id` + `client_secret` in settings
2. Admin clicks "Connect LinkedIn" → redirect to:
   `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={id}&redirect_uri={callback}&scope=w_member_social+openid+profile`
3. LinkedIn redirects to `/api/admin/linkedin/callback?code=...`
4. Server exchanges code for tokens:
   `POST https://www.linkedin.com/oauth/v2/accessToken`
5. Store: access_token (60 days), refresh_token (365 days), expires_at

### Publishing
- Endpoint: `POST https://api.linkedin.com/v2/ugcPosts`
- Author: `urn:li:person:{person_id}` (obtained from token introspection)
- Media: Upload image first if provided, then reference in post

### Token Refresh
- Check `linkedin_token_expires_at` before publish
- If expired: `POST https://www.linkedin.com/oauth/v2/accessToken` with `grant_type=refresh_token`
- If refresh also expired: fail + notify

---

### Image Generation Service

### Provider Selection (from settings.image_provider)

| Provider | API | Model | Notes |
|----------|-----|-------|-------|
| DALL-E 3 / gpt-image-1 | OpenAI | gpt-image-1 | Already have API key. Returns base64. Resized to 1080×1080 via sharp. |
| Stability AI | stability.ai | stable-diffusion-xl | Needs separate API key. High quality. |
| Replicate FLUX | replicate.com | black-forest-labs/flux-1.1-pro | Needs API token. Fast, photorealistic. |

> **Note:** The primary model in production is `gpt-image-1` (not dall-e-3). The API returns a base64-encoded image which is saved to `dist/images/` for static serving.

### Prompt Generation
From selected news titles, generate a prompt like:
"Professional LinkedIn cover image representing: [themes from news]. Modern, clean, corporate style. Blue and purple tones. No text."

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/admin/status | No | Check setup/auth state |
| POST | /api/admin/setup | No | Create first admin |
| POST | /api/admin/login | No | Authenticate |
| POST | /api/admin/logout | Yes | Clear session |
| GET | /api/admin/me | Yes | Current user info |
| GET | /api/admin/settings | Yes | Get all settings |
| PUT | /api/admin/settings | Yes | Update settings |
| GET | /api/admin/linkedin/auth-url | Yes | Get OAuth URL |
| GET | /api/admin/linkedin/callback | No* | OAuth callback |
| GET | /api/admin/dominical | Yes | List reports |
| GET | /api/admin/dominical/:id | Yes | Report detail |
| PUT | /api/admin/dominical/:id | Yes | Update report |
| POST | /api/admin/dominical/:id/cancel | Yes | Cancel report |
| POST | /api/admin/dominical/:id/publish | Yes | Publish to LinkedIn |
| POST | /api/admin/dominical/:id/generate-image | Yes | Generate image |
| POST | /api/admin/dominical/generate | Yes | Manual trigger |

*LinkedIn callback uses state parameter for CSRF protection

---

## Error Handling

| Scenario | Response | Action |
|----------|----------|--------|
| Invalid JWT | 401 Unauthorized | Redirect to login |
| Missing settings for publish | 400 Bad Request | Show specific error |
| LinkedIn API failure | 500 + error log | Mark failed, email admin |
| OpenAI rate limit | Retry with backoff (3 attempts) | Log if all fail |
| Image generation failure | Return error | Show fallback message in UI |
| DB corruption | Server won't start | Log error, admin manual fix |

---

## Security Considerations

- Passwords hashed with bcrypt (12 rounds)
- JWT in httpOnly cookie (not accessible from JS)
- CSRF protection via sameSite: strict cookie
- LinkedIn tokens encrypted at rest? → No, stored plain in SQLite (acceptable for single-server, local DB). Access controlled by file permissions.
- API keys displayed partially in UI
- `.db` file gitignored, backed up via VPS backup strategy
- Rate limiting on login endpoint (5 attempts per minute per IP)

---

## File Structure (new files)

```
server/
  db.ts                          ← SQLite connection + table creation
  auth.ts                        ← JWT middleware + helpers
  adminRoutes.ts                 ← All /api/admin/* endpoints
  services/
    linkedin.ts                  ← OAuth + publish
    dominicalScoring.ts          ← GPT-4o scoring + post generation
    imageGeneration.ts           ← Multi-provider image gen
  jobs/
    generateDominical.ts         ← Saturday cron logic
    autoPublishDominical.ts      ← Sunday cron logic

src/pages/admin/
  AdminLayout.tsx                ← Sidebar + protected wrapper
  AdminSetup.tsx                 ← First-time setup form
  AdminLogin.tsx                 ← Login form
  AdminDashboard.tsx             ← Overview / landing
  AdminSettings.tsx              ← Settings panel
  AdminDominicalList.tsx         ← Report listing
  AdminDominicalDetail.tsx       ← Review + edit + publish
```

---

## Post-Implementation Changes (vs. Original Design)

### Scoring (R3.1)
- Score scale changed from **1-10** to **1-100** for better granularity
- Scoring is now **multidimensional** (4 dimensions): novelty, people impact, economic impact, narrative potential
- Posts are capped at **30** before sending to GPT-4o to avoid context window issues
- GPT response parsing uses recursive array search to handle output format variations
- `all_news` stores full dimension breakdown per article, sorted by score DESC

### Image Generation
- Active model is **gpt-image-1** (not dall-e-3 as originally designed)
- gpt-image-1 returns base64 — saved to `dist/images/` for static serving
- Images resized to target dimensions via `sharp`

### LinkedIn Post
- Post now includes **direct blog links** for each selected article
- "Regenerate post" button added to UI (re-runs GPT generation without re-scoring)

### Instagram
- Separate `post_text_instagram` column added to `dominical_reports`
- Instagram-adapted text generated alongside LinkedIn text during Saturday job

### Admin UI Improvements
- News list in review panel sorted by score DESC
- Score displayed on 1-100 scale with dimension breakdown
- Date display corrected for week range
