import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { ComposeSlideOptions, ComposeCoverOptions, ComposeCTAOptions } from './carouselTypes.js';

const SLIDE_SIZE = 1080;
const LOGO_WIDTH = 180;
const LOGO_HEIGHT = 50;
const LOGO_TOP = 10;
const LOGO_LEFT = 15;
const WHITE_BAND_HEIGHT = 70;
const ART_HEIGHT = SLIDE_SIZE - WHITE_BAND_HEIGHT; // 1010px

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
 * Capitalizes the first letter of each word only if it starts with a lowercase letter.
 * E.g., "quantum computing" → "Quantum Computing"
 * E.g., "AI in Healthcare" → "AI In Healthcare"
 */
function smartTitleCase(text: string): string {
  return text.split(' ').map(word => {
    if (!word) return word;
    if (word[0] >= 'a' && word[0] <= 'z') {
      return word[0].toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

/**
 * Builds a small SVG for the band area text (category label or date).
 * This SVG is sized to the full slide width but only WHITE_BAND_HEIGHT tall.
 */
function buildBandTextSvg(rightText?: string): Buffer {
  const displayText = rightText ? smartTitleCase(rightText) : undefined;
  const svg = `<svg width="${SLIDE_SIZE}" height="${WHITE_BAND_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${displayText ? `<text x="${SLIDE_SIZE - 25}" y="${WHITE_BAND_HEIGHT / 2 + 6}" font-family="Arial, sans-serif" font-size="18" fill="#6B7280" text-anchor="end">${escapeXml(displayText)}</text>` : ''}
</svg>`;
  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the art area of an article slide.
 * Contains the gradient and title/engagement text. Sized to ART_HEIGHT (1010px).
 */
function buildArticleArtSvg(titleText: string, engagementPhrase?: string, phraseColor?: string): Buffer {
  const titleLines = wrapText(titleText, 40, 3);
  const titleFontSize = 36;
  const phraseFontSize = 30;
  const lineHeight = titleFontSize * 1.3;
  const phraseLineHeight = phraseFontSize * 1.3;

  // Gradient starts at 60% of art height
  const gradientStart = Math.round(ART_HEIGHT * 0.60);

  // Title text starts at ~83% of ART_HEIGHT
  const titleStartY = Math.round(ART_HEIGHT * 0.83);

  let titleSvgLines = '';
  titleLines.forEach((line, i) => {
    const y = titleStartY + i * lineHeight;
    titleSvgLines += `    <text x="60" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white" filter="url(#textShadow)" letter-spacing="1">${escapeXml(line)}</text>\n`;
  });

  let phraseSvg = '';
  if (engagementPhrase) {
    const phraseY = titleStartY + titleLines.length * lineHeight + phraseLineHeight * 0.5;
    const pColor = phraseColor || '#93c5fd';
    phraseSvg = `    <text x="60" y="${phraseY}" font-family="Arial, Helvetica, sans-serif" font-size="${phraseFontSize}" font-style="italic" fill="${pColor}" filter="url(#textShadow)">${escapeXml(engagementPhrase)}</text>\n`;
  }

  const svg = `<svg width="${SLIDE_SIZE}" height="${ART_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="textGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
    </linearGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.85)" flood-opacity="0.85"/>
    </filter>
  </defs>
  <rect x="0" y="${gradientStart}" width="${SLIDE_SIZE}" height="${ART_HEIGHT - gradientStart}" fill="url(#textGradient)"/>
${titleSvgLines}${phraseSvg}</svg>`;

  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the art area of the cover slide.
 * Contains the gradient backdrop and "El Dominical IA" centered title.
 * Sized to ART_HEIGHT (1010px).
 */
function buildCoverArtSvg(): Buffer {
  const titleFontSize = 56;

  // Position title in the lower area (same zone as article titles)
  const titleY = Math.round(ART_HEIGHT * 0.85);

  // Gradient starts at 60% to match article slides
  const gradientStart = Math.round(ART_HEIGHT * 0.60);

  const svg = `<svg width="${SLIDE_SIZE}" height="${ART_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
    </linearGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.85)" flood-opacity="0.85"/>
    </filter>
  </defs>
  <rect x="0" y="${gradientStart}" width="${SLIDE_SIZE}" height="${ART_HEIGHT - gradientStart}" fill="url(#coverGradient)"/>
  <text x="${SLIDE_SIZE / 2}" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white" text-anchor="middle" filter="url(#textShadow)" letter-spacing="1.5">El Dominical IA</text>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Generates the SVG overlay for the art area of the CTA slide.
 * Contains gradient backdrop and call-to-action text. Sized to ART_HEIGHT (1010px).
 */
function buildCtaArtSvg(ctaMessage: string): Buffer {
  const ctaFontSize = 38;

  // Wrap CTA message for longer texts
  const ctaLines = wrapText(ctaMessage, 32, 3);
  const lineHeight = ctaFontSize * 1.4;

  // Position CTA text in the lower area (same zone as article/cover titles)
  // Last line should end around 90% of art height
  const lastLineY = Math.round(ART_HEIGHT * 0.88);
  const startY = lastLineY - (ctaLines.length - 1) * lineHeight;

  let ctaTextSvg = '';
  ctaLines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctaTextSvg += `  <text x="${SLIDE_SIZE / 2}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${ctaFontSize}" font-weight="bold" fill="white" text-anchor="middle" filter="url(#textShadow)" letter-spacing="1">${escapeXml(line)}</text>\n`;
  });

  // Gradient starts at 60% to match other slides
  const gradientStart = Math.round(ART_HEIGHT * 0.60);

  const svg = `<svg width="${SLIDE_SIZE}" height="${ART_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ctaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.7)" stop-opacity="0.7"/>
    </linearGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.85)" flood-opacity="0.85"/>
    </filter>
  </defs>
  <rect x="0" y="${gradientStart}" width="${SLIDE_SIZE}" height="${ART_HEIGHT - gradientStart}" fill="url(#ctaGradient)"/>
${ctaTextSvg}</svg>`;

  return Buffer.from(svg);
}

/**
 * Composes an article slide:
 * 1. Pearl/white band at top (70px) with logo and category text
 * 2. Background art below the band (1080x1010), cropped to fit
 * 3. Gradient + title overlay on the art area
 */
export async function composeArticleSlide(options: ComposeSlideOptions): Promise<void> {
  const { backgroundImagePath, logoPath, titleText, engagementPhrase, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Resize logo to fit within band
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_WIDTH, LOGO_HEIGHT, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Resize and crop background to fit the art area (1080x1010)
  const artBuffer = await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, ART_HEIGHT, { fit: 'cover' })
    .png()
    .toBuffer();

  // Build SVG overlay for art area (gradient + title text)
  const svgOverlay = buildArticleArtSvg(titleText, engagementPhrase, options.phraseColor);

  // Build band text SVG (category label)
  const bandTextSvg = buildBandTextSvg(options.categoryLabel);

  // Create the full canvas:
  // - Background is the pearl/white color (fills band area)
  // - Art placed below the band
  // - SVG overlay on the art area
  // - Logo in the band
  // - Band text (category) in the band
  await sharp({
    create: {
      width: SLIDE_SIZE,
      height: SLIDE_SIZE,
      channels: 4,
      background: { r: 245, g: 245, b: 240, alpha: 255 },
    },
  })
    .composite([
      { input: artBuffer, top: WHITE_BAND_HEIGHT, left: 0 },
      { input: svgOverlay, top: WHITE_BAND_HEIGHT, left: 0 },
      { input: logoBuffer, top: LOGO_TOP, left: LOGO_LEFT },
      { input: bandTextSvg, top: 0, left: 0 },
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Composes the cover slide:
 * 1. Pearl/white band at top (70px) with logo and date range
 * 2. Background art below the band (1080x1010)
 * 3. "El Dominical IA" title centered on art area
 */
export async function composeCoverSlide(options: ComposeCoverOptions): Promise<void> {
  const { backgroundImagePath, logoPath, weekStart, weekEnd, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Resize logo to fit within band
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_WIDTH, LOGO_HEIGHT, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Resize and crop background to fit the art area (1080x1010)
  const artBuffer = await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, ART_HEIGHT, { fit: 'cover' })
    .png()
    .toBuffer();

  // Build cover art SVG overlay (gradient + title)
  const svgOverlay = buildCoverArtSvg();

  // Build band text SVG (date range)
  const dateLabel = `Semana del ${weekStart} al ${weekEnd}`;
  const bandTextSvg = buildBandTextSvg(dateLabel);

  // Create the full canvas
  await sharp({
    create: {
      width: SLIDE_SIZE,
      height: SLIDE_SIZE,
      channels: 4,
      background: { r: 245, g: 245, b: 240, alpha: 255 },
    },
  })
    .composite([
      { input: artBuffer, top: WHITE_BAND_HEIGHT, left: 0 },
      { input: svgOverlay, top: WHITE_BAND_HEIGHT, left: 0 },
      { input: logoBuffer, top: LOGO_TOP, left: LOGO_LEFT },
      { input: bandTextSvg, top: 0, left: 0 },
    ])
    .png()
    .toFile(outputPath);
}

/**
 * Composes the CTA slide:
 * 1. Pearl/white band at top (70px) with logo
 * 2. Background art below the band (1080x1010)
 * 3. CTA message centered on art area
 */
export async function composeCTASlide(options: ComposeCTAOptions): Promise<void> {
  const { backgroundImagePath, logoPath, ctaMessage, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Resize logo to fit within band
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_WIDTH, LOGO_HEIGHT, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Resize and crop background to fit the art area (1080x1010)
  const artBuffer = await sharp(backgroundImagePath)
    .resize(SLIDE_SIZE, ART_HEIGHT, { fit: 'cover' })
    .png()
    .toBuffer();

  // Build CTA art SVG overlay (gradient + CTA text)
  const svgOverlay = buildCtaArtSvg(ctaMessage);

  // Build band text SVG (no text for CTA, just empty band)
  const bandTextSvg = buildBandTextSvg();

  // Create the full canvas
  await sharp({
    create: {
      width: SLIDE_SIZE,
      height: SLIDE_SIZE,
      channels: 4,
      background: { r: 245, g: 245, b: 240, alpha: 255 },
    },
  })
    .composite([
      { input: artBuffer, top: WHITE_BAND_HEIGHT, left: 0 },
      { input: svgOverlay, top: WHITE_BAND_HEIGHT, left: 0 },
      { input: logoBuffer, top: LOGO_TOP, left: LOGO_LEFT },
      { input: bandTextSvg, top: 0, left: 0 },
    ])
    .png()
    .toFile(outputPath);
}
