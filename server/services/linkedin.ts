import db from '../db.js';

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
 * Follows the LinkedIn image upload flow:
 * 1. Register the upload to get an upload URL and asset URN
 * 2. Download the image from the provided URL
 * 3. Upload the image binary to LinkedIn
 * 4. Return the asset URN for use in the post
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
  // Get a valid access token (refreshes if needed)
  const accessToken = await getValidAccessToken();

  // Get person ID
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

  // Add media if image was uploaded
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

  // Publish to LinkedIn
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

  // LinkedIn returns the post ID in the x-restli-id header or in the response body
  const postId =
    response.headers.get('x-restli-id') ||
    response.headers.get('X-RestLi-Id') ||
    ((await response.json()) as { id?: string }).id ||
    'unknown';

  return postId;
}

/**
 * Uploads a PDF document to LinkedIn and publishes a post with it as a carousel.
 * Uses the LinkedIn Documents API (versioned REST API) for personal profiles.
 * The PDF pages will appear as swipeable carousel slides.
 *
 * Flow:
 * 1. Initialize document upload
 * 2. Upload the PDF binary
 * 3. Create a post with the document attached
 *
 * @param text - The post text content
 * @param pdfBuffer - The PDF file buffer
 * @param title - Document title shown on the carousel
 * @returns LinkedIn post URN
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
      'LinkedIn-Version': '202401',
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
      document: string; // document URN
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
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postPayload),
  });

  if (!postResponse.ok) {
    const errorBody = await postResponse.text();
    console.error('LinkedIn post with document failed:', postResponse.status, errorBody);
    throw new Error(`Failed to publish post with document (${postResponse.status}): ${errorBody}`);
  }

  // Get the post URN from the response header
  const postUrn = postResponse.headers.get('x-restli-id') ||
    postResponse.headers.get('X-RestLi-Id') ||
    'unknown';

  return postUrn;
}
