# Implementation Plan: Analytics Dashboard

## Overview

Build an analytics dashboard in the robles.ai admin panel that displays website traffic from GA4 and social media metrics from Meta. Backend proxies external APIs with SQLite caching. Frontend uses recharts for visualization.

## Tasks

- [ ] 1. Backend infrastructure
  - [x] 1.1 Create analytics cache module (`server/services/analyticsCache.ts`)
    - Create `analytics_cache` table in db.ts (cache_key TEXT PK, response_json TEXT, fetched_at TEXT, ttl_seconds INTEGER)
    - Implement get(key): parse JSON, check TTL, return data or null
    - Implement set(key, data, ttlSeconds): upsert with current timestamp
    - Implement clear(keyPattern?): delete matching entries
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 1.2 Create GA4 client (`server/services/ga4Client.ts`)
    - Install `@google-analytics/data` package
    - Implement Service Account authentication from `server/data/ga4-service-account.json`
    - Implement queryReport(dimensions, metrics, dateRange) wrapper
    - Implement runRealtimeReport() for active users
    - Implement specific query methods: getOverviewKPIs, getTrendData, getTopPages, getTrafficSources, getCountries, getDevices, getNewVsReturning, getLandingPages
    - Handle errors gracefully (missing credentials, API errors)
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

  - [x] 1.3 Create Meta insights client (`server/services/metaInsights.ts`)
    - Implement Instagram insights queries (follower_count, reach, impressions, profile_views)
    - Implement Instagram media list + per-media insights
    - Implement Facebook Page insights (page_views, page_fans, engagement)
    - Implement Facebook posts list with reactions/comments/shares
    - Read tokens from settings table
    - Handle expired token errors gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 1.4 Create analytics routes (`server/analyticsRoutes.ts`)
    - GET /api/admin/analytics/overview — KPIs with comparison
    - GET /api/admin/analytics/realtime — active users
    - GET /api/admin/analytics/traffic — sources, pages, countries, devices
    - GET /api/admin/analytics/behavior — engagement, landing pages, new/returning
    - GET /api/admin/analytics/social/instagram — IG metrics
    - GET /api/admin/analytics/social/facebook — FB metrics
    - POST /api/admin/analytics/refresh — clear cache
    - All with requireAuth, cache layer, date range params
    - _Requirements: 1.3, 1.4, 1.6, 1.7, 2.2, 2.5, 7.2, 7.3, 7.4, 8.1, 8.2, 8.4_

  - [x] 1.5 Add Service Account upload to admin settings
    - Add field/button in admin settings to upload GA4 Service Account JSON
    - Store file at server/data/ga4-service-account.json (server-side only)
    - Show status indicator (configured/not configured)
    - _Requirements: 1.2, 8.3_

- [ ] 2. Frontend dashboard
  - [ ] 2.1 Install dependencies and create page shell
    - Install recharts, date-fns if not present
    - Create AdminAnalytics.tsx page with tab layout (Overview, Traffic, Behavior, Social)
    - Add route /admin/analytics in the app router
    - Add "Analytics" link in admin sidebar/navigation
    - Create DateRangeSelector component with presets
    - _Requirements: 3.1, 3.2_

  - [ ] 2.2 Implement Overview tab
    - Create KpiCard component (value, label, trend arrow, percentage change)
    - Display: Total Users, Page Views, Avg Session Duration, Bounce Rate
    - Line chart showing daily users over selected range (recharts)
    - Real-time active users badge (refetch every 30s)
    - Loading skeletons while fetching
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ] 2.3 Implement Traffic tab
    - Bar chart: top 10 pages by views
    - Pie chart: traffic source distribution
    - Table: top countries with user count
    - Pie chart: device distribution
    - Bar chart: traffic by social platform
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 2.4 Implement Behavior tab
    - Metrics cards: pages/session, avg duration, bounce rate
    - Bar chart: top landing pages
    - Donut chart: new vs returning users
    - Per-page engagement table
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 2.5 Implement Social Media tab
    - Instagram section: followers, reach, impressions, profile views + growth indicators
    - Facebook section: fans, page views, engagements, reach
    - Recent posts list with per-post metrics (likes, comments, shares, reach)
    - Follower growth line chart
    - Warning card when tokens not configured
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3. Final checkpoint
  - Ensure all tests pass and dashboard loads correctly with mock/real data.

## Notes

- The GA4 Service Account needs "Viewer" role on the GA4 property — this is configured in Google Analytics Admin, not in code
- Meta API rate limits: 200 calls/hour per user — caching is critical
- The ga4_measurement_id (G-XXXXXXXXXX) needs to be converted to a numeric Property ID for the Data API — this can be looked up via the Admin API or configured manually in settings
- recharts is lightweight and tree-shakeable, good fit for the existing React setup

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.4", "2.5"] }
  ]
}
```
