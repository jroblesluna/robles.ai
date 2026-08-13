# Design: Analytics Dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ /admin/analytics                                          │  │
│  │  ├── DateRangeSelector                                    │  │
│  │  ├── OverviewTab (KPI cards + trend chart + real-time)    │  │
│  │  ├── TrafficTab (sources, pages, countries, devices)      │  │
│  │  ├── BehaviorTab (engagement, landing pages, new/return)  │  │
│  │  └── SocialTab (IG metrics, FB metrics, post list)        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                │ GET /api/admin/analytics/*
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Express)                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ server/analyticsRoutes.ts                                 │  │
│  │  ├── GET /overview (KPIs + trend)                         │  │
│  │  ├── GET /realtime (active users)                         │  │
│  │  ├── GET /traffic (sources, pages, countries, devices)    │  │
│  │  ├── GET /behavior (engagement, landing, new-return)      │  │
│  │  ├── GET /social/instagram (IG insights)                  │  │
│  │  ├── GET /social/facebook (FB insights)                   │  │
│  │  └── POST /refresh (force clear cache)                    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ server/services/analyticsCache.ts                         │  │
│  │  └── getCached(key) / setCache(key, data, ttl)            │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ server/services/ga4Client.ts                              │  │
│  │  └── queryGA4(dimensions, metrics, dateRange)             │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ server/services/metaInsights.ts                           │  │
│  │  └── queryInstagram(...) / queryFacebookPage(...)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │ SQLite Cache   │  │ GA4 Data API   │  │ Meta Graph API │   │
│  │(analytics_cache)│  │ (googleapis)   │  │ (graph.fb.com) │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. GA4 Client (`server/services/ga4Client.ts`)
- Uses `@google-analytics/data` package (official Node.js client)
- Authenticates via Service Account JSON file at `server/data/ga4-service-account.json`
- Provides typed query methods for each report type
- GA4 Property ID derived from the ga4_measurement_id setting

### 2. Meta Insights Client (`server/services/metaInsights.ts`)
- Uses fetch to call Meta Graph API v21.0
- Reads tokens from settings table (existing tokens)
- Queries: /{ig-user-id}/insights, /{page-id}/insights, /{media-id}/insights

### 3. Analytics Cache (`server/services/analyticsCache.ts`)
- SQLite table: analytics_cache (cache_key TEXT PK, response_json TEXT, fetched_at TEXT, ttl_seconds INTEGER)
- get(key): returns parsed JSON if within TTL, null otherwise
- set(key, data, ttlSeconds): upserts cache entry
- clear(keyPattern?): deletes entries matching pattern

### 4. Analytics Routes (`server/analyticsRoutes.ts`)
- Express router mounted at /api/admin/analytics
- All routes use requireAuth
- Each route: check cache → if miss, query external API → cache → respond

### 5. Frontend Dashboard (`src/pages/admin/AdminAnalytics.tsx`)
- Tab-based layout: Overview | Traffic | Behavior | Social
- Uses recharts for charts (Line, Bar, Pie, Area)
- Uses @tanstack/react-query with refetchInterval for real-time data
- Responsive grid layout with shadcn Card components

## Dependencies to Install

- `@google-analytics/data` — GA4 Data API client
- `recharts` — Chart library for React
- `date-fns` — Date utilities for range calculations

## File Structure

```
server/
  services/
    ga4Client.ts          # GA4 Data API wrapper
    metaInsights.ts       # Meta Graph API wrapper
    analyticsCache.ts     # SQLite cache layer
  analyticsRoutes.ts      # Express router for all dashboard endpoints
  data/
    ga4-service-account.json  # Google Service Account credentials (gitignored)

src/
  pages/admin/
    AdminAnalytics.tsx    # Main dashboard page
  components/admin/analytics/
    DateRangeSelector.tsx # Date range picker with presets
    KpiCard.tsx           # Metric card with trend arrow
    OverviewTab.tsx       # Overview section
    TrafficTab.tsx        # Traffic reports
    BehaviorTab.tsx       # Behavior reports  
    SocialTab.tsx         # Social media metrics
```

## GA4 Data API Queries

| Endpoint | Dimensions | Metrics |
|----------|-----------|---------|
| Overview KPIs | - | activeUsers, sessions, screenPageViews, bounceRate, averageSessionDuration |
| Trend chart | date | activeUsers, sessions |
| Top pages | pagePath | screenPageViews, averageSessionDuration |
| Traffic sources | sessionDefaultChannelGroup | sessions, activeUsers |
| Countries | country | activeUsers |
| Devices | deviceCategory | activeUsers |
| New/Returning | newVsReturning | activeUsers |
| Landing pages | landingPage | sessions, bounceRate |
| Real-time | - | activeUsers (runRealtimeReport) |

## Meta API Queries

| Endpoint | API Call | Metrics |
|----------|---------|---------|
| IG insights | GET /{ig-id}/insights?metric=impressions,reach,follower_count,profile_views&period=day | Daily metrics |
| IG media | GET /{ig-id}/media?fields=id,caption,timestamp,like_count,comments_count,media_type | Recent posts |
| IG media insights | GET /{media-id}/insights?metric=reach,impressions | Per-post reach |
| FB page insights | GET /{page-id}/insights?metric=page_views_total,page_engaged_users,page_fans | Page metrics |
| FB posts | GET /{page-id}/posts?fields=id,message,created_time,shares,reactions.summary(true),comments.summary(true) | Post performance |
