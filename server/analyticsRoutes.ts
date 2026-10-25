import { Router, type Request, type Response } from 'express';
import { requireAuth } from './auth.js';
import * as ga4Client from './services/ga4Client.js';
import * as metaInsights from './services/metaInsights.js';
import * as analyticsCache from './services/analyticsCache.js';
import { getGoogleAdsReport, getWebsiteChannelsReport, getLeadSignalsReport } from './services/googleAdsReport.js';
import { getDirectGoogleAdsReport, isGoogleAdsConfigured, getGoogleAdsAccountId } from './services/googleAdsApi.js';
import { getGoogleAdsClicks } from './services/googleAdsClicks.js';
import { getGoogleAdsInsights } from './services/googleAdsInsights.js';
import type { LeadForm } from '../shared/adsAnalytics.js';
import * as metaAds from './services/metaAds.js';

const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

function parseDateRange(req: Request): { startDate: string; endDate: string } {
  const startDate = (req.query.startDate as string) || '30daysAgo';
  const endDate = (req.query.endDate as string) || 'today';
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9\-]/g, '');
  return { startDate: sanitize(startDate), endDate: sanitize(endDate) };
}

function cacheKey(prefix: string, startDate: string, endDate: string): string {
  return `${prefix}:${startDate}:${endDate}`;
}

function getTtl(startDate: string, endDate: string): number {
  const today = new Date().toISOString().slice(0, 10);
  if (endDate === 'today' || endDate === today) {
    return analyticsCache.TTL.TODAY;
  }
  return analyticsCache.TTL.HISTORICAL;
}

analyticsRouter.get('/overview', (req: Request, res: Response) => {
  (async () => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const key = cacheKey('overview:kpis', startDate, endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const config = ga4Client.isConfigured();
      if (!config.configured) { res.json({ error: 'GA4 not configured', ...config }); return; }
      const [kpis, trend] = await Promise.all([
        ga4Client.getOverviewKPIs({ startDate, endDate }),
        ga4Client.getTrendData({ startDate, endDate }),
      ]);
      const data = { kpis, trend };
      analyticsCache.set(key, data, getTtl(startDate, endDate));
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Overview error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

analyticsRouter.get('/realtime', (_req: Request, res: Response) => {
  (async () => {
    try {
      const key = 'realtime:active';
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const config = ga4Client.isConfigured();
      if (!config.configured) { res.json({ error: 'GA4 not configured', activeUsers: 0, ...config }); return; }
      const data = await ga4Client.runRealtimeReport();
      analyticsCache.set(key, data, analyticsCache.TTL.REALTIME);
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Realtime error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

analyticsRouter.get('/traffic', (req: Request, res: Response) => {
  (async () => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const key = cacheKey('traffic', startDate, endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const config = ga4Client.isConfigured();
      if (!config.configured) { res.json({ error: 'GA4 not configured', ...config }); return; }
      const [topPages, sources, countries, devices] = await Promise.all([
        ga4Client.getTopPages({ startDate, endDate }, 10),
        ga4Client.getTrafficSources({ startDate, endDate }),
        ga4Client.getCountries({ startDate, endDate }, 20),
        ga4Client.getDevices({ startDate, endDate }),
      ]);
      const data = { topPages, sources, countries, devices };
      analyticsCache.set(key, data, getTtl(startDate, endDate));
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Traffic error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

analyticsRouter.get('/behavior', (req: Request, res: Response) => {
  (async () => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const key = cacheKey('behavior', startDate, endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const config = ga4Client.isConfigured();
      if (!config.configured) { res.json({ error: 'GA4 not configured', ...config }); return; }
      const [landingPages, newVsReturning] = await Promise.all([
        ga4Client.getLandingPages({ startDate, endDate }, 10),
        ga4Client.getNewVsReturning({ startDate, endDate }),
      ]);
      const data = { landingPages, newVsReturning };
      analyticsCache.set(key, data, getTtl(startDate, endDate));
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Behavior error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

analyticsRouter.get('/social/instagram', (_req: Request, res: Response) => {
  (async () => {
    try {
      const key = 'social:instagram';
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const data = await metaInsights.queryInstagram();
      if (metaInsights.isMetaInsightsError(data)) { res.json(data); return; }
      analyticsCache.set(key, data, analyticsCache.TTL.META);
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Instagram error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

analyticsRouter.get('/social/facebook', (_req: Request, res: Response) => {
  (async () => {
    try {
      const key = 'social:facebook';
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const data = await metaInsights.queryFacebookPage();
      if (metaInsights.isMetaInsightsError(data)) { res.json(data); return; }
      analyticsCache.set(key, data, analyticsCache.TTL.META);
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Facebook error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

// --- Paid campaigns (Ads tab) ---

function adsDates(req: Request) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  const parse = (raw: unknown, fallback: string) => {
    if (raw !== undefined && typeof raw !== 'string') throw new Error('Invalid date range.');
    let value = (raw as string | undefined) || fallback;
    if (value === 'today') value = today;
    const relative = /^(\d{1,3})daysAgo$/.exec(value);
    if (relative) {
      const date = new Date(today + 'T12:00:00Z');
      date.setUTCDate(date.getUTCDate() - Number(relative[1]));
      value = date.toISOString().slice(0, 10);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Invalid date range.');
    return value;
  };
  const startDate = parse(req.query.startDate, '29daysAgo');
  const endDate = parse(req.query.endDate, 'today');
  if (startDate > endDate) throw new Error('Start date must not follow end date.');
  return { startDate, endDate };
}
function adsCampaign(req: Request): string | undefined {
  const value = req.query.campaignId;
  if (value === undefined || value === '' || value === 'all') return;
  if (typeof value !== 'string' || !/^\d{1,20}$/.test(value) || Number(value) === 0) throw new Error('Invalid campaign ID.');
  return value;
}

analyticsRouter.get('/ads/google', (req: Request, res: Response) => {
  (async () => {
    let dateRange: { startDate: string; endDate: string };
    let campaignId: string | undefined;
    try { dateRange = adsDates(req); campaignId = adsCampaign(req); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    try {
      const accountId = getGoogleAdsAccountId();
      if (!/^\d{10}$/.test(accountId)) throw new Error('Invalid Google Ads customer ID in Settings.');
      const direct = isGoogleAdsConfigured();
      const key = cacheKey(`ads:google:v2:${direct ? 'api' : 'ga4'}:${accountId}:${campaignId || 'all'}`, dateRange.startDate, dateRange.endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      if (!direct && !ga4Client.isConfigured().configured) {
        res.json({ error: 'Google Ads is not configured. Connect the direct API or configure GA4 in Settings.' }); return;
      }
      const data = direct ? await getDirectGoogleAdsReport(dateRange, campaignId) : await getGoogleAdsReport(dateRange, accountId, campaignId);
      // Never cache an error/partial report as a successful zero-activity result.
      if (Object.values(data.availability).every(Boolean)) analyticsCache.set(key, data, getTtl(dateRange.startDate, dateRange.endDate));
      res.json(data);
    } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : 'Google Ads data unavailable.' }); }
  })();
});

analyticsRouter.get('/ads/google/clicks', (req: Request, res: Response) => {
  (async () => {
    let dateRange, campaignId;
    const clickDate = req.query.clickDate;
    try {
      dateRange = adsDates(req); campaignId = adsCampaign(req);
      if (clickDate !== undefined && (typeof clickDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(clickDate) || !Number.isFinite(Date.parse(clickDate)) || new Date(clickDate).toISOString().slice(0, 10) !== clickDate || clickDate < dateRange.startDate || clickDate > dateRange.endDate)) throw new Error('Invalid click date.');
    } catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      if (!isGoogleAdsConfigured()) { res.status(409).json({ error: 'Connect the direct Google Ads API in Settings to view click records.' }); return; }
      // Keep GCLIDs out of persistent analytics cache; the authenticated UI caches in memory.
      res.json(await getGoogleAdsClicks(dateRange, campaignId, clickDate as string | undefined));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Click date is outside')) { res.status(400).json({ error: error.message }); return; }
      res.status(502).json({ error: 'Google Ads click records unavailable. Check the direct connection and try Refresh.' });
    }
  })();
});

analyticsRouter.get('/ads/google/insights', (req: Request, res: Response) => {
  (async () => {
    let dateRange, campaignId;
    try { dateRange = adsDates(req); campaignId = adsCampaign(req); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    try {
      if (!isGoogleAdsConfigured()) { res.status(409).json({ error: 'Connect the direct Google Ads API in Settings to view search terms and audience details.' }); return; }
      const accountId = getGoogleAdsAccountId();
      const key = cacheKey(`ads:insights:v1:${accountId}:${campaignId || 'all'}`, dateRange.startDate, dateRange.endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const data = await getGoogleAdsInsights(dateRange, campaignId);
      if (Object.values(data.availability).every(Boolean) && !data.warnings.length) analyticsCache.set(key, data, getTtl(dateRange.startDate, dateRange.endDate));
      res.json(data);
    } catch { res.status(502).json({ error: 'Google Ads detail reports unavailable. Check the direct connection and try Refresh.' }); }
  })();
});

analyticsRouter.get('/channels', (req: Request, res: Response) => {
  (async () => {
    let dateRange;
    try { dateRange = adsDates(req); }
    catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    try {
      const key = cacheKey('traffic:channels:v2', dateRange.startDate, dateRange.endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const data = await getWebsiteChannelsReport(dateRange);
      analyticsCache.set(key, data, getTtl(dateRange.startDate, dateRange.endDate));
      res.json(data);
    } catch { res.status(502).json({ error: 'Website channel data unavailable. Check the GA4 connection.' }); }
  })();
});

analyticsRouter.get('/ads/leads', (req: Request, res: Response) => {
  (async () => {
    let dateRange, campaignId;
    const form = req.query.form || 'all';
    try {
      dateRange = adsDates(req); campaignId = adsCampaign(req);
      if (!['all', 'contact', 'quiz'].includes(form as string)) throw new Error('Invalid lead form filter.');
    } catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
    try {
      const accountId = getGoogleAdsAccountId();
      if (!/^\d{10}$/.test(accountId)) throw new Error('Invalid account.');
      const key = cacheKey(`ads:leads:v1:${accountId}:${campaignId || 'all'}:${form}`, dateRange.startDate, dateRange.endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const data = await getLeadSignalsReport(dateRange, accountId, campaignId, form as LeadForm);
      if (data.count !== null) analyticsCache.set(key, data, getTtl(dateRange.startDate, dateRange.endDate));
      res.json(data);
    } catch { res.status(502).json({ error: 'GA4 lead signals unavailable. Check the GA4 connection and event definitions.' }); }
  })();
});

analyticsRouter.get('/ads/meta', (req: Request, res: Response) => {
  (async () => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const key = cacheKey('ads:meta', startDate, endDate);
      const cached = analyticsCache.get(key);
      if (cached) { res.json(cached); return; }
      const data = await metaAds.queryMetaAds({ startDate, endDate });
      if (metaAds.isMetaAdsError(data)) { res.json(data); return; }
      analyticsCache.set(key, data, analyticsCache.TTL.META);
      res.json(data);
    } catch (error) {
      console.error('[Analytics] Meta Ads error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

analyticsRouter.post('/refresh', (_req: Request, res: Response) => {
  try {
    analyticsCache.clear();
    res.json({ success: true, message: 'Analytics cache cleared' });
  } catch (error) {
    console.error('[Analytics] Refresh error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default analyticsRouter;
