import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Carousel-specific image generation service.
 * Generates AI backgrounds for article slides, cover, and CTA using gpt-image-1.
 */

const CAROUSEL_SIZE = 1080;
const API_SIZE = '1024x1024' as const;

/**
 * Ensures the backgrounds directory exists for a given report.
 */
export function ensureBackgroundsDir(reportId: number): string {
  const dir = path.resolve(process.cwd(), 'server/data/carousel', String(reportId), 'backgrounds');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Builds an image prompt from article title and categories for an abstract background.
 */
export function buildArticleImagePrompt(articleTitle: string, categories: string[]): string {
  const categoryContext = categories.length > 0
    ? `Themes: ${categories.join(', ')}.`
    : '';

  return (
    `Abstract, visually striking background image for a LinkedIn carousel slide about: "${articleTitle}". ` +
    `${categoryContext} ` +
    `Style: modern, professional, abstract shapes and gradients. ` +
    `Color palette: deep blues, purples, and teals with subtle glowing accents. ` +
    `No text, no letters, no words. No people or faces. ` +
    `Square format, suitable as a background for overlaying text later. ` +
    `High contrast areas at the bottom third for text readability.`
  );
}

/**
 * Generates an AI background image for an article slide.
 * Calls gpt-image-1 and saves the result as a 1080x1080 PNG.
 */
export async function generateCarouselBackgroundImage(
  articleTitle: string,
  categories: string[],
  apiKey: string,
  outputPath: string
): Promise<void> {
  const prompt = buildArticleImagePrompt(articleTitle, categories);
  const imageBuffer = await callGptImage(prompt, apiKey);
  await resizeAndSave(imageBuffer, outputPath);
}

/**
 * Generates an abstract branded cover background for the first slide.
 */
export async function generateCoverBackground(
  apiKey: string,
  outputPath: string
): Promise<void> {
  const prompt = (
    `Abstract, elegant background for a LinkedIn carousel cover slide. ` +
    `Theme: AI innovation, weekly technology digest. ` +
    `Style: modern, professional, flowing abstract shapes with digital/neural network motifs. ` +
    `Color palette: deep navy blue, electric purple, and cyan accents with soft gradients. ` +
    `No text, no letters, no words. No people or faces. ` +
    `Square format, suitable as a background for overlaying a logo and title text. ` +
    `Slightly darker overall for text contrast.`
  );

  const imageBuffer = await callGptImage(prompt, apiKey);
  await resizeAndSave(imageBuffer, outputPath);
}

/**
 * Generates an abstract background for the CTA (call-to-action) slide.
 */
export async function generateCTABackground(
  apiKey: string,
  outputPath: string
): Promise<void> {
  const prompt = (
    `Abstract, inviting background for a LinkedIn carousel call-to-action slide. ` +
    `Theme: connection, community, following, engagement. ` +
    `Style: modern, professional, abstract shapes suggesting forward movement and connection. ` +
    `Color palette: warm purples transitioning to vibrant blues with golden accent highlights. ` +
    `No text, no letters, no words. No people or faces. ` +
    `Square format, suitable as a background for overlaying a logo and CTA message. ` +
    `Center area slightly darker for text readability.`
  );

  const imageBuffer = await callGptImage(prompt, apiKey);
  await resizeAndSave(imageBuffer, outputPath);
}

/**
 * Calls gpt-image-1 and returns the raw image buffer.
 */
async function callGptImage(prompt: string, apiKey: string): Promise<Buffer> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: API_SIZE,
  });

  const b64Data = response.data?.[0]?.b64_json;
  const urlData = response.data?.[0]?.url;

  if (b64Data) {
    return Buffer.from(b64Data, 'base64');
  } else if (urlData) {
    // Fetch the image from URL
    const fetchResponse = await fetch(urlData);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to download generated image: ${fetchResponse.status}`);
    }
    const arrayBuffer = await fetchResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    throw new Error('gpt-image-1 returned no image data');
  }
}

/**
 * Resizes an image buffer to exactly 1080x1080 and saves as PNG.
 */
async function resizeAndSave(imageBuffer: Buffer, outputPath: string): Promise<void> {
  // Ensure parent directory exists
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  await sharp(imageBuffer)
    .resize(CAROUSEL_SIZE, CAROUSEL_SIZE, { fit: 'cover' })
    .png()
    .toFile(outputPath);
}
