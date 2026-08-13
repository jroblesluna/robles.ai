import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';
import fs from 'fs';
import db from '../db.js';

// --- Types ---

export interface DateRange {
  startDate: string; // YYYY-MM-DD or relative like '7daysAgo'
  endDate: string;   // YYYY-MM-DD or 'today'
}

export interface GA4KPIs {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
  comparison: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    bounceRate: number;
    averageSessionDuration: number;
  };
}

export interface TrendDataPoint {
  date: string;
  activeUsers: number;
  sessions: number;
}

export interface PageData {
  pagePath: string;
  screenPageViews: number;
  averageSessionDuration: number;
}

export interface TrafficSourceData {
  channelGroup: string;
  sessions: number;
  activeUsers: number;
}

export interface CountryData {
  country: string;
  activeUsers: number;
}

export interface DeviceData {
  deviceCategory: string;
  activeUsers: number;
}

export interface NewVsReturningData {
  segment: string;
  activeUsers: number;
}

export interface LandingPageData {
  landingPage: string;
  sessions: number;
  bounceRate: number;
}

export interface RealtimeData {
  activeUsers: number;
}

// --- Helpers ---

/**
 * Read a setting from the SQLite settings table.
 */
function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

/**
 * Get the GA4 property ID from settings.
 * The property ID is numeric (e.g., "123456789").
 */
function getPropertyId(): string | null {
  return getSetting('ga4_property_id');
}

/**
 * Path to the service account credentials file.
 */
const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'server/data/ga4-service-account.json');

/**
 * Check if the service account credentials file exists.
 */
function credentialsExist(): boolean {
  try {
    return fs.existsSync(SERVICE_ACCOUNT_PATH);
  } catch {
    return false;
  }
}

/**
 * Create a BetaAnalyticsDataClient authenticated via Service Account JSON.
 * Returns null if credentials file is missing.
 */
function createClient(): BetaAnalyticsDataClient | null {
  if (!credentialsExist()) {
    console.warn('[GA4 Client] Service account credentials not found at', SERVICE_ACCOUNT_PATH);
    return null;
  }

  try {
    return new BetaAnalyticsDataClient({
      keyFilename: SERVICE_ACCOUNT_PATH,
    });
  } catch (err) {
    console.error('[GA4 Client] Failed to initialize client:', err);
    return null;
  }
}

// Lazily-initialized singleton client
let _client: BetaAnalyticsDataClient | null | undefined;

function getClient(): BetaAnalyticsDataClient | null {
  if (_client === undefined) {
    _client = createClient();
  }
  return _client;
}

/**
 * Compute the "previous period" date range for comparison.
 * Given a range, returns a date range of equal length immediately before startDate.
 */
function computeComparisonRange(dateRange: DateRange): DateRange {
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000); // day before startDate
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
}

// --- Core Query Wrappers ---

/**
 * Generic report query wrapper.
 * Runs a GA4 Data API runReport call with the given dimensions, metrics, and date range.
 */
export async function queryReport(
  dimensions: string[],
  metrics: string[],
  dateRange: DateRange,
  options?: { limit?: number; orderBy?: string; orderDesc?: boolean }
): Promise<{ dimensionHeaders: string[]; metricHeaders: string[]; rows: Record<string, string>[] }> {
  const client = getClient();
  if (!client) {
    throw new Error('GA4 client not configured. Upload service account credentials.');
  }

  const propertyId = getPropertyId();
  if (!propertyId) {
    throw new Error('GA4 Property ID not configured. Set ga4_property_id in settings.');
  }

  const request: any = {
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics: metrics.map((name) => ({ name })),
  };

  if (dimensions.length > 0) {
    request.dimensions = dimensions.map((name) => ({ name }));
  }

  if (options?.limit) {
    request.limit = options.limit;
  }

  if (options?.orderBy) {
    request.orderBys = [
      {
        metric: { metricName: options.orderBy },
        desc: options.orderDesc ?? true,
      },
    ];
  }

  const [response] = await client.runReport(request);

  const dimensionHeaders = (response.dimensionHeaders || []).map((h: any) => h.name || '');
  const metricHeaders = (response.metricHeaders || []).map((h: any) => h.name || '');

  const rows = (response.rows || []).map((row: any) => {
    const record: Record<string, string> = {};
    (row.dimensionValues || []).forEach((val: any, i: number) => {
      record[dimensionHeaders[i]] = val.value || '';
    });
    (row.metricValues || []).forEach((val: any, i: number) => {
      record[metricHeaders[i]] = val.value || '0';
    });
    return record;
  });

  return { dimensionHeaders, metricHeaders, rows };
}

/**
 * Run a real-time report for active users.
 */
export async function runRealtimeReport(): Promise<RealtimeData> {
  const client = getClient();
  if (!client) {
    throw new Error('GA4 client not configured. Upload service account credentials.');
  }

  const propertyId = getPropertyId();
  if (!propertyId) {
    throw new Error('GA4 Property ID not configured. Set ga4_property_id in settings.');
  }

  const [response] = await client.runRealtimeReport({
    property: `properties/${propertyId}`,
    metrics: [{ name: 'activeUsers' }],
  });

  const activeUsers = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
  return { activeUsers };
}

// --- Specific Query Methods ---

/**
 * Get overview KPIs with comparison to previous period.
 */
export async function getOverviewKPIs(dateRange: DateRange): Promise<GA4KPIs> {
  const metrics = ['activeUsers', 'sessions', 'screenPageViews', 'bounceRate', 'averageSessionDuration'];

  const currentResult = await queryReport([], metrics, dateRange);
  const comparisonRange = computeComparisonRange(dateRange);
  const prevResult = await queryReport([], metrics, comparisonRange);

  const current = currentResult.rows[0] || {};
  const prev = prevResult.rows[0] || {};

  return {
    activeUsers: parseInt(current.activeUsers || '0', 10),
    sessions: parseInt(current.sessions || '0', 10),
    screenPageViews: parseInt(current.screenPageViews || '0', 10),
    bounceRate: parseFloat(current.bounceRate || '0'),
    averageSessionDuration: parseFloat(current.averageSessionDuration || '0'),
    comparison: {
      activeUsers: parseInt(prev.activeUsers || '0', 10),
      sessions: parseInt(prev.sessions || '0', 10),
      screenPageViews: parseInt(prev.screenPageViews || '0', 10),
      bounceRate: parseFloat(prev.bounceRate || '0'),
      averageSessionDuration: parseFloat(prev.averageSessionDuration || '0'),
    },
  };
}

/**
 * Get trend data (daily users and sessions) over the selected date range.
 */
export async function getTrendData(dateRange: DateRange): Promise<TrendDataPoint[]> {
  const result = await queryReport(['date'], ['activeUsers', 'sessions'], dateRange);

  return result.rows.map((row) => ({
    date: row.date,
    activeUsers: parseInt(row.activeUsers || '0', 10),
    sessions: parseInt(row.sessions || '0', 10),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get top pages by pageviews.
 */
export async function getTopPages(dateRange: DateRange, limit = 10): Promise<PageData[]> {
  const result = await queryReport(
    ['pagePath'],
    ['screenPageViews', 'averageSessionDuration'],
    dateRange,
    { limit, orderBy: 'screenPageViews', orderDesc: true }
  );

  return result.rows.map((row) => ({
    pagePath: row.pagePath,
    screenPageViews: parseInt(row.screenPageViews || '0', 10),
    averageSessionDuration: parseFloat(row.averageSessionDuration || '0'),
  }));
}

/**
 * Get traffic sources by channel group.
 */
export async function getTrafficSources(dateRange: DateRange): Promise<TrafficSourceData[]> {
  const result = await queryReport(
    ['sessionDefaultChannelGroup'],
    ['sessions', 'activeUsers'],
    dateRange,
    { orderBy: 'sessions', orderDesc: true }
  );

  return result.rows.map((row) => ({
    channelGroup: row.sessionDefaultChannelGroup,
    sessions: parseInt(row.sessions || '0', 10),
    activeUsers: parseInt(row.activeUsers || '0', 10),
  }));
}

/**
 * Get user counts by country.
 */
export async function getCountries(dateRange: DateRange, limit = 20): Promise<CountryData[]> {
  const result = await queryReport(
    ['country'],
    ['activeUsers'],
    dateRange,
    { limit, orderBy: 'activeUsers', orderDesc: true }
  );

  return result.rows.map((row) => ({
    country: row.country,
    activeUsers: parseInt(row.activeUsers || '0', 10),
  }));
}

/**
 * Get user counts by device category.
 */
export async function getDevices(dateRange: DateRange): Promise<DeviceData[]> {
  const result = await queryReport(
    ['deviceCategory'],
    ['activeUsers'],
    dateRange,
    { orderBy: 'activeUsers', orderDesc: true }
  );

  return result.rows.map((row) => ({
    deviceCategory: row.deviceCategory,
    activeUsers: parseInt(row.activeUsers || '0', 10),
  }));
}

/**
 * Get new vs returning users breakdown.
 */
export async function getNewVsReturning(dateRange: DateRange): Promise<NewVsReturningData[]> {
  const result = await queryReport(
    ['newVsReturning'],
    ['activeUsers'],
    dateRange,
    { orderBy: 'activeUsers', orderDesc: true }
  );

  return result.rows.map((row) => ({
    segment: row.newVsReturning,
    activeUsers: parseInt(row.activeUsers || '0', 10),
  }));
}

/**
 * Get top landing pages with sessions and bounce rate.
 */
export async function getLandingPages(dateRange: DateRange, limit = 10): Promise<LandingPageData[]> {
  const result = await queryReport(
    ['landingPage'],
    ['sessions', 'bounceRate'],
    dateRange,
    { limit, orderBy: 'sessions', orderDesc: true }
  );

  return result.rows.map((row) => ({
    landingPage: row.landingPage,
    sessions: parseInt(row.sessions || '0', 10),
    bounceRate: parseFloat(row.bounceRate || '0'),
  }));
}

/**
 * Check if the GA4 client is properly configured (credentials file exists + property ID set).
 */
export function isConfigured(): { configured: boolean; missingCredentials: boolean; missingPropertyId: boolean } {
  const missingCredentials = !credentialsExist();
  const missingPropertyId = !getPropertyId();
  return {
    configured: !missingCredentials && !missingPropertyId,
    missingCredentials,
    missingPropertyId,
  };
}

/**
 * Reset the cached client instance (useful after uploading new credentials).
 */
export function resetClient(): void {
  _client = undefined;
}
