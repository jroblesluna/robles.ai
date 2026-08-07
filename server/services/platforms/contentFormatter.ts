// server/services/platforms/contentFormatter.ts

import type { PlatformName } from './types.js';

export interface FormattedContent {
  text: string;           // Truncated/adapted text
  mediaType: 'carousel_pdf' | 'multi_image' | 'single_image' | 'text_only';
  mediaUrls: string[];    // Image URLs to attach
  pdfBuffer?: Buffer;     // PDF buffer for LinkedIn carousel
}

/** Platform character limits */
const PLATFORM_CHAR_LIMITS: Record<PlatformName, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
};

/**
 * Truncate text to fit within maxLength.
 * Strategy:
 * 1. If text fits, return as-is.
 * 2. Try to truncate at the last sentence boundary (. ! ? followed by whitespace or end) within maxLength.
 * 3. If no sentence boundary exists, truncate at the last word boundary and append ellipsis ("…").
 */
export function truncateText(text: string, maxLength: number): string {
  if (maxLength <= 0) return '';
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);

  // Look for the last sentence boundary within the truncated portion.
  // A sentence boundary is a period, exclamation mark, or question mark
  // followed by whitespace or appearing at the end of the string.
  const sentenceEndRegex = /[.!?](?:\s|$)/g;
  let lastSentenceEnd = -1;
  let match: RegExpExecArray | null;

  while ((match = sentenceEndRegex.exec(truncated)) !== null) {
    // The sentence ends at the position of the punctuation mark + 1 (include the punctuation)
    lastSentenceEnd = match.index + 1;
  }

  if (lastSentenceEnd > 0) {
    return text.slice(0, lastSentenceEnd);
  }

  // No sentence boundary found — truncate at last word boundary with ellipsis.
  // The ellipsis character "…" takes 1 character, so we need to fit within maxLength.
  const ellipsis = '…';
  const maxWithEllipsis = maxLength - ellipsis.length;

  if (maxWithEllipsis <= 0) {
    return ellipsis.slice(0, maxLength);
  }

  const portion = text.slice(0, maxWithEllipsis);
  const lastSpace = portion.lastIndexOf(' ');

  if (lastSpace > 0) {
    return portion.slice(0, lastSpace) + ellipsis;
  }

  // No word boundary — just hard truncate with ellipsis
  return portion + ellipsis;
}

/**
 * Extract hashtags (#word) and mentions (@word) from text.
 * Returns the body text without them, plus arrays of hashtags and mentions.
 */
export function extractHashtagsAndMentions(text: string): {
  body: string;
  hashtags: string[];
  mentions: string[];
} {
  const hashtagRegex = /#[\w]+/g;
  const mentionRegex = /@[\w]+/g;

  const hashtags = text.match(hashtagRegex) || [];
  const mentions = text.match(mentionRegex) || [];

  // Remove hashtags and mentions from the body
  let body = text
    .replace(hashtagRegex, '')
    .replace(mentionRegex, '');

  // Clean up extra whitespace left behind
  body = body.replace(/\s{2,}/g, ' ').trim();

  return { body, hashtags, mentions };
}

/**
 * Format content for a specific platform.
 * 
 * Steps:
 * 1. Extract hashtags/mentions from raw text
 * 2. Calculate available space for body (platform limit minus hashtags/mentions suffix)
 * 3. Truncate body text to fit
 * 4. Re-append hashtags and mentions after truncation
 * 5. Select media type based on platform and slide count
 */
export function formatForPlatform(
  platform: PlatformName,
  rawText: string,
  slideImageUrls: string[],
  pdfBuffer?: Buffer,
  coverImageUrl?: string
): FormattedContent {
  const charLimit = PLATFORM_CHAR_LIMITS[platform];

  // Step 1: Extract hashtags and mentions
  const { body, hashtags, mentions } = extractHashtagsAndMentions(rawText);

  // Step 2: Build suffix from hashtags and mentions
  const suffixParts: string[] = [];
  if (hashtags.length > 0) suffixParts.push(hashtags.join(' '));
  if (mentions.length > 0) suffixParts.push(mentions.join(' '));
  const suffix = suffixParts.length > 0 ? '\n\n' + suffixParts.join(' ') : '';

  // Step 3: Calculate available space for body
  const availableForBody = charLimit - suffix.length;

  // Step 4: Truncate body and re-append suffix
  const truncatedBody = availableForBody > 0 ? truncateText(body, availableForBody) : '';
  const finalText = truncatedBody + suffix;

  // Step 5: Select media type based on platform and slide count
  const slideCount = slideImageUrls.length;
  const { mediaType, mediaUrls } = selectMediaFormat(platform, slideCount, slideImageUrls, coverImageUrl);

  return {
    text: finalText,
    mediaType,
    mediaUrls,
    ...(pdfBuffer && mediaType === 'carousel_pdf' ? { pdfBuffer } : {}),
  };
}

/**
 * Select the appropriate media format based on platform and slide count.
 */
function selectMediaFormat(
  platform: PlatformName,
  slideCount: number,
  slideImageUrls: string[],
  coverImageUrl?: string
): { mediaType: FormattedContent['mediaType']; mediaUrls: string[] } {
  switch (platform) {
    case 'linkedin':
      // carousel_pdf when slides >= 2, else single_image
      if (slideCount >= 2) {
        return { mediaType: 'carousel_pdf', mediaUrls: slideImageUrls };
      }
      return {
        mediaType: 'single_image',
        mediaUrls: slideCount > 0 ? [slideImageUrls[0]] : (coverImageUrl ? [coverImageUrl] : []),
      };

    case 'instagram':
      // multi_image when slides >= 2, else single_image
      if (slideCount >= 2) {
        return { mediaType: 'multi_image', mediaUrls: slideImageUrls };
      }
      return {
        mediaType: 'single_image',
        mediaUrls: slideCount > 0 ? [slideImageUrls[0]] : (coverImageUrl ? [coverImageUrl] : []),
      };

    case 'facebook':
      // multi_image when slides >= 1, else text_only with cover image
      if (slideCount >= 1) {
        return { mediaType: 'multi_image', mediaUrls: slideImageUrls };
      }
      return {
        mediaType: 'text_only',
        mediaUrls: coverImageUrl ? [coverImageUrl] : [],
      };

    default:
      return { mediaType: 'text_only', mediaUrls: [] };
  }
}
