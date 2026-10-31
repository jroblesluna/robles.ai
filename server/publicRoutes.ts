import { Router, type Request } from 'express';
import fs from 'fs';
import db from './db.js';
import { PUBLIC_CONTACT } from '../shared/publicContent.js';
import { validClarityProjectId } from '../shared/clarity.js';
import { getAiModel } from './services/aiModels.js';
import { apiKeysRequired, issueDemoToken, isApiId, unavailableDemos, verifyApiCredential } from './services/apiKeys.js';

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
  const clarityId = db.prepare("SELECT value FROM settings WHERE key = 'clarity_project_id'").get() as { value: string | null } | undefined;

  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
  res.json({
    ga4: ga4Id?.value || null,
    metaPixel: pixelId?.value || null,
    gtm: gtmId?.value || null,
    clarity: validClarityProjectId(clarityId?.value),
  });
});

/**
 * GET /api/public/site-config
 * Public, non-secret site settings for the SPA: the calendar booking link and the
 * demos that cannot run right now.
 * Only http(s) URLs are returned so a bad setting can never inject a javascript: link.
 */
publicRouter.get('/site-config', (_req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'booking_url'").get() as { value: string | null } | undefined;
  res.setHeader('Cache-Control', 'no-store');
  res.json({ bookingUrl: safeHttpUrl(row?.value) ?? PUBLIC_CONTACT.bookingUrl, unavailableDemos: unavailableDemos() });
});

/**
 * GET /api/public/ai-models
 * Model names for the demo APIs, which cache them and keep their own defaults when
 * this is unreachable. No secrets: the demos already show which model answered.
 */
publicRouter.get('/ai-models', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    text: getAiModel('ai_model_demo_text'),
    vision: getAiModel('ai_model_demo_vision'),
    tts: getAiModel('ai_model_demo_tts'),
    apiKeysRequired: apiKeysRequired(),
  });
});

/** POST /api/public/api-keys/verify: the backends ask whether a key or demo token is valid. */
publicRouter.post('/api-keys/verify', (req, res) => {
  const { api, key } = req.body ?? {};
  res.setHeader('Cache-Control', 'no-store');
  res.json({ valid: isApiId(api) && typeof key === 'string' && verifyApiCredential(api, key) });
});

const DEMO_TOKEN_WINDOW_MS = 60_000;
const DEMO_TOKEN_MAX_PER_WINDOW = 60;
const demoTokenRequests = new Map<string, { count: number; resetAt: number }>();

/** nginx appends the visitor's address last; `req.ip` alone is the local proxy. */
function clientAddress(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').pop()?.trim();
  return forwarded || req.ip || 'unknown';
}

function allowDemoToken(client: string): boolean {
  const now = Date.now();
  const entry = demoTokenRequests.get(client);
  if (!entry || entry.resetAt <= now) {
    if (demoTokenRequests.size > 10_000) demoTokenRequests.clear();
    demoTokenRequests.set(client, { count: 1, resetAt: now + DEMO_TOKEN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= DEMO_TOKEN_MAX_PER_WINDOW;
}

/**
 * POST /api/public/demo-token
 * Short-lived credential for the browser demos, so no real key reaches the page.
 * `token: null` means the demo key is not set yet.
 */
publicRouter.post('/demo-token', (req, res) => {
  const { api } = req.body ?? {};
  res.setHeader('Cache-Control', 'no-store');
  if (!isApiId(api)) {
    res.status(404).json({ error: 'Unknown API' });
    return;
  }
  if (!allowDemoToken(clientAddress(req))) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  res.json(issueDemoToken(api) ?? { token: null, expiresAt: 0 });
});

/** Returns the value only when it is an absolute http(s) URL. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// Original route (backward compat)
publicRouter.get('/slides/:reportId/:position', serveSlideImage);

// Route with .png extension for Instagram/Meta Graph API compatibility
publicRouter.get('/slides/:reportId/:position.png', serveSlideImage);

export default publicRouter;
