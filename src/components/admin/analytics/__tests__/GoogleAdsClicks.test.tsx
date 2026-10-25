import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it } from 'vitest';
import GoogleAdsClicks from '../GoogleAdsClicks';
import type { AdsClickReport } from '@shared/adsAnalytics';
afterEach(cleanup);
const ref = 'customers/5850899991/adGroupAds/1~9';
const report: AdsClickReport = { accountId: '5850899991', timeZone: 'America/Los_Angeles', fetchedAt: '2026-10-25T12:00:00Z', effectiveRange: { startDate: '2026-10-01', endDate: '2026-10-25' }, days: [{ date: '2026-10-24', clicks: 1 }, { date: '2026-10-23', clicks: 1 }], selectedDate: '2026-10-24', availability: { clicks: true, locations: true, ads: true }, warnings: [], records: [{ recordId: 'record-1', gclid: 'full-test-gclid-123', date: '2026-10-24', campaignId: '2', campaign: 'Lima', adGroup: 'Chatbots', adResource: ref, keyword: 'chatbot con inteligencia artificial', matchType: 'PHRASE', device: 'MOBILE', network: 'SEARCH', location: { city: 'Soacha', region: null, country: 'Colombia' }, clicks: 1 }], ads: { [ref]: { adId: '9', finalUrl: 'https://robles.ai/get-started', headlines: ['{KeyWord:Chatbot Para Empresas}', 'Atención al cliente'], descriptions: ['Build your chatbot.'], path: 'ia/chatbots' } } };
function show(value: AdsClickReport | Error = report) {
  const keys: string[] = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, queryFn: ({ queryKey }) => { const key = String(queryKey[0]); keys.push(key); if (value instanceof Error) throw value; if (key.includes('clickDate=2026-10-23')) return { ...value, selectedDate: '2026-10-23', records: value.records.map(row => ({ ...row, date: '2026-10-23' })) }; return value; } } } });
  render(<QueryClientProvider client={client}><GoogleAdsClicks dateRange={{ startDate: '2026-10-01', endDate: '2026-10-25', label: 'Test' }} campaignId="2" /></QueryClientProvider>);
  return keys;
}
it('shows real click identifiers and labels the preview as illustrative current assets', async () => {
  const keys = show();
  await screen.findByText('full-test-gclid-123', { selector: 'code' });
  expect(screen.getAllByText('Soacha, Colombia')[0]).toBeInTheDocument();
  fireEvent.click(screen.getByText('Expand for full ID and ad details'));
  expect(screen.getByRole('region', { name: 'Illustrative ad reconstruction' })).toBeVisible();
  expect(screen.getByText('Chatbot Para Empresas | Atención al cliente')).toBeInTheDocument();
  expect(screen.getByText(/not the exact historical headline combination/)).toBeInTheDocument();
  expect(screen.getByText('Not provided by ClickView')).toBeInTheDocument();
  expect(screen.getByText(/Not supplied per GCLID/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open current landing page' })).toHaveAttribute('href', 'https://robles.ai/get-started');
  expect(keys[0]).toContain('campaignId=2');
});
it('requests the chosen day and updates the record list', async () => {
  const keys = show(); await screen.findByLabelText('ClickView day');
  fireEvent.change(screen.getByLabelText('ClickView day'), { target: { value: '2026-10-23' } });
  await screen.findByText(/1 record for 2026-10-23/);
  expect(keys.some(key => key.includes('clickDate=2026-10-23'))).toBe(true);
});
it('distinguishes unsupported historical ranges from a zero-click result', async () => {
  show({ ...report, effectiveRange: null, records: [], days: [], selectedDate: null, availability: { ...report.availability, clicks: false } });
  await screen.findByText(/selected period is outside the available ClickView window/);
  expect(screen.queryByText(/No ClickView records returned/)).not.toBeInTheDocument();
});
it('preserves explicit unavailable status when a daily query fails', async () => {
  show({ ...report, records: [], availability: { ...report.availability, clicks: false } });
  await screen.findByText(/The click request failed/);
  expect(screen.queryByText(/No ClickView records returned/)).not.toBeInTheDocument();
});
it('handles total endpoint failure without fabricated click records', async () => {
  show(new Error('offline')); await screen.findByText(/Click records are unavailable/);
  expect(screen.queryByText('full-test-gclid-123')).not.toBeInTheDocument();
});
it('paginates click records', async () => {
  show({ ...report, records: Array.from({ length: 11 }, (_, index) => ({ ...report.records[0], recordId: `row-${index}`, gclid: `click-id-${index}` })) });
  await screen.findByText('click-id-0', { selector: 'code' });
  expect(screen.queryByText('click-id-10')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next click records' }));
  await waitFor(() => expect(screen.getByText('click-id-10', { selector: 'code' })).toBeInTheDocument());
  expect(screen.queryByText('click-id-0')).not.toBeInTheDocument();
});
