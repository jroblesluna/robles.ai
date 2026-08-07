// server/services/platforms/facebookAdapter.ts

import db from '../../db.js';
import type { PlatformAdapter, PublishRequest, PublishResult } from './types.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Helper to read a setting from the database.
 */
function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

/**
 * Helper to upsert a setting in the database.
 */
function setSetting(key: string, value: string): void {
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
  ).run(key, value, now);
}

/**
 * Attempts to refresh the Facebook Page access token using a token exchange.
 * Uses the stored app credentials and the existing token as fb_exchange_token.
 * Returns the new access token on success.
 * Throws if refresh fails or credentials are missing.
 */
async function refreshPageAccessToken(): Promise<string> {
  const appId = getSetting('meta_app_id');
  const appSecret = getSetting('meta_app_secret');
  const currentToken = getSetting('facebook_page_access_token');

  if (!appId || !appSecret) {
    throw new Error('Meta app credentials not configured. Please set them in Settings.');
  }
  if (!currentToken) {
    throw new Error('Facebook page access token not found. Please configure it in Settings.');
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: currentToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Facebook token refresh failed:', response.status, errorBody);
    throw new Error(
      `Facebook token refresh failed (${response.status}). The token may be expired. Please reconnect in Settings.`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };

  // Store the new token
  setSetting('facebook_page_access_token', data.access_token);

  if (data.expires_in) {
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    setSetting('meta_token_expires_at', expiresAt);
  }

  return data.access_token;
}

/**
 * Uploads a single photo to the Facebook Page in unpublished state.
 * Returns the photo ID (media_fbid) for use in attached_media.
 */
async function uploadUnpublishedPhoto(
  pageId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const response = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      published: false,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Facebook photo upload failed:', response.status, errorBody);
    throw new Error(`Failed to upload photo to Facebook (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Creates a multi-photo post on the Facebook Page feed.
 * Takes an array of photo IDs (uploaded unpublished) and the post text.
 * Returns the post ID.
 */
async function createMultiPhotoPost(
  pageId: string,
  accessToken: string,
  message: string,
  photoIds: string[]
): Promise<string> {
  const attachedMedia = photoIds.map((id) => ({
    media_fbid: id,
  }));

  const body: Record<string, unknown> = {
    message,
    attached_media: attachedMedia,
    access_token: accessToken,
  };

  const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Facebook multi-photo post failed:', response.status, errorBody);
    throw new Error(`Failed to create Facebook post (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Creates a text-only post on the Facebook Page feed.
 * Returns the post ID.
 */
async function createTextPost(
  pageId: string,
  accessToken: string,
  message: string
): Promise<string> {
  const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Facebook text post failed:', response.status, errorBody);
    throw new Error(`Failed to create Facebook text post (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Checks if an error indicates a 401 or 403 authentication/authorization problem.
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('(401)') || error.message.includes('(403)');
  }
  return false;
}

/**
 * Facebook adapter implementing the PlatformAdapter interface.
 * Supports multi-photo posts, single-photo posts, and text-only posts.
 * Implements one-retry-on-auth-error behavior with token refresh.
 */
export class FacebookAdapter implements PlatformAdapter {
  readonly platform = 'facebook' as const;

  /**
   * Check if Facebook credentials are configured.
   * Requires both facebook_page_id and facebook_page_access_token.
   */
  hasCredentials(): boolean {
    const pageId = getSetting('facebook_page_id');
    const pageAccessToken = getSetting('facebook_page_access_token');
    return Boolean(pageId && pageAccessToken);
  }

  /**
   * Validate credentials by making a lightweight API call to the Graph API.
   * Checks that the page ID and token are valid by fetching the page info.
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const pageId = getSetting('facebook_page_id');
      const accessToken = getSetting('facebook_page_access_token');

      if (!pageId || !accessToken) {
        return { valid: false, error: 'Facebook Page ID or access token not configured.' };
      }

      const response = await fetch(
        `${GRAPH_API_BASE}/${pageId}?fields=id,name&access_token=${accessToken}`
      );

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: 'Facebook page access token is invalid or expired. Please reconnect in Settings.',
        };
      }

      const errorBody = await response.text();
      return {
        valid: false,
        error: `Facebook API returned status ${response.status}: ${errorBody}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: message };
    }
  }

  /**
   * Publish content to Facebook.
   *
   * Publishing flow:
   * - If slideImageUrls.length >= 1: multi-photo post (upload photos unpublished → create post with attached_media)
   * - If coverImageUrl present and no slides: single-photo post using cover image
   * - Otherwise: text-only post
   *
   * Implements one-retry-on-auth-error behavior: if the first attempt fails with a 401/403,
   * refresh the token and retry once.
   */
  async publish(request: PublishRequest): Promise<PublishResult> {
    try {
      const postId = await this.attemptPublish(request);
      return { success: true, platformPostId: postId };
    } catch (firstError) {
      // Check if it's an auth error — attempt token refresh and retry
      if (isAuthError(firstError)) {
        try {
          console.log('Facebook publish got auth error, attempting token refresh and retry...');
          await refreshPageAccessToken();
          const postId = await this.attemptPublish(request);
          return { success: true, platformPostId: postId };
        } catch (retryError) {
          const message = retryError instanceof Error ? retryError.message : String(retryError);
          return {
            success: false,
            error: `Facebook publish failed after token refresh retry: ${message}`,
          };
        }
      }

      const message = firstError instanceof Error ? firstError.message : String(firstError);
      return { success: false, error: message };
    }
  }

  /**
   * Attempt to publish based on the request content.
   */
  private async attemptPublish(request: PublishRequest): Promise<string> {
    const pageId = getSetting('facebook_page_id');
    const accessToken = getSetting('facebook_page_access_token');

    if (!pageId || !accessToken) {
      throw new Error('Facebook credentials not configured. Please set Page ID and access token in Settings.');
    }

    const { text, slideImageUrls, coverImageUrl } = request;

    // Multi-photo post: slides available
    if (slideImageUrls.length >= 1) {
      const photoIds: string[] = [];

      for (const imageUrl of slideImageUrls) {
        const photoId = await uploadUnpublishedPhoto(pageId, accessToken, imageUrl);
        photoIds.push(photoId);
      }

      return createMultiPhotoPost(pageId, accessToken, text, photoIds);
    }

    // Single photo with cover image fallback
    if (coverImageUrl) {
      const photoId = await uploadUnpublishedPhoto(pageId, accessToken, coverImageUrl);
      return createMultiPhotoPost(pageId, accessToken, text, [photoId]);
    }

    // Text-only post
    return createTextPost(pageId, accessToken, text);
  }
}
