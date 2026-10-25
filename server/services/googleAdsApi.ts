// Read-only Google Ads REST integration. OAuth credentials stay on the server.
// No mutate, enable, pause, budget, billing or permission operations are exposed.
import { createHash } from 'node:crypto';
import db from '../db.js';
import type { DateRange } from './ga4Client.js';
import type { AdsReport, AdsCampaign } from '../../shared/adsAnalytics.js';
import { sumCampaigns } from './googleAdsReport.js';

const API = 'https://googleads.googleapis.com/v26';
const setting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: string } | undefined)?.value?.trim() || '';
export const getGoogleAdsAccountId = () => setting('google_ads_customer_id').replace(/-/g, '') || '5850899991';
const config = () => ({ customerId: getGoogleAdsAccountId(), clientId: setting('google_ads_client_id'),
  clientSecret: setting('google_ads_client_secret'), refreshToken: setting('google_ads_refresh_token'),
  managerId: setting('google_ads_login_customer_id').replace(/-/g, '') });
export function isGoogleAdsConfigured(): boolean {
  const c = config();
  return /^\d{10}$/.test(c.customerId) && !!c.clientId && !!c.clientSecret && !!c.refreshToken;
}
let cachedToken: { key: string; value: string; expiresAt: number } | undefined;
async function accessToken(c: ReturnType<typeof config>): Promise<string> {
  const key = createHash('sha256').update(JSON.stringify(c)).digest('hex');
  if (cachedToken?.key === key && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken }),
    signal: AbortSignal.timeout(20000),
  });
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !token.access_token) throw new Error('Google Ads authorization expired or was rejected. Reauthorize the connection in Settings.');
  cachedToken = { key, value: token.access_token, expiresAt: Date.now() + Math.min(token.expires_in || 3600, 3600) * 1000 };
  return cachedToken.value;
}

export async function searchGoogleAds(customerId: string, token: string, query: string, managerId = ''): Promise<any[]> {
  if (!/^\d{10}$/.test(customerId) || (managerId && !/^\d{10}$/.test(managerId))) throw new Error('Google Ads customer IDs must contain 10 digits.');
  const rows: any[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 100; page++) {
    const response = await fetch(`${API}/customers/${customerId}/googleAds:search`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(managerId ? { 'login-customer-id': managerId } : {}) },
      body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }), signal: AbortSignal.timeout(30000),
    });
    const body = await response.json() as { results?: any[]; nextPageToken?: string };
    if (!response.ok) throw new Error(`Google Ads request failed (${response.status}). Check API access and account authorization in Settings.`);
    rows.push(...(body.results || []));
    pageToken = body.nextPageToken;
    if (!pageToken) return rows;
  }
  throw new Error('Google Ads report exceeded the page limit; no partial totals are shown.');
}

export async function getDirectGoogleAdsReport(dateRange: DateRange, campaignId?: string): Promise<AdsReport> {
  if (campaignId && !/^\d{1,20}$/.test(campaignId)) throw new Error('Invalid campaign ID.');
  for (const date of [dateRange.startDate, dateRange.endDate]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid report date.');
  }
  const c = config();
  if (!isGoogleAdsConfigured()) throw new Error('Google Ads API is not configured.');
  const token = await accessToken(c);
  const search = (query: string) => searchGoogleAds(c.customerId, token, query, c.managerId);
  const [customerRows, catalog] = await Promise.all([
    search('SELECT customer.currency_code, customer.time_zone FROM customer LIMIT 1'),
    search("SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.id"),
  ]);
  const filter = `campaign.status != 'REMOVED'${campaignId ? ` AND campaign.id = ${campaignId}` : ''} AND segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'`;
  const [metrics, daily] = await Promise.allSettled([
    search(`SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE ${filter}`),
    search(`SELECT segments.date, metrics.cost_micros, metrics.clicks FROM campaign WHERE ${filter}`),
  ]);
  const warnings: string[] = [];
  const rows = metrics.status === 'fulfilled' ? metrics.value : [];
  if (metrics.status === 'rejected') warnings.push('Campaign metrics unavailable. Values are not zero; the request failed.');
  if (daily.status === 'rejected') warnings.push('Daily spend unavailable. The request failed.');
  const byId = new Map(rows.map(row => [String(row.campaign.id), row.metrics]));
  const campaignOptions = catalog.map(row => ({ campaignId: String(row.campaign.id), campaign: String(row.campaign.name) }));
  const campaigns: AdsCampaign[] = catalog.filter(row => !campaignId || String(row.campaign.id) === campaignId).map(row => {
    const m = byId.get(String(row.campaign.id));
    return { campaignId: String(row.campaign.id), campaign: String(row.campaign.name), status: row.campaign.status,
      dailyBudget: Number(row.campaignBudget?.amountMicros || 0) / 1e6,
      impressions: Number(m?.impressions || 0), clicks: Number(m?.clicks || 0), cost: Number(m?.costMicros || 0) / 1e6, results: Number(m?.conversions || 0) };
  });
  const byDate = new Map<string, { date: string; cost: number; clicks: number }>();
  if (daily.status === 'fulfilled') for (const row of daily.value) {
    const date = row.segments.date;
    const point = byDate.get(date) || { date, cost: 0, clicks: 0 };
    point.cost += Number(row.metrics.costMicros || 0) / 1e6;
    point.clicks += Number(row.metrics.clicks || 0);
    byDate.set(date, point);
  }
  return { source: 'google_ads_api', accountId: c.customerId, currency: customerRows[0]?.customer?.currencyCode || null,
    fetchedAt: new Date().toISOString(), campaignOptions, campaigns, totals: sumCampaigns(campaigns),
    daily: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    availability: { cost: metrics.status === 'fulfilled', results: metrics.status === 'fulfilled', daily: daily.status === 'fulfilled' }, warnings };
}
