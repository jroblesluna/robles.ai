import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../ga4Client.js', () => ({ queryReport: vi.fn(), getEventDimension: vi.fn() }));
import { queryReport, getEventDimension } from '../ga4Client.js';
import { isRealCampaignId, mergeCampaigns, aggregateDaily, buildGoogleAdsReport, getGoogleAdsReport, getWebsiteChannelsReport, getLeadSignalsReport } from '../googleAdsReport.js';
const ok = (rows: Record<string, string>[], currencyCode?: string) => ({ status: 'fulfilled', value: { dimensionHeaders: [], metricHeaders: [], rows, currencyCode } }) as const;
const fail = (message: string) => ({ status: 'rejected', reason: new Error(message) }) as const;
const result = (rows: Record<string, string>[]) => ({ dimensionHeaders: [], metricHeaders: [], rows });
const range = { startDate: '2026-10-01', endDate: '2026-10-25' };
beforeEach(() => { vi.resetAllMocks(); });

describe('Google Ads attribution and partial results', () => {
  it('identifies campaigns by numeric ID rather than marketing names or GA4 placeholders', () => {
    expect(isRealCampaignId('(not set)')).toBe(false);
    expect(isRealCampaignId('0')).toBe(false);
    const campaigns = mergeCampaigns([
      { sessionGoogleAdsCampaignId: '123', sessionGoogleAdsCampaignName: 'Old name', advertiserAdCost: '2', advertiserAdClicks: '1' },
      { sessionGoogleAdsCampaignId: '123', sessionGoogleAdsCampaignName: 'New name', advertiserAdCost: '3', advertiserAdClicks: '2' },
      { sessionGoogleAdsCampaignId: '(not set)', sessionGoogleAdsCampaignName: 'Manual UTM', advertiserAdCost: '100' },
    ], [{ sessionGoogleAdsCampaignId: '123', sessionGoogleAdsCampaignName: 'New name', keyEvents: '5' }]);
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]).toMatchObject({ campaignId: '123', cost: 5, clicks: 3, results: 5 });
  });
  it('aggregates daily costs across campaigns and respects a selected ID', () => {
    const rows = [
      { date: '20261002', sessionGoogleAdsCampaignId: '1', advertiserAdCost: '2', advertiserAdClicks: '1' },
      { date: '20261002', sessionGoogleAdsCampaignId: '2', advertiserAdCost: '3', advertiserAdClicks: '2' },
      { date: '20261001', sessionGoogleAdsCampaignId: '(not set)', advertiserAdCost: '100' },
    ];
    expect(aggregateDaily(rows)).toEqual([{ date: '20261002', cost: 5, clicks: 3 }]);
    expect(aggregateDaily(rows, '2')).toEqual([{ date: '20261002', cost: 3, clicks: 2 }]);
  });
  it('marks failed cost and daily requests unavailable instead of reporting a successful zero', () => {
    const report = buildGoogleAdsReport({ cost: fail('incompatible'), engagement: ok([{ sessionGoogleAdsCampaignId: '1', keyEvents: '2' }]), daily: fail('incompatible') }, '5850899991');
    expect(report.availability).toEqual({ cost: false, results: true, daily: false });
    expect(report.warnings).toHaveLength(2);
    expect(report.totals.results).toBe(2);
  });
  it('filters totals and chart by campaign without losing the selector catalog', () => {
    const report = buildGoogleAdsReport({ cost: ok([
      { sessionGoogleAdsCampaignId: '1', sessionGoogleAdsCampaignName: 'A', advertiserAdCost: '4' },
      { sessionGoogleAdsCampaignId: '2', sessionGoogleAdsCampaignName: 'B', advertiserAdCost: '7' },
    ], 'USD'), engagement: ok([]), daily: ok([]) }, '5850899991', '2');
    expect(report.totals.cost).toBe(7);
    expect(report.campaignOptions).toHaveLength(2);
    expect(report.campaigns.map(c => c.campaignId)).toEqual(['2']);
  });
  it('requests the campaign dimension required by GA4 daily cost and filters the account', async () => {
    vi.mocked(queryReport).mockResolvedValue(result([]));
    await getGoogleAdsReport(range);
    const daily = vi.mocked(queryReport).mock.calls.find(call => call[0].includes('date'))!;
    expect(daily[0]).toContain('sessionCampaignName');
    expect(daily[3]?.dimensionFilter).toMatchObject({ filter: { fieldName: 'sessionGoogleAdsCustomerId', inListFilter: { values: ['5850899991', '585-089-9991'] } } });
  });
  it('fails explicitly if all campaign queries fail', async () => {
    vi.mocked(queryReport).mockRejectedValue(new Error('denied'));
    await expect(getGoogleAdsReport(range)).rejects.toThrow('could not return');
  });
});

describe('Website context and submission signals', () => {
  it('uses GA4 session key event rate even when repeated key events exceed sessions', async () => {
    vi.mocked(queryReport).mockResolvedValue(result([{ sessionDefaultChannelGroup: 'Direct', sessions: '292', keyEvents: '745', sessionKeyEventRate: '0.25' }]));
    const report = await getWebsiteChannelsReport(range);
    expect(report.channels[0].sessionKeyEventRate).toBe(0.25);
    expect(vi.mocked(queryReport).mock.calls[0][1]).toContain('sessionKeyEventRate');
  });
  it('does not invent a contact breakdown when its dimension is missing', async () => {
    vi.mocked(getEventDimension).mockResolvedValue(null);
    const report = await getLeadSignalsReport(range, '5850899991', '1', 'contact');
    expect(report.count).toBeNull();
    expect(report.segmentationAvailable).toBe(false);
    expect(queryReport).not.toHaveBeenCalled();
  });
  it('counts generate_lead separately, constrained to account, campaign and registered form', async () => {
    vi.mocked(getEventDimension).mockResolvedValue('customEvent:form_id');
    vi.mocked(queryReport).mockResolvedValue(result([{ eventCount: '3' }]));
    const report = await getLeadSignalsReport(range, '5850899991', '24393066470', 'quiz');
    expect(report.count).toBe(3);
    expect(vi.mocked(queryReport).mock.calls[0][1]).toEqual(['eventCount']);
    const filter = vi.mocked(queryReport).mock.calls[0][3]?.dimensionFilter;
    expect(JSON.stringify(filter)).toContain('generate_lead');
    expect(JSON.stringify(filter)).toContain('24393066470');
    expect(JSON.stringify(filter)).toContain('customEvent:form_id');
    expect(JSON.stringify(filter)).toContain('quiz');
  });
});
