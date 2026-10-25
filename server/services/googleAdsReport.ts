// GA4 fallback for Google Ads. Account and campaign IDs constrain attribution;
// website-wide channels are a separate report and never advertising results.
import { queryReport, getEventDimension, type DateRange, type ReportFilter } from './ga4Client.js';
import type { AdsCampaign, AdsReport, WebsiteChannelsReport, LeadForm, LeadSignalsReport } from '../../shared/adsAnalytics.js';

type ReportResult = Awaited<ReturnType<typeof queryReport>>;
const ID = 'sessionGoogleAdsCampaignId';
const NAME = 'sessionGoogleAdsCampaignName';
const CUSTOMER = 'sessionGoogleAdsCustomerId';
const number = (value: string | undefined) => Number(value) || 0;
export const isRealCampaignId = (value: string | undefined): value is string => !!value && /^\d+$/.test(value) && Number(value) > 0;
export const isPaidChannel = (name: string) => /^(paid|cross-network|display|audio)/i.test(name.trim());

export function accountFilter(customerId: string): ReportFilter {
  const id = customerId.replace(/-/g, '');
  return { filter: { fieldName: CUSTOMER, inListFilter: { values: [id, `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`] } } };
}

export function mergeCampaigns(costRows: Record<string, string>[], engagementRows: Record<string, string>[]): AdsCampaign[] {
  const byId = new Map<string, AdsCampaign>();
  const ensure = (row: Record<string, string>) => {
    const id = row[ID];
    if (!isRealCampaignId(id)) return;
    if (!byId.has(id)) byId.set(id, { campaignId: id, campaign: row[NAME] || id, impressions: 0, clicks: 0, cost: 0, results: 0 });
    return byId.get(id)!;
  };
  for (const row of costRows) {
    const item = ensure(row);
    if (item) {
      item.impressions += number(row.advertiserAdImpressions);
      item.clicks += number(row.advertiserAdClicks);
      item.cost += number(row.advertiserAdCost);
    }
  }
  for (const row of engagementRows) {
    const item = ensure(row);
    if (item) item.results += number(row.keyEvents);
  }
  return Array.from(byId.values()).sort((a, b) => b.cost - a.cost || a.campaign.localeCompare(b.campaign));
}

export function sumCampaigns(campaigns: AdsCampaign[]) {
  return campaigns.reduce((sum, row) => ({
    impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks,
    cost: sum.cost + row.cost, results: sum.results + row.results,
  }), { impressions: 0, clicks: 0, cost: 0, results: 0 });
}

export function aggregateDaily(rows: Record<string, string>[], campaignId?: string) {
  const byDate = new Map<string, { date: string; cost: number; clicks: number }>();
  for (const row of rows) {
    if (!isRealCampaignId(row[ID]) || (campaignId && row[ID] !== campaignId)) continue;
    if (!/^\d{8}$/.test(row.date)) continue;
    const point = byDate.get(row.date) || { date: row.date, cost: 0, clicks: 0 };
    point.cost += number(row.advertiserAdCost);
    point.clicks += number(row.advertiserAdClicks);
    byDate.set(row.date, point);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildGoogleAdsReport(results: {
  cost: PromiseSettledResult<ReportResult>;
  engagement: PromiseSettledResult<ReportResult>;
  daily: PromiseSettledResult<ReportResult>;
}, accountId: string, campaignId?: string): AdsReport {
  const warnings: string[] = [];
  const rows = (label: string, result: PromiseSettledResult<ReportResult>) => {
    if (result.status === 'fulfilled') return result.value.rows;
    warnings.push(`${label} unavailable: ${result.reason instanceof Error ? result.reason.message : 'GA4 request failed'}`);
    return [];
  };
  const allCampaigns = mergeCampaigns(rows('Campaign cost', results.cost), rows('Campaign key events', results.engagement));
  const campaigns = campaignId ? allCampaigns.filter(row => row.campaignId === campaignId) : allCampaigns;
  return {
    source: 'ga4', accountId, fetchedAt: new Date().toISOString(),
    currency: results.cost.status === 'fulfilled' ? results.cost.value.currencyCode || null : null,
    campaignOptions: allCampaigns.map(({ campaignId, campaign }) => ({ campaignId, campaign })),
    campaigns, totals: sumCampaigns(campaigns), daily: aggregateDaily(rows('Daily spend', results.daily), campaignId),
    availability: { cost: results.cost.status === 'fulfilled', results: results.engagement.status === 'fulfilled', daily: results.daily.status === 'fulfilled' },
    warnings,
  };
}

export async function getGoogleAdsReport(dateRange: DateRange, accountId = '5850899991', campaignId?: string): Promise<AdsReport> {
  const dimensions = ['sessionCampaignName', ID, NAME];
  const options = { limit: 10000, dimensionFilter: accountFilter(accountId) };
  const [cost, engagement, daily] = await Promise.allSettled([
    queryReport(dimensions, ['advertiserAdImpressions', 'advertiserAdClicks', 'advertiserAdCost'], dateRange, options),
    queryReport([ID, NAME], ['sessions', 'keyEvents'], dateRange, options),
    // GA4 requires a campaign dimension alongside advertising cost, including in daily reports.
    queryReport(['date', ...dimensions], ['advertiserAdCost', 'advertiserAdClicks'], dateRange, options),
  ]);
  if ([cost, engagement, daily].every(result => result.status === 'rejected')) throw new Error('GA4 could not return Google Ads data. Check the account link and property access.');
  return buildGoogleAdsReport({ cost, engagement, daily }, accountId, campaignId);
}

export async function getWebsiteChannelsReport(dateRange: DateRange): Promise<WebsiteChannelsReport> {
  const result = await queryReport(['sessionDefaultChannelGroup'], ['sessions', 'keyEvents', 'sessionKeyEventRate'], dateRange, { limit: 100 });
  return { channels: result.rows.map(row => {
    const rate = row.sessionKeyEventRate === undefined ? NaN : Number(row.sessionKeyEventRate);
    return { channelGroup: row.sessionDefaultChannelGroup || '(other)', sessions: number(row.sessions), keyEvents: number(row.keyEvents),
      sessionKeyEventRate: Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : null,
      paid: isPaidChannel(row.sessionDefaultChannelGroup || '') };
  }) };
}

export async function getLeadSignalsReport(dateRange: DateRange, accountId: string, campaignId: string | undefined, form: LeadForm): Promise<LeadSignalsReport> {
  const formDimension = await getEventDimension('form_id');
  if (form !== 'all' && !formDimension) return { count: null, form, segmentationAvailable: false,
    warnings: ['Contact/quiz breakdown is unavailable: form_id is not registered as an event-scoped custom dimension in GA4. Registration does not backfill historical data.'] };
  const filters: ReportFilter[] = [accountFilter(accountId), { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'generate_lead' } } }];
  if (campaignId) filters.push({ filter: { fieldName: ID, stringFilter: { matchType: 'EXACT', value: campaignId } } });
  if (form !== 'all') filters.push({ filter: { fieldName: formDimension!, stringFilter: { matchType: 'EXACT', value: form } } });
  const result = await queryReport([], ['eventCount'], dateRange, { dimensionFilter: { andGroup: { expressions: filters } } });
  return { count: result.rows.reduce((sum, row) => sum + number(row.eventCount), 0), form,
    segmentationAvailable: !!formDimension, warnings: formDimension ? [] : ['Contact/quiz breakdown is unavailable until form_id is registered in GA4; historical submissions cannot be reliably separated.'] };
}
