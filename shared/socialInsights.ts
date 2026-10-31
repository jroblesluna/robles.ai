// Pure analysis helpers for the admin Social tab: normalise Instagram and
// Facebook posts and compare them against the account's own baseline.

import type {
  FacebookPostItem,
  InstagramMediaItem,
} from "./socialAnalytics.js";

export type Platform = "instagram" | "facebook";

export interface SocialPost {
  id: string;
  platform: Platform;
  text: string | null;
  publishedAt: string;
  format: string;
  /** Unique accounts reached; null when the platform does not report it. */
  reach: number | null;
  /** Likes/reactions + comments + shares + saves. */
  interactions: number;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  permalink: string | null;
  thumbnailUrl: string | null;
}

export type PerformanceLabel = "top" | "average" | "low";

export interface ScoredPost extends SocialPost {
  /** interactions / reach, when reach is known. */
  engagementRate: number | null;
  /** Interactions relative to the median post (1 = typical). */
  index: number;
  label: PerformanceLabel;
}

export interface GroupStat {
  key: string;
  posts: number;
  medianInteractions: number;
  medianReach: number | null;
  medianEngagementRate: number | null;
}

// ─── Normalisation ──────────────────────────────────────────────────────────

const IG_FORMATS: Record<string, string> = {
  REELS: "Reel",
  STORY: "Story",
  CAROUSEL_ALBUM: "Carousel",
  IMAGE: "Image",
  VIDEO: "Video",
};

export function instagramFormat(item: Pick<InstagramMediaItem, "mediaType" | "productType">): string {
  if (item.productType === "REELS" || item.productType === "STORY") return IG_FORMATS[item.productType];
  return IG_FORMATS[item.mediaType] ?? titleCase(item.mediaType);
}

export function normalizeInstagramPosts(items: InstagramMediaItem[]): SocialPost[] {
  return items.map((m) => {
    const shares = m.shares ?? null;
    const saves = m.saved ?? null;
    const interactions =
      m.totalInteractions ?? m.likeCount + m.commentsCount + (shares ?? 0) + (saves ?? 0);
    return {
      id: m.id,
      platform: "instagram",
      text: m.caption,
      publishedAt: m.timestamp,
      format: instagramFormat(m),
      reach: m.reach,
      interactions,
      likes: m.likeCount,
      comments: m.commentsCount,
      shares,
      saves,
      permalink: m.permalink ?? null,
      thumbnailUrl: m.thumbnailUrl ?? null,
    };
  });
}

export function normalizeFacebookPosts(items: FacebookPostItem[]): SocialPost[] {
  return items.map((p) => ({
    id: p.id,
    platform: "facebook",
    text: p.message,
    publishedAt: p.createdTime,
    format: p.pictureUrl ? "Photo post" : "Text post",
    reach: null,
    interactions: p.reactions + p.comments + p.shares,
    likes: p.reactions,
    comments: p.comments,
    shares: p.shares,
    saves: null,
    permalink: p.permalink ?? null,
    thumbnailUrl: p.pictureUrl ?? null,
  }));
}

// ─── Statistics ─────────────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Percentage change; null when there is no meaningful baseline. */
export function pctChange(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function movingAverage(values: number[], window = 7): Array<number | null> {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
}

/**
 * Days that stand out from the rest of the series (beyond `threshold`
 * standard deviations from the mean). Needs at least 7 points.
 */
export function findOutliers(
  series: Array<{ date: string; value: number }>,
  threshold = 2
): Array<{ date: string; value: number; direction: "spike" | "drop" }> {
  if (series.length < 7) return [];
  const values = series.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  if (sd === 0) return [];
  return series
    .filter((p) => Math.abs(p.value - mean) > threshold * sd)
    .map((p) => ({ ...p, direction: p.value > mean ? "spike" : "drop" }));
}

/** Last `days` points vs the `days` before them; null without enough data. */
export function recentMomentum(values: number[], days = 7): { recent: number; prior: number; change: number | null } | null {
  if (values.length < days * 2) return null;
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const recent = sum(values.slice(-days));
  const prior = sum(values.slice(-days * 2, -days));
  return { recent, prior, change: pctChange(recent, prior) };
}

// ─── Post scoring and grouping ──────────────────────────────────────────────

export function scorePosts(posts: SocialPost[]): ScoredPost[] {
  const baseline = median(posts.map((p) => p.interactions));
  return posts.map((p) => {
    const index = baseline > 0 ? p.interactions / baseline : p.interactions > 0 ? 2 : 1;
    return {
      ...p,
      engagementRate: p.reach && p.reach > 0 ? p.interactions / p.reach : null,
      index,
      label: index >= 1.5 ? "top" : index <= 0.6 ? "low" : "average",
    };
  });
}

export function groupPerformance(posts: ScoredPost[], keyOf: (p: ScoredPost) => string): GroupStat[] {
  const groups = new Map<string, ScoredPost[]>();
  for (const p of posts) {
    const key = keyOf(p);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return Array.from(groups, ([key, items]) => {
    const reaches = items.flatMap((p) => (p.reach != null ? [p.reach] : []));
    const rates = items.flatMap((p) => (p.engagementRate != null ? [p.engagementRate] : []));
    return {
      key,
      posts: items.length,
      medianInteractions: median(items.map((p) => p.interactions)),
      medianReach: reaches.length ? median(reaches) : null,
      medianEngagementRate: rates.length ? median(rates) : null,
    };
  }).sort((a, b) => b.medianInteractions - a.medianInteractions);
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const TIME_BLOCKS = ["Night (0–6h)", "Morning (6–12h)", "Afternoon (12–18h)", "Evening (18–24h)"] as const;

/**
 * Weekday (0 = Sunday) and 6-hour block of a timestamp, in the viewer's
 * local time or in `timeZone` (the server uses the business time zone).
 */
export function slotOf(iso: string, timeZone?: string): { weekday: number; block: number } {
  const d = new Date(iso);
  if (!timeZone) return { weekday: d.getDay(), block: Math.floor(d.getHours() / 6) };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(d);
  const weekday = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value as (typeof WEEKDAYS)[number]);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return { weekday, block: Math.floor(hour / 6) };
}

export function captionLengthBucket(text: string | null): string {
  const len = text?.trim().length ?? 0;
  if (len < 100) return "Short (<100 chars)";
  if (len <= 300) return "Medium (100–300)";
  return "Long (>300)";
}

export function hasQuestion(text: string | null): boolean {
  return !!text && /[?¿]/.test(text);
}

/** Weekday × time-block grid of median interactions (null when no posts). */
export function timingGrid(posts: ScoredPost[], timeZone?: string): Array<Array<{ posts: number; median: number | null }>> {
  const cells: number[][][] = WEEKDAYS.map(() => TIME_BLOCKS.map(() => []));
  for (const p of posts) {
    const { weekday, block } = slotOf(p.publishedAt, timeZone);
    cells[weekday][block].push(p.interactions);
  }
  return cells.map((row) => row.map((vals) => ({ posts: vals.length, median: vals.length ? median(vals) : null })));
}

export interface Cadence {
  postsInRange: number;
  postsPerWeek: number;
  daysSinceLastPost: number | null;
  longestGapDays: number | null;
}

export function postingCadence(posts: SocialPost[], startDate: string, endDate: string, now = new Date()): Cadence {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const all = posts.map((p) => new Date(p.publishedAt).getTime()).sort((a, b) => a - b);
  const inRange = all.filter((t) => t >= start && t <= end);
  const rangeDays = Math.max(1, Math.round((end - start) / 86_400_000));
  let longestGap: number | null = null;
  for (let i = 1; i < inRange.length; i++) {
    const gap = (inRange[i] - inRange[i - 1]) / 86_400_000;
    longestGap = Math.max(longestGap ?? 0, gap);
  }
  return {
    postsInRange: inRange.length,
    postsPerWeek: (inRange.length / rangeDays) * 7,
    daysSinceLastPost: all.length ? Math.floor((now.getTime() - all[all.length - 1]) / 86_400_000) : null,
    longestGapDays: longestGap === null ? null : Math.round(longestGap),
  };
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");
}
