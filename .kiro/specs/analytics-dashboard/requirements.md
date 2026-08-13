# Requirements: Analytics Dashboard

## Introduction

An analytics dashboard integrated into the robles.ai admin panel that displays key visitor metrics and user behavior reports by pulling data from Google Analytics 4 (GA4 Data API) and Meta (Graph API). The dashboard provides a unified view of website traffic, user behavior, and social media performance without needing to switch between multiple platforms.

## Glossary

- **GA4 Data API**: Google's API for querying Analytics data programmatically (requires a Service Account)
- **Meta Graph API**: Facebook/Instagram API for retrieving page insights and post metrics
- **Service Account**: A Google Cloud identity used for server-to-server authentication (no user interaction needed)
- **KPI Card**: A visual element showing a single key metric with comparison to previous period
- **TTL Cache**: Cached API responses stored with a time-to-live expiration to reduce external API calls

## Requirements

### Requirement 1: GA4 Backend Integration

**User Story:** As an admin, I want the system to fetch analytics data from Google Analytics 4, so that I can see visitor metrics without leaving my admin panel.

#### Acceptance Criteria

1. THE system SHALL authenticate with the GA4 Data API using a Google Service Account JSON credential stored server-side.
2. THE system SHALL provide an admin settings field to upload or configure the Service Account credentials.
3. THE system SHALL expose backend API endpoints that proxy GA4 Data API queries, protected by requireAuth middleware.
4. THE system SHALL cache GA4 API responses in SQLite with a configurable TTL (default 5 minutes for real-time, 1 hour for historical data).
5. THE system SHALL support querying: active users (real-time), sessions, pageviews, users by date range, top pages, traffic sources, countries, cities, devices, bounce rate, session duration, pages per session, new vs returning users.
6. THE system SHALL accept a date range parameter (startDate, endDate) for all historical queries.
7. THE system SHALL compute comparison metrics against the previous equivalent period (e.g., last 7 days vs the 7 days before).

### Requirement 2: Meta Backend Integration

**User Story:** As an admin, I want the system to fetch social media metrics from Instagram and Facebook, so that I can track my social presence alongside website analytics.

#### Acceptance Criteria

1. THE system SHALL use the existing `facebook_page_access_token` and `instagram_access_token` stored in settings to authenticate Meta API calls.
2. THE system SHALL expose backend API endpoints for Meta insights, protected by requireAuth middleware.
3. THE system SHALL query Instagram Business Account insights: impressions, reach, follower_count, profile_views, and per-post metrics (likes, comments, shares, reach).
4. THE system SHALL query Facebook Page insights: page_views_total, page_engaged_users, page_post_engagements, page_fans, and per-post metrics.
5. THE system SHALL cache Meta API responses with a TTL of 30 minutes.
6. THE system SHALL handle expired tokens gracefully (display warning in dashboard, not crash).

### Requirement 3: Dashboard Overview Page

**User Story:** As an admin, I want a dashboard overview page showing key metrics at a glance, so that I can quickly assess my site's performance.

#### Acceptance Criteria

1. THE dashboard SHALL be accessible at `/admin/analytics` with a link in the admin navigation.
2. THE dashboard SHALL display a date range selector with presets: Today, Last 7 Days, Last 30 Days, Last 90 Days, and Custom range.
3. THE dashboard SHALL show KPI cards for: Total Users, Page Views, Average Session Duration, Bounce Rate — each with a trend indicator (up/down arrow + percentage change vs previous period).
4. THE dashboard SHALL display a line chart showing daily users/sessions over the selected date range.
5. THE dashboard SHALL display real-time active users count (refreshed every 30 seconds).
6. THE dashboard SHALL show loading skeletons while data is being fetched.

### Requirement 4: Traffic Reports Section

**User Story:** As an admin, I want detailed traffic reports, so that I can understand where my visitors come from and what they view.

#### Acceptance Criteria

1. THE dashboard SHALL display a bar chart showing top 10 most viewed pages.
2. THE dashboard SHALL display a pie/donut chart showing traffic source distribution (Organic Search, Social, Direct, Referral, Email).
3. THE dashboard SHALL display a table of top countries with user count and percentage.
4. THE dashboard SHALL display a pie chart showing device category distribution (Desktop, Mobile, Tablet).
5. THE dashboard SHALL display a bar chart of traffic by social platform (LinkedIn, Instagram, Facebook, Twitter/X).

### Requirement 5: Behavior Reports Section

**User Story:** As an admin, I want to understand user behavior on my site, so that I can identify content that engages visitors.

#### Acceptance Criteria

1. THE dashboard SHALL display metrics: Pages per Session, Average Session Duration, Bounce Rate, New Users vs Returning Users.
2. THE dashboard SHALL display a bar chart of top landing pages (entry pages).
3. THE dashboard SHALL display a donut chart showing New vs Returning users distribution.
4. THE dashboard SHALL display engagement metrics per top page (avg time on page, bounce rate per page).

### Requirement 6: Social Media Section

**User Story:** As an admin, I want to see Instagram and Facebook performance metrics, so that I can track my social media growth and content effectiveness.

#### Acceptance Criteria

1. THE dashboard SHALL display Instagram metrics: Follower count, follower growth (vs previous period), total reach, total impressions, profile views.
2. THE dashboard SHALL display Facebook Page metrics: Page fans count, page views, post engagements, page reach.
3. THE dashboard SHALL display a list of recent posts (last 10) with per-post metrics: reach, likes, comments, shares.
4. THE dashboard SHALL display a line chart showing follower growth over time (if data available from Meta API).
5. IF Meta tokens are not configured or expired, THE dashboard SHALL display a warning card with link to settings instead of crashing.

### Requirement 7: Caching and Performance

**User Story:** As a developer, I want API responses cached locally, so that the dashboard loads fast and doesn't hit rate limits.

#### Acceptance Criteria

1. THE system SHALL store cached API responses in a SQLite table `analytics_cache` with columns: cache_key (TEXT PRIMARY KEY), response_json (TEXT), fetched_at (TEXT), ttl_seconds (INTEGER).
2. THE system SHALL return cached data if the cache entry exists and is within its TTL.
3. THE system SHALL fetch fresh data from the external API when the cache is expired or missing.
4. THE system SHALL provide an admin button to force-refresh data (bypass cache).
5. THE system SHALL use different TTLs: 30 seconds for real-time data, 5 minutes for today's data, 1 hour for historical data, 30 minutes for Meta data.

### Requirement 8: Security

**User Story:** As an admin, I want analytics data to be secure and API credentials protected.

#### Acceptance Criteria

1. ALL dashboard API endpoints SHALL require admin authentication via requireAuth middleware.
2. THE system SHALL never expose Service Account credentials, API keys, or access tokens to the frontend.
3. THE Service Account JSON file SHALL be stored server-side only (not in the database, not accessible via any API).
4. THE system SHALL sanitize all query parameters before passing them to external APIs.
