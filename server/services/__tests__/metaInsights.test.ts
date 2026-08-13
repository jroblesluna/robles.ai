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
} from '../metaInsights.js';

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

    it('returns NOT_CONFIGURED when instagram_user_id is missing', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'token-abc' }; // instagram_access_token
        return undefined; // instagram_user_id missing
      });

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(true);
      if (isMetaInsightsError(result)) {
        expect(result.code).toBe('NOT_CONFIGURED');
      }
    });

    it('returns structured insights data on success', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'ig-token-123' };
        if (callCount === 2) return { value: 'ig-user-456' };
        return undefined;
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { name: 'impressions', period: 'day', values: [{ value: 100, end_time: '2024-01-01T00:00:00+0000' }, { value: 150, end_time: '2024-01-02T00:00:00+0000' }] },
            { name: 'reach', period: 'day', values: [{ value: 80, end_time: '2024-01-01T00:00:00+0000' }, { value: 90, end_time: '2024-01-02T00:00:00+0000' }] },
            { name: 'follower_count', period: 'day', values: [{ value: 500, end_time: '2024-01-01T00:00:00+0000' }, { value: 505, end_time: '2024-01-02T00:00:00+0000' }] },
            { name: 'profile_views', period: 'day', values: [{ value: 20, end_time: '2024-01-01T00:00:00+0000' }, { value: 25, end_time: '2024-01-02T00:00:00+0000' }] },
          ],
        }),
      });

      const result = await queryInstagramInsights();

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.followerCount).toBe(505); // latest value
        expect(result.reach).toBe(170); // 80 + 90
        expect(result.impressions).toBe(250); // 100 + 150
        expect(result.profileViews).toBe(45); // 20 + 25
        expect(result.dailyMetrics).toHaveLength(2);
        expect(result.dailyMetrics[0].date).toBe('2024-01-01');
      }
    });

    it('returns TOKEN_EXPIRED when API returns 190 error code', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'expired-token' };
        if (callCount === 2) return { value: 'ig-user-456' };
        return undefined;
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
              { name: 'impressions', values: [{ value: 300 }] },
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
        expect(result[0].impressions).toBe(300);
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

    it('returns structured page insights on success', async () => {
      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { value: 'fb-token-123' };
        if (callCount === 2) return { value: 'fb-page-456' };
        return undefined;
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { name: 'page_views_total', period: 'day', values: [{ value: 200, end_time: '2024-01-01T00:00:00+0000' }, { value: 300, end_time: '2024-01-02T00:00:00+0000' }] },
            { name: 'page_engaged_users', period: 'day', values: [{ value: 50, end_time: '2024-01-01T00:00:00+0000' }, { value: 60, end_time: '2024-01-02T00:00:00+0000' }] },
            { name: 'page_fans', period: 'day', values: [{ value: 1000, end_time: '2024-01-01T00:00:00+0000' }, { value: 1005, end_time: '2024-01-02T00:00:00+0000' }] },
          ],
        }),
      });

      const result = await queryFacebookPageInsights();

      expect(isMetaInsightsError(result)).toBe(false);
      if (!isMetaInsightsError(result)) {
        expect(result.pageViews).toBe(500); // 200 + 300
        expect(result.pageFans).toBe(1005); // latest
        expect(result.engagedUsers).toBe(110); // 50 + 60
        expect(result.dailyMetrics).toHaveLength(2);
      }
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
  });

  describe('queryFacebookPage (combined)', () => {
    it('returns NOT_CONFIGURED if credentials missing', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await queryFacebookPage();

      expect(isMetaInsightsError(result)).toBe(true);
    });
  });
});
