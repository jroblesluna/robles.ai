import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB
const mockGet = vi.fn();
const mockPrepare = vi.fn(() => ({
  get: mockGet,
}));

vi.mock('../../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

// Mock fs
const mockExistsSync = vi.fn();
vi.mock('fs', () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
}));

// Mock @google-analytics/data
const mockRunReport = vi.fn();
const mockRunRealtimeReport = vi.fn();

vi.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: function MockBetaAnalyticsDataClient() {
    return {
      runReport: mockRunReport,
      runRealtimeReport: mockRunRealtimeReport,
    };
  },
}));

import {
  queryReport,
  runRealtimeReport,
  getOverviewKPIs,
  getTrendData,
  getTopPages,
  getTrafficSources,
  getCountries,
  getDevices,
  getNewVsReturning,
  getLandingPages,
  isConfigured,
  resetClient,
} from '../ga4Client.js';
import type { DateRange } from '../ga4Client.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the cached client so each test starts fresh
  resetClient();
  // Default: credentials exist, property ID is set
  mockExistsSync.mockReturnValue(true);
  mockGet.mockImplementation((key: string) => {
    if (key === 'ga4_property_id') return { value: '123456789' };
    return undefined;
  });
});

const testDateRange: DateRange = { startDate: '2024-01-01', endDate: '2024-01-07' };

describe('ga4Client', () => {
  describe('isConfigured', () => {
    it('returns configured:true when credentials exist and property ID is set', () => {
      const result = isConfigured();
      expect(result.configured).toBe(true);
      expect(result.missingCredentials).toBe(false);
      expect(result.missingPropertyId).toBe(false);
    });

    it('returns missingCredentials when service account file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      const result = isConfigured();
      expect(result.configured).toBe(false);
      expect(result.missingCredentials).toBe(true);
    });

    it('returns missingPropertyId when setting is not in DB', () => {
      mockGet.mockReturnValue(undefined);
      const result = isConfigured();
      expect(result.configured).toBe(false);
      expect(result.missingPropertyId).toBe(true);
    });
  });

  describe('queryReport', () => {
    it('throws when credentials file is missing', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(queryReport(['date'], ['activeUsers'], testDateRange)).rejects.toThrow(
        'GA4 client not configured'
      );
    });

    it('throws when property ID is missing', async () => {
      mockGet.mockReturnValue(undefined);
      await expect(queryReport(['date'], ['activeUsers'], testDateRange)).rejects.toThrow(
        'GA4 Property ID not configured'
      );
    });

    it('returns parsed rows from GA4 API response', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'date' }],
          metricHeaders: [{ name: 'activeUsers' }],
          rows: [
            { dimensionValues: [{ value: '20240101' }], metricValues: [{ value: '150' }] },
            { dimensionValues: [{ value: '20240102' }], metricValues: [{ value: '200' }] },
          ],
        },
      ]);

      const result = await queryReport(['date'], ['activeUsers'], testDateRange);

      expect(result.dimensionHeaders).toEqual(['date']);
      expect(result.metricHeaders).toEqual(['activeUsers']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ date: '20240101', activeUsers: '150' });
      expect(result.rows[1]).toEqual({ date: '20240102', activeUsers: '200' });
    });

    it('handles empty response gracefully', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [],
          metricHeaders: [{ name: 'activeUsers' }],
          rows: [],
        },
      ]);

      const result = await queryReport([], ['activeUsers'], testDateRange);
      expect(result.rows).toEqual([]);
    });

    it('passes limit and orderBy options correctly', async () => {
      mockRunReport.mockResolvedValue([
        { dimensionHeaders: [{ name: 'pagePath' }], metricHeaders: [{ name: 'screenPageViews' }], rows: [] },
      ]);

      await queryReport(['pagePath'], ['screenPageViews'], testDateRange, {
        limit: 10,
        orderBy: 'screenPageViews',
        orderDesc: true,
      });

      expect(mockRunReport).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'properties/123456789',
          limit: 10,
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        })
      );
    });
  });

  describe('runRealtimeReport', () => {
    it('throws when credentials file is missing', async () => {
      mockExistsSync.mockReturnValue(false);
      await expect(runRealtimeReport()).rejects.toThrow('GA4 client not configured');
    });

    it('returns active users count', async () => {
      mockRunRealtimeReport.mockResolvedValue([
        { rows: [{ metricValues: [{ value: '42' }] }] },
      ]);

      const result = await runRealtimeReport();
      expect(result.activeUsers).toBe(42);
    });

    it('returns 0 when no rows in realtime response', async () => {
      mockRunRealtimeReport.mockResolvedValue([{ rows: [] }]);

      const result = await runRealtimeReport();
      expect(result.activeUsers).toBe(0);
    });
  });

  describe('getOverviewKPIs', () => {
    it('returns current metrics and comparison to previous period', async () => {
      // First call: current period, Second call: comparison period
      let callCount = 0;
      mockRunReport.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return [
            {
              dimensionHeaders: [],
              metricHeaders: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'screenPageViews' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
              ],
              rows: [
                {
                  dimensionValues: [],
                  metricValues: [
                    { value: '1000' },
                    { value: '1500' },
                    { value: '5000' },
                    { value: '0.35' },
                    { value: '120.5' },
                  ],
                },
              ],
            },
          ];
        }
        // Comparison period
        return [
          {
            dimensionHeaders: [],
            metricHeaders: [
              { name: 'activeUsers' },
              { name: 'sessions' },
              { name: 'screenPageViews' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
            ],
            rows: [
              {
                dimensionValues: [],
                metricValues: [
                  { value: '800' },
                  { value: '1200' },
                  { value: '4000' },
                  { value: '0.40' },
                  { value: '100.0' },
                ],
              },
            ],
          },
        ];
      });

      const result = await getOverviewKPIs(testDateRange);

      expect(result.activeUsers).toBe(1000);
      expect(result.sessions).toBe(1500);
      expect(result.screenPageViews).toBe(5000);
      expect(result.bounceRate).toBeCloseTo(0.35);
      expect(result.averageSessionDuration).toBeCloseTo(120.5);
      expect(result.comparison.activeUsers).toBe(800);
      expect(result.comparison.sessions).toBe(1200);
    });
  });

  describe('getTrendData', () => {
    it('returns sorted daily data points', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'date' }],
          metricHeaders: [{ name: 'activeUsers' }, { name: 'sessions' }],
          rows: [
            { dimensionValues: [{ value: '20240103' }], metricValues: [{ value: '120' }, { value: '180' }] },
            { dimensionValues: [{ value: '20240101' }], metricValues: [{ value: '100' }, { value: '150' }] },
            { dimensionValues: [{ value: '20240102' }], metricValues: [{ value: '110' }, { value: '160' }] },
          ],
        },
      ]);

      const result = await getTrendData(testDateRange);

      expect(result).toHaveLength(3);
      // Should be sorted by date
      expect(result[0].date).toBe('20240101');
      expect(result[1].date).toBe('20240102');
      expect(result[2].date).toBe('20240103');
      expect(result[0].activeUsers).toBe(100);
      expect(result[0].sessions).toBe(150);
    });
  });

  describe('getTopPages', () => {
    it('returns pages with views and duration', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'pagePath' }],
          metricHeaders: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
          rows: [
            { dimensionValues: [{ value: '/blog/ai-trends' }], metricValues: [{ value: '500' }, { value: '45.2' }] },
            { dimensionValues: [{ value: '/' }], metricValues: [{ value: '300' }, { value: '30.0' }] },
          ],
        },
      ]);

      const result = await getTopPages(testDateRange, 10);

      expect(result).toHaveLength(2);
      expect(result[0].pagePath).toBe('/blog/ai-trends');
      expect(result[0].screenPageViews).toBe(500);
      expect(result[0].averageSessionDuration).toBeCloseTo(45.2);
    });
  });

  describe('getTrafficSources', () => {
    it('returns traffic sources by channel group', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'sessionDefaultChannelGroup' }],
          metricHeaders: [{ name: 'sessions' }, { name: 'activeUsers' }],
          rows: [
            { dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '800' }, { value: '600' }] },
            { dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: '400' }, { value: '350' }] },
          ],
        },
      ]);

      const result = await getTrafficSources(testDateRange);

      expect(result).toHaveLength(2);
      expect(result[0].channelGroup).toBe('Organic Search');
      expect(result[0].sessions).toBe(800);
      expect(result[0].activeUsers).toBe(600);
    });
  });

  describe('getCountries', () => {
    it('returns country data with active users', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'country' }],
          metricHeaders: [{ name: 'activeUsers' }],
          rows: [
            { dimensionValues: [{ value: 'United States' }], metricValues: [{ value: '500' }] },
            { dimensionValues: [{ value: 'Costa Rica' }], metricValues: [{ value: '200' }] },
          ],
        },
      ]);

      const result = await getCountries(testDateRange, 20);

      expect(result).toHaveLength(2);
      expect(result[0].country).toBe('United States');
      expect(result[0].activeUsers).toBe(500);
    });
  });

  describe('getDevices', () => {
    it('returns device categories with user counts', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'deviceCategory' }],
          metricHeaders: [{ name: 'activeUsers' }],
          rows: [
            { dimensionValues: [{ value: 'desktop' }], metricValues: [{ value: '600' }] },
            { dimensionValues: [{ value: 'mobile' }], metricValues: [{ value: '350' }] },
            { dimensionValues: [{ value: 'tablet' }], metricValues: [{ value: '50' }] },
          ],
        },
      ]);

      const result = await getDevices(testDateRange);

      expect(result).toHaveLength(3);
      expect(result[0].deviceCategory).toBe('desktop');
      expect(result[0].activeUsers).toBe(600);
    });
  });

  describe('getNewVsReturning', () => {
    it('returns new vs returning user segments', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'newVsReturning' }],
          metricHeaders: [{ name: 'activeUsers' }],
          rows: [
            { dimensionValues: [{ value: 'new' }], metricValues: [{ value: '700' }] },
            { dimensionValues: [{ value: 'returning' }], metricValues: [{ value: '300' }] },
          ],
        },
      ]);

      const result = await getNewVsReturning(testDateRange);

      expect(result).toHaveLength(2);
      expect(result[0].segment).toBe('new');
      expect(result[0].activeUsers).toBe(700);
      expect(result[1].segment).toBe('returning');
      expect(result[1].activeUsers).toBe(300);
    });
  });

  describe('getLandingPages', () => {
    it('returns landing pages with sessions and bounce rate', async () => {
      mockRunReport.mockResolvedValue([
        {
          dimensionHeaders: [{ name: 'landingPage' }],
          metricHeaders: [{ name: 'sessions' }, { name: 'bounceRate' }],
          rows: [
            { dimensionValues: [{ value: '/' }], metricValues: [{ value: '400' }, { value: '0.25' }] },
            { dimensionValues: [{ value: '/blog' }], metricValues: [{ value: '200' }, { value: '0.45' }] },
          ],
        },
      ]);

      const result = await getLandingPages(testDateRange, 10);

      expect(result).toHaveLength(2);
      expect(result[0].landingPage).toBe('/');
      expect(result[0].sessions).toBe(400);
      expect(result[0].bounceRate).toBeCloseTo(0.25);
    });
  });
});
