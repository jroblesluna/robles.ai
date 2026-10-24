// server/services/metaAds.ts
// Meta Marketing API (ad account insights) for the admin Ads tab.
// Needs a token with `ads_read` (e.g. a System User token) — the Page/Instagram
// tokens used for publishing do not grant access to ad accounts.

import db from '../db.js';
import { GRAPH_API_BASE } from './metaGraphApi.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MetaAdsError {
  error: true;
  code: 'NOT_CONFIGURED' | 'TOKEN_EXPIRED' | 'API_ERROR';
  message: string;
}

export interface MetaAdsTotals {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
}

export interface MetaAdsCampaignRow extends MetaAdsTotals {
  campaignId: string;
  campaign: string;
}

export interface MetaAdsDailyPoint {
  date: string; // YYYY-MM-DD
  spend: number;
  clicks: number;
  leads: number;
}

export interface MetaAdsReport {
  account: { id: string; name: string | null; currency: string | null };
  totals: MetaAdsTotals;
  campaigns: MetaAdsCampaignRow[];
  daily: MetaAdsDailyPoint[];
}

interface InsightAction {
  action_type: string;
  value: string;
}

interface InsightRow {
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: InsightAction[];
}

// ─── Settings ───────────────────────────────────────────────────────────────────

export const META_AD_ACCOUNT_KEY = 'meta_ad_account_id';
export const META_ADS_TOKEN_KEY = 'meta_ads_access_token';

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  const value = row?.value?.trim();
  return value ? value : null;
}

// ─── Pure helpers (exported for tests) ─────────────────────────────────────────

/** Accepts "123", "act_123" or "act=123"-ish input; returns "act_123" or null. */
export function normalizeAdAccountId(raw: string | null | undefined): string | null {
  const digits = (raw || '').replace(/^act_/i, '').replace(/\D/g, '');
  return digits ? `act_${digits}` : null;
}

/**
 * Lead count from an insights `actions` array. Meta reports the same lead under
 * several action types (aggregate "lead", pixel, on-site forms); take the first one
 * present in priority order instead of summing, to avoid double counting.
 */
export function extractLeads(actions: InsightAction[] | undefined): number {
  if (!actions?.length) return 0;
  const priority = ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped'];
  for (const type of priority) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) return parseFloat(hit.value) || 0;
  }
  return 0;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Converts GA4-style dates ("today", "yesterday", "30daysAgo", "YYYY-MM-DD") to YYYY-MM-DD. */
export function toIsoDate(value: string, now: Date = new Date()): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(now);
  if (value === 'yesterday') d.setDate(d.getDate() - 1);
  const m = /^(\d+)daysAgo$/.exec(value);
  if (m) d.setDate(d.getDate() - parseInt(m[1], 10));
  return isoDay(d);
}

const num = (v: string | undefined) => parseFloat(v || '0') || 0;

export function toCampaignRow(r: InsightRow): MetaAdsCampaignRow {
  return {
    campaignId: r.campaign_id || '',
    campaign: r.campaign_name || '(unnamed)',
    spend: num(r.spend),
    impressions: Math.round(num(r.impressions)),
    clicks: Math.round(num(r.clicks)),
    leads: extractLeads(r.actions),
  };
}

export function sumRows(rows: MetaAdsTotals[]): MetaAdsTotals {
  return rows.reduce<MetaAdsTotals>(
    (t, r) => ({
      spend: t.spend + r.spend,
      impressions: t.impressions + r.impressions,
      clicks: t.clicks + r.clicks,
      leads: t.leads + r.leads,
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0 }
  );
}

export function isMetaAdsError(value: unknown): value is MetaAdsError {
  return typeof value === 'object' && value !== null && (value as any).error === true && typeof (value as any).code === 'string';
}

// ─── HTTP ───────────────────────────────────────────────────────────────────────

async function graphGet<T>(path: string, token: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // Token goes in a header, not the URL, so it never lands in proxy/access logs.
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const body: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = body?.error?.code;
    const sub = body?.error?.error_subcode;
    const tokenProblem = response.status === 401 || code === 190 || sub === 463 || sub === 467;
    const err: MetaAdsError = {
      error: true,
      code: tokenProblem ? 'TOKEN_EXPIRED' : 'API_ERROR',
      message: body?.error?.message || `Meta API error (${response.status})`,
    };
    throw err;
  }
  return body as T;
}

// ─── Query ──────────────────────────────────────────────────────────────────────

export async function queryMetaAds(range: { startDate: string; endDate: string }): Promise<MetaAdsReport | MetaAdsError> {
  const accountId = normalizeAdAccountId(getSetting(META_AD_ACCOUNT_KEY));
  const token = getSetting(META_ADS_TOKEN_KEY);
  if (!accountId || !token) {
    return {
      error: true,
      code: 'NOT_CONFIGURED',
      message: 'Meta Ads is not configured. Add the Ad Account ID and an ads_read access token in Settings.',
    };
  }

  const timeRange = JSON.stringify({ since: toIsoDate(range.startDate), until: toIsoDate(range.endDate) });
  const fields = 'spend,impressions,clicks,actions';

  try {
    const [account, byCampaign, byDay] = await Promise.all([
      graphGet<{ id: string; name?: string; currency?: string }>(`/${accountId}`, token, { fields: 'name,currency' }),
      graphGet<{ data: InsightRow[] }>(`/${accountId}/insights`, token, {
        level: 'campaign',
        fields: `campaign_id,campaign_name,${fields}`,
        time_range: timeRange,
        limit: '200',
      }),
      graphGet<{ data: InsightRow[] }>(`/${accountId}/insights`, token, {
        fields,
        time_range: timeRange,
        time_increment: '1',
        limit: '500',
      }),
    ]);

    const campaigns = (byCampaign.data || []).map(toCampaignRow).sort((a, b) => b.spend - a.spend);
    const daily = (byDay.data || [])
      .map((r) => ({ date: r.date_start || '', spend: num(r.spend), clicks: Math.round(num(r.clicks)), leads: extractLeads(r.actions) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      account: { id: accountId, name: account.name ?? null, currency: account.currency ?? null },
      totals: sumRows(campaigns),
      campaigns,
      daily,
    };
  } catch (err) {
    if (isMetaAdsError(err)) return err;
    return { error: true, code: 'API_ERROR', message: err instanceof Error ? err.message : String(err) };
  }
}
