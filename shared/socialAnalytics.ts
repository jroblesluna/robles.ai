// shared/socialAnalytics.ts
// Instagram / Facebook insights shapes returned by /api/admin/analytics/social/*
// (server: server/services/metaInsights.ts, client: the admin Social tab).

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
  /** Range totals; null when Meta does not return the metric for this account. */
  totalInteractions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  profileLinksTaps?: number | null;
  /** `followerCount` here is Meta's daily `follower_count`: NEW followers that day, not the total. */
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
  /** REELS, FEED, STORY… (media_product_type) */
  productType?: string | null;
  permalink?: string | null;
  thumbnailUrl?: string | null;
  saved?: number | null;
  shares?: number | null;
  totalInteractions?: number | null;
}

export interface InstagramData {
  insights: InstagramInsightsData;
  /** Same metrics for the equal-length period right before the selected one. */
  previous?: InstagramInsightsData | null;
  recentMedia: InstagramMediaItem[];
  /** Non-fatal problems (e.g. recent media unavailable for lack of permission). */
  warnings?: string[];
}

export interface FacebookPageInsightsData {
  pageViews: number;
  pageFollows: number;
  postEngagements: number;
  /** Range totals; null when Meta does not return the metric for this Page. */
  newFollows?: number | null;
  unfollows?: number | null;
  dailyMetrics: Array<{
    date: string;
    pageViews: number;
    postEngagements: number;
    pageFollows: number;
    newFollows?: number | null;
    unfollows?: number | null;
  }>;
}

export interface FacebookPostItem {
  id: string;
  message: string | null;
  createdTime: string;
  shares: number;
  reactions: number;
  comments: number;
  permalink?: string | null;
  pictureUrl?: string | null;
}

export interface FacebookData {
  insights: FacebookPageInsightsData;
  /** Same metrics for the equal-length period right before the selected one. */
  previous?: FacebookPageInsightsData | null;
  recentPosts: FacebookPostItem[];
  /** Non-fatal problems (e.g. recent posts unavailable for lack of permission). */
  warnings?: string[];
}
