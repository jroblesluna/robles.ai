import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Property 5: All slides produce 1080x1080 PNG output
 * **Validates: Requirements 2.2, 3.5, 5.3, 7.2**
 *
 * For any successfully composed slide (cover, article, or CTA),
 * the output file SHALL be a valid PNG image with dimensions exactly 1080x1080 pixels.
 *
 * Feature: dominical-carousel-images, Property 5: All slides produce 1080x1080 PNG output
 */

let tempDir: string;

// Mock OpenAI at module level with a proper class constructor
vi.mock('openai', () => {
  class MockOpenAI {
    images = {
      generate: async () => ({
        data: [{ b64_json: (globalThis as any).__mockImageBase64 ?? '' }],
      }),
    };
  }
  return { default: MockOpenAI };
});

beforeAll(async () => {
  // Create a valid 1024x1024 PNG image buffer for the mock
  const imageBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 100, g: 50, b: 150 },
    },
  })
    .png()
    .toBuffer();

  // Store on globalThis so the mock class can access it
  (globalThis as any).__mockImageBase64 = imageBuffer.toString('base64');

  // Create a temporary directory for test outputs
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-img-prop-test-'));
});

afterAll(() => {
  // Clean up the temp directory
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  delete (globalThis as any).__mockImageBase64;
});

/** Arbitrary for slide types */
const slideTypeArb = fc.constantFrom('article', 'cover', 'cta') as fc.Arbitrary<
  'article' | 'cover' | 'cta'
>;

/** Arbitrary for article titles */
const articleTitleArb = fc.string({ minLength: 1, maxLength: 150 }).filter((s) => s.trim().length > 0);

/** Arbitrary for category arrays */
const categoriesArb = fc.array(
  fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  { minLength: 0, maxLength: 5 },
);

describe('CarouselImageGen Property Tests', () => {
  describe('Property 5: All slides produce 1080x1080 PNG output', () => {
    it('for any slide type, the output file is a valid 1080x1080 PNG', async () => {
      const { generateCarouselBackgroundImage, generateCoverBackground, generateCTABackground } =
        await import('../carouselImageGen.js');

      let counter = 0;

      await fc.assert(
        fc.asyncProperty(slideTypeArb, articleTitleArb, categoriesArb, async (slideType, title, categories) => {
          const outputPath = path.join(tempDir, `slide-${counter++}.png`);

          // Call the appropriate generation function based on slide type
          switch (slideType) {
            case 'article':
              await generateCarouselBackgroundImage(title, categories, 'fake-api-key', outputPath);
              break;
            case 'cover':
              await generateCoverBackground('fake-api-key', outputPath);
              break;
            case 'cta':
              await generateCTABackground('fake-api-key', outputPath);
              break;
          }

          // Verify the file exists
          expect(fs.existsSync(outputPath)).toBe(true);

          // Read metadata with sharp and verify dimensions
          const metadata = await sharp(outputPath).metadata();
          expect(metadata.format).toBe('png');
          expect(metadata.width).toBe(1080);
          expect(metadata.height).toBe(1080);
        }),
        { numRuns: 100 },
      );
    });
  });
});
