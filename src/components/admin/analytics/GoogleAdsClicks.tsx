import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdsClickReport, AdsClickRecord, ClickAdAssets } from '@shared/adsAnalytics';
import type { DateRange } from './DateRangeSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
const labels: Record<string, string> = { MOBILE: 'Mobile', DESKTOP: 'Desktop', TABLET: 'Tablet', CONNECTED_TV: 'Connected TV', SEARCH: 'Google Search', SEARCH_PARTNERS: 'Search partners', CONTENT: 'Display', PHRASE: 'Phrase', EXACT: 'Exact', BROAD: 'Broad' };
const label = (value: string | null) => value ? labels[value] || value : 'Not provided';
const insertDefault = (text: string) => text.replace(/\{keyword:([^}]+)\}/gi, '$1');
function AdPreview({ ad }: { ad: ClickAdAssets | undefined }) {
  if (!ad || !ad.headlines.length) return <p className="text-sm text-muted-foreground">Current ad assets are unavailable. No historical preview can be reconstructed from this record.</p>;
  const host = ad.finalUrl ? new URL(ad.finalUrl).host : 'Destination not provided';
  return <section aria-label="Illustrative ad reconstruction" className="min-w-0 space-y-3">
    <h4 className="font-medium">Illustrative ad reconstruction</h4>
    <p className="text-xs text-muted-foreground">Uses the ad’s current assets, not the exact historical headline combination or appearance. Keyword insertion uses its default text here. Location, personalization and assets may have changed since this click.</p>
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-xs font-semibold">Sponsored · illustrative preview</p>
      <p className="mt-2 break-all text-sm">{host}{ad.path ? ` / ${ad.path}` : ''}</p>
      <p className="mt-2 break-words text-xl text-blue-700 dark:text-blue-400">{ad.headlines.slice(0, 3).map(insertDefault).join(' | ')}</p>
      <p className="mt-2 break-words text-sm">{ad.descriptions.slice(0, 2).map(insertDefault).join(' ')}</p>
    </div>
    <p className="text-xs text-muted-foreground">Ad ID: {ad.adId}</p>
    {ad.finalUrl && <a href={ad.finalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline">Open current landing page</a>}
    <details className="text-sm"><summary className="cursor-pointer py-2">All current ad text assets</summary><ul className="list-disc space-y-1 pl-5">{[...ad.headlines, ...ad.descriptions].map((text, index) => <li className="break-words" key={index}>{text}</li>)}</ul></details>
  </section>;
}
function RecordDetails({ row, ad, timeZone }: { row: AdsClickRecord; ad?: ClickAdAssets; timeZone: string }) {
  const location = [row.location.city, row.location.region, row.location.country].filter(Boolean).join(', ') || 'Not provided';
  return <details className="min-w-0 rounded-lg border bg-background open:shadow-sm">
    <summary className="cursor-pointer p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="ml-1 inline-grid w-[calc(100%-1.5rem)] items-start gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <span><time dateTime={row.date} className="font-medium">{row.date}</time><span className="mt-1 block text-xs text-muted-foreground">{row.clicks} reported click{row.clicks === 1 ? '' : 's'}</span></span>
        <span className="min-w-0 break-words">{row.keyword || 'Keyword not provided'}<span className="mt-1 block text-xs text-muted-foreground">{label(row.matchType)} · {label(row.device)}</span></span>
        <span className="min-w-0 break-words">{location}</span>
        <span className="min-w-0"><code className="block truncate">{row.gclid || 'GCLID not provided'}</code><span className="mt-1 block text-xs text-muted-foreground">Expand for full ID and ad details</span></span>
      </span>
    </summary>
    <div className="grid min-w-0 gap-6 border-t p-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-4 text-sm">
        <h4 className="font-medium">Google Ads click record</h4>
        <dl className="space-y-3">{[
          ['GCLID', row.gclid || 'Not provided'], ['Date', `${row.date} (${timeZone})`], ['Exact time', 'Not provided by ClickView'],
          ['Campaign', row.campaign], ['Campaign ID', row.campaignId], ['Ad group', row.adGroup], ['Triggered keyword', row.keyword || 'Not provided'],
          ['Match type', label(row.matchType)], ['Device', label(row.device)], ['Network', label(row.network)], ['Approximate user presence', location],
          ['Search query', 'Not supplied per GCLID. Use the separate Search terms report; its rows are not linked to individual click records.'],
          ['Individual click cost', 'Not provided by ClickView. Campaign spend and CPC are reported separately.'],
        ].map(([name, value]) => <div key={name}><dt className="text-xs text-muted-foreground">{name}</dt><dd className="break-words [overflow-wrap:anywhere]">{value || 'Not provided'}</dd></div>)}</dl>
      </div>
      <AdPreview ad={ad} />
    </div>
  </details>;
}
export default function GoogleAdsClicks({ dateRange, campaignId }: { dateRange: DateRange; campaignId: string }) {
  const [clickDate, setClickDate] = useState('');
  const [page, setPage] = useState(0);
  const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate, campaignId });
  if (clickDate) params.set('clickDate', clickDate);
  const { data, isLoading, isError } = useQuery<AdsClickReport & { error?: string }>({ queryKey: [`/api/admin/analytics/ads/google/clicks?${params}`], staleTime: 5 * 60 * 1000 });
  const records = data?.records || [];
  const size = 10;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(records.length / size) - 1));
  return <Card className="min-w-0" id="google-ads-clicks"><CardHeader>
    <div className="flex flex-wrap items-start justify-between gap-3"><CardTitle className="text-base">Individual clicks · ClickView</CardTitle><a href="https://developers.google.com/google-ads/api/reference/rpc/v26/ClickView" target="_blank" rel="noopener noreferrer" className="text-xs underline">About ClickView</a></div>
    <CardDescription>Google Ads records for the selected campaign and dates, queried one day at a time within the latest 90 days. A GCLID identifies a click record, not a person, and can represent more than one interaction. Exact time and the historical ad rendering are not provided.</CardDescription>
  </CardHeader><CardContent className="space-y-4">
    {isLoading ? <Skeleton className="h-32 w-full" /> : isError || data?.error || !data ? <p role="status" className="text-sm text-muted-foreground">Click records are unavailable. Try Refresh or check the direct Google Ads connection.</p> : <>
      {data.warnings.map(warning => <p key={warning} role="status" className="rounded border border-amber-300 p-3 text-sm">{warning}</p>)}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {data.days.length > 0 && <label className="flex flex-wrap items-center gap-2">Day with clicks
          <select aria-label="ClickView day" value={data.selectedDate || ''} className="min-h-11 rounded-md border bg-background px-3" onChange={event => { setClickDate(event.target.value); setPage(0); }}>
            {data.selectedDate && !data.days.some(day => day.date === data.selectedDate) && <option value={data.selectedDate}>{data.selectedDate}</option>}
            {data.days.map(day => <option key={day.date} value={day.date}>{day.date} · {day.clicks} click{day.clicks === 1 ? '' : 's'}</option>)}
          </select>
        </label>}
        <span className="text-xs text-muted-foreground">Account {data.accountId} · {data.timeZone}</span>
      </div>
      {!data.effectiveRange ? <p className="text-sm text-muted-foreground">The selected period is outside the available ClickView window. Select recent dates to load records.</p> : !data.availability.clicks ? <p role="status" className="text-sm text-muted-foreground">The click request failed. These values are unavailable, not zero.</p> : !records.length ? <p className="text-sm text-muted-foreground">No ClickView records returned for {data.selectedDate || 'the selected period'}. Privacy, coverage or reporting delays can make this differ from campaign click totals.</p> : <>
        <p className="text-sm text-muted-foreground">{records.length} record{records.length === 1 ? '' : 's'} for {data.selectedDate}. Expand a record to inspect the full GCLID and current ad assets.</p>
        <div className="space-y-3">{records.slice(currentPage * size, (currentPage + 1) * size).map(row => <RecordDetails key={row.recordId} row={row} ad={row.adResource ? data.ads[row.adResource] : undefined} timeZone={data.timeZone} />)}</div>
        {records.length > size && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{currentPage * size + 1}–{Math.min((currentPage + 1) * size, records.length)} of {records.length}</span><div className="flex gap-2"><button type="button" className="tap-target rounded border px-3 py-2 disabled:opacity-50" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous click records</button><button type="button" className="tap-target rounded border px-3 py-2 disabled:opacity-50" disabled={(currentPage + 1) * size >= records.length} onClick={() => setPage(currentPage + 1)}>Next click records</button></div></div>}
      </>}
    </>}
  </CardContent></Card>;
}
