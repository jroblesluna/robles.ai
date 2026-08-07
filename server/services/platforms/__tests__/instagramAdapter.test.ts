// Unit tests for InstagramAdapter
// Validates: Requirements 3.1, 3.2, 3.3, 3.4

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
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

import { InstagramAdapter } from '../instagramAdapter.js';

/** Helper to set up DB mock to return settings */
function mockSettings(settings: Record<string, string | null>) {
  mockGet.mockImplementation((key: string) => {
    const value = settings[key] ?? null;
    return value != null ? { value } : undefined;
  });
}

/** Helper to create a successful JSON response */
function jsonResponse(data: object, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

/** Helper to create a failed response */
function errorResponse(status: number, body = 'Error'): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message: body } }),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('InstagramAdapter', () => {
  let adapter: InstagramAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new InstagramAdapter();
  });

  describe('hasCredentials', () => {
    it('returns true when both account ID and access token are set', () => {
      mockSettings({
        instagram_business_account_id: '123456',
        instagram_access_token: 'token-abc',
      });
      expect(adapter.hasCredentials()).toBe(true);
    });

    it('returns false when account ID is missing', () => {
      mockSettings({
        instagram_business_account_id: null,
        instagram_access_token: 'token-abc',
      });
      expect(adapter.hasCredentials()).toBe(false);
    });

    it('returns false when access token is missing', () => {
      mockSettings({
        instagram_business_account_id: '123456',
        instagram_access_token: null,
      });
      expect(adapter.hasCredentials()).toBe(false);
    });
  });

  describe('validateCredentials', () => {
    it('returns valid when API responds with 200', async () => {
      mockSettings({
        instagram_business_account_id: '123456',
        instagram_access_token: 'valid-token',
      });
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: '123456', username: 'testuser' }));

      const result = await adapter.validateCredentials();
      expect(result.valid).toBe(true);
    });

    it('returns invalid with error when credentials are not configured', async () => {
      mockSettings({
        instagram_business_account_id: null,
        instagram_access_token: null,
      });

      const result = await adapter.validateCredentials();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('returns invalid when API responds with 401', async () => {
      mockSettings({
        instagram_business_account_id: '123456',
        instagram_access_token: 'expired-token',
      });
      mockFetch.mockResolvedValueOnce(errorResponse(401, 'Invalid token'));

      const result = await adapter.validateCredentials();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid or expired');
    });
  });

  describe('publish - carousel flow (2-10 slides)', () => {
    const baseSettings = {
      instagram_business_account_id: 'ig-user-123',
      instagram_access_token: 'valid-token',
      meta_app_id: 'app-id',
      meta_app_secret: 'app-secret',
    };

    it('creates item containers, carousel container, and publishes (Req 3.1, 3.2)', async () => {
      mockSettings(baseSettings);

      const slideUrls = [
        'https://example.com/slide1.png',
        'https://example.com/slide2.png',
        'https://example.com/slide3.png',
      ];

      // Mock 3 item container creations
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ id: 'container-1' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'container-2' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'container-3' }))
        // Mock carousel container creation
        .mockResolvedValueOnce(jsonResponse({ id: 'carousel-container-1' }))
        // Mock publish
        .mockResolvedValueOnce(jsonResponse({ id: 'media-id-final' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Hello Instagram! #AI',
        slideImageUrls: slideUrls,
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('media-id-final');

      // Verify correct number of API calls: 3 items + 1 carousel + 1 publish = 5
      expect(mockFetch).toHaveBeenCalledTimes(5);

      // Verify item container call includes is_carousel_item
      const firstCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCall.is_carousel_item).toBe(true);
      expect(firstCall.image_url).toBe('https://example.com/slide1.png');

      // Verify carousel container call
      const carouselCall = JSON.parse(mockFetch.mock.calls[3][1].body);
      expect(carouselCall.media_type).toBe('CAROUSEL');
      expect(carouselCall.children).toBe('container-1,container-2,container-3');
      expect(carouselCall.caption).toBe('Hello Instagram! #AI');

      // Verify publish call
      const publishCall = JSON.parse(mockFetch.mock.calls[4][1].body);
      expect(publishCall.creation_id).toBe('carousel-container-1');
    });

    it('limits carousel to max 10 images when more than 10 slides provided', async () => {
      mockSettings(baseSettings);

      const slideUrls = Array.from({ length: 12 }, (_, i) => `https://example.com/slide${i + 1}.png`);

      // Mock 10 item containers + 1 carousel container + 1 publish = 12 calls
      for (let i = 1; i <= 10; i++) {
        mockFetch.mockResolvedValueOnce(jsonResponse({ id: `container-${i}` }));
      }
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ id: 'carousel-container' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'published-media-id' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Many slides post',
        slideImageUrls: slideUrls,
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('published-media-id');

      // Should be 10 item containers + 1 carousel + 1 publish = 12 total calls
      expect(mockFetch).toHaveBeenCalledTimes(12);

      // Verify carousel uses only first 10 container IDs
      const carouselCall = JSON.parse(mockFetch.mock.calls[10][1].body);
      const childrenIds = carouselCall.children.split(',');
      expect(childrenIds).toHaveLength(10);
    });

    it('creates a carousel with exactly 2 slides (minimum carousel size)', async () => {
      mockSettings(baseSettings);

      const slideUrls = [
        'https://example.com/slide1.png',
        'https://example.com/slide2.png',
      ];

      mockFetch
        .mockResolvedValueOnce(jsonResponse({ id: 'container-1' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'container-2' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'carousel-container' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'media-published' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Two slide carousel',
        slideImageUrls: slideUrls,
      });

      expect(result.success).toBe(true);
      // 2 items + 1 carousel + 1 publish = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('publish - single image fallback (1 slide)', () => {
    const baseSettings = {
      instagram_business_account_id: 'ig-user-123',
      instagram_access_token: 'valid-token',
      meta_app_id: 'app-id',
      meta_app_secret: 'app-secret',
    };

    it('publishes single image when only 1 slide available (Req 3.4)', async () => {
      mockSettings(baseSettings);

      mockFetch
        // Single image container creation
        .mockResolvedValueOnce(jsonResponse({ id: 'single-container' }))
        // Publish
        .mockResolvedValueOnce(jsonResponse({ id: 'single-media-id' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Single slide post',
        slideImageUrls: ['https://example.com/slide1.png'],
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('single-media-id');

      // Verify single image container (no is_carousel_item)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const containerCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(containerCall.image_url).toBe('https://example.com/slide1.png');
      expect(containerCall.caption).toBe('Single slide post');
      expect(containerCall.is_carousel_item).toBeUndefined();
    });
  });

  describe('publish - 0 slides edge cases', () => {
    const baseSettings = {
      instagram_business_account_id: 'ig-user-123',
      instagram_access_token: 'valid-token',
      meta_app_id: 'app-id',
      meta_app_secret: 'app-secret',
    };

    it('uses cover image as fallback when 0 slides and coverImageUrl provided (Req 3.4)', async () => {
      mockSettings(baseSettings);

      mockFetch
        .mockResolvedValueOnce(jsonResponse({ id: 'cover-container' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'cover-media-id' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Cover image fallback',
        slideImageUrls: [],
        coverImageUrl: 'https://example.com/cover.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('cover-media-id');

      const containerCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(containerCall.image_url).toBe('https://example.com/cover.jpg');
    });

    it('returns failure when 0 slides and no cover image', async () => {
      mockSettings(baseSettings);

      const result = await adapter.publish({
        reportId: 1,
        text: 'No images available',
        slideImageUrls: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires at least one image');
    });
  });

  describe('publish - token refresh retry (Req 3.3)', () => {
    const baseSettings = {
      instagram_business_account_id: 'ig-user-123',
      instagram_access_token: 'expired-token',
      meta_app_id: 'app-id',
      meta_app_secret: 'app-secret',
    };

    it('retries after token refresh when first attempt returns 401', async () => {
      mockSettings(baseSettings);

      mockFetch
        // First attempt: item container creation fails with 401
        .mockResolvedValueOnce(errorResponse(401, 'Token expired'))
        // Token refresh call succeeds
        .mockResolvedValueOnce(jsonResponse({ access_token: 'new-fresh-token', token_type: 'bearer', expires_in: 5184000 }))
        // Retry: item containers succeed
        .mockResolvedValueOnce(jsonResponse({ id: 'container-1' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'container-2' }))
        // Retry: carousel container
        .mockResolvedValueOnce(jsonResponse({ id: 'carousel-retry' }))
        // Retry: publish
        .mockResolvedValueOnce(jsonResponse({ id: 'retry-media-id' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Retry after refresh',
        slideImageUrls: [
          'https://example.com/slide1.png',
          'https://example.com/slide2.png',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('retry-media-id');
    });

    it('returns failure when token refresh also fails', async () => {
      mockSettings(baseSettings);

      mockFetch
        // First attempt fails with 401
        .mockResolvedValueOnce(errorResponse(401, 'Token expired'))
        // Token refresh also fails
        .mockResolvedValueOnce(errorResponse(400, 'Invalid token for refresh'));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Both attempts fail',
        slideImageUrls: [
          'https://example.com/slide1.png',
          'https://example.com/slide2.png',
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('token refresh');
    });

    it('retries after token refresh when first attempt returns 403', async () => {
      mockSettings(baseSettings);

      mockFetch
        // First attempt fails with 403
        .mockResolvedValueOnce(errorResponse(403, 'Forbidden'))
        // Token refresh succeeds
        .mockResolvedValueOnce(jsonResponse({ access_token: 'new-token', token_type: 'bearer' }))
        // Retry: single image publish (only 1 slide provided)
        .mockResolvedValueOnce(jsonResponse({ id: 'single-container' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'media-after-refresh' }));

      const result = await adapter.publish({
        reportId: 1,
        text: 'Retry on 403',
        slideImageUrls: ['https://example.com/slide1.png'],
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('media-after-refresh');
    });
  });

  describe('publish - credentials not configured', () => {
    it('returns failure when credentials are missing', async () => {
      mockSettings({
        instagram_business_account_id: null,
        instagram_access_token: null,
      });

      const result = await adapter.publish({
        reportId: 1,
        text: 'No credentials',
        slideImageUrls: ['https://example.com/slide1.png'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});
