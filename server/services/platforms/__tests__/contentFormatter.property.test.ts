// Feature: multi-platform-publishing, Property 6: Format Selection by Slide Count
// **Validates: Requirements 2.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatForPlatform } from '../contentFormatter.js';
import type { PlatformName } from '../types.js';

describe('Property 6: Format Selection by Slide Count', () => {
  /**
   * Helper: generate an array of placeholder slide URLs with a given length.
   */
  const slideUrlsArb = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `https://example.com/slides/slide-${i + 1}.png`);

  const sampleText = 'Hello world. This is a test post.';
  const samplePdfBuffer = Buffer.from('fake-pdf');
  const sampleCoverImage = 'https://example.com/cover.png';

  it('LinkedIn: carousel_pdf when slides >= 2, single_image otherwise', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (slideCount) => {
          const urls = slideUrlsArb(slideCount);
          const result = formatForPlatform(
            'linkedin',
            sampleText,
            urls,
            samplePdfBuffer,
            sampleCoverImage
          );

          if (slideCount >= 2) {
            expect(result.mediaType).toBe('carousel_pdf');
          } else {
            expect(result.mediaType).toBe('single_image');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Instagram: multi_image when slides >= 2, single_image otherwise', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (slideCount) => {
          const urls = slideUrlsArb(slideCount);
          const result = formatForPlatform(
            'instagram',
            sampleText,
            urls,
            undefined,
            sampleCoverImage
          );

          if (slideCount >= 2) {
            expect(result.mediaType).toBe('multi_image');
          } else {
            expect(result.mediaType).toBe('single_image');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Facebook: multi_image when slides >= 1, text_only otherwise', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (slideCount) => {
          const urls = slideUrlsArb(slideCount);
          const result = formatForPlatform(
            'facebook',
            sampleText,
            urls,
            undefined,
            sampleCoverImage
          );

          if (slideCount >= 1) {
            expect(result.mediaType).toBe('multi_image');
          } else {
            expect(result.mediaType).toBe('text_only');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mediaUrls contains all slide URLs when multi_image or carousel_pdf is selected', () => {
    const platforms: PlatformName[] = ['linkedin', 'instagram', 'facebook'];

    fc.assert(
      fc.property(
        fc.constantFrom(...platforms),
        fc.integer({ min: 2, max: 20 }),
        (platform, slideCount) => {
          const urls = slideUrlsArb(slideCount);
          const result = formatForPlatform(
            platform,
            sampleText,
            urls,
            samplePdfBuffer,
            sampleCoverImage
          );

          // When slides >= 2, all platforms use multi-slide format
          if (result.mediaType === 'carousel_pdf' || result.mediaType === 'multi_image') {
            expect(result.mediaUrls).toEqual(urls);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: multi-platform-publishing, Property 5: Hashtag and Mention Preservation During Truncation
// **Validates: Requirements 2.5**

describe('Property 5: Hashtag and Mention Preservation During Truncation', () => {
  const platforms: PlatformName[] = ['linkedin', 'instagram', 'facebook'];

  /**
   * Generator for alphanumeric word strings (used as hashtag/mention bodies).
   * Uses fc.string with unit restricted to alphanumeric characters.
   */
  const alphanumChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const wordArb = fc.string({ minLength: 1, maxLength: 15, unit: fc.constantFrom(...alphanumChars.split('')) });

  /**
   * Generator for hashtags: #word
   */
  const hashtagArb = wordArb.map(w => `#${w}`);

  /**
   * Generator for mentions: @word
   */
  const mentionArb = wordArb.map(w => `@${w}`);

  /**
   * Generator for body text: printable ASCII strings (alphanumeric + spaces + punctuation).
   */
  const bodyChars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!? ';
  const bodyTextArb = fc.string({ minLength: 1, maxLength: 500, unit: fc.constantFrom(...bodyChars.split('')) });

  it('all hashtags and mentions from original text appear in formatted output for any platform', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...platforms),
        bodyTextArb,
        fc.array(hashtagArb, { minLength: 1, maxLength: 5 }),
        fc.array(mentionArb, { minLength: 1, maxLength: 5 }),
        (platform, body, hashtags, mentions) => {
          // Combine body, hashtags, and mentions into full raw text
          const rawText = `${body} ${hashtags.join(' ')} ${mentions.join(' ')}`;

          // Format for platform with a single slide image URL
          const result = formatForPlatform(
            platform,
            rawText,
            ['https://example.com/slide1.png']
          );

          // Verify every hashtag from the original appears in the output text
          for (const tag of hashtags) {
            expect(result.text).toContain(tag);
          }

          // Verify every mention from the original appears in the output text
          for (const mention of mentions) {
            expect(result.text).toContain(mention);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hashtags and mentions survive even when body text is very long and requires truncation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...platforms),
        fc.string({ minLength: 2000, maxLength: 3000, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz 0123456789'.split('')) }),
        fc.array(hashtagArb, { minLength: 1, maxLength: 3 }),
        fc.array(mentionArb, { minLength: 1, maxLength: 3 }),
        (platform, longBody, hashtags, mentions) => {
          // Build raw text that will exceed at least Instagram's 2200 char limit
          const rawText = `${longBody} ${hashtags.join(' ')} ${mentions.join(' ')}`;

          const result = formatForPlatform(
            platform,
            rawText,
            ['https://example.com/slide1.png']
          );

          // All hashtags must be preserved in the output
          for (const tag of hashtags) {
            expect(result.text).toContain(tag);
          }

          // All mentions must be preserved in the output
          for (const mention of mentions) {
            expect(result.text).toContain(mention);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hashtags and mentions interspersed within body text are all preserved in output', () => {
    const shortBodyArb = fc.string({ minLength: 1, maxLength: 50, unit: fc.constantFrom(...bodyChars.split('')) });

    fc.assert(
      fc.property(
        fc.constantFrom(...platforms),
        fc.array(
          fc.oneof(
            shortBodyArb,
            hashtagArb,
            mentionArb
          ),
          { minLength: 3, maxLength: 10 }
        ),
        (platform, parts) => {
          const rawText = parts.join(' ');

          // Extract the hashtags and mentions we expect to find
          const expectedHashtags = parts.filter(p => p.startsWith('#'));
          const expectedMentions = parts.filter(p => p.startsWith('@'));

          // Skip if no hashtags or mentions were generated
          if (expectedHashtags.length === 0 && expectedMentions.length === 0) return;

          const result = formatForPlatform(
            platform,
            rawText,
            ['https://example.com/slide1.png']
          );

          for (const tag of expectedHashtags) {
            expect(result.text).toContain(tag);
          }

          for (const mention of expectedMentions) {
            expect(result.text).toContain(mention);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
