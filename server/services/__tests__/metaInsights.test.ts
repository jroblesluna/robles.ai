import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
const mockGet = vi.fn();
const mockPrepare = vi.fn(() => ({
  get: mockGet,
}));

vi.mock('../../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  queryInstagramInsights,
  queryInstagramMedia,
  queryInstagram,
  queryFacebookPageInsights,
  queryFacebookPosts,
  queryFacebookPage,
  isMetaInsightsError,
  splitRange,
  metaRangeFromDates,
  dayOfEndTime,
} from '../metaInsights.js';
import { GRAPH_API_BASE, GRAPH_API_VERSION } from '../metaGraphApi.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to set up settings mock
function mockSettings(settings: Record<string, string | null>) {
  mockGet.mockImplementation(() => {
    // Get the last call to prepare to determine which key is being fetched
    const lastPrepareCall = mockPrepare.mock.calls[mockPrepare.mock.calls.length - 1];
    // We can't easily get the .get() arg, so we'll use a call counter
    return undefined;
  });

  // Use a call-based approach: each call to prepare().get(key) returns the matching setting
  let callIndex = 0;
  const settingsOrder = Object.entries(settings);

  mockGet.mockImplementation((...args: any[]) => {
    const key = args[0];
    if (key && settings[key] !== undefined) {
      const value = settings[key];
      return value !== null ? { value } : undefined;
    }
    // Fallback for sequential calls
    if (callIndex < settingsOrder.length) {
      const [, value] = settingsOrder[callIndex++];
      return value !== null ? { value } : undefined;
    }
    return undefined;
  });
}


// Key-based settings mock: getSetting(key) calls prepare(...).get(key)
function mockSettingsByKey(settings: Record<string, string>) {
  mockGet.mockImplementation((key: string) =>
    settings[key] !== undefined ? { value: settings[key] } : undefined
  );
}

// Route fetch by URL: handler returns a JSON body, or { status, body } for errors
function routeFetch(handler: (url: URL) => any) {
  mockFetch.mockImplementation(async (raw: string) => {
    const result = handler(new URL(raw));
    if (result && typeof result.status === 'number') {
      return { ok: false, status: result.status, json: async () => result.body };
    }
    return { ok: true, json: async () => result };
  });
}

const day1 = '2024-01-01T00:00:00+0000';
const day2 = '2024-01-02T00:00:00+0000';
const invalidMetric = {
  status: 400,
  body: { error: { code: 100, message: '(#100) The value must be a valid insights metric' } },
};

describe('metaInsights', () => {
  describe('isMetaInsightsError', () => {
    it('returns true for valid error objects', () => {
      expect(isMetaInsightsError({ error: true, code: 'NOT_CONFIGURED', message: 'test' })).toBe(true);
      expect(isMetaInsightsError({ error: true, code: 'TOKEN_EXPIRED', message: 'test' })).toBe(true);
      expect(isMetaInsightsError({ error: true, code: 'API_ERROR', message: 'test' })).toBe(true);
    });

    it('returns false for non-error values', () => {
      expect(isMetaInsightsError(null)).toBe(false);
      expect(isMetaInsightsError(undefined)).toBe(false);
      expect(isMetaInsightsError({})).toBe(false);
      expect(isMetaInsightsError({ error: false })).toBe(false);
      expect(isMetaInsightsError({ data: [] })).toBe(false);
    });
  });

  describe('queryInstagramInsights', () => {
    it('returns NOT_CONFIGURED when token is missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('NOT_CONFIGURED');
      }
    });

    it('returns NOT_CONFIGURED when the account ID is missing', async () => {
      mockSettingsByKey({ instagram_access_token: 'token-abc' });

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('NOT_CONFIGURED');
      }
    });

    it('reads the account ID saved by Settings (instagram_business_account_id)', async () => {
      mockSettingsByKey({
        instagram_access_token: 'ig-token',
        instagram_business_account_id: 'ig-biz-1',
      });
      routeFetch(() => ({ data: [] }));

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(false);
      const urls = mockFetch.mock.calls.map(([u]) => new URL(u as string).pathname);
      expect(urls.some((p) => p.endsWith('/ig-biz-1/insights'))).toBe(true);
      for (const [u] of mockFetch.mock.calls) {
        expect(u as string).toMatch(new RegExp(`^${GRAPH_API_BASE}/`));
      }
    });

    it('falls back to the legacy instagram_user_id key', async () => {
      mockSettingsByKey({
        instagram_access_token: 'ig-token',
        instagram_user_id: 'ig-legacy-1',
      });
      routeFetch(() => ({ data: [] }));

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(false);
      const urls = mockFetch.mock.calls.map(([u]) => new URL(u as string).pathname);
      expect(urls.some((p) => p.endsWith('/ig-legacy-1/insights'))).toBe(true);
    });

    it('requests only current metrics and returns structured insights', async () => {
      mockSettingsByKey({
        instagram_access_token: 'ig-token-123',
        instagram_business_account_id: 'ig-user-456',
      });
      routeFetch((url) => {
        if (!url.pathname.endsWith('/insights')) return { followers_count: 512 };
        const metric = url.searchParams.get('metric');
        if (metric === 'reach') {
          return { data: [{ name: 'reach', period: 'day', values: [{ value: 80, end_time: day1 }, { value: 90, end_time: day2 }] }] };
        }
        if (metric === 'follower_count') {
          return { data: [{ name: 'follower_count', period: 'day', values: [{ value: 3, end_time: day1 }, { value: 5, end_time: day2 }] }] };
        }
        if (metric === 'views') {
          expect(url.searchParams.get('metric_type')).toBe('total_value');
          return { data: [{ name: 'views', period: 'day', total_value: { value: 250 } }] };
        }
        if (metric === 'accounts_engaged') {
          expect(url.searchParams.get('metric_type')).toBe('total_value');
          return { data: [{ name: 'accounts_engaged', period: 'day', total_value: { value: 45 } }] };
        }
        return invalidMetric;
      });

      const result = await queryInstagramInsights();

      const requested = mockFetch.mock.calls
        .map(([u]) => new URL(u as string).searchParams.get('metric'))
        .filter(Boolean);
      expect(requested).not.toContain('impressions');
      expect(requested).not.toContain('profile_views');

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.followerCount).toBe(512); // from the account's followers_count
        expect(result.reach).toBe(170); // 80 + 90
        expect(result.views).toBe(250);
        expect(result.accountsEngaged).toBe(45);
        // end_time marks the end of the measured day, so each value belongs to the day before
        expect(result.dailyMetrics).toEqual([
          { date: '2023-12-31', reach: 80, followerCount: 3 },
          { date: '2024-01-01', reach: 90, followerCount: 5 },
        ]);
      }
    });

    it('returns TOKEN_EXPIRED when API returns 190 error code', async () => {
      mockSettingsByKey({
        instagram_access_token: 'expired-token',
        instagram_business_account_id: 'ig-user-456',
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 190, message: 'Error validating access token: Session has expired', error_subcode: 463 },
        }),
      });

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('queryInstagramMedia', () => {
    it('returns NOT_CONFIGURED when credentials missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryInstagramMedia();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('NOT_CONFIGURED');
      }
    });

    it('returns media items with per-post insights', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'ig-token' };
        if (callCount === 2) return { value: 'ig-user' };
        return undefined;
      });

      // First call: media list, second call: per-media insights
      let fetchCallCount = 0;
      mockFetch.mockImplementation(async () => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { id: 'media-1', caption: 'Hello world', timestamp: '2024-01-01T12:00:00+0000', like_count: 50, comments_count: 5, media_type: 'IMAGE' },
              ],
            }),
          };
        }
        // Per-media insights
        return {
          ok: true,
          json: async () => ({
            data: [
              { name: 'reach', values: [{ value: 200 }] },
              { name: 'views', values: [{ value: 300 }] },
            ],
          }),
        };
      });

      const result = await queryInstagramMedia(10);

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('media-1');
        expect(result[0].likeCount).toBe(50);
        expect(result[0].reach).toBe(200);
        expect(result[0].views).toBe(300);
      }
    });
  });

  describe('queryFacebookPageInsights', () => {
    it('returns NOT_CONFIGURED when token is missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryFacebookPageInsights();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('NOT_CONFIGURED');
      }
    });

    it('requests current metrics and returns structured page insights', async () => {
      mockSettingsByKey({
        facebook_page_access_token: 'fb-token-123',
        facebook_page_id: 'fb-page-456',
      });
      routeFetch((url) => {
        const metric = url.searchParams.get('metric');
        if (metric === 'page_views_total') {
          return { data: [{ name: metric, period: 'day', values: [{ value: 200, end_time: day1 }, { value: 300, end_time: day2 }] }] };
        }
        if (metric === 'page_post_engagements') {
          return { data: [{ name: metric, period: 'day', values: [{ value: 50, end_time: day1 }, { value: 60, end_time: day2 }] }] };
        }
        if (metric === 'page_follows') {
          return { data: [{ name: metric, period: 'day', values: [{ value: 1000, end_time: day1 }, { value: 1005, end_time: day2 }] }] };
        }
        return invalidMetric;
      });

      const result = await queryFacebookPageInsights();

      const requested = mockFetch.mock.calls.map(([u]) => new URL(u as string).searchParams.get('metric'));
      expect(requested).not.toContain('page_engaged_users');
      expect(requested).not.toContain('page_fans');

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.pageViews).toBe(500); // 200 + 300
        expect(result.pageFollows).toBe(1005); // latest
        expect(result.postEngagements).toBe(110); // 50 + 60
        expect(result.dailyMetrics).toHaveLength(2);
      }
    });

    it('keeps the other metrics when Meta rejects one as invalid (#100)', async () => {
      mockSettingsByKey({
        facebook_page_access_token: 'fb-token',
        facebook_page_id: 'fb-page',
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      routeFetch((url) => {
        const metric = url.searchParams.get('metric');
        if (metric === 'page_views_total') return invalidMetric;
        return { data: [{ name: metric, period: 'day', values: [{ value: 7, end_time: day1 }] }] };
      });

      const result = await queryFacebookPageInsights();

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.pageViews).toBe(0);
        expect(result.postEngagements).toBe(7);
        expect(result.pageFollows).toBe(7);
      }
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('handles API error gracefully', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'fb-token' };
        if (callCount === 2) return { value: 'fb-page' };
        return undefined;
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: 'Internal server error' },
        }),
      });

      const result = await queryFacebookPageInsights();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('API_ERROR');
      }
    });
  });

  describe('queryFacebookPosts', () => {
    it('returns NOT_CONFIGURED when credentials missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryFacebookPosts();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('NOT_CONFIGURED');
      }
    });

    it('returns posts with engagement metrics', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'fb-token' };
        if (callCount === 2) return { value: 'fb-page' };
        return undefined;
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'post-1',
              message: 'Hello Facebook!',
              created_time: '2024-01-01T12:00:00+0000',
              shares: { count: 5 },
              reactions: { summary: { total_count: 30 } },
              comments: { summary: { total_count: 8 } },
            },
            {
              id: 'post-2',
              created_time: '2024-01-02T12:00:00+0000',
              // No message, no shares
              reactions: { summary: { total_count: 10 } },
              comments: { summary: { total_count: 2 } },
            },
          ],
        }),
      });

      const result = await queryFacebookPosts();

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('post-1');
        expect(result[0].message).toBe('Hello Facebook!');
        expect(result[0].shares).toBe(5);
        expect(result[0].reactions).toBe(30);
        expect(result[0].comments).toBe(8);
        // Post without shares/message
        expect(result[1].message).toBeNull();
        expect(result[1].shares).toBe(0);
      }
    });
  });

  describe('queryInstagram (combined)', () => {
    it('returns NOT_CONFIGURED if token missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryInstagram();

      expect(isMetaInsightsError(result)).toBe(true);
    });

    it('returns insights with a warning when recent media is not permitted', async () => {
      mockSettingsByKey({ instagram_access_token: 'ig-token', instagram_business_account_id: 'ig-1' });
      routeFetch((url) => {
        if (url.pathname.endsWith('/ig-1/media')) {
          return { status: 400, body: { error: { code: 10, message: '(#10) Application does not have permission for this action' } } };
        }
        if (url.pathname.endsWith('/ig-1/insights')) {
          const metric = url.searchParams.get('metric')!;
          return metric === 'views' || metric === 'accounts_engaged'
            ? { data: [{ name: metric, total_value: { value: 7 } }] }
            : { data: [{ name: metric, values: [{ value: 3, end_time: day1 }] }] };
        }
        return { followers_count: 42 };
      });

      const result = await queryInstagram();

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.insights.followerCount).toBe(42);
        expect(result.recentMedia).toEqual([]);
        expect(result.warnings?.[0]).toContain('(#10)');
      }
    });

    it('still fails when recent media reports an expired token', async () => {
      mockSettingsByKey({ instagram_access_token: 'ig-token', instagram_business_account_id: 'ig-1' });
      routeFetch((url) => {
        if (url.pathname.endsWith('/ig-1/media')) {
          return { status: 400, body: { error: { code: 190, message: 'expired' } } };
        }
        if (url.pathname.endsWith('/ig-1/insights')) {
          return { data: [{ name: url.searchParams.get('metric')!, values: [{ value: 1, end_time: day1 }] }] };
        }
        return { followers_count: 1 };
      });

      const result = await queryInstagram();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) expect(result.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('queryFacebookPage (combined)', () => {
    it('returns NOT_CONFIGURED if credentials missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryFacebookPage();

      expect(isMetaInsightsError(result)).toBe(true);
    });

    it('returns insights with a warning when recent posts are not permitted', async () => {
      mockSettingsByKey({ facebook_page_access_token: 'fb-token', facebook_page_id: 'page-1' });
      routeFetch((url) => {
        if (url.pathname.endsWith('/page-1/posts')) {
          return { status: 400, body: { error: { code: 10, message: "(#10) This endpoint requires the 'pages_read_user_content' permission" } } };
        }
        return { data: [{ name: url.searchParams.get('metric')!, values: [{ value: 5, end_time: day1 }, { value: 6, end_time: day2 }] }] };
      });

      const result = await queryFacebookPage();

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.insights.pageViews).toBe(11);
        expect(result.recentPosts).toEqual([]);
        expect(result.warnings?.[0]).toContain('pages_read_user_content');
      }
    });
  });
});

describe('date ranges', () => {
  const DAY = 86400;

  it('dates a daily value by the day it measures, not its end_time', () => {
    expect(dayOfEndTime('2024-01-02T08:00:00+0000')).toBe('2024-01-01');
    expect(dayOfEndTime('2024-03-01T07:00:00+0000')).toBe('2024-02-29');
  });

  it('turns admin dates into an inclusive range plus the equal-length previous period', () => {
    const range = metaRangeFromDates('2024-01-01', '2024-01-10');
    const start = Date.parse('2024-01-01T00:00:00Z') / 1000;
    expect(range?.current).toEqual({ since: String(start), until: String(start + 10 * DAY) });
    expect(range?.previous).toEqual({ since: String(start - 10 * DAY), until: String(start) });
  });

  it('rejects malformed dates and caps the range at now', () => {
    expect(metaRangeFromDates('30daysAgo', 'today')).toBeNull();
    const today = new Date().toISOString().slice(0, 10);
    const range = metaRangeFromDates(today, today)!;
    expect(Number(range.current.until)).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });

  it('splits long ranges into windows Meta accepts', () => {
    const chunks = splitRange({ since: '0', until: String(75 * DAY) }, 30);
    expect(chunks).toEqual([
      { since: '0', until: String(30 * DAY) },
      { since: String(30 * DAY), until: String(60 * DAY) },
      { since: String(60 * DAY), until: String(75 * DAY) },
    ]);
  });

  it('queries every window of a long Instagram range and merges the series', async () => {
    mockSettingsByKey({ instagram_access_token: 't', instagram_business_account_id: 'ig-1' });
    routeFetch((url) => {
      if (!url.pathname.endsWith('/insights')) return { followers_count: 10 };
      const metric = url.searchParams.get('metric')!;
      if (url.searchParams.get('metric_type') === 'total_value') return { data: [{ name: metric, total_value: { value: 5 } }] };
      const end = new Date((Number(url.searchParams.get('until'))) * 1000).toISOString();
      return { data: [{ name: metric, values: [{ value: 1, end_time: end }] }] };
    });

    const result = await queryInstagramInsights('0', String(45 * DAY));

    expect(isMetaInsightsError(result)).toBe(false);
    if (!isMetaInsightsError(result)) {
      expect(result.dailyMetrics).toHaveLength(2); // one point per window in this mock
      expect(result.reach).toBe(2);
      expect(result.views).toBe(10); // total_value summed across windows
    }
  });
});

describe('Graph API version', () => {
  it('pins a single vNN.0 version on graph.facebook.com', () => {
    expect(GRAPH_API_VERSION).toMatch(/^v\d+\.0$/);
    expect(GRAPH_API_BASE).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}`);
  });
});
