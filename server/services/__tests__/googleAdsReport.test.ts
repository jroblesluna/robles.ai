import { describe, it, expect, vi } from 'vitest';

vi.mock('../ga4Client.js', () => ({ queryReport: vi.fn() }));

import { queryReport } from '../ga4Client.js';
import {
  isRealCampaign,
  isPaidChannel,
  mergeCampaigns,
  buildGoogleAdsReport,
  getGoogleAdsReport,
} from '../googleAdsReport.js';

const ok = (rows: Record<string, string>[], currencyCode?: string) =>
  ({ status: 'fulfilled', value: { dimensionHeaders: [], metricHeaders: [], rows, currencyCode } }) as const;
const fail = (msg: string) => ({ status: 'rejected', reason: new Error(msg) }) as const;

describe('googleAdsReport helpers', () => {
  it('treats GA4 placeholders as non-campaigns', () => {
    expect(isRealCampaign('(not set)')).toBe(false);
    expect(isRealCampaign('')).toBe(false);
    expect(isRealCampaign(undefined)).toBe(false);
    expect(isRealCampaign('Search - Brand')).toBe(true);
  });

  it('classifies paid channel groups', () => {
    expect(isPaidChannel('Paid Search')).toBe(true);
    expect(isPaidChannel('Paid Social')).toBe(true);
    expect(isPaidChannel('Cross-network')).toBe(true);
    expect(isPaidChannel('Display')).toBe(true);
    expect(isPaidChannel('Organic Search')).toBe(false);
    expect(isPaidChannel('Direct')).toBe(false);
  });

  it('merges cost and engagement rows by campaign, dropping (not set), sorted by cost', () => {
    const cost = [
      { sessionGoogleAdsCampaignName: 'A', advertiserAdImpressions: '100', advertiserAdClicks: '10', advertiserAdCost: '5.5' },
      { sessionGoogleAdsCampaignName: 'B', advertiserAdImpressions: '50', advertiserAdClicks: '4', advertiserAdCost: '12' },
      { sessionGoogleAdsCampaignName: '(not set)', advertiserAdImpressions: '0', advertiserAdClicks: '0', advertiserAdCost: '0' },
    ];
    const engagement = [
      { sessionGoogleAdsCampaignName: 'A', sessions: '9', keyEvents: '2' },
      { sessionGoogleAdsCampaignName: '(not set)', sessions: '500', keyEvents: '30' },
    ];
    const rows = mergeCampaigns(cost, engagement);
    expect(rows.map((r) => r.campaign)).toEqual(['B', 'A']);
    expect(rows[1]).toEqual({ campaign: 'A', impressions: 100, clicks: 10, cost: 5.5, sessions: 9, keyEvents: 2 });
  });

  it('keeps working when some queries fail and reports warnings', () => {
    const report = buildGoogleAdsReport({
      cost: ok([{ sessionGoogleAdsCampaignName: 'A', advertiserAdImpressions: '10', advertiserAdClicks: '2', advertiserAdCost: '3' }], 'USD'),
      engagement: fail('incompatible'),
      daily: ok([
        { date: '20261002', advertiserAdCost: '2', advertiserAdClicks: '1' },
        { date: '20261001', advertiserAdCost: '1', advertiserAdClicks: '1' },
      ]),
      channels: ok([
        { sessionDefaultChannelGroup: 'Paid Search', sessions: '20', keyEvents: '1' },
        { sessionDefaultChannelGroup: 'Organic Search', sessions: '80', keyEvents: '3' },
      ]),
    });
    expect(report.currency).toBe('USD');
    expect(report.totals).toEqual({ impressions: 10, clicks: 2, cost: 3, sessions: 0, keyEvents: 0 });
    expect(report.daily.map((d) => d.date)).toEqual(['20261001', '20261002']);
    expect(report.channels.map((c) => c.paid)).toEqual([true, false]);
    expect(report.warnings).toEqual(['Campaign sessions: incompatible']);
  });

  it('throws when every GA4 query fails', async () => {
    vi.mocked(queryReport).mockRejectedValue(new Error('GA4 client not configured'));
    await expect(getGoogleAdsReport({ startDate: '2026-10-01', endDate: '2026-10-22' })).rejects.toThrow('GA4 client not configured');
  });
});
