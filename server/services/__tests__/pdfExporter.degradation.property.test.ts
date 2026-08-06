import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exportCarouselPdf } from '../pdfExporter.js';

/**
 * Property 8: PDF graceful degradation with missing slides
 * **Validates: Requirements 6.4**
 *
 * For any carousel where M slides have missing images (M < total),
 * the exported PDF SHALL contain exactly (total - M) pages and
 * the result SHALL include exactly M warning messages.
 *
 * Feature: dominical-carousel-images, Property 8: PDF graceful degradation with missing slides
 */

let tempDir: string;
let validPngBuffer: Buffer;

beforeAll(async () => {
  // Create a temporary directory for test slide images
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-degrade-prop-test-'));

  // Create a valid 1080x1080 PNG buffer to use for "present" slides
  validPngBuffer = await sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 3,
      background: { r: 80, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
});

afterAll(() => {
  // Clean up the temp directory
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * Custom arbitrary that generates a slide scenario:
 * - totalSlides (2-10)
 * - a boolean presence mask (true = present, false = missing)
 * - constrained so at least 1 present and at least 1 missing
 */
const slideScenarioArb = fc
  .integer({ min: 2, max: 10 })
  .chain((total) =>
    fc.tuple(
      fc.constant(total),
      fc
        .array(fc.boolean(), { minLength: total, maxLength: total })
        .filter((mask) => mask.includes(true) && mask.includes(false)),
    ),
  );

describe('PdfExporter Property Tests', () => {
  describe('Property 8: PDF graceful degradation with missing slides', () => {
    it('page count = total - missing and warnings count = missing count', async () => {
      let testCounter = 0;

      await fc.assert(
        fc.asyncProperty(
          slideScenarioArb,
          fc.integer({ min: 1, max: 99999 }),
          async ([totalSlides, mask], reportId) => {
            const batchDir = path.join(tempDir, `batch-${testCounter++}`);
            fs.mkdirSync(batchDir, { recursive: true });

            const slidePaths: string[] = [];
            let presentCount = 0;
            let missingCount = 0;

            for (let i = 0; i < totalSlides; i++) {
              if (mask[i]) {
                // Create a real PNG file for this "present" slide
                const filePath = path.join(batchDir, `slide-${i}.png`);
                fs.writeFileSync(filePath, validPngBuffer);
                slidePaths.push(filePath);
                presentCount++;
              } else {
                // Provide a non-existent path for this "missing" slide
                slidePaths.push(path.join(batchDir, `nonexistent-slide-${i}.png`));
                missingCount++;
              }
            }

            const result = await exportCarouselPdf(reportId, slidePaths);

            // pageCount should equal the number of present slides
            expect(result.pageCount).toBe(presentCount);

            // warnings count should equal the number of missing slides
            expect(result.warnings.length).toBe(missingCount);

            // Each warning should mention the excluded slide position
            for (let i = 0; i < totalSlides; i++) {
              if (!mask[i]) {
                const slideNum = i + 1;
                const hasWarning = result.warnings.some((w) =>
                  w.includes(`Slide ${slideNum}`)
                );
                expect(hasWarning).toBe(true);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
