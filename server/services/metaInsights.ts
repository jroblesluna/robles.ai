// server/services/metaInsights.ts
// Meta Graph API client for querying Instagram and Facebook Page insights.

import db from '../db.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MetaInsightsError {
  error: true;
  code: 'TOKEN_EXPIRED' | 'NOT_CONFIGURED' | 'API_ERROR';
  message: string;
}

export interface InstagramInsightsData {
  followerCount: number;
  reach: number;
  impressions: number;
  profileViews: number;
  dailyMetrics: Array<{
    date: string;
    reach: number;
    impressions: number;
    followerCount: number;
    profileViews: number;
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
  impressions: number | null;
}

export interface InstagramData {
  insights: InstagramInsightsData;
  recentMedia: InstagramMediaItem[];
}

export interface FacebookPageInsightsData {
  pageViews: number;
  pageFans: number;
  engagedUsers: number;
  dailyMetrics: Array<{
    date: string;
    pageViews: number;
    engagedUsers: number;
    pageFans: number;
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
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

// ─── Instagram ──────────────────────────────────────────────────────────────────

/**
 * Query Instagram Business Account insights: impressions, reach, follower_count, profile_views.
 * Returns aggregated totals and daily breakdowns.
 */
export async function queryInstagramInsights(
  since?: string,
  until?: string
): Promise<InstagramInsightsData | MetaInsightsError> {
  const token = getSetting('instagram_access_token');
  const igUserId = getSetting('instagram_user_id');

  if (!token || !igUserId) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Instagram credentials not configured. Please set instagram_access_token and instagram_user_id in Settings.',
    };
  }

  try {
    const params: Record<string, string> = {
      metric: 'impressions,reach,follower_count,profile_views',
      period: 'day',
    };
    if (since) params.since = since;
    if (until) params.until = until;

    const data = await metaGet<{
      data: Array<{
        name: string;
        period: string;
        values: Array<{ value: number; end_time: string }>;
      }>;
    }>(`/${igUserId}/insights`, token, params);

    // Parse the response into structured data
    const metricsMap: Record<string, Array<{ value: number; end_time: string }>> = {};
    for (const metric of data.data) {
      metricsMap[metric.name] = metric.values;
    }

    // Aggregate totals (sum for reach/impressions/profile_views, latest for follower_count)
    const reachValues = metricsMap['reach'] || [];
    const impressionsValues = metricsMap['impressions'] || [];
    const followerValues = metricsMap['follower_count'] || [];
    const profileViewsValues = metricsMap['profile_views'] || [];

    const totalReach = reachValues.reduce((sum, v) => sum + v.value, 0);
    const totalImpressions = impressionsValues.reduce((sum, v) => sum + v.value, 0);
    const totalProfileViews = profileViewsValues.reduce((sum, v) => sum + v.value, 0);
    const latestFollowers = followerValues.length > 0
      ? followerValues[followerValues.length - 1].value
      : 0;

    // Build daily metrics array
    const dates = reachValues.map((v) => v.end_time.split('T')[0]);
    const dailyMetrics = dates.map((date, i) => ({
      date,
      reach: reachValues[i]?.value ?? 0,
      impressions: impressionsValues[i]?.value ?? 0,
      followerCount: followerValues[i]?.value ?? 0,
      profileViews: profileViewsValues[i]?.value ?? 0,
    }));

    return {
      followerCount: latestFollowers,
      reach: totalReach,
      impressions: totalImpressions,
      profileViews: totalProfileViews,
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
 * Query recent Instagram media with per-media insights (reach, impressions).
 * Returns the last `limit` posts with their engagement metrics.
 */
export async function queryInstagramMedia(
  limit: number = 10
): Promise<InstagramMediaItem[] | MetaInsightsError> {
  const token = getSetting('instagram_access_token');
  const igUserId = getSetting('instagram_user_id');

  if (!token || !igUserId) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Instagram credentials not configured. Please set instagram_access_token and instagram_user_id in Settings.',
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
      let impressions: number | null = null;

      try {
        const insightsData = await metaGet<{
          data: Array<{ name: string; values: Array<{ value: number }> }>;
        }>(`/${post.id}/insights`, token, {
          metric: 'reach,impressions',
        });

        for (const metric of insightsData.data) {
          if (metric.name === 'reach' && metric.values[0]) {
            reach = metric.values[0].value;
          }
          if (metric.name === 'impressions' && metric.values[0]) {
            impressions = metric.values[0].value;
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
        impressions,
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

  const recentMedia = await queryInstagramMedia();
  if (isMetaInsightsError(recentMedia)) return recentMedia;

  return { insights, recentMedia };
}

// ─── Facebook ───────────────────────────────────────────────────────────────────

/**
 * Query Facebook Page insights: page_views_total, page_engaged_users, page_fans.
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
    const params: Record<string, string> = {
      metric: 'page_views_total,page_engaged_users,page_fans',
      period: 'day',
    };
    if (since) params.since = since;
    if (until) params.until = until;

    const data = await metaGet<{
      data: Array<{
        name: string;
        period: string;
        values: Array<{ value: number; end_time: string }>;
      }>;
    }>(`/${pageId}/insights`, token, params);

    const metricsMap: Record<string, Array<{ value: number; end_time: string }>> = {};
    for (const metric of data.data) {
      metricsMap[metric.name] = metric.values;
    }

    const pageViewsValues = metricsMap['page_views_total'] || [];
    const engagedUsersValues = metricsMap['page_engaged_users'] || [];
    const pageFansValues = metricsMap['page_fans'] || [];

    const totalPageViews = pageViewsValues.reduce((sum, v) => sum + v.value, 0);
    const totalEngagedUsers = engagedUsersValues.reduce((sum, v) => sum + v.value, 0);
    const latestPageFans = pageFansValues.length > 0
      ? pageFansValues[pageFansValues.length - 1].value
      : 0;

    // Build daily metrics
    const dates = pageViewsValues.map((v) => v.end_time.split('T')[0]);
    const dailyMetrics = dates.map((date, i) => ({
      date,
      pageViews: pageViewsValues[i]?.value ?? 0,
      engagedUsers: engagedUsersValues[i]?.value ?? 0,
      pageFans: pageFansValues[i]?.value ?? 0,
    }));

    return {
      pageViews: totalPageViews,
      pageFans: latestPageFans,
      engagedUsers: totalEngagedUsers,
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

  const recentPosts = await queryFacebookPosts();
  if (isMetaInsightsError(recentPosts)) return recentPosts;

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
