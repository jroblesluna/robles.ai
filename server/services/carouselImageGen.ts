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
export function buildArticleImagePrompt(articleTitle: string, categories: string[], palette?: PaletteConfig, imageStyle?: ImageStyleConfig, contentSummary?: string): string {
  const categoryContext = categories.length > 0
    ? `Related domains: ${categories.join(', ')}.`
    : '';

  // Extract key visual elements from content summary
  const contentContext = contentSummary
    ? `Key details from the article (use these for visual inspiration): ${contentSummary.slice(0, 300)}. `
    : '';

  const colorDesc = palette
    ? `${palette.backgroundDesc} background with ${palette.primaryAccent} and ${palette.secondaryAccent} accent elements`
    : 'dark navy/charcoal background (#1a1a2e) with vibrant accent colors (cyan, purple, teal, orange)';

  return (
    `Conceptual illustration for a LinkedIn carousel slide about: "${articleTitle}". ` +
    `${categoryContext} ` +
    `${contentContext}` +
    `Style: ${imageStyle?.stylePrompt || 'clean flat-design vector illustration, modern and professional'}. ` +
    `Include recognizable visual metaphors that represent the SPECIFIC topic. If companies are mentioned, suggest their presence through visual cues (e.g., a car resembling famous mentioned EV brand style, industrial equipment in mentioned company's brand color or logo shape, server racks for mentioned or known cloud-based companies, a phone for well-known or mentioned brands). Include visual hints of monetary figures if relevant (stacks of coins, growth charts with numbers). The references don't need to be exact — just enough for the viewer to associate the image with the real-world actors and scale of the story. ` +
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
  imageStyle?: ImageStyleConfig,
  contentSummary?: string
): Promise<void> {
  const prompt = buildArticleImagePrompt(articleTitle, categories, palette, imageStyle, contentSummary);
  const imageBuffer = await callGptImage(prompt, apiKey);
  await resizeAndSave(imageBuffer, outputPath);
}

/**
 * Generates a branded cover background for the first slide.
 * Uses a contextual illustration style based on the week's news topics.
 */
export async function generateCoverBackground(
  apiKey: string,
  outputPath: string,
  palette?: PaletteConfig,
  imageStyle?: ImageStyleConfig,
  topics?: string[]
): Promise<void> {
  const colorDesc = palette
    ? `${palette.backgroundDesc} background with ${palette.primaryAccent} and ${palette.secondaryAccent} accent elements`
    : 'dark navy background (#1a1a2e) with electric cyan, purple, and white accent elements';

  // Creative cover concepts that rotate for variety
  const coverConcepts = [
    'A humanoid robot sitting in a cozy armchair reading a newspaper titled "El Dominical". The room has warm lighting and a cup of coffee nearby.',
    'Friends (a mix of humans and friendly robots) gathered around a large screen/TV discussing the latest tech news. The screen shows abstract data visualizations.',
    'A person browsing a futuristic holographic magazine floating in mid-air, with news headlines appearing as 3D floating elements around them.',
    'A robot journalist at a desk broadcasting AI news on a retro-futuristic TV set. The atmosphere is like a late-night show.',
    'A bird\'s-eye view of a futuristic newsroom where humans and AI assistants collaborate, with multiple screens showing different tech topics.',
    'Someone opening a glowing envelope/newsletter on their phone while commuting on a futuristic train, with AI-related icons floating out of the screen.',
    'A friendly robot delivering a rolled-up newspaper to a doorstep in a futuristic neighborhood, with smart cars and drones in the background.',
    'A group of diverse people at a café, all looking at their devices with amazement as holographic news stories float above the table.',
    'A vintage-style newsstand but in a futuristic city, selling digital newspapers with holographic covers about AI topics.',
    'An AI assistant presenting a weekly briefing on a large interactive whiteboard, with charts and icons representing the week\'s main stories.',
  ];

  // Pick a concept based on the current week number for variety
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const conceptIndex = weekNumber % coverConcepts.length;
  const baseConcept = coverConcepts[conceptIndex];

  // Incorporate the week's topics into the chosen concept
  const topicHint = topics && topics.length > 0
    ? `The news/content being discussed or shown should visually hint at: ${topics.slice(0, 2).join(' and ')}. Include subtle visual references to these themes in the background or on screens/papers shown in the scene.`
    : '';

  const prompt = (
    `Cover illustration for "El Dominical IA", a weekly AI newsletter. ` +
    `Scene concept: ${baseConcept} ` +
    `${topicHint} ` +
    `Style: ${imageStyle?.stylePrompt || 'cinematic photography with dramatic lighting'}. ` +
    `Color palette: ${colorDesc}. ` +
    `The overall mood should be warm, inviting, and intellectually curious — like discovering exciting news. ` +
    `IMPORTANT: Do NOT show generic AI brains or neural networks. The scene should feel like a moment of human (or human+AI) connection with news/information. ` +
    `No text, no letters, no words, no watermarks. ` +
    `${imageStyle?.constraints || 'Photorealistic humans and stylized robots are acceptable.'} ` +
    `Square format 1:1 ratio. ` +
    `Lower-left area should be slightly darker for overlaying a title text.`
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
