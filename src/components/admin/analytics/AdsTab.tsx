import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import KpiCard from "./KpiCard";
import GoogleAdsInsights from "./GoogleAdsInsights";
import type { DateRange } from "./DateRangeSelector";

// --- Types matching /api/admin/analytics/ads/* ---

import type { AdsReport, LeadSignalsReport, LeadForm } from "@shared/adsAnalytics";

interface MetaAdsCampaignRow {
  campaignId: string;
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
}

interface MetaAdsResponse {
  account?: { id: string; name: string | null; currency: string | null };
  totals?: { spend: number; impressions: number; clicks: number; leads: number };
  campaigns?: MetaAdsCampaignRow[];
  daily?: Array<{ date: string; spend: number; clicks: number; leads: number }>;
  error?: true | string;
  code?: "NOT_CONFIGURED" | "TOKEN_EXPIRED" | "API_ERROR";
  message?: string;
}

// --- Formatting helpers ---

function formatMoney(value: number, currency: string | null | undefined): string {
  if (!currency) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

const formatNumber = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Ratio as money, or an em dash when the denominator is zero. */
function moneyPer(total: number, count: number, currency: string | null | undefined): string {
  return count > 0 ? formatMoney(total / count, currency) : "—";
}

function shortDate(raw: string, pattern: "yyyyMMdd" | "yyyy-MM-dd"): string {
  try {
    return format(parse(raw, pattern, new Date()), "MMM d");
  } catch {
    return raw;
  }
}

const COLORS = { spend: "hsl(var(--primary))", clicks: "#10b981" };

// --- Small building blocks ---

function Notice({ tone = "amber", children }: { tone?: "amber" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
      : "bg-muted/40 text-muted-foreground";
  return (
    <Card className={cls}>
      <CardContent className="p-4 text-sm">{children}</CardContent>
    </Card>
  );
}

function SpendChart({
  data,
  currency,
}: {
  data: Array<{ displayDate: string; spend: number; clicks: number }>;
  currency: string | null | undefined;
}) {
  if (data.length === 0 || data.every((d) => d.spend === 0 && d.clicks === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No spend in this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="spend" tick={{ fontSize: 12 }} width={56} />
        <YAxis yAxisId="clicks" orientation="right" tick={{ fontSize: 12 }} width={40} />
        <Tooltip
          formatter={(value, name) =>
            name === "Spend" ? [formatMoney(Number(value), currency), name] : [formatNumber(Number(value)), name]
          }
        />
        <Legend />
        <Line yAxisId="spend" type="monotone" dataKey="spend" name="Spend" stroke={COLORS.spend} strokeWidth={2} dot={false} />
        <Line yAxisId="clicks" type="monotone" dataKey="clicks" name="Clicks" stroke={COLORS.clicks} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface TableRow {
  key: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  status?: string;
  dailyBudget?: number;
}

function CampaignTable({
  rows,
  currency,
  resultsLabel,
  label,
  costAvailable = true,
  resultsAvailable = true,
  emptyText = "No campaigns with activity in this period.",
}: {
  rows: TableRow[];
  currency: string | null | undefined;
  resultsLabel: string;
  label: string;
  costAvailable?: boolean;
  resultsAvailable?: boolean;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm" aria-label={label}>
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left font-medium">Campaign</th>
            <th className="py-2 text-right font-medium">Spend</th>
            <th className="py-2 text-right font-medium">Impr.</th>
            <th className="py-2 text-right font-medium">Clicks</th>
            <th className="py-2 text-right font-medium">CTR</th>
            <th className="py-2 text-right font-medium">CPC</th>
            <th className="py-2 text-right font-medium">{resultsLabel}</th>
            <th className="py-2 text-right font-medium">Cost / result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="break-anywhere py-2 pr-3">{r.name}{r.status && <span className="mt-1 block text-xs text-muted-foreground">{r.status} · Average daily budget {formatMoney(r.dailyBudget || 0, currency)}</span>}</td>
              <td className="py-2 text-right tabular-nums">{costAvailable ? formatMoney(r.spend, currency) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{costAvailable ? formatNumber(r.impressions) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{costAvailable ? formatNumber(r.clicks) : "—"}</td>
              <td className="py-2 text-right tabular-nums">
                {costAvailable && r.impressions > 0 ? `${((r.clicks / r.impressions) * 100).toFixed(2)}%` : "—"}
              </td>
              <td className="py-2 text-right tabular-nums">{costAvailable ? moneyPer(r.spend, r.clicks, currency) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{resultsAvailable ? formatNumber(r.results) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{costAvailable && resultsAvailable ? moneyPer(r.spend, r.results, currency) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiRow({
  isLoading,
  currency,
  spend,
  clicks,
  impressions,
  results,
  resultsLabel,
  costAvailable = true,
  resultsAvailable = true,
}: {
  isLoading: boolean;
  currency: string | null | undefined;
  spend: number;
  clicks: number;
  impressions: number;
  results: number;
  resultsLabel: string;
  costAvailable?: boolean;
  resultsAvailable?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Spend" value={costAvailable ? formatMoney(spend, currency) : "—"} isLoading={isLoading} />
      <KpiCard label="Impressions" value={costAvailable ? impressions : "—"} format={costAvailable ? "number" : undefined} isLoading={isLoading} />
      <KpiCard label="Clicks" value={costAvailable ? clicks : "—"} format={costAvailable ? "number" : undefined} isLoading={isLoading} />
      <KpiCard label="Avg. CPC" value={costAvailable ? moneyPer(spend, clicks, currency) : "—"} isLoading={isLoading} />
      <KpiCard label={resultsLabel} value={resultsAvailable ? formatNumber(results) : "—"} isLoading={isLoading} />
      <KpiCard label="Cost / result" value={costAvailable && resultsAvailable ? moneyPer(spend, results, currency) : "—"} isLoading={isLoading} />
    </div>
  );
}

// --- Sections ---

export function GoogleAdsSection({ dateRange }: { dateRange: DateRange }) {
  const [campaignId, setCampaignId] = useState("all");
  const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate, campaignId });
  const { data, isLoading, isError } = useQuery<AdsReport & { error?: string }>({
    queryKey: [`/api/admin/analytics/ads/google?${params}`], staleTime: 5 * 60 * 1000,
  });
  const failed = isError || !!data?.error;
  const direct = data?.source === "google_ads_api";
  const costAvailable = !failed && !!data?.availability?.cost;
  const resultsAvailable = !failed && !!data?.availability?.results;
  const resultLabel = direct ? "Conversions (Ads)" : "Key events (GA4)";
  const [lastOptions, setLastOptions] = useState<AdsReport['campaignOptions']>([]);
  useEffect(() => { if (data?.campaignOptions) setLastOptions(data.campaignOptions); }, [data?.campaignOptions]);
  const options = data?.campaignOptions || lastOptions;
  return (
    <section className="space-y-4" aria-labelledby="google-ads-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="google-ads-heading" className="text-lg font-semibold">Google Ads</h2>
          {data?.source && <Badge variant="outline">{direct ? "Direct API" : "Imported via GA4"}</Badge>}
          {data?.accountId && <span className="text-xs text-muted-foreground">Account {data.accountId}</span>}
          {data?.currency && <Badge variant="secondary">{data.currency}</Badge>}
          {data?.fetchedAt && <time dateTime={data.fetchedAt} className="text-xs text-muted-foreground">Fetched {new Date(data.fetchedAt).toLocaleString()}</time>}
        </div>
        <label className="flex items-center gap-2 text-sm">Campaign
          <select aria-label="Google Ads campaign" value={campaignId} onChange={e => setCampaignId(e.target.value)} className="h-10 max-w-[280px] rounded-md border bg-background px-3">
            <option value="all">All campaigns in this account</option>
            {campaignId !== "all" && !options.some(c => c.campaignId === campaignId) && <option value={campaignId}>Campaign {campaignId}</option>}
            {options.map(c => <option key={c.campaignId} value={c.campaignId}>{c.campaign}</option>)}
          </select>
        </label>
      </div>
      {failed && <Notice>Google Ads data unavailable. {data?.error || "The request failed. Try Refresh or check the connection in Settings."}</Notice>}
      {!failed && !isLoading && !direct && <Notice tone="muted">These figures are imported through GA4 and may lag behind Google Ads. Connect the direct Google Ads API in <Link href="/admin/settings" className="underline">Settings</Link> for campaign spend and conversions. An empty GA4 report does not confirm zero spend.</Notice>}
      {data?.warnings?.map(warning => <Notice key={warning}>{warning}</Notice>)}
      {!failed && <>
        <KpiRow isLoading={isLoading} currency={data?.currency} spend={data?.totals.cost || 0} clicks={data?.totals.clicks || 0} impressions={data?.totals.impressions || 0} results={data?.totals.results || 0} resultsLabel={resultLabel} costAvailable={costAvailable} resultsAvailable={resultsAvailable} />
        <Card><CardHeader><CardTitle className="text-base">Daily spend · selected campaign filter</CardTitle></CardHeader><CardContent>
          {isLoading ? <Skeleton className="h-[260px] w-full" /> : !data?.availability.daily ? <p role="status" className="py-8 text-sm text-muted-foreground">Daily spend is unavailable because its data request failed.</p> : <SpendChart currency={data.currency} data={data.daily.map(d => ({ displayDate: shortDate(d.date, direct ? "yyyy-MM-dd" : "yyyyMMdd"), spend: d.cost, clicks: d.clicks }))} />}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Campaigns</CardTitle><CardDescription>{direct ? "Conversions are attributed by Google Ads according to the account's configured conversion goals." : "GA4 key events are engagement signals of all configured types; they are not a count of qualified leads."}</CardDescription></CardHeader><CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : !costAvailable && !resultsAvailable ? <p className="text-sm text-muted-foreground">Campaign metrics are unavailable.</p> : <CampaignTable label="Google Ads campaigns" currency={data?.currency} resultsLabel={resultLabel} costAvailable={costAvailable} resultsAvailable={resultsAvailable} emptyText={direct ? "No campaigns match this filter." : "No campaigns attributed to this Ads account were returned by GA4 for these dates."} rows={(data?.campaigns || []).map(c => ({ key: c.campaignId, name: c.campaign, spend: c.cost, impressions: c.impressions, clicks: c.clicks, results: c.results, status: c.status, dailyBudget: c.dailyBudget }))} />}
        </CardContent></Card>
      </>}
      {!failed && direct && <GoogleAdsInsights dateRange={dateRange} campaignId={campaignId} currency={data?.currency || null} />}
      <LeadSignals dateRange={dateRange} campaignId={campaignId} />
    </section>
  );
}

function LeadSignals({ dateRange, campaignId }: { dateRange: DateRange; campaignId: string }) {
  const [form, setForm] = useState<LeadForm>("all");
  const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate, campaignId, form });
  const { data, isLoading, isError } = useQuery<LeadSignalsReport & { error?: string }>({ queryKey: [`/api/admin/analytics/ads/leads?${params}`], staleTime: 5 * 60 * 1000 });
  const unavailable = isError || !!data?.error || data?.count === null;
  return <Card><CardHeader><CardTitle className="text-base">Website submissions from Google Ads · GA4</CardTitle><CardDescription>Counts generate_lead events attributed in GA4 to the selected Ads account/campaign and dates. Contact means the server accepted the form; quiz registrations can precede email verification. These are not qualified leads.</CardDescription></CardHeader><CardContent className="space-y-3">
    <label className="flex flex-wrap items-center gap-2 text-sm">Submission type
      <select aria-label="Lead submission type" value={form} onChange={e => setForm(e.target.value as LeadForm)} className="h-10 max-w-full rounded-md border bg-background px-3">
        <option value="all">All submissions</option>
        <option value="contact" disabled={!data?.segmentationAvailable}>Contact forms accepted</option>
        <option value="quiz" disabled={!data?.segmentationAvailable}>Quiz registrations (email not verified)</option>
      </select>
    </label>
    {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-semibold">{unavailable ? "Unavailable" : formatNumber(data?.count || 0)}</p>}
    {(isError || data?.error) && <p role="status" className="text-sm text-muted-foreground">GA4 submission data is unavailable. Check the GA4 connection and event definitions.</p>}
    {data?.warnings?.map(warning => <p key={warning} className="text-sm text-muted-foreground">{warning}</p>)}
  </CardContent></Card>;
}

function MetaAdsSection({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading, isError } = useQuery<MetaAdsResponse>({
    queryKey: [`/api/admin/analytics/ads/meta?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    staleTime: 5 * 60 * 1000,
  });

  const code = data?.error === true ? data.code : undefined;
  const notConfigured = code === "NOT_CONFIGURED";
  const failed = isError || (!!data?.error && !notConfigured);
  const currency = data?.account?.currency;
  const totals = data?.totals;

  const chartData = (data?.daily ?? []).map((d) => ({
    displayDate: shortDate(d.date, "yyyy-MM-dd"),
    spend: d.spend,
    clicks: d.clicks,
  }));

  return (
    <section className="space-y-4" aria-labelledby="meta-ads-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="meta-ads-heading" className="text-lg font-semibold">Meta Ads</h2>
        <Badge variant="outline">Facebook · Instagram</Badge>
        {data?.account?.name && <Badge variant="secondary" className="break-anywhere">{data.account.name}</Badge>}
        {currency && <Badge variant="secondary">{currency}</Badge>}
      </div>

      {notConfigured && (
        <Notice tone="muted">
          Meta Ads is not connected. Add the Ad Account ID and an access token with <code>ads_read</code> in{" "}
          <Link href="/admin/settings" className="underline">Settings → Meta Ads</Link>.
        </Notice>
      )}
      {failed && (
        <Notice>
          {code === "TOKEN_EXPIRED"
            ? "The Meta Ads token expired or lacks ads_read. Generate a new one and save it in Settings."
            : `Could not load Meta Ads data: ${data?.message ?? (typeof data?.error === "string" ? data.error : "request failed")}`}
        </Notice>
      )}

      {!notConfigured && !failed && (
        <>
          <KpiRow
            isLoading={isLoading}
            currency={currency}
            spend={totals?.spend ?? 0}
            clicks={totals?.clicks ?? 0}
            impressions={totals?.impressions ?? 0}
            results={totals?.leads ?? 0}
            resultsLabel="Leads"
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily spend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[260px] w-full" /> : <SpendChart data={chartData} currency={currency} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaigns</CardTitle>
              <CardDescription>Leads as attributed by Meta (Pixel + Conversions API).</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <CampaignTable
                  label="Meta Ads campaigns"
                  currency={currency}
                  resultsLabel="Leads"
                  rows={(data?.campaigns ?? []).map((c) => ({
                    key: c.campaignId || c.campaign,
                    name: c.campaign,
                    spend: c.spend,
                    impressions: c.impressions,
                    clicks: c.clicks,
                    results: c.leads,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

// --- Tab ---

export default function AdsTab({ dateRange }: { dateRange: DateRange }) {
  return (
    <div className="space-y-10">
      <GoogleAdsSection dateRange={dateRange} />
      <MetaAdsSection dateRange={dateRange} />
    </div>
  );
}
