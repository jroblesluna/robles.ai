// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
vi.mock('../db.js', () => ({ default: { prepare: () => ({ get: () => undefined }) } }));
vi.mock('../services/ga4Client.js', () => ({ isConfigured: () => ({ configured: true }) }));
vi.mock('../services/googleAdsReport.js', () => ({ getGoogleAdsReport: vi.fn(), getWebsiteChannelsReport: vi.fn(), getLeadSignalsReport: vi.fn() }));
vi.mock('../services/googleAdsApi.js', () => ({ isGoogleAdsConfigured: () => true, getGoogleAdsAccountId: () => '5850899991', getDirectGoogleAdsReport: vi.fn() }));
vi.mock('../services/googleAdsInsights.js', () => ({ getGoogleAdsInsights: vi.fn() }));
vi.mock('../services/analyticsCache.js', () => ({ get: () => null, set: vi.fn(), clear: vi.fn(), TTL: { TODAY: 300, HISTORICAL: 3600 } }));
vi.mock('../services/metaInsights.js', () => ({}));
vi.mock('../services/metaAds.js', () => ({}));
import router from '../analyticsRoutes.js';
import { getGoogleAdsInsights } from '../services/googleAdsInsights.js';
import { generateToken } from '../auth.js';
import { getDirectGoogleAdsReport } from '../services/googleAdsApi.js';
const app = express(); app.use(cookieParser()); app.use('/analytics', router);
beforeEach(() => { vi.stubEnv('ADMIN_JWT_SECRET', 'test-ads-reporting-secret'); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());
const cookie = () => `admin_token=${generateToken(1, 'test@example.com')}`;

it.each(['/ads/google', '/ads/google/insights', '/channels', '/ads/leads'])('requires admin authentication for %s', async path => {
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

it('applies the selected campaign and dates to authenticated detail requests', async () => {
  vi.mocked(getGoogleAdsInsights).mockResolvedValue({ accountId: '5850899991', availability: { terms: true }, warnings: [], terms: [] } as any);
  const res = await request(app).get('/analytics/ads/google/insights?startDate=2026-10-01&endDate=2026-10-25&campaignId=2').set('Cookie', cookie());
  expect(res.status).toBe(200);
  expect(getGoogleAdsInsights).toHaveBeenCalledWith({ startDate: '2026-10-01', endDate: '2026-10-25' }, '2');
});
it('validates detail filters before sending a Google Ads request', async () => {
  const res = await request(app).get('/analytics/ads/google/insights?campaignId=invalid').set('Cookie', cookie());
  expect(res.status).toBe(400);
  expect(getGoogleAdsInsights).not.toHaveBeenCalled();
});
it('returns an explicit error if detail reporting fails', async () => {
  vi.mocked(getGoogleAdsInsights).mockRejectedValue(new Error('denied'));
  const res = await request(app).get('/analytics/ads/google/insights').set('Cookie', cookie());
  expect(res.status).toBe(502);
  expect(res.body.error).toMatch(/unavailable/);
});
