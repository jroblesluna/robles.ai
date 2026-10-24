// server/services/googleAdsReport.ts
// Google Ads results read through GA4 (requires the Google Ads account to be linked
// to the GA4 property). No Google Ads API developer token is needed: cost, clicks and
// impressions are imported by GA4 and exposed as advertiser* metrics.

import { queryReport, type DateRange } from './ga4Client.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface GoogleAdsCampaignRow {
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  sessions: number;
  keyEvents: number;
}

export interface GoogleAdsDailyPoint {
  date: string; // YYYYMMDD (GA4 format)
  cost: number;
  clicks: number;
}

export interface ChannelRow {
  channelGroup: string;
  sessions: number;
  keyEvents: number;
  paid: boolean;
}

export interface GoogleAdsTotals {
  impressions: number;
  clicks: number;
  cost: number;
  sessions: number;
  keyEvents: number;
}

export interface GoogleAdsReport {
  currency: string | null;
  totals: GoogleAdsTotals;
  campaigns: GoogleAdsCampaignRow[];
  daily: GoogleAdsDailyPoint[];
  channels: ChannelRow[];
  /** Non-fatal problems, e.g. one of the GA4 queries was rejected. */
  warnings?: string[];
}

type ReportResult = Awaited<ReturnType<typeof queryReport>>;

// ─── Pure helpers (exported for tests) ─────────────────────────────────────────

const CAMPAIGN_DIMENSION = 'sessionGoogleAdsCampaignName';

/** GA4 uses "(not set)" for sessions that did not come from a Google Ads campaign. */
export function isRealCampaign(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.trim();
  return n !== '' && n !== '(not set)' && n !== '(not provided)' && n !== '(organic)' && n !== '(direct)';
}

/** Default channel groups that represent paid traffic. */
export function isPaidChannel(channelGroup: string): boolean {
  return /^(paid|cross-network|display|audio)/i.test(channelGroup.trim());
}

const toInt = (v: string | undefined) => parseInt(v || '0', 10) || 0;
const toFloat = (v: string | undefined) => parseFloat(v || '0') || 0;

/**
 * Merge the cost query and the engagement query (both grouped by Google Ads campaign)
 * into one row per campaign, sorted by cost desc.
 */
export function mergeCampaigns(
  costRows: Record<string, string>[],
  engagementRows: Record<string, string>[]
): GoogleAdsCampaignRow[] {
  const byName = new Map<string, GoogleAdsCampaignRow>();
  const ensure = (name: string) => {
    let row = byName.get(name);
    if (!row) {
      row = { campaign: name, impressions: 0, clicks: 0, cost: 0, sessions: 0, keyEvents: 0 };
      byName.set(name, row);
    }
    return row;
  };

  for (const r of costRows) {
    const name = r[CAMPAIGN_DIMENSION];
    if (!isRealCampaign(name)) continue;
    const row = ensure(name);
    row.impressions += toInt(r.advertiserAdImpressions);
    row.clicks += toInt(r.advertiserAdClicks);
    row.cost += toFloat(r.advertiserAdCost);
  }
  for (const r of engagementRows) {
    const name = r[CAMPAIGN_DIMENSION];
    if (!isRealCampaign(name)) continue;
    const row = ensure(name);
    row.sessions += toInt(r.sessions);
    row.keyEvents += toFloat(r.keyEvents);
  }

  return Array.from(byName.values()).sort((a, b) => b.cost - a.cost || b.sessions - a.sessions);
}

export function sumCampaigns(campaigns: GoogleAdsCampaignRow[]): GoogleAdsTotals {
  return campaigns.reduce<GoogleAdsTotals>(
    (t, c) => ({
      impressions: t.impressions + c.impressions,
      clicks: t.clicks + c.clicks,
      cost: t.cost + c.cost,
      sessions: t.sessions + c.sessions,
      keyEvents: t.keyEvents + c.keyEvents,
    }),
    { impressions: 0, clicks: 0, cost: 0, sessions: 0, keyEvents: 0 }
  );
}

export function buildGoogleAdsReport(results: {
  cost: PromiseSettledResult<ReportResult>;
  engagement: PromiseSettledResult<ReportResult>;
  daily: PromiseSettledResult<ReportResult>;
  channels: PromiseSettledResult<ReportResult>;
}): GoogleAdsReport {
  const warnings: string[] = [];
  const rowsOf = (label: string, r: PromiseSettledResult<ReportResult>) => {
    if (r.status === 'fulfilled') return r.value.rows;
    const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
    warnings.push(`${label}: ${msg}`);
    return [];
  };

  const campaigns = mergeCampaigns(rowsOf('Campaign cost', results.cost), rowsOf('Campaign sessions', results.engagement));

  const daily = rowsOf('Daily cost', results.daily)
    .map((r) => ({ date: r.date, cost: toFloat(r.advertiserAdCost), clicks: toInt(r.advertiserAdClicks) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const channels = rowsOf('Channels', results.channels).map((r) => ({
    channelGroup: r.sessionDefaultChannelGroup || '(other)',
    sessions: toInt(r.sessions),
    keyEvents: toFloat(r.keyEvents),
    paid: isPaidChannel(r.sessionDefaultChannelGroup || ''),
  }));

  const currency =
    (results.cost.status === 'fulfilled' && results.cost.value.currencyCode) ||
    (results.daily.status === 'fulfilled' && results.daily.value.currencyCode) ||
    null;

  const report: GoogleAdsReport = { currency, totals: sumCampaigns(campaigns), campaigns, daily, channels };
  if (warnings.length) report.warnings = warnings;
  return report;
}

// ─── Query ──────────────────────────────────────────────────────────────────────

/**
 * Google Ads performance for the range. Each GA4 query runs independently so an
 * incompatible metric/dimension combo degrades to a warning instead of failing the tab.
 * Throws only when every query fails (e.g. GA4 not configured).
 */
export async function getGoogleAdsReport(dateRange: DateRange): Promise<GoogleAdsReport> {
  const [cost, engagement, daily, channels] = await Promise.allSettled([
    queryReport([CAMPAIGN_DIMENSION], ['advertiserAdImpressions', 'advertiserAdClicks', 'advertiserAdCost'], dateRange, {
      limit: 100,
      orderBy: 'advertiserAdCost',
      orderDesc: true,
    }),
    queryReport([CAMPAIGN_DIMENSION], ['sessions', 'keyEvents'], dateRange, { limit: 100, orderBy: 'sessions', orderDesc: true }),
    queryReport(['date'], ['advertiserAdCost', 'advertiserAdClicks'], dateRange),
    queryReport(['sessionDefaultChannelGroup'], ['sessions', 'keyEvents'], dateRange, { orderBy: 'sessions', orderDesc: true }),
  ]);

  const all = [cost, engagement, daily, channels];
  if (all.every((r) => r.status === 'rejected')) {
    throw (cost as PromiseRejectedResult).reason;
  }

  return buildGoogleAdsReport({ cost, engagement, daily, channels });
}
