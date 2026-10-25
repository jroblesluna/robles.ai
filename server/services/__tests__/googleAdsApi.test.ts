import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const values: Record<string, string> = { google_ads_customer_id: '5850899991', google_ads_client_id: 'client', google_ads_client_secret: 'secret', google_ads_refresh_token: 'refresh' };
vi.mock('../../db.js', () => ({ default: { prepare: () => ({ get: (key: string) => ({ value: values[key] }) }) } }));
vi.mock('../ga4Client.js', () => ({ queryReport: vi.fn(), getEventDimension: vi.fn() }));
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const range = { startDate: '2026-10-01', endDate: '2026-10-25' };
beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

it('preserves paused zero-activity campaigns and reads micros and fractional conversions correctly', async () => {
  vi.mocked(fetch).mockImplementation(async (url, init) => {
    if (String(url).includes('oauth2')) return response({ access_token: 'access', expires_in: 3600 });
    const query = JSON.parse(String(init?.body)).query;
    if (query.includes('customer.currency_code')) return response({ results: [{ customer: { currencyCode: 'USD' } }] });
    if (query.includes('campaign_budget')) return response({ results: [
      { campaign: { id: '1', name: 'US', status: 'PAUSED' }, campaignBudget: { amountMicros: '15000000' } },
      { campaign: { id: '2', name: 'Lima', status: 'PAUSED' }, campaignBudget: { amountMicros: '20000000' } },
    ] });
    if (query.includes('SELECT segments.date')) return response({ results: [
      { segments: { date: '2026-10-25' }, metrics: { costMicros: '720000', clicks: '1' } },
      { segments: { date: '2026-10-25' }, metrics: { costMicros: '1000000', clicks: '2' } },
    ] });
    return response({ results: [{ campaign: { id: '2' }, metrics: { costMicros: '720000', clicks: '1', impressions: '9', conversions: 0.5 } }] });
  });
  const { getDirectGoogleAdsReport } = await import('../googleAdsApi.js');
  const report = await getDirectGoogleAdsReport(range);
  expect(report.campaigns).toHaveLength(2);
  expect(report.campaigns[0]).toMatchObject({ status: 'PAUSED', cost: 0, dailyBudget: 15 });
  expect(report.campaigns[1]).toMatchObject({ cost: 0.72, results: 0.5, dailyBudget: 20 });
  expect(report.daily).toEqual([{ date: '2026-10-25', cost: 1.72, clicks: 3 }]);
  expect(JSON.stringify(report)).not.toContain('secret');
  expect(JSON.stringify(report)).not.toContain('refresh');
  for (const [url] of vi.mocked(fetch).mock.calls) expect(String(url)).not.toContain('access');
});

it('rejects query injection in campaign IDs before any request', async () => {
  const { getDirectGoogleAdsReport } = await import('../googleAdsApi.js');
  await expect(getDirectGoogleAdsReport(range, "1 OR campaign.status = 'ENABLED'")).rejects.toThrow('Invalid campaign');
  expect(fetch).not.toHaveBeenCalled();
});

it('paginates read-only searches without losing or repeating rows', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response({ results: [{ id: 1 }], nextPageToken: 'next' })).mockResolvedValueOnce(response({ results: [{ id: 2 }] }));
  const { searchGoogleAds } = await import('../googleAdsApi.js');
  expect(await searchGoogleAds('5850899991', 'access', 'SELECT campaign.id FROM campaign')).toEqual([{ id: 1 }, { id: 2 }]);
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body)).pageToken).toBe('next');
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('googleAds:search');
});

it('does not convert rejected authorization into an empty successful report', async () => {
  vi.mocked(fetch).mockResolvedValue(response({ error: 'invalid_grant' }, 400));
  const { getDirectGoogleAdsReport } = await import('../googleAdsApi.js');
  await expect(getDirectGoogleAdsReport(range)).rejects.toThrow('authorization expired');
});
