import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
vi.mock('../../db.js', () => ({
  default: { prepare: () => ({ get: (...args: any[]) => mockGet(...args) }) },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { normalizeAdAccountId, extractLeads, toIsoDate, queryMetaAds, isMetaAdsError } from '../metaAds.js';

function settings(map: Record<string, string>) {
  mockGet.mockImplementation((key: string) => (map[key] !== undefined ? { value: map[key] } : undefined));
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('metaAds helpers', () => {
  it('normalizes ad account ids', () => {
    expect(normalizeAdAccountId('123')).toBe('act_123');
    expect(normalizeAdAccountId('act_123')).toBe('act_123');
    expect(normalizeAdAccountId(' ACT_45 ')).toBe('act_45');
    expect(normalizeAdAccountId('')).toBeNull();
    expect(normalizeAdAccountId(null)).toBeNull();
  });

  it('counts leads once, preferring the aggregate "lead" action', () => {
    expect(extractLeads(undefined)).toBe(0);
    expect(
      extractLeads([
        { action_type: 'offsite_conversion.fb_pixel_lead', value: '3' },
        { action_type: 'lead', value: '3' },
        { action_type: 'link_click', value: '40' },
      ])
    ).toBe(3);
    expect(extractLeads([{ action_type: 'offsite_conversion.fb_pixel_lead', value: '2' }])).toBe(2);
    expect(extractLeads([{ action_type: 'link_click', value: '9' }])).toBe(0);
  });

  it('converts GA4-style relative dates', () => {
    const now = new Date(2026, 9, 22); // 22 Oct 2026, local time
    expect(toIsoDate('2026-10-01', now)).toBe('2026-10-01');
    expect(toIsoDate('today', now)).toBe('2026-10-22');
    expect(toIsoDate('yesterday', now)).toBe('2026-10-21');
    expect(toIsoDate('30daysAgo', now)).toBe('2026-09-22');
  });
});

describe('queryMetaAds', () => {
  it('returns NOT_CONFIGURED without calling Meta when settings are missing', async () => {
    settings({ meta_ad_account_id: '123' });
    const result = await queryMetaAds({ startDate: '2026-10-01', endDate: '2026-10-22' });
    expect(isMetaAdsError(result) && result.code).toBe('NOT_CONFIGURED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('aggregates campaigns and daily rows, sending the token in a header', async () => {
    settings({ meta_ad_account_id: '123', meta_ads_access_token: 'secret-token' });
    mockFetch.mockImplementation(async (url: string) => {
      const u = new URL(url);
      if (!u.pathname.endsWith('/insights')) return jsonResponse({ id: 'act_123', name: 'Robles.AI', currency: 'USD' });
      if (u.searchParams.get('level') === 'campaign') {
        return jsonResponse({
          data: [
            { campaign_id: '1', campaign_name: 'Leads US', spend: '10.50', impressions: '1000', clicks: '20', actions: [{ action_type: 'lead', value: '2' }] },
            { campaign_id: '2', campaign_name: 'Awareness', spend: '30', impressions: '5000', clicks: '15' },
          ],
        });
      }
      return jsonResponse({
        data: [
          { date_start: '2026-10-02', spend: '20', clicks: '20', actions: [{ action_type: 'lead', value: '1' }] },
          { date_start: '2026-10-01', spend: '20.5', clicks: '15', actions: [{ action_type: 'lead', value: '1' }] },
        ],
      });
    });

    const result = await queryMetaAds({ startDate: '2026-10-01', endDate: '2026-10-02' });
    if (isMetaAdsError(result)) throw new Error(result.message);

    expect(result.account).toEqual({ id: 'act_123', name: 'Robles.AI', currency: 'USD' });
    expect(result.totals).toEqual({ spend: 40.5, impressions: 6000, clicks: 35, leads: 2 });
    expect(result.campaigns.map((c) => c.campaign)).toEqual(['Awareness', 'Leads US']);
    expect(result.daily.map((d) => d.date)).toEqual(['2026-10-01', '2026-10-02']);

    for (const [url, init] of mockFetch.mock.calls) {
      expect(String(url)).not.toContain('secret-token');
      expect(init.headers.Authorization).toBe('Bearer secret-token');
    }
    const insightsUrl = new URL(String(mockFetch.mock.calls.find(([u]) => String(u).includes('level=campaign'))![0]));
    expect(JSON.parse(insightsUrl.searchParams.get('time_range')!)).toEqual({ since: '2026-10-01', until: '2026-10-02' });
  });

  it('maps token errors to TOKEN_EXPIRED', async () => {
    settings({ meta_ad_account_id: 'act_123', meta_ads_access_token: 'bad' });
    mockFetch.mockResolvedValue(jsonResponse({ error: { code: 190, message: 'Invalid OAuth access token' } }, 400));
    const result = await queryMetaAds({ startDate: '2026-10-01', endDate: '2026-10-02' });
    expect(isMetaAdsError(result) && result.code).toBe('TOKEN_EXPIRED');
  });
});
