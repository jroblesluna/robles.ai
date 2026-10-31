import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll } from "vitest";
import SocialTab from "../SocialTab";
import type { FacebookData, InstagramData } from "@shared/socialAnalytics";

// recharts' ResponsiveContainer needs ResizeObserver
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const range = { startDate: "2026-10-01", endDate: "2026-10-28", label: "Custom" };
const days = Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
const local = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();

const instagram: InstagramData = {
  insights: {
    followerCount: 1200,
    reach: 5000,
    views: 9000,
    accountsEngaged: 300,
    totalInteractions: 400,
    saves: 10,
    shares: 5,
    profileLinksTaps: 2,
    dailyMetrics: days.map((date, i) => ({ date, reach: i === 20 ? 900 : 150, followerCount: 2 })),
  },
  previous: {
    followerCount: 1150,
    reach: 10000,
    views: 8000,
    accountsEngaged: 280,
    totalInteractions: 350,
    dailyMetrics: [],
  },
  recentMedia: [
    ...[3, 10, 17].map((d) => ({ id: `r${d}`, caption: `Reel about agents ${d}?`, timestamp: local(d, 19), likeCount: 60, commentsCount: 6, mediaType: "VIDEO", productType: "REELS", reach: 900, views: 1500, totalInteractions: 70, permalink: `https://instagram.com/p/r${d}` })),
    ...[5, 12, 19].map((d) => ({ id: `i${d}`, caption: `Image ${d}`, timestamp: local(d, 9), likeCount: 10, commentsCount: 0, mediaType: "IMAGE", productType: "FEED", reach: 300, views: 400, totalInteractions: 12 })),
  ],
};

const facebook: FacebookData = {
  insights: {
    pageViews: 200,
    pageFollows: 800,
    postEngagements: 90,
    newFollows: 4,
    unfollows: 9,
    dailyMetrics: days.map((date) => ({ date, pageViews: 7, postEngagements: 3, pageFollows: 800, newFollows: 0, unfollows: 0 })),
  },
  previous: null,
  recentPosts: [{ id: "f1", message: "Hello", createdTime: local(2, 10), shares: 1, reactions: 4, comments: 0 }],
};

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const params = `startDate=${range.startDate}&endDate=${range.endDate}`;
  qc.setQueryData([`/api/admin/analytics/social/instagram?${params}`], instagram);
  qc.setQueryData([`/api/admin/analytics/social/facebook?${params}`], facebook);
  return render(
    <QueryClientProvider client={qc}>
      <SocialTab dateRange={range} />
    </QueryClientProvider>
  );
}

describe("SocialTab", () => {
  it("shows Instagram detail with comparisons and switches to Facebook", () => {
    renderTab();
    expect(screen.getByText("Instagram in detail")).toBeTruthy();
    expect(screen.getByText("Engagement rate")).toBeTruthy();
    expect(screen.getByText("Post performance")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Facebook/ }));
    expect(screen.getByText("Facebook in detail")).toBeTruthy();
    expect(screen.getByText("Unfollows")).toBeTruthy();
  });
});
