import OpenAI from 'openai';
import db from '../db.js';

/**
 * Multi-provider image generation service.
 * Supports: DALL-E 3, Stability AI, Replicate FLUX.
 * Provider is selected via the `image_provider` setting in the DB.
 */

/**
 * Generates an image prompt from news themes for a LinkedIn cover image.
 */
export function generateImagePrompt(newsThemes: string): string {
  return `Professional LinkedIn cover image representing: ${newsThemes}. Modern, clean, corporate style. Blue and purple tones. No text.`;
}

/**
 * Generates an image using OpenAI gpt-image-1.
 * Returns the generated image URL or saves to disk and returns path.
 */
export async function generateImageWithDallE(
  prompt: string,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1536x1024',
  });

  const b64Data = response.data?.[0]?.b64_json;
  const urlData = response.data?.[0]?.url;

  if (urlData) {
    return urlData;
  } else if (b64Data) {
    // Return as data URI
    return `data:image/png;base64,${b64Data}`;
  } else {
    throw new Error('Image generation returned no image data');
  }
}

/**
 * Generates an image using Stability AI (Stable Diffusion XL).
 * Returns the generated image as a base64 data URL.
 */
export async function generateImageWithStability(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          { text: prompt, weight: 1 },
        ],
        cfg_scale: 7,
        width: 1024,
        height: 1024,
        steps: 30,
        samples: 1,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Stability AI error (${response.status}): ${errorBody}`);
  }

  const data = await response.json() as {
    artifacts: Array<{ base64: string; finishReason: string }>;
  };

  const artifact = data.artifacts?.[0];
  if (!artifact || !artifact.base64) {
    throw new Error('Stability AI returned no image data');
  }

  // Return as a data URL that can be used directly or saved
  return `data:image/png;base64,${artifact.base64}`;
}

/**
 * Generates an image using Replicate (FLUX 1.1 Pro).
 * Polls the prediction until complete or failed. Returns the output image URL.
 */
export async function generateImageWithReplicate(
  prompt: string,
  apiToken: string
): Promise<string> {
  // Create prediction
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      version: 'black-forest-labs/flux-1.1-pro',
      input: {
        prompt,
        width: 1024,
        height: 1024,
      },
    }),
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw new Error(`Replicate create prediction error (${createResponse.status}): ${errorBody}`);
  }

  const prediction = await createResponse.json() as {
    id: string;
    status: string;
    urls: { get: string };
    output: string | string[] | null;
    error: string | null;
  };

  // Poll for completion (max 120 seconds, 2s interval)
  const maxAttempts = 60;
  let attempts = 0;
  let current = prediction;

  while (current.status !== 'succeeded' && current.status !== 'failed') {
    if (attempts >= maxAttempts) {
      throw new Error('Replicate prediction timed out after 120 seconds');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;

    const pollResponse = await fetch(current.urls.get, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!pollResponse.ok) {
      throw new Error(`Replicate poll error (${pollResponse.status})`);
    }

    current = await pollResponse.json() as typeof prediction;
  }

  if (current.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${current.error || 'Unknown error'}`);
  }

  // Output can be a string URL or an array of URLs
  const output = current.output;
  if (!output) {
    throw new Error('Replicate returned no output');
  }

  const imageUrl = Array.isArray(output) ? output[0] : output;
  if (!imageUrl) {
    throw new Error('Replicate returned empty output array');
  }

  return imageUrl;
}

/**
 * Helper to read a setting value from the DB.
 */
function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

/**
 * Main entry point: generates an image from news themes.
 * Reads provider selection and API keys from the settings table,
 * switches on the configured provider, and returns the image URL.
 */
export async function generateImage(newsThemes: string): Promise<string> {
  const provider = getSetting('image_provider') || 'dalle3';
  const prompt = generateImagePrompt(newsThemes);

  switch (provider) {
    case 'dalle3': {
      const apiKey = getSetting('openai_api_key') || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Set it in Admin Settings or as OPENAI_API_KEY env var.');
      }
      return generateImageWithDallE(prompt, apiKey);
    }

    case 'stability': {
      const apiKey = getSetting('stability_api_key');
      if (!apiKey) {
        throw new Error('Stability AI API key not configured. Please set it in Admin Settings.');
      }
      return generateImageWithStability(prompt, apiKey);
    }

    case 'replicate': {
      const apiToken = getSetting('replicate_api_token');
      if (!apiToken) {
        throw new Error('Replicate API token not configured. Please set it in Admin Settings.');
      }
      return generateImageWithReplicate(prompt, apiToken);
    }

    default:
      throw new Error(`Unknown image provider: ${provider}. Valid options: dalle3, stability, replicate`);
  }
}
