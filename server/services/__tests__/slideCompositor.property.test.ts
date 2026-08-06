import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { composeArticleSlide } from '../slideCompositor.js';

/**
 * Property 10: Background preservation on text-only changes
 * **Validates: Requirements 10.3**
 *
 * For any article slide, when only the title or engagement phrase text is changed
 * (without regeneration), the background image file SHALL remain byte-for-byte
 * identical before and after re-composition.
 *
 * Feature: dominical-carousel-images, Property 10: Background preservation on text-only changes
 */

let tempDir: string;
let backgroundImagePath: string;
let logoPath: string;

beforeAll(async () => {
  // Create a temporary directory for test outputs
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slide-compositor-bg-prop-test-'));

  // Create a real 1080x1080 PNG background image
  backgroundImagePath = path.join(tempDir, 'background.png');
  await sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 3,
      background: { r: 42, g: 87, b: 200 },
    },
  })
    .png()
    .toFile(backgroundImagePath);

  // Create a simple logo PNG for testing (120x120 red square)
  logoPath = path.join(tempDir, 'logo.png');
  await sharp({
    create: {
      width: 120,
      height: 120,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 255 },
    },
  })
    .png()
    .toFile(logoPath);
});

afterAll(() => {
  // Clean up the temp directory
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/** Arbitrary for non-empty title text (alphanumeric + spaces to avoid XML issues in generation) */
const titleTextArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary for engagement phrases */
const engagementPhraseArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

describe('SlideCompositor Property Tests', () => {
  describe('Property 10: Background preservation on text-only changes', () => {
    it('background image file remains byte-for-byte identical after composing with different text', async () => {
      let counter = 0;

      await fc.assert(
        fc.asyncProperty(
          titleTextArb,
          titleTextArb,
          engagementPhraseArb,
          engagementPhraseArb,
          async (titleText1, titleText2, engagementPhrase1, engagementPhrase2) => {
            const idx = counter++;
            const outputPath1 = path.join(tempDir, `output-${idx}-a.png`);
            const outputPath2 = path.join(tempDir, `output-${idx}-b.png`);

            // Record background file bytes before first composition
            const bgBytesBefore = fs.readFileSync(backgroundImagePath);

            // First composition with text pair 1
            await composeArticleSlide({
              backgroundImagePath,
              logoPath,
              titleText: titleText1,
              engagementPhrase: engagementPhrase1,
              slideType: 'article',
              outputPath: outputPath1,
            });

            // Verify background is unchanged after first composition
            const bgBytesAfterFirst = fs.readFileSync(backgroundImagePath);
            expect(bgBytesAfterFirst.equals(bgBytesBefore)).toBe(true);

            // Second composition with text pair 2 (same background)
            await composeArticleSlide({
              backgroundImagePath,
              logoPath,
              titleText: titleText2,
              engagementPhrase: engagementPhrase2,
              slideType: 'article',
              outputPath: outputPath2,
            });

            // Verify background is STILL byte-for-byte identical after second composition
            const bgBytesAfterSecond = fs.readFileSync(backgroundImagePath);
            expect(bgBytesAfterSecond.equals(bgBytesBefore)).toBe(true);

            // Clean up output files to avoid filling temp dir
            if (fs.existsSync(outputPath1)) fs.unlinkSync(outputPath1);
            if (fs.existsSync(outputPath2)) fs.unlinkSync(outputPath2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
