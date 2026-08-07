import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { PaletteConfig, ImageStyleConfig } from './carouselTypes.js';

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
 * Builds an image prompt from article title and categories for a conceptual background.
 * Generates vector/flat-design style illustrations that represent the article's topic.
 */
export function buildArticleImagePrompt(articleTitle: string, categories: string[], palette?: PaletteConfig, imageStyle?: ImageStyleConfig): string {
  const categoryContext = categories.length > 0
    ? `Related domains: ${categories.join(', ')}.`
    : '';

  const colorDesc = palette
    ? `${palette.backgroundDesc} background with ${palette.primaryAccent} and ${palette.secondaryAccent} accent elements`
    : 'dark navy/charcoal background (#1a1a2e) with vibrant accent colors (cyan, purple, teal, orange)';

  return (
    `Conceptual illustration for a LinkedIn carousel slide about: "${articleTitle}". ` +
    `${categoryContext} ` +
    `Style: ${imageStyle?.stylePrompt || 'clean flat-design vector illustration, modern and professional'}. ` +
    `Include recognizable visual metaphors and icons that represent the topic conceptually (e.g., if about autonomous vehicles show a stylized car with sensor lines, if about quantum computing show qubits and circuits, if about healthcare show medical symbols with data flows). ` +
    `Color palette: ${colorDesc}. ` +
    `No text, no letters, no words, no watermarks. ` +
    `${imageStyle?.constraints || 'No realistic human faces or photographs. Stylized silhouettes or icons are acceptable.'} ` +
    `Square format 1:1 ratio. ` +
    `Bottom third should be darker/emptier to allow text overlay with good readability. ` +
    `Top two-thirds should contain the main conceptual illustration.`
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
  outputPath: string,
  palette?: PaletteConfig,
  imageStyle?: ImageStyleConfig
): Promise<void> {
  const prompt = buildArticleImagePrompt(articleTitle, categories, palette, imageStyle);
  const imageBuffer = await callGptImage(prompt, apiKey);
  await resizeAndSave(imageBuffer, outputPath);
}

/**
 * Generates a branded cover background for the first slide.
 * Uses a conceptual tech/AI illustration style.
 */
export async function generateCoverBackground(
  apiKey: string,
  outputPath: string,
  palette?: PaletteConfig,
  imageStyle?: ImageStyleConfig
): Promise<void> {
  const colorDesc = palette
    ? `${palette.backgroundDesc} background with ${palette.primaryAccent} and ${palette.secondaryAccent} accent elements`
    : 'dark navy background (#1a1a2e) with electric cyan, purple, and white accent elements';

  const prompt = (
    `Conceptual cover illustration for a weekly AI technology newsletter. ` +
    `Style: ${imageStyle?.stylePrompt || 'clean flat-design vector illustration with isometric perspective elements'}. ` +
    `Show a composition of technology icons: neural network nodes, data streams, a glowing brain, circuit board patterns, and connected devices — all arranged as a cohesive scene. ` +
    `Color palette: ${colorDesc}. ` +
    `No text, no letters, no words, no watermarks. ` +
    `${imageStyle?.constraints || 'No realistic human faces.'} ` +
    `Square format 1:1 ratio. ` +
    `Center area should be slightly darker/emptier for overlaying a logo and title text.`
  );

  const imageBuffer = await callGptImage(prompt, apiKey);
  await resizeAndSave(imageBuffer, outputPath);
}

/**
 * Generates a conceptual background for the CTA (call-to-action) slide.
 */
export async function generateCTABackground(
  apiKey: string,
  outputPath: string,
  palette?: PaletteConfig,
  imageStyle?: ImageStyleConfig
): Promise<void> {
  const colorDesc = palette
    ? `${palette.backgroundDesc} background with ${palette.primaryAccent} and ${palette.secondaryAccent} accent elements`
    : 'dark navy background (#1a1a2e) with warm purple, gold/amber, and cyan accent elements';

  const prompt = (
    `Conceptual illustration for a LinkedIn carousel call-to-action slide about following and engaging with an AI community. ` +
    `Style: ${imageStyle?.stylePrompt || 'clean flat-design vector illustration'}. ` +
    `Show visual metaphors for connection and community: stylized notification bell, follow/subscribe icons, connected profile silhouettes, upward arrows suggesting growth, a "thumbs up" or heart icon. ` +
    `Color palette: ${colorDesc}. ` +
    `No text, no letters, no words, no watermarks. ` +
    `${imageStyle?.constraints || 'No realistic human faces. Stylized silhouettes are acceptable.'} ` +
    `Square format 1:1 ratio. ` +
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
