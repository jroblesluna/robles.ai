import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdsInsights, AdsMetrics, AdsSegment } from '@shared/adsAnalytics';
import type { DateRange } from './DateRangeSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const labels: Record<string, string> = {
  MOBILE: 'Mobile', DESKTOP: 'Desktop', TABLET: 'Tablet', CONNECTED_TV: 'Connected TV',
  SEARCH: 'Google Search', SEARCH_PARTNERS: 'Search partners', CONTENT: 'Display', MIXED: 'Mixed networks',
  MALE: 'Male', FEMALE: 'Female', UNDETERMINED: 'Unknown', UNKNOWN: 'Unknown',
  AGE_RANGE_18_24: '18–24', AGE_RANGE_25_34: '25–34', AGE_RANGE_35_44: '35–44', AGE_RANGE_45_54: '45–54',
  AGE_RANGE_55_64: '55–64', AGE_RANGE_65_UP: '65+', AGE_RANGE_UNDETERMINED: 'Unknown',
  PRESENCE: 'Presence', PRESENCE_OR_INTEREST: 'Presence or interest', SEARCH_INTEREST: 'Interest',
  PHRASE: 'Phrase', EXACT: 'Exact', BROAD: 'Broad',
};
const label = (value: string) => labels[value] || value;
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const money = (value: number, currency: string | null) => currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value) : value.toFixed(2);
function MetricCells({ row, currency }: { row: AdsMetrics; currency: string | null }) {
  return <><td className="p-2 text-right tabular-nums">{number(row.impressions)}</td><td className="p-2 text-right tabular-nums">{number(row.clicks)}</td><td className="p-2 text-right tabular-nums">{row.impressions ? `${(row.clicks / row.impressions * 100).toFixed(2)}%` : '—'}</td><td className="p-2 text-right tabular-nums">{money(row.cost, currency)}</td><td className="p-2 text-right tabular-nums">{number(row.results)}</td></>;
}
function MetricHead() { return <><th scope="col" className="p-2 text-right">Impressions</th><th scope="col" className="p-2 text-right">Clicks</th><th scope="col" className="p-2 text-right">CTR</th><th scope="col" className="p-2 text-right">Spend</th><th scope="col" className="p-2 text-right">Conversions</th></>; }
function PagedTable({ rows, name, currency, terms = false }: { rows: Array<AdsSegment | AdsInsights['terms'][number]>; name: string; currency: string | null; terms?: boolean }) {
  const [page, setPage] = useState(0);
  const size = 10;
  const last = Math.max(0, Math.ceil(rows.length / size) - 1);
  const current = Math.min(page, last);
  return <><div className="overflow-x-auto"><table aria-label={name} className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-muted-foreground"><th scope="col" className="p-2 text-left">{terms ? 'Search term / triggered keyword' : name}</th><MetricHead /></tr></thead><tbody>
    {rows.slice(current * size, (current + 1) * size).map((row, index) => <tr key={current * size + index} className="border-b last:border-0"><th scope="row" className="max-w-sm break-words p-2 text-left font-normal">{'term' in row ? <><span className="font-medium">{row.term}</span><span className="mt-1 block text-xs text-muted-foreground">{row.campaign} · {row.adGroup}</span><span className="block text-xs text-muted-foreground">Keyword: {row.keyword || 'Not disclosed'} · {label(row.matchType)}</span></> : label(row.label)}</th><MetricCells row={row} currency={currency} /></tr>)}
  </tbody></table></div>{rows.length > size && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{current * size + 1}–{Math.min((current + 1) * size, rows.length)} of {rows.length}</span><div className="flex gap-2"><button type="button" className="tap-target rounded border px-3 py-2 disabled:opacity-50" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={`Previous ${name} page`}>Previous</button><button type="button" className="tap-target rounded border px-3 py-2 disabled:opacity-50" disabled={current === last} onClick={() => setPage(current + 1)} aria-label={`Next ${name} page`}>Next</button></div></div>}</>;
}

export default function GoogleAdsInsights({ dateRange, campaignId, currency }: { dateRange: DateRange; campaignId: string; currency: string | null }) {
  const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate, campaignId });
  const { data, isLoading, isError } = useQuery<AdsInsights & { error?: string }>({ queryKey: [`/api/admin/analytics/ads/google/insights?${params}`], staleTime: 5 * 60 * 1000 });
  const [clickedOnly, setClickedOnly] = useState(false);
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || data?.error || !data) return <Card><CardHeader><CardTitle className="text-base">Search terms and audience details</CardTitle></CardHeader><CardContent><p role="status" className="text-sm text-muted-foreground">Google Ads details are unavailable. Try Refresh or check the direct API connection.</p></CardContent></Card>;
  const breakdown = (title: string, rows: AdsSegment[], available: boolean, description: string) => <Card key={title} className="min-w-0"><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{!available ? <p role="status" className="text-sm text-muted-foreground">This breakdown is unavailable because its request failed.</p> : rows.length ? <PagedTable key={`${params}:${title}`} name={title} rows={rows} currency={currency} /> : <p className="text-sm text-muted-foreground">No reported activity for this breakdown in the selected campaign and dates.</p>}</CardContent></Card>;
  const terms = clickedOnly ? data.terms.filter(row => row.clicks > 0) : data.terms;
  return <div className="space-y-4">
    {data.warnings.map(warning => <p key={warning} role="status" className="rounded border border-amber-300 p-3 text-sm">{warning}</p>)}
    <Card><CardHeader><CardTitle className="text-base">Search terms</CardTitle><CardDescription>Actual searches reported by Google, with the keyword that triggered the ad. Privacy thresholds can hide terms, so these rows may not add up to campaign totals. All activity below follows the selected campaign and dates. Impressions count ad displays, not unique people.</CardDescription></CardHeader><CardContent className="space-y-3">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={clickedOnly} onChange={event => setClickedOnly(event.target.checked)} />Only terms with clicks</label>
      {!data.availability.terms ? <p role="status">Search terms are unavailable because the request failed.</p> : terms.length ? <PagedTable key={`${params}:${clickedOnly}`} name="Search terms" rows={terms} terms currency={currency} /> : <p className="text-sm text-muted-foreground">No disclosed search terms match these filters. This does not prove zero impressions or clicks.</p>}
    </CardContent></Card>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {breakdown('Countries reached', data.countries, data.availability.geography, 'Approximate user presence reported by Google Ads, not configured target countries. Geographic coverage can be incomplete.')}
      {breakdown('Cities and regions reached', data.locations, data.availability.geography, 'Approximate location groups. These are aggregate reports, not individual visitors or exact addresses.')}
      {breakdown('Devices', data.devices, data.availability.devices, 'Devices on which ads were shown or clicked.')}
      {breakdown('Advertising networks', data.networks, data.availability.networks, 'Where Google served the ads, including Google Search and search partners when reported.')}
      {breakdown('Age groups', data.ages, data.availability.ages, 'Google-estimated age ranges. Unknown and unreported activity are not proof of a visitor’s identity; coverage may be incomplete.')}
      {breakdown('Gender groups', data.genders, data.availability.genders, 'Google-estimated aggregate demographics. Unknown and unreported activity may be present; these are not verified personal details.')}
    </div>
    <Card><CardHeader><CardTitle className="text-base">Current location targeting</CardTitle><CardDescription>Current configuration, independent of the selected historical dates. It does not establish which targeting was in effect when a past click occurred. Presence or interest can include people outside the selected location who show interest in it.</CardDescription></CardHeader><CardContent>
      {!data.availability.targeting ? <p role="status">Current location targeting is unavailable.</p> : data.targeting.length ? <div className="overflow-x-auto"><table aria-label="Current location targeting" className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b text-muted-foreground">{['Campaign', 'Location', 'Rule', 'Location matching'].map(heading => <th scope="col" className="p-2" key={heading}>{heading}</th>)}</tr></thead><tbody>{data.targeting.map((row, index) => <tr key={index} className="border-b last:border-0"><td className="p-2">{row.campaign}</td><td className="p-2">{row.location}</td><td className="p-2">{row.excluded ? 'Excluded' : 'Included'}</td><td className="p-2">{label(row.excluded ? row.exclusionPresence : row.presence)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No explicit location criteria returned. This alone does not establish the campaign’s full targeting.</p>}
    </CardContent></Card>
  </div>;
}
