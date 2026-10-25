import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const reader = vi.hoisted(() => ({ get: vi.fn(), search: vi.fn() }));
vi.mock('../googleAdsApi.js', () => ({ getGoogleAdsReader: reader.get }));
import { clickDateRange, getGoogleAdsClicks, safeAdUrl } from '../googleAdsClicks.js';
const range = { startDate: '2026-10-01', endDate: '2026-10-25' };
const ref = 'customers/5850899991/adGroupAds/1~9';
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  reader.get.mockResolvedValue({ search: reader.search, accountId: '5850899991' });
  reader.search.mockImplementation(async (query: string) => {
    if (query.includes('FROM customer')) return [{ customer: { timeZone: 'America/Los_Angeles' } }];
    if (query.includes('FROM campaign')) return [{ segments: { date: '2026-10-24' }, metrics: { clicks: '1' } }, { segments: { date: '2026-10-24' }, metrics: { clicks: '2' } }, { segments: { date: '2026-10-23' }, metrics: { clicks: '1' } }];
    if (query.includes('FROM click_view')) return [{ clickView: { gclid: 'test-gclid', adGroupAd: ref, keywordInfo: { text: 'chatbot', matchType: 'PHRASE' }, locationOfPresence: { country: 'geoTargetConstants/2170', city: 'geoTargetConstants/9197754' } }, campaign: { id: '2', name: 'Lima' }, adGroup: { name: 'Chatbots' }, segments: { date: query.match(/segments.date = '(.*?)'/)?.[1], device: 'MOBILE', adNetworkType: 'SEARCH' }, metrics: { clicks: '2' } }];
    if (query.includes('FROM geo_target_constant')) return [{ geoTargetConstant: { id: '2170', name: 'Colombia' } }, { geoTargetConstant: { id: '9197754', name: 'Soacha' } }];
    if (query.includes('FROM ad_group_ad')) return [{ adGroupAd: { resourceName: ref, ad: { id: '9', finalUrls: ['https://robles.ai/get-started'], responsiveSearchAd: { headlines: [{ text: 'Current headline' }], descriptions: [{ text: 'Current description' }], path1: 'ia' } } } }];
    throw new Error('Unexpected query');
  });
});
afterEach(() => vi.useRealTimers());
it('queries exactly one day, preserves full GCLID and distinguishes multiple interactions from records', async () => {
  const data = await getGoogleAdsClicks(range, '2');
  expect(data.selectedDate).toBe('2026-10-24');
  expect(data.days[0]).toEqual({ date: '2026-10-24', clicks: 3 });
  expect(data.records).toHaveLength(1);
  expect(data.records[0]).toMatchObject({ gclid: 'test-gclid', clicks: 2, keyword: 'chatbot', location: { country: 'Colombia', city: 'Soacha' } });
  expect(data.ads[ref]).toMatchObject({ headlines: ['Current headline'], adId: '9' });
  const clickQueries = reader.search.mock.calls.map(([q]) => q).filter(q => q.includes('FROM click_view'));
  expect(clickQueries).toHaveLength(1);
  expect(clickQueries[0]).toContain("segments.date = '2026-10-24'");
  expect(clickQueries[0]).toContain('campaign.id = 2');
  expect(clickQueries[0]).not.toContain('BETWEEN');
  expect(data.records[0]).not.toHaveProperty('hour');
  expect(data.records[0]).not.toHaveProperty('cost');
});
it('uses the selected day and rejects malformed or out-of-range click dates before reading credentials', async () => {
  expect((await getGoogleAdsClicks(range, '2', '2026-10-23')).selectedDate).toBe('2026-10-23');
  reader.get.mockClear();
  for (const date of ['2026-02-30', '2026-10-26', "2026-10-24' OR 1=1"]) await expect(getGoogleAdsClicks(range, undefined, date)).rejects.toThrow('Invalid click date');
  expect(reader.get).not.toHaveBeenCalled();
});
it('clips ranges in the account timezone and avoids pretending old ranges have zero clicks', async () => {
  expect(clickDateRange({ startDate: '2026-01-01', endDate: '2026-12-01' }, '2026-10-25')).toEqual({ startDate: '2026-07-28', endDate: '2026-10-25' });
  const data = await getGoogleAdsClicks({ startDate: '2026-01-01', endDate: '2026-01-31' });
  expect(data.effectiveRange).toBeNull(); expect(data.availability.clicks).toBe(false);
  expect(reader.search).toHaveBeenCalledTimes(1);
  expect(data.warnings[0]).toMatch(/90 calendar days/);
});
it('uses the account local day rather than UTC around midnight', async () => {
  vi.setSystemTime(new Date('2026-10-25T01:00:00Z'));
  const data = await getGoogleAdsClicks(range);
  expect(data.effectiveRange?.endDate).toBe('2026-10-24');
});
it('marks a failed daily request unavailable and retains the date choices', async () => {
  const original = reader.search.getMockImplementation()!;
  reader.search.mockImplementation(async q => { if (q.includes('FROM click_view')) throw new Error('denied'); return original(q); });
  const data = await getGoogleAdsClicks(range);
  expect(data.availability.clicks).toBe(false); expect(data.days).toHaveLength(2);
  expect(data.warnings[0]).toMatch(/failed request/);
});
it('preserves click records if optional geography and ad lookups fail', async () => {
  const original = reader.search.getMockImplementation()!;
  reader.search.mockImplementation(async q => { if (/FROM (geo_target_constant|ad_group_ad)/.test(q)) throw new Error('denied'); return original(q); });
  const data = await getGoogleAdsClicks(range);
  expect(data.records[0].gclid).toBe('test-gclid');
  expect(data.records[0].location.country).toBe('Location 2170');
  expect(data.availability).toEqual({ clicks: true, locations: false, ads: false });
  expect(data.warnings).toHaveLength(2);
});
it('returns an empty successful report without issuing daily queries when no days have clicks', async () => {
  const original = reader.search.getMockImplementation()!;
  reader.search.mockImplementation(async q => q.includes('FROM campaign') ? [] : original(q));
  const data = await getGoogleAdsClicks(range);
  expect(data.records).toEqual([]); expect(data.availability.clicks).toBe(true); expect(data.selectedDate).toBeNull();
  expect(reader.search).toHaveBeenCalledTimes(2);
});
it('only allows HTTP(S) ad destinations', () => {
  expect(safeAdUrl('javascript:alert(1)')).toBeNull();
  expect(safeAdUrl('https://robles.ai/get-started')).toBe('https://robles.ai/get-started');
  expect(safeAdUrl('not a URL')).toBeNull();
});
