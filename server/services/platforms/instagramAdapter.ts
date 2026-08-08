// server/services/platforms/instagramAdapter.ts

import db from '../../db.js';
import type { PlatformAdapter, PublishRequest, PublishResult } from './types.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const MAX_CAROUSEL_IMAGES = 10;

/**
 * Format caption for Instagram to preserve paragraph breaks.
 * Instagram Graph API strips blank lines and invisible characters.
 * The only reliable method is to place a visible character (·) on blank lines.
 * This is the standard approach used by social media scheduling tools.
 */
function formatCaptionForInstagram(text: string): string {
  return text.replace(/\n\n/g, '\r\n\r\n');
}

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
 * Attempts to refresh the Instagram/Meta access token using the stored app credentials.
 * Uses the fb_exchange_token grant type to exchange the current token for a new long-lived one.
 * Returns the new access token on success, throws on failure.
 */
async function refreshAccessToken(): Promise<string> {
  const currentToken = getSetting('instagram_access_token');
  const appId = getSetting('meta_app_id');
  const appSecret = getSetting('meta_app_secret');

  if (!currentToken) {
    throw new Error('Instagram access token not found. Please configure Instagram credentials in Settings.');
  }
  if (!appId || !appSecret) {
    throw new Error('Meta App credentials (app_id/app_secret) not configured. Please set them in Settings.');
  }

  const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', currentToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Instagram token refresh failed:', response.status, errorBody);
    throw new Error(
      `Instagram token refresh failed (${response.status}). The token may be expired. Please reconnect Instagram in Settings.`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };

  // Store the new token
  setSetting('instagram_access_token', data.access_token);

  if (data.expires_in) {
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    setSetting('meta_token_expires_at', expiresAt);
  }

  return data.access_token;
}

/**
 * Creates a single item container for a carousel image on Instagram.
 * Returns the container creation ID.
 */
async function createItemContainer(
  igUserId: string,
  accessToken: string,
  imageUrl: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${igUserId}/media`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      is_carousel_item: true,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Instagram item container creation failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Creates a carousel container referencing all item container IDs.
 * Returns the carousel container creation ID.
 */
async function createCarouselContainer(
  igUserId: string,
  accessToken: string,
  childrenIds: string[],
  caption: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${igUserId}/media`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      caption,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Instagram carousel container creation failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Creates a single image post container (non-carousel).
 * Returns the container creation ID.
 */
async function createSingleImageContainer(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${igUserId}/media`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Instagram single image container creation failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Publishes a media container (carousel or single image) to Instagram.
 * Returns the published media ID.
 */
async function publishContainer(
  igUserId: string,
  accessToken: string,
  creationId: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${igUserId}/media_publish`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Instagram media publish failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/**
 * Waits for a media container to be ready for publishing.
 * Polls the container status every 3 seconds, up to maxAttempts times.
 * Instagram containers go through: IN_PROGRESS → FINISHED (ready to publish)
 */
async function waitForContainerReady(
  igUserId: string,
  accessToken: string,
  containerId: string,
  maxAttempts: number = 10
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = (await response.json()) as { status_code?: string };
      if (data.status_code === 'FINISHED') {
        return; // Ready to publish
      }
      if (data.status_code === 'ERROR') {
        throw new Error(`Instagram container ${containerId} failed processing`);
      }
    }

    // Wait 3 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error(`Instagram container ${containerId} not ready after ${maxAttempts * 3} seconds`);
}

/**
 * Instagram adapter implementing the PlatformAdapter interface.
 * Supports carousel posts (2-10 images) and single-image posts.
 * Implements token refresh retry on 401/403 errors.
 */
export class InstagramAdapter implements PlatformAdapter {
  readonly platform = 'instagram' as const;

  /**
   * Check if Instagram credentials are configured.
   * Requires both the business account ID and access token.
   */
  hasCredentials(): boolean {
    const accountId = getSetting('instagram_business_account_id');
    const accessToken = getSetting('instagram_access_token');
    return Boolean(accountId && accessToken);
  }

  /**
   * Validate credentials by making a lightweight API call to the Instagram Graph API.
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const accountId = getSetting('instagram_business_account_id');
      const accessToken = getSetting('instagram_access_token');

      if (!accountId || !accessToken) {
        return { valid: false, error: 'Instagram credentials not configured. Please set them in Settings.' };
      }

      const url = `${GRAPH_API_BASE}/${accountId}?fields=id,username&access_token=${accessToken}`;
      const response = await fetch(url);

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Instagram access token is invalid or expired. Please reconnect in Settings.' };
      }

      const errorBody = await response.text();
      return { valid: false, error: `Instagram API returned status ${response.status}: ${errorBody}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: message };
    }
  }

  /**
   * Publish content to Instagram.
   *
   * - If slideImageUrls.length >= 2: carousel post (limited to first 10 images)
   * - If slideImageUrls.length === 1 or coverImageUrl available: single image post
   * - Otherwise: fail with error (Instagram requires at least one image)
   *
   * Implements one-retry-on-401/403 behavior: if the first attempt fails with
   * an auth error, refresh the token and retry once.
   */
  async publish(request: PublishRequest): Promise<PublishResult> {
    try {
      const mediaId = await this.attemptPublish(request);
      return { success: true, platformPostId: mediaId };
    } catch (firstError) {
      // Check if it's a 401/403 error — attempt token refresh and retry
      if (this.isAuthError(firstError)) {
        try {
          console.log('Instagram publish got auth error, attempting token refresh and retry...');
          await refreshAccessToken();
          const mediaId = await this.attemptPublish(request);
          return { success: true, platformPostId: mediaId };
        } catch (retryError) {
          const message = retryError instanceof Error ? retryError.message : String(retryError);
          return { success: false, error: `Instagram publish failed after token refresh retry: ${message}` };
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
    const { text: rawText, slideImageUrls, coverImageUrl } = request;
    const text = formatCaptionForInstagram(rawText);

    const igUserId = getSetting('instagram_business_account_id');
    const accessToken = getSetting('instagram_access_token');

    if (!igUserId || !accessToken) {
      throw new Error('Instagram credentials not configured. Please set them in Settings.');
    }

    // Carousel mode: 2+ slides, limited to MAX_CAROUSEL_IMAGES
    if (slideImageUrls.length >= 2) {
      const imagesToPublish = slideImageUrls.slice(0, MAX_CAROUSEL_IMAGES);

      // Step 1: Create item containers for each image
      const childrenIds: string[] = [];
      for (let i = 0; i < imagesToPublish.length; i++) {
        const containerId = await createItemContainer(igUserId, accessToken, imagesToPublish[i]);
        childrenIds.push(containerId);
      }

      // Step 2: Create carousel container
      const carouselId = await createCarouselContainer(igUserId, accessToken, childrenIds, text);

      // Step 2.5: Wait for container to be ready
      await waitForContainerReady(igUserId, accessToken, carouselId);

      // Step 3: Publish the carousel
      const mediaId = await publishContainer(igUserId, accessToken, carouselId);
      return mediaId;
    }

    // Single image mode: use first slide or cover image
    const singleImageUrl = slideImageUrls[0] || coverImageUrl;
    if (singleImageUrl) {
      const containerId = await createSingleImageContainer(igUserId, accessToken, singleImageUrl, text);
      await waitForContainerReady(igUserId, accessToken, containerId);
      const mediaId = await publishContainer(igUserId, accessToken, containerId);
      return mediaId;
    }

    // No images available — Instagram requires at least one image
    throw new Error('Instagram publishing requires at least one image. No slides or cover image available.');
  }

  /**
   * Check if an error is a 401/403 authentication error.
   */
  private isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('(401)') ||
        error.message.includes('(403)') ||
        error.message.includes('401') ||
        error.message.includes('403')
      );
    }
    return false;
  }
}
