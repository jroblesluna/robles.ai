import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { ComposeSlideOptions, ComposeCoverOptions, ComposeCTAOptions } from './carouselTypes.js';

const SLIDE_SIZE = 1080;
const LOGO_SIZE = 50;
const LOGO_TOP = 15;
const LOGO_LEFT = 20;
const WHITE_BAND_HEIGHT = 80;

/**
 * Escapes special characters for safe embedding in SVG/XML content.
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wraps text to fit within a max width, returning an array of lines.
 * Splits on word boundaries and limits to maxLines.
 */
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (lines.length >= maxLines) break;

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length >= maxLines) break;
        currentLine = word;
      } else {
        // Single word exceeds line width — truncate with ellipsis
        lines.push(word.substring(0, maxCharsPerLine - 1) + '…');
        currentLine = '';
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // Add ellipsis to last line if we had remaining content
  if (lines.length === maxLines && currentLine && !lines.includes(currentLine)) {
    const lastLine = lines[maxLines - 1];
    if (lastLine.length > maxCharsPerLine - 1) {
      lines[maxLines - 1] = lastLine.substring(0, maxCharsPerLine - 1) + '…';
    } else {
      lines[maxLines - 1] = lastLine + '…';
    }
  }

  return lines;
}

/**
 * Generates the SVG overlay for an article slide with white band, gradient, title, and engagement phrase.
 */
function buildArticleSvgOverlay(titleText: string, engagementPhrase?: string): Buffer {
  const titleLines = wrapText(titleText, 40, 3);
  const titleFontSize = 36;
  const phraseFontSize = 30;
  const lineHeight = titleFontSize * 1.3;
  const phraseLineHeight = phraseFontSize * 1.3;

  // Gradient starts at 55% of slide height
  const gradientStart = Math.round(SLIDE_SIZE * 0.55);

  // Title text starts at 78% of slide height
  const titleStartY = Math.round(SLIDE_SIZE * 0.78);

  let titleSvgLines = '';
  titleLines.forEach((line, i) => {
    const y = titleStartY + i * lineHeight;
    titleSvgLines += `    <text x="60" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white">${escapeXml(line)}</text>\n`;
  });

  let phraseSvg = '';
  if (engagementPhrase) {
    const phraseY = titleStartY + titleLines.length * lineHeight + phraseLineHeight * 0.5;
    phraseSvg = `    <text x="60" y="${phraseY}" font-family="Arial, Helvetica, sans-serif" font-size="${phraseFontSize}" font-style="italic" fill="#93c5fd">${escapeXml(engagementPhrase)}</text>\n`;
  }

  const svg = `<svg width="${SLIDE_SIZE}" height="${SLIDE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="textGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${SLIDE_SIZE}" height="${WHITE_BAND_HEIGHT}" fill="white"/>
  <rect x="0" y="${gradientStart}" width="${SLIDE_SIZE}" height="${SLIDE_SIZE - gradientStart}" fill="url(#textGradient)"/>
${titleSvgLines}${phraseSvg}</svg>`;

  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the cover slide with white band (logo left, date right)
 * and "El Dominical IA" title centered in the middle.
 */
function buildCoverSvgOverlay(weekStart: string, weekEnd: string): Buffer {
  const titleFontSize = 56;
  const dateFontSize = 20;

  // Center text vertically (slightly lower)
  const centerY = SLIDE_SIZE / 2 + 40;

  const svg = `<svg width="${SLIDE_SIZE}" height="${SLIDE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="30%" stop-color="rgba(0,0,0,0.5)" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="rgba(0,0,0,0.5)" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${SLIDE_SIZE}" height="${WHITE_BAND_HEIGHT}" fill="white"/>
  <text x="${SLIDE_SIZE - 30}" y="${WHITE_BAND_HEIGHT / 2 + 7}" font-family="Arial, Helvetica, sans-serif" font-size="${dateFontSize}" fill="#374151" text-anchor="end">${escapeXml(weekStart)} — ${escapeXml(weekEnd)}</text>
  <rect x="0" y="${centerY - 120}" width="${SLIDE_SIZE}" height="240" fill="url(#coverGradient)"/>
  <text x="${SLIDE_SIZE / 2}" y="${centerY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white" text-anchor="middle">El Dominical IA</text>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the CTA slide with white band and call-to-action message.
 */
function buildCtaSvgOverlay(ctaMessage: string): Buffer {
  const ctaFontSize = 38;
  // Position CTA text in middle-lower area
  const centerY = SLIDE_SIZE * 0.6;

  // Wrap CTA message for longer texts
  const ctaLines = wrapText(ctaMessage, 32, 3);
  const lineHeight = ctaFontSize * 1.4;
  const totalTextHeight = ctaLines.length * lineHeight;
  const startY = centerY - totalTextHeight / 2;

  let ctaTextSvg = '';
  ctaLines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctaTextSvg += `  <text x="${SLIDE_SIZE / 2}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${ctaFontSize}" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(line)}</text>\n`;
  });

  // Gradient backdrop for CTA text area
  const gradientTop = Math.round(centerY - 140);
  const gradientHeight = 280;

  const svg = `<svg width="${SLIDE_SIZE}" height="${SLIDE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ctaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="30%" stop-color="rgba(0,0,0,0.6)" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="rgba(0,0,0,0.6)" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${SLIDE_SIZE}" height="${WHITE_BAND_HEIGHT}" fill="white"/>
  <rect x="0" y="${gradientTop}" width="${SLIDE_SIZE}" height="${gradientHeight}" fill="url(#ctaGradient)"/>
${ctaTextSvg}</svg>`;

  return Buffer.from(svg);
}

/**
 * Composes an article slide by overlaying the white band, logo, and SVG text on the background image.
 */
export async function composeArticleSlide(options: ComposeSlideOptions): Promise<void> {
  const { backgroundImagePath, logoPath, titleText, engagementPhrase, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Resize logo to target size
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Build SVG text overlay (includes white band)
  const svgOverlay = buildArticleSvgOverlay(titleText, engagementPhrase);

  // Composite all layers onto the background
  await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, SLIDE_SIZE, { fit: 'cover' })
    .composite([
      {
        input: svgOverlay,
        top: 0,
        left: 0,
      },
      {
        input: logoBuffer,
        top: LOGO_TOP,
        left: LOGO_LEFT,
      },
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Composes the cover slide with white band (logo left, date right) and "El Dominical IA" title centered.
 */
export async function composeCoverSlide(options: ComposeCoverOptions): Promise<void> {
  const { backgroundImagePath, logoPath, weekStart, weekEnd, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Resize logo to target size
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Build cover SVG overlay (includes white band with date)
  const svgOverlay = buildCoverSvgOverlay(weekStart, weekEnd);

  // Composite all layers onto the background
  await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, SLIDE_SIZE, { fit: 'cover' })
    .composite([
      {
        input: svgOverlay,
        top: 0,
        left: 0,
      },
      {
        input: logoBuffer,
        top: LOGO_TOP,
        left: LOGO_LEFT,
      },
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Composes the CTA slide with white band, logo, and call-to-action message.
 */
export async function composeCTASlide(options: ComposeCTAOptions): Promise<void> {
  const { backgroundImagePath, logoPath, ctaMessage, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Resize logo to target size
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Build CTA SVG overlay (includes white band)
  const svgOverlay = buildCtaSvgOverlay(ctaMessage);

  // Composite all layers onto the background
  await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, SLIDE_SIZE, { fit: 'cover' })
    .composite([
      {
        input: svgOverlay,
        top: 0,
        left: 0,
      },
      {
        input: logoBuffer,
        top: LOGO_TOP,
        left: LOGO_LEFT,
      },
    ])
    .png()
    .toFile(outputPath);
}
