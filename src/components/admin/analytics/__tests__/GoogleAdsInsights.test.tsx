import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it } from 'vitest';
import GoogleAdsInsights from '../GoogleAdsInsights';
import type { AdsInsights } from '@shared/adsAnalytics';
afterEach(cleanup);
const metric = { impressions: 3, clicks: 1, cost: 0.72, results: 0 };
const data: AdsInsights = {
  accountId: '5850899991', fetchedAt: '2026-10-25T12:00:00Z', warnings: [],
  availability: { terms: true, geography: true, devices: true, networks: true, ages: true, genders: true, targeting: true },
  terms: [
    { ...metric, term: 'vince ia', campaignId: '2', campaign: 'Lima', adGroup: 'Chatbots', keyword: 'chatbot con inteligencia artificial', matchType: 'PHRASE' },
    { ...metric, clicks: 0, term: 'chat bot', campaignId: '2', campaign: 'Lima', adGroup: 'Chatbots', keyword: 'chatbot', matchType: 'PHRASE' },
  ], countries: [{ ...metric, label: 'Colombia' }], locations: [], devices: [{ ...metric, label: 'MOBILE' }], networks: [], ages: [], genders: [],
  targeting: [{ campaignId: '2', campaign: 'Lima', location: 'San Isidro,Peru', excluded: false, presence: 'PRESENCE_OR_INTEREST', exclusionPresence: 'PRESENCE' }],
};
function show(report: AdsInsights | Error = data) {
  const keys: string[] = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, queryFn: ({ queryKey }) => { keys.push(String(queryKey[0])); if (report instanceof Error) throw report; return report; } } } });
  render(<QueryClientProvider client={client}><GoogleAdsInsights dateRange={{ startDate: '2026-10-01', endDate: '2026-10-25', label: 'Test' }} campaignId="2" currency="USD" /></QueryClientProvider>);
  return keys;
}
it('shows actual searches and approximate reached countries separately from current targeting', async () => {
  const keys = show();
  await screen.findByRole('table', { name: 'Search terms' });
  expect(screen.getByText('vince ia')).toBeInTheDocument();
  expect(screen.getByText(/Keyword: chatbot con inteligencia artificial/)).toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: 'Countries reached' })).getByText('Colombia')).toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: 'Current location targeting' })).getByText('Presence or interest')).toBeInTheDocument();
  expect(screen.getByText(/Privacy thresholds can hide terms/)).toBeInTheDocument();
  expect(keys[0]).toContain('campaignId=2');
  expect(keys[0]).toContain('startDate=2026-10-01');
  fireEvent.click(screen.getByLabelText('Only terms with clicks'));
  expect(screen.queryByText('chat bot')).not.toBeInTheDocument();
  expect(screen.getByText('vince ia')).toBeInTheDocument();
});
it('distinguishes request failure from an empty successful term report', async () => {
  show({ ...data, availability: { ...data.availability, terms: false } });
  await screen.findByText('Search terms are unavailable because the request failed.');
  expect(screen.queryByText(/No disclosed search terms/)).not.toBeInTheDocument();
});
it('provides pagination so all disclosed terms remain accessible', async () => {
  show({ ...data, terms: Array.from({ length: 11 }, (_, i) => ({ ...data.terms[0], term: `query-${i}` })) });
  await screen.findByText('query-0');
  expect(screen.queryByText('query-10')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next Search terms page' }));
  expect(screen.getByText('query-10')).toBeInTheDocument();
  expect(screen.queryByText('query-0')).not.toBeInTheDocument();
});
it('does not invent zero metrics if the whole endpoint fails', async () => {
  show(new Error('offline'));
  await screen.findByText(/Google Ads details are unavailable/);
  expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
});
