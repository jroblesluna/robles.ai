import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const reader = vi.hoisted(() => ({ get: vi.fn(), search: vi.fn() }));
vi.mock('../googleAdsApi.js', () => ({ getGoogleAdsReader: reader.get }));
import { getGoogleAdsInsights } from '../googleAdsInsights.js';
const range = { startDate: '2026-10-01', endDate: '2026-10-25' };
const activity = (impressions = 4, clicks = 1) => ({ impressions: String(impressions), clicks: String(clicks), costMicros: '720000', conversions: 0.5 });
beforeEach(() => {
  vi.clearAllMocks();
  reader.get.mockResolvedValue({ search: reader.search, filter: "campaign.id = 2 AND segments.date BETWEEN '2026-10-01' AND '2026-10-25'", accountId: '5850899991' });
  reader.search.mockImplementation(async (query: string) => {
    if (query.includes('FROM search_term_view')) return [{ campaign: { id: '2', name: 'Lima' }, adGroup: { name: 'Chatbots' }, searchTermView: { searchTerm: 'vince ia' }, segments: { keyword: { info: { text: 'chatbot con inteligencia artificial', matchType: 'PHRASE' } } }, metrics: activity() }];
    if (query.includes('FROM geographic_view')) return [
      { geographicView: { countryCriterionId: '2170' }, segments: { geoTargetCity: 'geoTargetConstants/9197754' }, metrics: activity() },
      { geographicView: { countryCriterionId: '2170' }, metrics: activity(2, 0) },
    ];
    if (query.includes('FROM campaign_criterion')) return [{ campaign: { id: '2', name: 'Lima', geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE_OR_INTEREST', negativeGeoTargetType: 'PRESENCE' } }, campaignCriterion: { negative: true, location: { geoTargetConstant: 'geoTargetConstants/2170' } } }];
    if (query.includes('FROM geo_target_constant')) return [{ geoTargetConstant: { id: '2170', canonicalName: 'Colombia' } }, { geoTargetConstant: { id: '9197754', canonicalName: 'Soacha,Colombia' } }];
    if (query.includes('segments.device')) return [{ segments: { device: 'MOBILE' }, metrics: activity() }, { segments: { device: 'MOBILE' }, metrics: activity(1, 0) }];
    if (query.includes('FROM gender_view')) return [{ adGroupCriterion: { gender: { type: 'UNDETERMINED' } }, metrics: activity() }];
    return [];
  });
});
afterEach(() => vi.restoreAllMocks());
it('keeps actual queries, keyword matches and country activity distinct from current location rules', async () => {
  const data = await getGoogleAdsInsights(range, '2');
  expect(data.terms[0]).toMatchObject({ term: 'vince ia', keyword: 'chatbot con inteligencia artificial', matchType: 'PHRASE', cost: 0.72, results: 0.5 });
  expect(data.countries).toEqual([{ label: 'Colombia', impressions: 6, clicks: 1, cost: 1.44, results: 1 }]);
  expect(data.devices).toEqual([{ label: 'MOBILE', impressions: 5, clicks: 1, cost: 1.44, results: 1 }]);
  expect(data.targeting[0]).toMatchObject({ location: 'Colombia', excluded: true, presence: 'PRESENCE_OR_INTEREST', exclusionPresence: 'PRESENCE' });
  expect(data.genders[0].label).toBe('UNDETERMINED');
  expect(reader.get).toHaveBeenCalledWith(range, '2');
  for (const [query] of reader.search.mock.calls) if (!query.includes('FROM geo_target_constant')) expect(query).toContain('campaign.id = 2');
  const targets = reader.search.mock.calls.find(([q]) => q.includes('FROM campaign_criterion'))![0];
  expect(targets).not.toContain('segments.date');
  const geography = reader.search.mock.calls.find(([q]) => q.includes('FROM geographic_view'))![0];
  expect(geography.split('FROM')[0]).toContain('campaign.id, campaign.status');
  expect(geography).toContain("location_type = 'LOCATION_OF_PRESENCE'");
});
it('preserves other breakdowns when one request fails and marks it unavailable', async () => {
  const original = reader.search.getMockImplementation()!;
  reader.search.mockImplementation(async query => { if (query.includes('FROM search_term_view')) throw new Error('denied'); return original(query); });
  const data = await getGoogleAdsInsights(range, '2');
  expect(data.availability.terms).toBe(false);
  expect(data.availability.devices).toBe(true);
  expect(data.terms).toEqual([]);
  expect(data.warnings).toHaveLength(1);
  expect(data.devices[0].clicks).toBe(1);
});
it('keeps readable location IDs when name resolution fails', async () => {
  const original = reader.search.getMockImplementation()!;
  reader.search.mockImplementation(async query => { if (query.includes('FROM geo_target_constant')) throw new Error('denied'); return original(query); });
  const data = await getGoogleAdsInsights(range, '2');
  expect(data.countries[0].label).toBe('Location 2170');
  expect(data.warnings).toHaveLength(1);
});
it('reports empty successful results without inventing unknown visitor demographics', async () => {
  reader.search.mockResolvedValue([]);
  const data = await getGoogleAdsInsights(range);
  expect(Object.values(data.availability).every(Boolean)).toBe(true);
  expect(data.terms).toEqual([]);
  expect(data.genders).toEqual([]);
  expect(data.warnings).toEqual([]);
});
it('rejects total report failure instead of returning successful zeroes', async () => {
  reader.search.mockRejectedValue(new Error('denied'));
  await expect(getGoogleAdsInsights(range)).rejects.toThrow('detail reports unavailable');
});
