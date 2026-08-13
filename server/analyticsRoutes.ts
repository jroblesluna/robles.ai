import { Router, type Request, type Response } from 'express';
import { requireAuth } from './auth.js';
import * as ga4Client from './services/ga4Client.js';
import * as metaInsights from './services/metaInsights.js';
import * as analyticsCache from './services/analyticsCache.js';

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
