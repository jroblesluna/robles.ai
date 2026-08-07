// server/services/platforms/linkedinAdapter.ts

import db from '../../db.js';
import type { PlatformAdapter, PublishRequest, PublishResult } from './types.js';

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
 * Refreshes the LinkedIn access token using the stored refresh_token.
 * Updates the stored access_token and expiry in the settings table.
 * Returns the new access token.
 * Throws if refresh fails or credentials are missing.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getSetting('linkedin_refresh_token');
  const clientId = getSetting('linkedin_client_id');
  const clientSecret = getSetting('linkedin_client_secret');

  if (!refreshToken) {
    throw new Error('LinkedIn refresh token not found. Please reconnect LinkedIn in Settings.');
  }
  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn client credentials not configured. Please set them in Settings.');
  }

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('LinkedIn token refresh failed:', response.status, errorBody);
    throw new Error(
      `LinkedIn token refresh failed (${response.status}). The refresh token may be expired. Please reconnect LinkedIn in Settings.`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };

  // Store new tokens
  const now = new Date();
  const expiresAt = new Date(now.getTime() + data.expires_in * 1000).toISOString();

  setSetting('linkedin_access_token', data.access_token);
  setSetting('linkedin_token_expires_at', expiresAt);

  // If a new refresh token is provided, store it too
  if (data.refresh_token) {
    setSetting('linkedin_refresh_token', data.refresh_token);
  }

  return data.access_token;
}

/**
 * Returns a valid LinkedIn access token.
 * Checks the stored expiry and refreshes the token if expired.
 */
export async function getValidAccessToken(): Promise<string> {
  const accessToken = getSetting('linkedin_access_token');
  const expiresAt = getSetting('linkedin_token_expires_at');

  if (!accessToken) {
    throw new Error('LinkedIn access token not found. Please connect LinkedIn in Settings.');
  }

  // Check if token is expired (with a 5-minute buffer)
  if (expiresAt) {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

    if (now >= expiryTime - bufferMs) {
      console.log('LinkedIn access token expired or expiring soon, refreshing...');
      return refreshAccessToken();
    }
  }

  return accessToken;
}

/**
 * Uploads an image to LinkedIn for use in a UGC post.
 */
export async function uploadImageToLinkedIn(
  imageUrl: string,
  accessToken: string,
  personId: string
): Promise<string> {
  // Step 1: Register upload
  const registerResponse = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${personId}`,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }),
    }
  );

  if (!registerResponse.ok) {
    const errorBody = await registerResponse.text();
    console.error('LinkedIn image register failed:', registerResponse.status, errorBody);
    throw new Error(`Failed to register image upload with LinkedIn (${registerResponse.status})`);
  }

  const registerData = (await registerResponse.json()) as {
    value: {
      uploadMechanism: {
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
          uploadUrl: string;
        };
      };
      asset: string;
    };
  };

  const uploadUrl =
    registerData.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Step 2: Download the image from the provided URL
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image from ${imageUrl} (${imageResponse.status})`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // Step 3: Upload the image binary to LinkedIn
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    console.error('LinkedIn image upload failed:', uploadResponse.status, errorBody);
    throw new Error(`Failed to upload image to LinkedIn (${uploadResponse.status})`);
  }

  return assetUrn;
}

/**
 * Publishes a post to LinkedIn using the UGC Posts API.
 * Optionally includes an image (uploaded first if imageUrl is provided).
 * Returns the LinkedIn post ID from the response.
 */
export async function publishPost(
  text: string,
  imageUrl?: string
): Promise<string> {
  const accessToken = await getValidAccessToken();

  const personId = getSetting('linkedin_person_id');
  if (!personId) {
    throw new Error('LinkedIn person ID not found. Please reconnect LinkedIn in Settings.');
  }

  // If image is provided, upload it first
  let mediaAssetUrn: string | undefined;
  if (imageUrl) {
    mediaAssetUrn = await uploadImageToLinkedIn(imageUrl, accessToken, personId);
  }

  // Build UGC post payload
  const shareMediaCategory = mediaAssetUrn ? 'IMAGE' : 'NONE';
  const shareContent: Record<string, unknown> = {
    shareCommentary: {
      text,
    },
    shareMediaCategory,
  };

  if (mediaAssetUrn) {
    shareContent.media = [
      {
        status: 'READY',
        media: mediaAssetUrn,
      },
    ];
  }

  const postPayload = {
    author: `urn:li:person:${personId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('LinkedIn publish failed:', response.status, errorBody);
    throw new Error(`Failed to publish to LinkedIn (${response.status}): ${errorBody}`);
  }

  const postId =
    response.headers.get('x-restli-id') ||
    response.headers.get('X-RestLi-Id') ||
    ((await response.json()) as { id?: string }).id ||
    'unknown';

  return postId;
}

/**
 * Uploads a PDF document to LinkedIn and publishes a post with it as a carousel.
 */
export async function publishPostWithDocument(
  text: string,
  pdfBuffer: Buffer,
  title: string = 'El Dominical IA'
): Promise<string> {
  const accessToken = await getValidAccessToken();

  const personId = getSetting('linkedin_person_id');
  if (!personId) {
    throw new Error('LinkedIn person ID not found. Please reconnect LinkedIn in Settings.');
  }

  const authorUrn = `urn:li:person:${personId}`;

  // Step 1: Initialize document upload
  const initResponse = await fetch('https://api.linkedin.com/rest/documents?action=initializeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202607',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: authorUrn,
      },
    }),
  });

  if (!initResponse.ok) {
    const errorBody = await initResponse.text();
    console.error('LinkedIn document init failed:', initResponse.status, errorBody);
    throw new Error(`Failed to initialize document upload (${initResponse.status}): ${errorBody}`);
  }

  const initData = (await initResponse.json()) as {
    value: {
      uploadUrl: string;
      document: string;
    };
  };

  const uploadUrl = initData.value.uploadUrl;
  const documentUrn = initData.value.document;

  // Step 2: Upload the PDF binary
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
    },
    body: new Uint8Array(pdfBuffer),
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    console.error('LinkedIn document upload failed:', uploadResponse.status, errorBody);
    throw new Error(`Failed to upload document to LinkedIn (${uploadResponse.status}): ${errorBody}`);
  }

  // Step 3: Create post with document
  const postPayload = {
    author: authorUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        title: title,
        id: documentUrn,
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202607',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postPayload),
  });

  if (!postResponse.ok) {
    const errorBody = await postResponse.text();
    console.error('LinkedIn post with document failed:', postResponse.status, errorBody);
    throw new Error(`Failed to publish post with document (${postResponse.status}): ${errorBody}`);
  }

  const postUrn = postResponse.headers.get('x-restli-id') ||
    postResponse.headers.get('X-RestLi-Id') ||
    'unknown';

  return postUrn;
}

/**
 * LinkedIn adapter implementing the PlatformAdapter interface.
 * Wraps the existing LinkedIn publish logic with retry-on-401 behavior.
 */
export class LinkedInAdapter implements PlatformAdapter {
  readonly platform = 'linkedin' as const;

  /**
   * Check if LinkedIn credentials are configured.
   * Requires both access token and person ID.
   */
  hasCredentials(): boolean {
    const accessToken = getSetting('linkedin_access_token');
    const personId = getSetting('linkedin_person_id');
    return Boolean(accessToken && personId);
  }

  /**
   * Validate credentials by making a lightweight API call to LinkedIn.
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const accessToken = await getValidAccessToken();

      const response = await fetch('https://api.linkedin.com/v2/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'LinkedIn access token is invalid or expired. Please reconnect in Settings.' };
      }

      const errorBody = await response.text();
      return { valid: false, error: `LinkedIn API returned status ${response.status}: ${errorBody}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: message };
    }
  }

  /**
   * Publish content to LinkedIn.
   *
   * - If pdfBuffer is present AND slideImageUrls.length >= 2: carousel (PDF document post)
   * - Otherwise: single image post using coverImageUrl or first slideImageUrl
   *
   * Implements one-retry-on-401 behavior: if the first attempt fails with a 401,
   * refresh the token and retry once. On second failure, return a failure result.
   */
  async publish(request: PublishRequest): Promise<PublishResult> {
    try {
      const postId = await this.attemptPublish(request);
      return { success: true, platformPostId: postId };
    } catch (firstError) {
      // Check if it's a 401 error — attempt token refresh and retry
      if (this.isAuthError(firstError)) {
        try {
          console.log('LinkedIn publish got 401, attempting token refresh and retry...');
          await refreshAccessToken();
          const postId = await this.attemptPublish(request);
          return { success: true, platformPostId: postId };
        } catch (retryError) {
          const message = retryError instanceof Error ? retryError.message : String(retryError);
          return { success: false, error: `LinkedIn publish failed after token refresh retry: ${message}` };
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
    const { text, pdfBuffer, slideImageUrls, coverImageUrl } = request;

    // Carousel mode: PDF + at least 2 slides
    if (pdfBuffer && slideImageUrls.length >= 2) {
      return publishPostWithDocument(text, pdfBuffer);
    }

    // Single image mode: use coverImageUrl or first slide
    const imageUrl = coverImageUrl || slideImageUrls[0] || undefined;
    return publishPost(text, imageUrl);
  }

  /**
   * Check if an error is a 401 authentication error.
   */
  private isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('(401)') || error.message.includes('401');
    }
    return false;
  }
}
