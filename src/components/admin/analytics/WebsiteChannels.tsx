import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { WebsiteChannelsReport } from '@shared/adsAnalytics';
import type { DateRange } from './DateRangeSelector';

export default function WebsiteChannels({ dateRange }: { dateRange: DateRange }) {
  const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate });
  const { data, isLoading, isError } = useQuery<WebsiteChannelsReport & { error?: string }>({ queryKey: [`/api/admin/analytics/channels?${params}`], staleTime: 5 * 60 * 1000 });
  const channels = data?.channels || [];
  const sessions = channels.reduce((sum, row) => sum + row.sessions, 0);
  const paidSessions = channels.filter(row => row.paid).reduce((sum, row) => sum + row.sessions, 0);
  return <Card><CardHeader><CardTitle className="text-base">Website traffic · all sources</CardTitle><CardDescription>All website traffic in the selected date range, including history before your current campaigns. Paid classification alone does not attribute sessions to a particular Ads account. Key events include all configured event types and are not a lead count.</CardDescription></CardHeader><CardContent>
    {isLoading ? <Skeleton className="h-32 w-full" /> : isError || data?.error ? <p role="status" className="text-sm text-muted-foreground">Website channel data is unavailable. Check the GA4 connection.</p> : channels.length === 0 ? <p className="text-sm text-muted-foreground">No website sessions returned for these dates.</p> : <>
      <p className="mb-3 text-sm text-muted-foreground">Paid channels: {paidSessions.toLocaleString()} of {sessions.toLocaleString()} sessions ({sessions ? (paidSessions / sessions * 100).toFixed(1) : '0'}%).</p>
      <div className="overflow-x-auto"><table className="w-full text-sm" aria-label="Website channels, all sources"><thead><tr className="border-b"><th className="py-2 text-left">Channel</th><th className="py-2 text-right">Sessions</th><th className="py-2 text-right">Key events (all types)</th><th className="py-2 text-right">Session key event rate</th></tr></thead><tbody>
        {channels.map(row => <tr key={row.channelGroup} className="border-b last:border-0"><td className="py-2">{row.channelGroup} {row.paid && <Badge variant="secondary">Paid</Badge>}</td><td className="py-2 text-right tabular-nums">{row.sessions.toLocaleString()}</td><td className="py-2 text-right tabular-nums">{row.keyEvents.toLocaleString()}</td><td className="py-2 text-right tabular-nums">{row.sessionKeyEventRate === null ? '—' : `${(row.sessionKeyEventRate * 100).toFixed(1)}%`}</td></tr>)}
      </tbody></table></div><p className="mt-3 text-xs text-muted-foreground">Session key event rate comes directly from GA4: the percentage of sessions with at least one key event. Repeated events do not turn this percentage into a value above 100%.</p>
    </>}
  </CardContent></Card>;
}
