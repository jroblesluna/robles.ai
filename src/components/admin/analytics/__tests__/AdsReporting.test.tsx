import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleAdsSection } from '../AdsTab';
import WebsiteChannels from '../WebsiteChannels';
import type { AdsReport } from '@shared/adsAnalytics';
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div>{children}</div>, Line: () => null, XAxis: () => null,
  YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));
afterEach(cleanup);
const dateRange = { startDate: '2026-10-01', endDate: '2026-10-25', label: 'Test dates' };
const report: AdsReport = {
  source: 'google_ads_api', accountId: '5850899991', currency: 'USD', fetchedAt: '2026-10-25T12:00:00Z',
  campaignOptions: [{ campaignId: '1', campaign: 'US' }, { campaignId: '2', campaign: 'Lima' }],
  campaigns: [], totals: { cost: 0, clicks: 0, impressions: 0, results: 0 }, daily: [],
  availability: { cost: true, results: true, daily: true }, warnings: [],
};
function renderWithQuery(ui: React.ReactElement, query: (key: string) => unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, queryFn: ({ queryKey }) => String(queryKey[0]).includes('/ads/google/clicks?') ? { accountId: '5850899991', timeZone: 'America/Los_Angeles', effectiveRange: null, selectedDate: null, days: [], records: [], ads: {}, availability: { clicks: false, locations: true, ads: true }, warnings: [] } : query(String(queryKey[0])) } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
const leads = { count: 0, form: 'all', segmentationAvailable: false, warnings: ['Contact/quiz breakdown unavailable.'] };

describe('Ads reporting states', () => {
  it('does not render failed cost and daily requests as zero spend', async () => {
    renderWithQuery(<GoogleAdsSection dateRange={dateRange} />, key => key.includes('/ads/leads') ? leads : { ...report, availability: { cost: false, results: false, daily: false }, warnings: ['Campaign metrics unavailable.'] });
    await screen.findByText('Daily spend is unavailable because its data request failed.');
    expect(screen.queryByText('No spend in this period.')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('Website traffic · all sources')).not.toBeInTheDocument();
  });
  it('changes the campaign request and preserves available campaign choices', async () => {
    const keys: string[] = [];
    renderWithQuery(<GoogleAdsSection dateRange={dateRange} />, key => {
      keys.push(key);
      if (key.includes('/ads/leads')) return leads;
      return report;
    });
    await screen.findByRole('option', { name: 'Lima' });
    fireEvent.change(screen.getByLabelText('Google Ads campaign'), { target: { value: '2' } });
    await waitFor(() => expect(keys.some(key => key.includes('/ads/google?') && key.includes('campaignId=2'))).toBe(true));
    expect(screen.getByRole('option', { name: 'US' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Contact forms accepted' })).toBeDisabled();
  });
  it('labels GA4 fallback and never presents all key events as leads', async () => {
    renderWithQuery(<GoogleAdsSection dateRange={dateRange} />, key => key.includes('/ads/leads') ? leads : { ...report, source: 'ga4' });
    await screen.findByText('Imported via GA4');
    expect(screen.getByText(/An empty GA4 report does not confirm zero spend/)).toBeInTheDocument();
    expect(screen.getByText('Key events (GA4)')).toBeInTheDocument();
  });
});

it('shows the GA4 session rate instead of repeated event count divided by sessions', async () => {
  renderWithQuery(<WebsiteChannels dateRange={dateRange} />, () => ({ channels: [{ channelGroup: 'Direct', sessions: 292, keyEvents: 745, sessionKeyEventRate: 0.25, paid: false }] }));
  await screen.findByText('25.0%');
  expect(screen.queryByText('255.1%')).not.toBeInTheDocument();
  expect(screen.getByText('745')).toBeInTheDocument();
});
