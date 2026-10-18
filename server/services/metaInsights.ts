// server/services/metaInsights.ts
// Meta Graph API client for querying Instagram and Facebook Page insights.

import db from '../db.js';
import { GRAPH_API_BASE } from './metaGraphApi.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MetaInsightsError {
  error: true;
  code: 'TOKEN_EXPIRED' | 'NOT_CONFIGURED' | 'API_ERROR';
  message: string;
}

export interface InstagramInsightsData {
  followerCount: number;
  reach: number;
  views: number;
  accountsEngaged: number;
  dailyMetrics: Array<{
    date: string;
    reach: number;
    followerCount: number;
  }>;
}

export interface InstagramMediaItem {
  id: string;
  caption: string | null;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  mediaType: string;
  reach: number | null;
  views: number | null;
}

export interface InstagramData {
  insights: InstagramInsightsData;
  recentMedia: InstagramMediaItem[];
  /** Non-fatal problems (e.g. recent media unavailable for lack of permission). */
  warnings?: string[];
}

export interface FacebookPageInsightsData {
  pageViews: number;
  pageFollows: number;
  postEngagements: number;
  dailyMetrics: Array<{
    date: string;
    pageViews: number;
    postEngagements: number;
    pageFollows: number;
  }>;
}

export interface FacebookPostItem {
  id: string;
  message: string | null;
  createdTime: string;
  shares: number;
  reactions: number;
  comments: number;
}

export interface FacebookData {
  insights: FacebookPageInsightsData;
  recentPosts: FacebookPostItem[];
  /** Non-fatal problems (e.g. recent posts unavailable for lack of permission). */
  warnings?: string[];
}

// Insights metric as returned by /{id}/insights: time series in `values`,
// or a single aggregate in `total_value` when metric_type=total_value.
interface InsightsMetric {
  name: string;
  values?: Array<{ value: number; end_time: string }>;
  total_value?: { value: number };
}

// Window used when the caller does not pass since/until. Instagram caps
// user insights ranges at 30 days, so stay below that.
const DEFAULT_RANGE_DAYS = 28;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

/**
 * Instagram account ID as saved by /admin/settings (`instagram_business_account_id`),
 * falling back to the legacy `instagram_user_id` key.
 */
function getInstagramAccountId(): string | null {
  return getSetting('instagram_business_account_id') ?? getSetting('instagram_user_id');
}

function resolveRange(since?: string, until?: string): { since: string; until: string } {
  if (since && until) return { since, until };
  const now = Math.floor(Date.now() / 1000);
  return {
    since: since ?? String(now - DEFAULT_RANGE_DAYS * 24 * 60 * 60),
    until: until ?? String(now),
  };
}

/**
 * Determine if a Meta API error response indicates an expired/invalid token.
 */
function isTokenError(status: number, body: any): boolean {
  if (status === 401 || status === 403) return true;
  // Meta Graph API returns error.code 190 for expired/invalid tokens
  if (body?.error?.code === 190) return true;
  // Subcode 463 = expired token, 467 = invalid token
  if (body?.error?.error_subcode === 463 || body?.error?.error_subcode === 467) return true;
  return false;
}

/**
 * Make a GET request to the Meta Graph API.
 * Returns the parsed JSON response or throws with structured error info.
 */
async function metaGet<T = any>(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set('access_token', accessToken);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const body = await response.json();

  if (!response.ok) {
    if (isTokenError(response.status, body)) {
      const err: MetaInsightsError = {
        error: true,
        code: 'TOKEN_EXPIRED',
        message: body?.error?.message || 'Access token expired or invalid. Please reconnect in Settings.',
      };
      throw err;
    }
    const err: MetaInsightsError = {
      error: true,
      code: 'API_ERROR',
      message: body?.error?.message || `Meta API error (${response.status})`,
    };
    throw err;
  }

  return body as T;
}

/**
 * Query each insights metric in its own request so that one metric Meta
 * rejects (e.g. a newly deprecated one, error #100) does not take down the
 * rest. Token errors still abort; if every metric fails, the first error is thrown.
 */
async function fetchInsightsMetrics(
  path: string,
  accessToken: string,
  metrics: string[],
  params: Record<string, string>
): Promise<Record<string, InsightsMetric>> {
  const results = await Promise.allSettled(
    metrics.map((metric) =>
      metaGet<{ data: InsightsMetric[] }>(path, accessToken, { ...params, metric })
    )
  );

  const byName: Record<string, InsightsMetric> = {};
  const errors: unknown[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      for (const metric of result.value.data) byName[metric.name] = metric;
      return;
    }
    const reason = result.reason;
    if (isMetaInsightsError(reason) && reason.code === 'TOKEN_EXPIRED') throw reason;
    errors.push(reason);
    const message = isMetaInsightsError(reason) || reason instanceof Error ? reason.message : String(reason);
    console.warn(`[metaInsights] Metric "${metrics[i]}" unavailable: ${message}`);
  });

  if (errors.length === metrics.length) throw errors[0];
  return byName;
}

function sumValues(metric?: InsightsMetric): number {
  return (metric?.values ?? []).reduce((sum, v) => sum + v.value, 0);
}

function latestValue(metric?: InsightsMetric): number {
  const values = metric?.values ?? [];
  return values.length > 0 ? values[values.length - 1].value : 0;
}

function valuesByDate(metric?: InsightsMetric): Map<string, number> {
  return new Map((metric?.values ?? []).map((v) => [v.end_time.split('T')[0], v.value]));
}

function sortedDates(...series: Map<string, number>[]): string[] {
  return Array.from(new Set(series.flatMap((s) => Array.from(s.keys())))).sort();
}

// ─── Instagram ──────────────────────────────────────────────────────────────────

/**
 * Query Instagram Business Account insights: reach and follower_count (daily
 * series), views and accounts_engaged (totals for the range).
 * Returns aggregated totals and daily breakdowns.
 */
export async function queryInstagramInsights(
  since?: string,
  until?: string
): Promise<InstagramInsightsData | MetaInsightsError> {
  const token = getSetting('instagram_access_token');
  const igUserId = getInstagramAccountId();

  if (!token || !igUserId) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Instagram credentials not configured. Please set the Instagram Business Account ID and access token in Settings.',
    };
  }

  try {
    const range = resolveRange(since, until);

    const [series, totals, profile] = await Promise.all([
      fetchInsightsMetrics(`/${igUserId}/insights`, token, ['reach', 'follower_count'], {
        period: 'day',
        ...range,
      }),
      // `views` and `accounts_engaged` only support metric_type=total_value
      fetchInsightsMetrics(`/${igUserId}/insights`, token, ['views', 'accounts_engaged'], {
        period: 'day',
        metric_type: 'total_value',
        ...range,
      }),
      metaGet<{ followers_count?: number }>(`/${igUserId}`, token, {
        fields: 'followers_count',
      }).catch((err) => {
        if (isMetaInsightsError(err) && err.code === 'TOKEN_EXPIRED') throw err;
        return {} as { followers_count?: number };
      }),
    ]);

    const reachByDate = valuesByDate(series['reach']);
    const followersByDate = valuesByDate(series['follower_count']);
    const dailyMetrics = sortedDates(reachByDate, followersByDate).map((date) => ({
      date,
      reach: reachByDate.get(date) ?? 0,
      followerCount: followersByDate.get(date) ?? 0,
    }));

    return {
      followerCount: profile.followers_count ?? latestValue(series['follower_count']),
      reach: sumValues(series['reach']),
      views: totals['views']?.total_value?.value ?? 0,
      accountsEngaged: totals['accounts_engaged']?.total_value?.value ?? 0,
      dailyMetrics,
    };
  } catch (err) {
    if (isMetaInsightsError(err)) return err;
    return {
      error: true,
      code: 'API_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Query recent Instagram media with per-media insights (reach, views).
 * Returns the last `limit` posts with their engagement metrics.
 */
export async function queryInstagramMedia(
  limit: number = 10
): Promise<InstagramMediaItem[] | MetaInsightsError> {
  const token = getSetting('instagram_access_token');
  const igUserId = getInstagramAccountId();

  if (!token || !igUserId) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Instagram credentials not configured. Please set the Instagram Business Account ID and access token in Settings.',
    };
  }

  try {
    // Fetch recent media
    const mediaData = await metaGet<{
      data: Array<{
        id: string;
        caption?: string;
        timestamp: string;
        like_count: number;
        comments_count: number;
        media_type: string;
      }>;
    }>(`/${igUserId}/media`, token, {
      fields: 'id,caption,timestamp,like_count,comments_count,media_type',
      limit: String(limit),
    });

    // Fetch per-media insights for each post
    const mediaItems: InstagramMediaItem[] = [];
    for (const post of mediaData.data) {
      let reach: number | null = null;
      let views: number | null = null;

      try {
        const insightsData = await metaGet<{
          data: Array<{ name: string; values: Array<{ value: number }> }>;
        }>(`/${post.id}/insights`, token, {
          metric: 'reach,views',
        });

        for (const metric of insightsData.data) {
          if (metric.name === 'reach' && metric.values[0]) {
            reach = metric.values[0].value;
          }
          if (metric.name === 'views' && metric.values[0]) {
            views = metric.values[0].value;
          }
        }
      } catch {
        // Per-media insights may not be available for all media types (e.g., stories)
        // Continue without them
      }

      mediaItems.push({
        id: post.id,
        caption: post.caption ?? null,
        timestamp: post.timestamp,
        likeCount: post.like_count,
        commentsCount: post.comments_count,
        mediaType: post.media_type,
        reach,
        views,
      });
    }

    return mediaItems;
  } catch (err) {
    if (isMetaInsightsError(err)) return err;
    return {
      error: true,
      code: 'API_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetch full Instagram data (insights + recent media).
 */
export async function queryInstagram(
  since?: string,
  until?: string
): Promise<InstagramData | MetaInsightsError> {
  const insights = await queryInstagramInsights(since, until);
  if (isMetaInsightsError(insights)) return insights;

  // Recent media is secondary: if it fails (other than an expired token), still
  // return the insights with an empty list and a warning.
  const recentMedia = await queryInstagramMedia();
  if (isMetaInsightsError(recentMedia)) {
    if (recentMedia.code === 'TOKEN_EXPIRED') return recentMedia;
    console.warn(`[metaInsights] Instagram recent media unavailable: ${recentMedia.message}`);
    return { insights, recentMedia: [], warnings: [`Recent media unavailable: ${recentMedia.message}`] };
  }

  return { insights, recentMedia };
}

// ─── Facebook ───────────────────────────────────────────────────────────────────

/**
 * Query Facebook Page insights: page_views_total, page_post_engagements, page_follows.
 * (page_engaged_users and page_fans were deprecated by Meta in 2024 and 2025.)
 * Returns aggregated totals and daily breakdowns.
 */
export async function queryFacebookPageInsights(
  since?: string,
  until?: string
): Promise<FacebookPageInsightsData | MetaInsightsError> {
  const token = getSetting('facebook_page_access_token');
  const pageId = getSetting('facebook_page_id');

  if (!token || !pageId) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Facebook credentials not configured. Please set facebook_page_access_token and facebook_page_id in Settings.',
    };
  }

  try {
    const metrics = await fetchInsightsMetrics(
      `/${pageId}/insights`,
      token,
      ['page_views_total', 'page_post_engagements', 'page_follows'],
      { period: 'day', ...resolveRange(since, until) }
    );

    const viewsByDate = valuesByDate(metrics['page_views_total']);
    const engagementsByDate = valuesByDate(metrics['page_post_engagements']);
    const followsByDate = valuesByDate(metrics['page_follows']);

    const dailyMetrics = sortedDates(viewsByDate, engagementsByDate, followsByDate).map((date) => ({
      date,
      pageViews: viewsByDate.get(date) ?? 0,
      postEngagements: engagementsByDate.get(date) ?? 0,
      pageFollows: followsByDate.get(date) ?? 0,
    }));

    return {
      pageViews: sumValues(metrics['page_views_total']),
      pageFollows: latestValue(metrics['page_follows']),
      postEngagements: sumValues(metrics['page_post_engagements']),
      dailyMetrics,
    };
  } catch (err) {
    if (isMetaInsightsError(err)) return err;
    return {
      error: true,
      code: 'API_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Query recent Facebook Page posts with reactions, comments, and shares.
 */
export async function queryFacebookPosts(
  limit: number = 10
): Promise<FacebookPostItem[] | MetaInsightsError> {
  const token = getSetting('facebook_page_access_token');
  const pageId = getSetting('facebook_page_id');

  if (!token || !pageId) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Facebook credentials not configured. Please set facebook_page_access_token and facebook_page_id in Settings.',
    };
  }

  try {
    const postsData = await metaGet<{
      data: Array<{
        id: string;
        message?: string;
        created_time: string;
        shares?: { count: number };
        reactions?: { summary: { total_count: number } };
        comments?: { summary: { total_count: number } };
      }>;
    }>(`/${pageId}/posts`, token, {
      fields: 'id,message,created_time,shares,reactions.summary(true),comments.summary(true)',
      limit: String(limit),
    });

    return postsData.data.map((post) => ({
      id: post.id,
      message: post.message ?? null,
      createdTime: post.created_time,
      shares: post.shares?.count ?? 0,
      reactions: post.reactions?.summary?.total_count ?? 0,
      comments: post.comments?.summary?.total_count ?? 0,
    }));
  } catch (err) {
    if (isMetaInsightsError(err)) return err;
    return {
      error: true,
      code: 'API_ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetch full Facebook Page data (insights + recent posts).
 */
export async function queryFacebookPage(
  since?: string,
  until?: string
): Promise<FacebookData | MetaInsightsError> {
  const insights = await queryFacebookPageInsights(since, until);
  if (isMetaInsightsError(insights)) return insights;

  // Recent posts need extra permissions (pages_read_user_content); if they fail
  // (other than an expired token), still return the insights with a warning.
  const recentPosts = await queryFacebookPosts();
  if (isMetaInsightsError(recentPosts)) {
    if (recentPosts.code === 'TOKEN_EXPIRED') return recentPosts;
    console.warn(`[metaInsights] Facebook recent posts unavailable: ${recentPosts.message}`);
    return { insights, recentPosts: [], warnings: [`Recent posts unavailable: ${recentPosts.message}`] };
  }

  return { insights, recentPosts };
}

// ─── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Type guard to check if a value is a MetaInsightsError.
 */
export function isMetaInsightsError(value: unknown): value is MetaInsightsError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    (value as any).error === true &&
    'code' in value &&
    'message' in value
  );
}
