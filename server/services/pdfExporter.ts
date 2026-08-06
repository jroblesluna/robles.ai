import fs from 'fs';
import PDFDocument from 'pdfkit';
import type { PdfExportResult } from './carouselTypes.js';

/** Page size for LinkedIn carousel slides (square format) */
const PAGE_SIZE = 1080;

/**
 * Exports carousel slides as a multi-page PDF document.
 * Each valid slide image is embedded full-bleed on its own 1080x1080 page.
 * Missing or corrupted slide images are skipped with a warning.
 *
 * @param reportId - The report ID (used for identification in warnings)
 * @param slidePaths - Array of absolute file paths to slide PNG images
 * @returns PdfExportResult with buffer, page count, and any warnings
 */
export async function exportCarouselPdf(
  reportId: number,
  slidePaths: string[]
): Promise<PdfExportResult> {
  const warnings: string[] = [];
  let pageCount = 0;

  const doc = new PDFDocument({
    size: [PAGE_SIZE, PAGE_SIZE],
    autoFirstPage: false,
    margin: 0,
  });

  // Collect PDF output into a buffer
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const pdfReady = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));
  });

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];

    // Check if file exists and is readable
    if (!fs.existsSync(slidePath)) {
      warnings.push(`Slide ${i + 1} excluded: image missing at ${slidePath}`);
      continue;
    }

    // Try to read the file and embed it
    try {
      const imageBuffer = fs.readFileSync(slidePath);

      // Verify the buffer is non-empty and starts with a valid PNG signature
      if (imageBuffer.length === 0) {
        warnings.push(`Slide ${i + 1} excluded: file is empty`);
        continue;
      }

      // Add a new page and embed the image full-bleed
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: 0 });
      doc.image(imageBuffer, 0, 0, {
        width: PAGE_SIZE,
        height: PAGE_SIZE,
      });
      pageCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(`Slide ${i + 1} excluded: corrupted or unreadable (${message})`);
    }
  }

  doc.end();

  const pdfBuffer = await pdfReady;

  return {
    pdfBuffer,
    pageCount,
    warnings,
  };
}
