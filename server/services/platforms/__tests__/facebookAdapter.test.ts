// Unit tests for FacebookAdapter
// Validates: Requirements 4.1, 4.2, 4.3, 4.4

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { PublishRequest } from '../types.js';

// Mock the db module
const mockGet = vi.fn();
const mockRun = vi.fn();
vi.mock('../../../db.js', () => ({
  default: {
    prepare: () => ({
      get: mockGet,
      run: mockRun,
    }),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks are set up
const { FacebookAdapter } = await import('../facebookAdapter.js');

function createPublishRequest(overrides: Partial<PublishRequest> = {}): PublishRequest {
  return {
    reportId: 1,
    text: 'Hello Facebook! #AI @robles',
    slideImageUrls: [],
    coverImageUrl: undefined,
    ...overrides,
  };
}

/**
 * Sets up mockGet to return settings values from a map.
 */
function setupSettings(settings: Record<string, string | null>): void {
  mockGet.mockImplementation((key: string) => {
    const value = settings[key] ?? null;
    return value !== null ? { value } : undefined;
  });
}

/**
 * Creates a successful JSON response mock.
 */
function okResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

/**
 * Creates an error response mock.
 */
function errorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(JSON.parse(body)),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('FacebookAdapter', () => {
  let adapter: InstanceType<typeof FacebookAdapter>;

  beforeEach(() => {
    adapter = new FacebookAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasCredentials', () => {
    it('returns true when both page_id and page_access_token are set', () => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
      });

      expect(adapter.hasCredentials()).toBe(true);
    });

    it('returns false when facebook_page_id is missing', () => {
      setupSettings({
        facebook_page_id: null,
        facebook_page_access_token: 'token-abc',
      });

      expect(adapter.hasCredentials()).toBe(false);
    });

    it('returns false when facebook_page_access_token is missing', () => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: null,
      });

      expect(adapter.hasCredentials()).toBe(false);
    });

    it('returns false when both are missing', () => {
      setupSettings({});

      expect(adapter.hasCredentials()).toBe(false);
    });
  });

  describe('validateCredentials', () => {
    it('returns valid when API responds OK', async () => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
      });

      mockFetch.mockResolvedValueOnce(okResponse({ id: 'page-123', name: 'Test Page' }));

      const result = await adapter.validateCredentials();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch.mock.calls[0][0]).toContain('/page-123?fields=id,name');
    });

    it('returns invalid when token is expired (401)', async () => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'expired-token',
      });

      mockFetch.mockResolvedValueOnce(errorResponse(401, '{"error":{"message":"Token expired"}}'));

      const result = await adapter.validateCredentials();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid or expired');
    });

    it('returns invalid when credentials are not configured', async () => {
      setupSettings({});

      const result = await adapter.validateCredentials();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('returns invalid on network error', async () => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.validateCredentials();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('publish - multi-photo post flow', () => {
    beforeEach(() => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
        meta_app_id: 'app-id',
        meta_app_secret: 'app-secret',
      });
    });

    it('uploads all photos unpublished then creates multi-photo post', async () => {
      const request = createPublishRequest({
        slideImageUrls: [
          'https://robles.ai/api/public/slides/1/1',
          'https://robles.ai/api/public/slides/1/2',
          'https://robles.ai/api/public/slides/1/3',
        ],
      });

      // Mock photo uploads (3 photos)
      mockFetch
        .mockResolvedValueOnce(okResponse({ id: 'photo-1' }))
        .mockResolvedValueOnce(okResponse({ id: 'photo-2' }))
        .mockResolvedValueOnce(okResponse({ id: 'photo-3' }))
        // Mock feed post creation
        .mockResolvedValueOnce(okResponse({ id: 'page-123_post-456' }));

      const result = await adapter.publish(request);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('page-123_post-456');

      // Verify 3 photo uploads + 1 feed post = 4 fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // First 3 calls are photo uploads with published: false
      for (let i = 0; i < 3; i++) {
        const [url, options] = mockFetch.mock.calls[i];
        expect(url).toContain('/page-123/photos');
        const body = JSON.parse(options.body);
        expect(body.published).toBe(false);
        expect(body.url).toBe(request.slideImageUrls[i]);
      }

      // Last call is the feed post with attached_media
      const [feedUrl, feedOptions] = mockFetch.mock.calls[3];
      expect(feedUrl).toContain('/page-123/feed');
      const feedBody = JSON.parse(feedOptions.body);
      expect(feedBody.message).toBe(request.text);
      expect(feedBody.attached_media).toEqual([
        { media_fbid: 'photo-1' },
        { media_fbid: 'photo-2' },
        { media_fbid: 'photo-3' },
      ]);
    });

    it('handles single slide as multi-photo post (1 slide >= 1)', async () => {
      const request = createPublishRequest({
        slideImageUrls: ['https://robles.ai/api/public/slides/1/1'],
      });

      mockFetch
        .mockResolvedValueOnce(okResponse({ id: 'photo-1' }))
        .mockResolvedValueOnce(okResponse({ id: 'page-123_post-789' }));

      const result = await adapter.publish(request);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('page-123_post-789');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('publish - single photo with cover image fallback', () => {
    beforeEach(() => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
        meta_app_id: 'app-id',
        meta_app_secret: 'app-secret',
      });
    });

    it('uses cover image when no slides are available', async () => {
      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: 'https://robles.ai/images/cover.jpg',
      });

      mockFetch
        .mockResolvedValueOnce(okResponse({ id: 'cover-photo-1' }))
        .mockResolvedValueOnce(okResponse({ id: 'page-123_cover-post' }));

      const result = await adapter.publish(request);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('page-123_cover-post');

      // Verify cover image was uploaded
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/page-123/photos');
      const body = JSON.parse(options.body);
      expect(body.url).toBe('https://robles.ai/images/cover.jpg');
      expect(body.published).toBe(false);

      // Then feed post with that single photo
      const feedBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(feedBody.attached_media).toEqual([{ media_fbid: 'cover-photo-1' }]);
    });
  });

  describe('publish - text-only fallback', () => {
    beforeEach(() => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
        meta_app_id: 'app-id',
        meta_app_secret: 'app-secret',
      });
    });

    it('creates text-only post when no slides and no cover image', async () => {
      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: undefined,
      });

      mockFetch.mockResolvedValueOnce(okResponse({ id: 'page-123_text-post' }));

      const result = await adapter.publish(request);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('page-123_text-post');

      // Verify it's a text-only post to /feed
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/page-123/feed');
      const body = JSON.parse(options.body);
      expect(body.message).toBe(request.text);
      expect(body.attached_media).toBeUndefined();
    });
  });

  describe('publish - token refresh retry on auth error', () => {
    beforeEach(() => {
      setupSettings({
        facebook_page_id: 'page-123',
        facebook_page_access_token: 'token-abc',
        meta_app_id: 'app-id',
        meta_app_secret: 'app-secret',
      });
    });

    it('retries after token refresh when first attempt gets 401', async () => {
      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: undefined,
      });

      mockFetch
        // First attempt: text post fails with 401
        .mockResolvedValueOnce(errorResponse(401, '{"error":{"message":"Token expired"}}'))
        // Token refresh succeeds
        .mockResolvedValueOnce(okResponse({ access_token: 'new-token-xyz', token_type: 'bearer', expires_in: 5184000 }))
        // Retry text post succeeds
        .mockResolvedValueOnce(okResponse({ id: 'page-123_retry-post' }));

      const result = await adapter.publish(request);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('page-123_retry-post');

      // Verify: first attempt + token refresh + retry = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Token refresh call goes to oauth endpoint
      expect(mockFetch.mock.calls[1][0]).toContain('/oauth/access_token');
    });

    it('retries after token refresh when first attempt gets 403', async () => {
      const request = createPublishRequest({
        slideImageUrls: ['https://robles.ai/api/public/slides/1/1'],
      });

      mockFetch
        // First attempt: photo upload fails with 403
        .mockResolvedValueOnce(errorResponse(403, '{"error":{"message":"Permission denied"}}'))
        // Token refresh succeeds
        .mockResolvedValueOnce(okResponse({ access_token: 'refreshed-token', token_type: 'bearer' }))
        // Retry: photo upload succeeds
        .mockResolvedValueOnce(okResponse({ id: 'photo-1' }))
        // Feed post succeeds
        .mockResolvedValueOnce(okResponse({ id: 'page-123_retry-post' }));

      const result = await adapter.publish(request);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('page-123_retry-post');
    });

    it('returns failure when both attempts fail (token refresh also fails)', async () => {
      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: undefined,
      });

      mockFetch
        // First attempt: text post fails with 401
        .mockResolvedValueOnce(errorResponse(401, '{"error":{"message":"Token expired"}}'))
        // Token refresh fails
        .mockResolvedValueOnce(errorResponse(400, '{"error":{"message":"Invalid token exchange"}}'));

      const result = await adapter.publish(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('token refresh');
    });

    it('returns failure when retry after refresh also gets auth error', async () => {
      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: undefined,
      });

      mockFetch
        // First attempt: fails with 401
        .mockResolvedValueOnce(errorResponse(401, '{"error":{"message":"Token expired"}}'))
        // Token refresh succeeds
        .mockResolvedValueOnce(okResponse({ access_token: 'new-token', token_type: 'bearer' }))
        // Retry also fails
        .mockResolvedValueOnce(errorResponse(401, '{"error":{"message":"Still invalid"}}'));

      const result = await adapter.publish(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('token refresh retry');
    });

    it('does not retry on non-auth errors (e.g. 500)', async () => {
      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: undefined,
      });

      mockFetch.mockResolvedValueOnce(
        errorResponse(500, '{"error":{"message":"Internal server error"}}')
      );

      const result = await adapter.publish(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      // Only 1 fetch call - no retry
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe('publish - missing credentials', () => {
    it('returns failure when credentials are not configured', async () => {
      setupSettings({});

      const request = createPublishRequest({
        slideImageUrls: [],
        coverImageUrl: undefined,
      });

      const result = await adapter.publish(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});
