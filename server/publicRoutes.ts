import { Router } from 'express';
import fs from 'fs';
import db from './db.js';

const publicRouter = Router();

/**
 * GET /api/public/slides/:reportId/:position
 * Serves carousel slide images as publicly accessible URLs.
 * This endpoint does NOT require auth — Meta servers need to cURL these
 * images during Instagram/Facebook carousel creation.
 */
publicRouter.get('/slides/:reportId/:position', (req, res) => {
  try {
    const { reportId, position } = req.params;
    const numReportId = Number(reportId);
    const numPosition = Number(position);

    if (isNaN(numReportId) || numReportId < 1) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    if (isNaN(numPosition) || numPosition < 1) {
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
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache — slides don't change once generated
    res.setHeader('Content-Disposition', `inline; filename="slide-${numPosition}.png"`);

    const imageStream = fs.createReadStream(slide.composite_image_path);
    imageStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving public slide image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default publicRouter;
