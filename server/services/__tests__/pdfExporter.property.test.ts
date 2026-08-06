import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exportCarouselPdf } from '../pdfExporter.js';

/**
 * Property 7: PDF page count matches valid slides
 * **Validates: Requirements 6.1**
 *
 * For any carousel with N total slides where all slides are valid,
 * the exported PDF SHALL contain exactly N pages.
 *
 * Feature: dominical-carousel-images, Property 7: PDF page count matches valid slides
 */

let tempDir: string;
let validPngPath: string;

beforeAll(async () => {
  // Create a temporary directory for test slide images
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-pagecount-prop-test-'));

  // Create a valid 1080x1080 PNG to reuse across iterations
  validPngPath = path.join(tempDir, 'valid-slide.png');
  await sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 3,
      background: { r: 50, g: 100, b: 200 },
    },
  })
    .png()
    .toFile(validPngPath);
});

afterAll(() => {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/** Arbitrary for slide counts between 1 and 15 */
const slideCountArb = fc.integer({ min: 1, max: 15 });

describe('PdfExporter Property Tests', () => {
  describe('Property 7: PDF page count matches valid slides', () => {
    it('for any number of valid slides, PDF page count equals the input slide count', async () => {
      await fc.assert(
        fc.asyncProperty(slideCountArb, async (slideCount) => {
          // Create the requested number of valid PNG slide files
          const slidePaths: string[] = [];
          for (let i = 0; i < slideCount; i++) {
            const slidePath = path.join(tempDir, `iter-slide-${i}.png`);
            // Copy the pre-made valid PNG
            fs.copyFileSync(validPngPath, slidePath);
            slidePaths.push(slidePath);
          }

          // Export to PDF
          const result = await exportCarouselPdf(1, slidePaths);

          // Verify page count equals number of input slides
          expect(result.pageCount).toBe(slideCount);

          // Verify PDF buffer is non-empty
          expect(result.pdfBuffer.length).toBeGreaterThan(0);

          // Verify no warnings since all slides are valid
          expect(result.warnings).toHaveLength(0);

          // Clean up the iteration-specific files
          for (const p of slidePaths) {
            if (fs.existsSync(p)) {
              fs.unlinkSync(p);
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
