import { Router } from 'express';
import fs from 'fs';
import db from './db.js';

const publicRouter = Router();

/**
 * Serves carousel slide images as publicly accessible URLs.
 * This handler does NOT require auth — Meta servers need to cURL these
 * images during Instagram/Facebook carousel creation.
 */
function serveSlideImage(req: any, res: any) {
  try {
    const { reportId, position } = req.params;
    const numReportId = Number(reportId);
    // Strip .png suffix if present (e.g. "0.png" → "0")
    const cleanPosition = String(position).replace(/\.png$/i, '');
    const numPosition = Number(cleanPosition);

    if (isNaN(numReportId) || numReportId < 1) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    if (isNaN(numPosition) || numPosition < 0) {
      res.status(400).json({ error: 'Invalid slide position' });
      return;
    }

    // Query the carousel_slides table for the composite image path
    const slide = db.prepare(
      'SELECT composite_image_path, status FROM carousel_slides WHERE report_id = ? AND position = ?'
    ).get(numReportId, numPosition) as
      | { composite_image_path: string | null; status: string }
      | undefined;

    if (!slide) {
      res.status(404).json({ error: 'Slide not found' });
      return;
    }

    if (slide.status !== 'generated' || !slide.composite_image_path) {
      res.status(404).json({ error: 'Slide image not available' });
      return;
    }

    if (!fs.existsSync(slide.composite_image_path)) {
      res.status(404).json({ error: 'Slide image file not found on disk' });
      return;
    }

    // Serve the PNG with appropriate headers for Meta API consumption
    const stat = fs.statSync(slide.composite_image_path);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache — slides don't change once generated
    res.setHeader('Content-Disposition', `inline; filename="slide-${numPosition}.png"`);

    const imageStream = fs.createReadStream(slide.composite_image_path);
    imageStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving public slide image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/public/analytics-config
 * Returns analytics IDs for client-side script injection.
 * No auth required — this is loaded on every page.
 */
publicRouter.get('/analytics-config', (_req, res) => {
  const ga4Id = db.prepare("SELECT value FROM settings WHERE key = 'ga4_measurement_id'").get() as { value: string | null } | undefined;
  const pixelId = db.prepare("SELECT value FROM settings WHERE key = 'meta_pixel_id'").get() as { value: string | null } | undefined;
  const gtmId = db.prepare("SELECT value FROM settings WHERE key = 'gtm_container_id'").get() as { value: string | null } | undefined;

  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
  res.json({
    ga4: ga4Id?.value || null,
    metaPixel: pixelId?.value || null,
    gtm: gtmId?.value || null,
  });
});

// Original route (backward compat)
publicRouter.get('/slides/:reportId/:position', serveSlideImage);

// Route with .png extension for Instagram/Meta Graph API compatibility
publicRouter.get('/slides/:reportId/:position.png', serveSlideImage);

export default publicRouter;
