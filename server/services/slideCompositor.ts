import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { ComposeSlideOptions, ComposeCoverOptions, ComposeCTAOptions } from './carouselTypes.js';

const SLIDE_SIZE = 1080;
const LOGO_SIZE = 120;
const LOGO_PADDING = 40;

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
 * Generates the SVG overlay for an article slide with gradient, title, and engagement phrase.
 */
function buildArticleSvgOverlay(titleText: string, engagementPhrase?: string): Buffer {
  const titleLines = wrapText(titleText, 35, 2);
  const titleFontSize = 42;
  const phraseFontSize = 30;
  const lineHeight = titleFontSize * 1.3;
  const phraseLineHeight = phraseFontSize * 1.3;

  // Position text at bottom third
  const textAreaTop = SLIDE_SIZE * 0.60;
  const gradientStart = textAreaTop - 60; // gradient starts slightly above text area

  // Calculate title y position
  const titleStartY = textAreaTop + 80;

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
  <rect x="0" y="${gradientStart}" width="${SLIDE_SIZE}" height="${SLIDE_SIZE - gradientStart}" fill="url(#textGradient)"/>
${titleSvgLines}${phraseSvg}</svg>`;

  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the cover slide with "El Dominical IA" and date range.
 */
function buildCoverSvgOverlay(weekStart: string, weekEnd: string): Buffer {
  const titleFontSize = 56;
  const dateFontSize = 32;

  // Center text vertically
  const centerY = SLIDE_SIZE / 2;

  const svg = `<svg width="${SLIDE_SIZE}" height="${SLIDE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="30%" stop-color="rgba(0,0,0,0.5)" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="rgba(0,0,0,0.5)" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${centerY - 120}" width="${SLIDE_SIZE}" height="240" fill="url(#coverGradient)"/>
  <text x="${SLIDE_SIZE / 2}" y="${centerY - 10}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white" text-anchor="middle">El Dominical IA</text>
  <text x="${SLIDE_SIZE / 2}" y="${centerY + 50}" font-family="Arial, Helvetica, sans-serif" font-size="${dateFontSize}" fill="#93c5fd" text-anchor="middle">${escapeXml(weekStart)} — ${escapeXml(weekEnd)}</text>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the CTA slide with the call-to-action message.
 */
function buildCtaSvgOverlay(ctaMessage: string): Buffer {
  const ctaFontSize = 38;
  const centerY = SLIDE_SIZE / 2;

  // Wrap CTA message for longer texts
  const ctaLines = wrapText(ctaMessage, 32, 3);
  const lineHeight = ctaFontSize * 1.4;
  const totalTextHeight = ctaLines.length * lineHeight;
  const startY = centerY + 40 - totalTextHeight / 2;

  let ctaTextSvg = '';
  ctaLines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctaTextSvg += `  <text x="${SLIDE_SIZE / 2}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${ctaFontSize}" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(line)}</text>\n`;
  });

  const svg = `<svg width="${SLIDE_SIZE}" height="${SLIDE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ctaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="30%" stop-color="rgba(0,0,0,0.6)" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="rgba(0,0,0,0.6)" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${centerY - 140}" width="${SLIDE_SIZE}" height="280" fill="url(#ctaGradient)"/>
${ctaTextSvg}</svg>`;

  return Buffer.from(svg);
}

/**
 * Composes an article slide by overlaying the logo and SVG text on the background image.
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

  // Build SVG text overlay
  const svgOverlay = buildArticleSvgOverlay(titleText, engagementPhrase);

  // Composite all layers onto the background
  await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, SLIDE_SIZE, { fit: 'cover' })
    .composite([
      {
        input: logoBuffer,
        top: LOGO_PADDING,
        left: LOGO_PADDING,
      },
      {
        input: svgOverlay,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Composes the cover slide with logo, "El Dominical IA" title, and date range.
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

  // Build cover SVG overlay
  const svgOverlay = buildCoverSvgOverlay(weekStart, weekEnd);

  // Composite all layers onto the background
  await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, SLIDE_SIZE, { fit: 'cover' })
    .composite([
      {
        input: logoBuffer,
        top: LOGO_PADDING,
        left: LOGO_PADDING,
      },
      {
        input: svgOverlay,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Composes the CTA slide with logo and call-to-action message.
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

  // Build CTA SVG overlay
  const svgOverlay = buildCtaSvgOverlay(ctaMessage);

  // Composite all layers onto the background
  await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, SLIDE_SIZE, { fit: 'cover' })
    .composite([
      {
        input: logoBuffer,
        top: LOGO_PADDING,
        left: LOGO_PADDING,
      },
      {
        input: svgOverlay,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(outputPath);
}
