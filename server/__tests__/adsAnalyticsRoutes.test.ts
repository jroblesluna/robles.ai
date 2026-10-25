// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
vi.mock('../db.js', () => ({ default: { prepare: () => ({ get: () => undefined }) } }));
vi.mock('../services/ga4Client.js', () => ({ isConfigured: () => ({ configured: true }) }));
vi.mock('../services/googleAdsReport.js', () => ({ getGoogleAdsReport: vi.fn(), getWebsiteChannelsReport: vi.fn(), getLeadSignalsReport: vi.fn() }));
vi.mock('../services/googleAdsApi.js', () => ({ isGoogleAdsConfigured: () => true, getGoogleAdsAccountId: () => '5850899991', getDirectGoogleAdsReport: vi.fn() }));
vi.mock('../services/analyticsCache.js', () => ({ get: () => null, set: vi.fn(), clear: vi.fn(), TTL: { TODAY: 300, HISTORICAL: 3600 } }));
vi.mock('../services/metaInsights.js', () => ({}));
vi.mock('../services/metaAds.js', () => ({}));
import router from '../analyticsRoutes.js';
import { generateToken } from '../auth.js';
import { getDirectGoogleAdsReport } from '../services/googleAdsApi.js';
const app = express(); app.use(cookieParser()); app.use('/analytics', router);
beforeEach(() => { vi.stubEnv('ADMIN_JWT_SECRET', 'test-ads-reporting-secret'); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());
const cookie = () => `admin_token=${generateToken(1, 'test@example.com')}`;

it.each(['/ads/google', '/channels', '/ads/leads'])('requires admin authentication for %s', async path => {
  expect((await request(app).get('/analytics' + path)).status).toBe(401);
});
it.each(['campaignId=1%20OR%201=1', 'startDate=2026-02-30', 'startDate=2026-10-25&endDate=2026-10-01'])('rejects invalid report filters: %s', async query => {
  const res = await request(app).get('/analytics/ads/google?' + query).set('Cookie', cookie());
  expect(res.status).toBe(400);
  expect(getDirectGoogleAdsReport).not.toHaveBeenCalled();
});
it('does not silently fall back to GA4 zeros if direct authorization fails', async () => {
  vi.mocked(getDirectGoogleAdsReport).mockRejectedValue(new Error('Reauthorize connection'));
  const res = await request(app).get('/analytics/ads/google?startDate=2026-10-01&endDate=2026-10-25').set('Cookie', cookie());
  expect(res.status).toBe(502);
  expect(res.body).toEqual({ error: 'Reauthorize connection' });
});
