// server/services/metaInsights.ts
// Meta Graph API client for querying Instagram and Facebook Page insights.

import db from '../db.js';
import { GRAPH_API_BASE } from './metaGraphApi.js';
import type {
  MetaInsightsError,
  InstagramInsightsData,
  InstagramMediaItem,
  InstagramData,
  FacebookPageInsightsData,
  FacebookPostItem,
  FacebookData,
} from '../../shared/socialAnalytics.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

// Response shapes live in shared/ so the admin Social tab uses the same types.
export type {
  MetaInsightsError,
  InstagramInsightsData,
  InstagramMediaItem,
  InstagramData,
  FacebookPageInsightsData,
  FacebookPostItem,
  FacebookData,
};

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

const DAY_SECONDS = 24 * 60 * 60;
// Instagram user insights accept at most 30 days per request; Page insights 93.
const IG_MAX_RANGE_DAYS = 30;
const FB_MAX_RANGE_DAYS = 90;

/** Split a unix-seconds range into consecutive windows of at most `maxDays`. */
export function splitRange(
  range: { since: string; until: string },
  maxDays: number
): Array<{ since: string; until: string }> {
  const start = Number(range.since);
  const end = Number(range.until);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [range];
  const step = maxDays * DAY_SECONDS;
  const chunks: Array<{ since: string; until: string }> = [];
  for (let from = start; from < end; from += step) {
    chunks.push({ since: String(from), until: String(Math.min(from + step, end)) });
  }
  return chunks;
}

/**
 * Convert YYYY-MM-DD dates (as sent by the admin date selector) into the
 * unix-seconds range Meta expects, plus the equal-length range right before it.
 * `until` is exclusive, so the end date's whole day is included.
 */
export function metaRangeFromDates(
  startDate?: string,
  endDate?: string
): { current: { since: string; until: string }; previous: { since: string; until: string } } | null {
  const valid = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!valid(startDate) || !valid(endDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`) / 1000;
  const endExclusive = Date.parse(`${endDate}T00:00:00Z`) / 1000 + DAY_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const until = Math.min(endExclusive, now);
  if (!Number.isFinite(start) || until <= start) return null;
  const length = until - start;
  return {
    current: { since: String(start), until: String(until) },
    previous: { since: String(start - length), until: String(start) },
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

/**
 * fetchInsightsMetrics over several date windows, merged into one result per
 * metric (series concatenated, total_value summed). A window that fails
 * entirely (e.g. older than Meta keeps) is skipped unless all of them fail.
 */
async function fetchInsightsOverRange(
  path: string,
  accessToken: string,
  metrics: string[],
  params: Record<string, string>,
  range: { since: string; until: string },
  maxDays: number
): Promise<Record<string, InsightsMetric>> {
  const chunks = splitRange(range, maxDays);
  if (chunks.length === 1) {
    return fetchInsightsMetrics(path, accessToken, metrics, { ...params, ...chunks[0] });
  }
  const results = await Promise.allSettled(
    chunks.map((chunk) => fetchInsightsMetrics(path, accessToken, metrics, { ...params, ...chunk }))
  );
  const merged: Record<string, InsightsMetric> = {};
  let firstError: unknown = null;
  for (const result of results) {
    if (result.status === 'rejected') {
      if (isMetaInsightsError(result.reason) && result.reason.code === 'TOKEN_EXPIRED') throw result.reason;
      firstError ??= result.reason;
      continue;
    }
    for (const [name, metric] of Object.entries(result.value)) {
      const target = (merged[name] ??= { name });
      if (metric.values) target.values = [...(target.values ?? []), ...metric.values];
      if (metric.total_value) {
        target.total_value = { value: (target.total_value?.value ?? 0) + metric.total_value.value };
      }
    }
  }
  if (Object.keys(merged).length === 0 && firstError) throw firstError;
  return merged;
}

function totalOrNull(metric?: InsightsMetric): number | null {
  return metric?.total_value ? metric.total_value.value : null;
}

function sumOrNull(metric?: InsightsMetric): number | null {
  return metric?.values ? sumValues(metric) : null;
}

/** Run `fn` over `items` with at most `limit` calls in flight, keeping order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function sumValues(metric?: InsightsMetric): number {
  return (metric?.values ?? []).reduce((sum, v) => sum + v.value, 0);
}

function latestValue(metric?: InsightsMetric): number {
  const values = metric?.values ?? [];
  return values.length > 0 ? values[values.length - 1].value : 0;
}

/**
 * Daily values keyed by the day they measure. Meta stamps each daily value
 * with `end_time` = the END of that day (next midnight, Pacific time, e.g.
 * 2024-01-02T08:00:00+0000 for Jan 1), so step back one day before taking the date.
 */
export function dayOfEndTime(endTime: string): string {
  const ms = Date.parse(endTime);
  if (Number.isNaN(ms)) return endTime.split('T')[0];
  return new Date(ms - DAY_SECONDS * 1000).toISOString().slice(0, 10);
}

function valuesByDate(metric?: InsightsMetric): Map<string, number> {
  return new Map((metric?.values ?? []).map((v) => [dayOfEndTime(v.end_time), v.value]));
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
      fetchInsightsOverRange(`/${igUserId}/insights`, token, ['reach', 'follower_count'], {
        period: 'day',
      }, range, IG_MAX_RANGE_DAYS),
      // These only support metric_type=total_value. accounts_engaged is a unique
      // count, so over ranges longer than 30 days the per-window sum overcounts.
      fetchInsightsOverRange(`/${igUserId}/insights`, token, [
        'views', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'shares', 'saves', 'profile_links_taps',
      ], {
        period: 'day',
        metric_type: 'total_value',
      }, range, IG_MAX_RANGE_DAYS),
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
      totalInteractions: totalOrNull(totals['total_interactions']),
      likes: totalOrNull(totals['likes']),
      comments: totalOrNull(totals['comments']),
      shares: totalOrNull(totals['shares']),
      saves: totalOrNull(totals['saves']),
      profileLinksTaps: totalOrNull(totals['profile_links_taps']),
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
  limit: number = 30
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
        media_product_type?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
      }>;
    }>(`/${igUserId}/media`, token, {
      fields: 'id,caption,timestamp,like_count,comments_count,media_type,media_product_type,permalink,thumbnail_url,media_url',
      limit: String(limit),
    });

    type MediaMetrics = Array<{ name: string; values: Array<{ value: number }> }>;
    // Per-media insights, a few requests at a time. If Meta rejects the full
    // metric list for a media type, retry with the basic pair.
    return await mapWithConcurrency(mediaData.data, 5, async (post) => {
      let metrics: MediaMetrics = [];
      for (const metric of ['reach,views,saved,shares,total_interactions', 'reach,views']) {
        try {
          metrics = (await metaGet<{ data: MediaMetrics }>(`/${post.id}/insights`, token, { metric })).data;
          break;
        } catch (err) {
          if (isMetaInsightsError(err) && err.code === 'TOKEN_EXPIRED') throw err;
          // Per-media insights may not be available for all media types (e.g., stories)
        }
      }
      const value = (name: string) => metrics.find((m) => m.name === name)?.values[0]?.value ?? null;

      const item: InstagramMediaItem = {
        id: post.id,
        caption: post.caption ?? null,
        timestamp: post.timestamp,
        likeCount: post.like_count,
        commentsCount: post.comments_count,
        mediaType: post.media_type,
        reach: value('reach'),
        views: value('views'),
        productType: post.media_product_type ?? null,
        permalink: post.permalink ?? null,
        // Videos expose a thumbnail; images and carousels only media_url
        thumbnailUrl: post.thumbnail_url ?? (post.media_type === 'VIDEO' ? null : post.media_url ?? null),
        saved: value('saved'),
        shares: value('shares'),
        totalInteractions: value('total_interactions'),
      };
      return item;
    });
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
  until?: string,
  previousRange?: { since: string; until: string }
): Promise<InstagramData | MetaInsightsError> {
  const [insights, previousResult] = await Promise.all([
    queryInstagramInsights(since, until),
    previousRange ? queryInstagramInsights(previousRange.since, previousRange.until) : Promise.resolve(null),
  ]);
  if (isMetaInsightsError(insights)) return insights;
  // The comparison period is optional: if Meta has no data that far back, show none.
  const previous = previousResult && !isMetaInsightsError(previousResult) ? previousResult : null;

  // Recent media is secondary: if it fails (other than an expired token), still
  // return the insights with an empty list and a warning.
  const recentMedia = await queryInstagramMedia();
  if (isMetaInsightsError(recentMedia)) {
    if (recentMedia.code === 'TOKEN_EXPIRED') return recentMedia;
    console.warn(`[metaInsights] Instagram recent media unavailable: ${recentMedia.message}`);
    return { insights, previous, recentMedia: [], warnings: [`Recent media unavailable: ${recentMedia.message}`] };
  }

  return { insights, previous, recentMedia };
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
    const metrics = await fetchInsightsOverRange(
      `/${pageId}/insights`,
      token,
      ['page_views_total', 'page_post_engagements', 'page_follows', 'page_daily_follows_unique', 'page_daily_unfollows_unique'],
      { period: 'day' },
      resolveRange(since, until),
      FB_MAX_RANGE_DAYS
    );

    const viewsByDate = valuesByDate(metrics['page_views_total']);
    const engagementsByDate = valuesByDate(metrics['page_post_engagements']);
    const followsByDate = valuesByDate(metrics['page_follows']);
    const newFollowsByDate = metrics['page_daily_follows_unique'] ? valuesByDate(metrics['page_daily_follows_unique']) : null;
    const unfollowsByDate = metrics['page_daily_unfollows_unique'] ? valuesByDate(metrics['page_daily_unfollows_unique']) : null;

    const dailyMetrics = sortedDates(viewsByDate, engagementsByDate, followsByDate).map((date) => ({
      date,
      pageViews: viewsByDate.get(date) ?? 0,
      postEngagements: engagementsByDate.get(date) ?? 0,
      pageFollows: followsByDate.get(date) ?? 0,
      newFollows: newFollowsByDate ? newFollowsByDate.get(date) ?? 0 : null,
      unfollows: unfollowsByDate ? unfollowsByDate.get(date) ?? 0 : null,
    }));

    return {
      pageViews: sumValues(metrics['page_views_total']),
      pageFollows: latestValue(metrics['page_follows']),
      postEngagements: sumValues(metrics['page_post_engagements']),
      newFollows: sumOrNull(metrics['page_daily_follows_unique']),
      unfollows: sumOrNull(metrics['page_daily_unfollows_unique']),
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
  limit: number = 30
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
        permalink_url?: string;
        full_picture?: string;
      }>;
    }>(`/${pageId}/posts`, token, {
      fields: 'id,message,created_time,shares,reactions.summary(true),comments.summary(true),permalink_url,full_picture',
      limit: String(limit),
    });

    return postsData.data.map((post) => ({
      id: post.id,
      message: post.message ?? null,
      createdTime: post.created_time,
      shares: post.shares?.count ?? 0,
      reactions: post.reactions?.summary?.total_count ?? 0,
      comments: post.comments?.summary?.total_count ?? 0,
      permalink: post.permalink_url ?? null,
      pictureUrl: post.full_picture ?? null,
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
  until?: string,
  previousRange?: { since: string; until: string }
): Promise<FacebookData | MetaInsightsError> {
  const [insights, previousResult] = await Promise.all([
    queryFacebookPageInsights(since, until),
    previousRange ? queryFacebookPageInsights(previousRange.since, previousRange.until) : Promise.resolve(null),
  ]);
  if (isMetaInsightsError(insights)) return insights;
  const previous = previousResult && !isMetaInsightsError(previousResult) ? previousResult : null;

  // Recent posts need extra permissions (pages_read_user_content); if they fail
  // (other than an expired token), still return the insights with a warning.
  const recentPosts = await queryFacebookPosts();
  if (isMetaInsightsError(recentPosts)) {
    if (recentPosts.code === 'TOKEN_EXPIRED') return recentPosts;
    console.warn(`[metaInsights] Facebook recent posts unavailable: ${recentPosts.message}`);
    return { insights, previous, recentPosts: [], warnings: [`Recent posts unavailable: ${recentPosts.message}`] };
  }

  return { insights, previous, recentPosts };
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
