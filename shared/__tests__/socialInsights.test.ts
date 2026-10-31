import { describe, it, expect } from "vitest";
import {
  findOutliers,
  groupPerformance,
  instagramFormat,
  median,
  movingAverage,
  normalizeFacebookPosts,
  normalizeInstagramPosts,
  pctChange,
  postingCadence,
  scorePosts,
  slotOf,
  timingGrid,
  type SocialPost,
} from "../socialInsights";

// Local-time timestamps so weekday/hour checks hold in any test timezone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

function post(over: Partial<SocialPost>): SocialPost {
  return {
    id: Math.random().toString(36).slice(2),
    platform: "instagram",
    text: "Post",
    publishedAt: at(2026, 10, 5),
    format: "Image",
    reach: 100,
    interactions: 10,
    likes: 8,
    comments: 2,
    shares: 0,
    saves: 0,
    permalink: null,
    thumbnailUrl: null,
    ...over,
  };
}

describe("statistics", () => {
  it("median handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("pctChange has no baseline for zero or missing previous values", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(5, null)).toBeNull();
  });

  it("movingAverage starts once the window is full", () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });

  it("findOutliers flags spikes and drops only with enough data", () => {
    const flat = Array.from({ length: 10 }, (_, i) => ({ date: `d${i}`, value: 10 }));
    expect(findOutliers(flat)).toEqual([]);
    const spiky = [...flat, { date: "spike", value: 100 }];
    expect(findOutliers(spiky)).toEqual([{ date: "spike", value: 100, direction: "spike" }]);
    expect(findOutliers(spiky.slice(-3))).toEqual([]);
  });
});

describe("normalisation", () => {
  it("maps Instagram formats, preferring Reels over the raw video type", () => {
    expect(instagramFormat({ mediaType: "VIDEO", productType: "REELS" })).toBe("Reel");
    expect(instagramFormat({ mediaType: "CAROUSEL_ALBUM", productType: "FEED" })).toBe("Carousel");
  });

  it("falls back to summing Instagram interactions when total_interactions is missing", () => {
    const [p] = normalizeInstagramPosts([
      { id: "1", caption: null, timestamp: at(2026, 10, 1), likeCount: 10, commentsCount: 2, mediaType: "IMAGE", reach: 50, views: null, saved: 3, shares: 1 },
    ]);
    expect(p.interactions).toBe(16);
    expect(p.format).toBe("Image");
  });

  it("sums Facebook reactions, comments and shares", () => {
    const [p] = normalizeFacebookPosts([
      { id: "f", message: "Hi", createdTime: at(2026, 10, 1), shares: 2, reactions: 5, comments: 1 },
    ]);
    expect(p.interactions).toBe(8);
    expect(p.reach).toBeNull();
  });
});

describe("scoring and grouping", () => {
  it("labels posts against the median post", () => {
    const scored = scorePosts([post({ interactions: 10 }), post({ interactions: 10 }), post({ interactions: 30 }), post({ interactions: 2 })]);
    expect(scored.map((p) => p.label)).toEqual(["average", "average", "top", "low"]);
    expect(scored[0].engagementRate).toBeCloseTo(0.1);
  });

  it("groups and ranks by median interactions", () => {
    const scored = scorePosts([
      post({ format: "Reel", interactions: 40 }),
      post({ format: "Reel", interactions: 60 }),
      post({ format: "Image", interactions: 10 }),
    ]);
    const groups = groupPerformance(scored, (p) => p.format);
    expect(groups[0]).toMatchObject({ key: "Reel", posts: 2, medianInteractions: 50 });
  });

  it("places posts in the weekday × time-block grid", () => {
    // 2026-10-06 is a Tuesday; 15h is the afternoon block
    const grid = timingGrid(scorePosts([post({ publishedAt: at(2026, 10, 6, 15), interactions: 7 })]));
    expect(grid[2][2]).toEqual({ posts: 1, median: 7 });
    expect(grid[0][0]).toEqual({ posts: 0, median: null });
  });
});

describe("postingCadence", () => {
  it("counts posts in range, frequency, gaps and recency", () => {
    const posts = [post({ publishedAt: at(2026, 10, 1) }), post({ publishedAt: at(2026, 10, 8) }), post({ publishedAt: at(2026, 9, 1) })];
    const c = postingCadence(posts, "2026-10-01", "2026-10-14", new Date(2026, 9, 15, 12));
    expect(c.postsInRange).toBe(2);
    expect(c.postsPerWeek).toBeCloseTo(1, 0);
    expect(c.longestGapDays).toBe(7);
    expect(c.daysSinceLastPost).toBe(7);
  });
});

describe("slotOf", () => {
  it("reads weekday and time block in a given time zone", () => {
    // 2026-10-06T03:30Z is Monday 22:30 in Lima (UTC-5)
    expect(slotOf("2026-10-06T03:30:00Z", "America/Lima")).toEqual({ weekday: 1, block: 3 });
    expect(slotOf("2026-10-06T03:30:00Z", "UTC")).toEqual({ weekday: 2, block: 0 });
  });
});
