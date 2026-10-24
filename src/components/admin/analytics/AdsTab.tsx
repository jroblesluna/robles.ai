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
import type { DateRange } from "./DateRangeSelector";

// --- Types matching /api/admin/analytics/ads/* ---

interface GoogleAdsCampaignRow {
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  sessions: number;
  keyEvents: number;
}

interface ChannelRow {
  channelGroup: string;
  sessions: number;
  keyEvents: number;
  paid: boolean;
}

interface GoogleAdsResponse {
  currency: string | null;
  totals: { impressions: number; clicks: number; cost: number; sessions: number; keyEvents: number };
  campaigns: GoogleAdsCampaignRow[];
  daily: Array<{ date: string; cost: number; clicks: number }>;
  channels: ChannelRow[];
  warnings?: string[];
  error?: string;
}

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

const formatNumber = (n: number) => Math.round(n).toLocaleString();

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
}

function CampaignTable({
  rows,
  currency,
  resultsLabel,
  label,
}: {
  rows: TableRow[];
  currency: string | null | undefined;
  resultsLabel: string;
  label: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No campaigns with activity in this period.</p>;
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
              <td className="break-anywhere py-2 pr-3">{r.name}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(r.spend, currency)}</td>
              <td className="py-2 text-right tabular-nums">{formatNumber(r.impressions)}</td>
              <td className="py-2 text-right tabular-nums">{formatNumber(r.clicks)}</td>
              <td className="py-2 text-right tabular-nums">
                {r.impressions > 0 ? `${((r.clicks / r.impressions) * 100).toFixed(2)}%` : "—"}
              </td>
              <td className="py-2 text-right tabular-nums">{moneyPer(r.spend, r.clicks, currency)}</td>
              <td className="py-2 text-right tabular-nums">{formatNumber(r.results)}</td>
              <td className="py-2 text-right tabular-nums">{moneyPer(r.spend, r.results, currency)}</td>
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
}: {
  isLoading: boolean;
  currency: string | null | undefined;
  spend: number;
  clicks: number;
  impressions: number;
  results: number;
  resultsLabel: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Spend" value={formatMoney(spend, currency)} isLoading={isLoading} />
      <KpiCard label="Impressions" value={impressions} format="number" isLoading={isLoading} />
      <KpiCard label="Clicks" value={clicks} format="number" isLoading={isLoading} />
      <KpiCard label="Avg. CPC" value={moneyPer(spend, clicks, currency)} isLoading={isLoading} />
      <KpiCard label={resultsLabel} value={results} format="number" isLoading={isLoading} />
      <KpiCard label="Cost / result" value={moneyPer(spend, results, currency)} isLoading={isLoading} />
    </div>
  );
}

// --- Sections ---

function GoogleAdsSection({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading, isError } = useQuery<GoogleAdsResponse>({
    queryKey: [`/api/admin/analytics/ads/google?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    staleTime: 5 * 60 * 1000,
  });

  const notConfigured = data?.error === "GA4 not configured";
  const failed = isError || (!!data?.error && !notConfigured);
  const currency = data?.currency;
  const totals = data?.totals;
  const hasCampaigns = (data?.campaigns?.length ?? 0) > 0;

  const chartData = (data?.daily ?? []).map((d) => ({
    displayDate: shortDate(d.date, "yyyyMMdd"),
    spend: d.cost,
    clicks: d.clicks,
  }));

  return (
    <section className="space-y-4" aria-labelledby="google-ads-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="google-ads-heading" className="text-lg font-semibold">Google Ads</h2>
        <Badge variant="outline">via GA4</Badge>
        {currency && <Badge variant="secondary">{currency}</Badge>}
      </div>

      {notConfigured && (
        <Notice>
          GA4 is not configured. Set the Property ID and upload the Service Account in{" "}
          <Link href="/admin/settings" className="underline">Settings</Link>.
        </Notice>
      )}
      {failed && <Notice>Could not load Google Ads data: {String(data?.error ?? "request failed")}</Notice>}
      {data?.warnings?.length ? (
        <Notice tone="muted">Some figures are incomplete: {data.warnings.join(" · ")}</Notice>
      ) : null}
      {!isLoading && !notConfigured && !failed && !hasCampaigns && (
        <Notice tone="muted">
          No Google Ads activity in this period. If campaigns are running, check that the Google Ads account is
          linked to this GA4 property (GA4 → Admin → Product links → Google Ads). Imported cost can take up to a day to appear.
        </Notice>
      )}

      {!notConfigured && (
        <>
          <KpiRow
            isLoading={isLoading}
            currency={currency}
            spend={totals?.cost ?? 0}
            clicks={totals?.clicks ?? 0}
            impressions={totals?.impressions ?? 0}
            results={totals?.keyEvents ?? 0}
            resultsLabel="Key events"
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
              <CardDescription>Results are GA4 key events (e.g. generate_lead) from sessions of each campaign.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <CampaignTable
                  label="Google Ads campaigns"
                  currency={currency}
                  resultsLabel="Key events"
                  rows={(data?.campaigns ?? []).map((c) => ({
                    key: c.campaign,
                    name: c.campaign,
                    spend: c.cost,
                    impressions: c.impressions,
                    clicks: c.clicks,
                    results: c.keyEvents,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ChannelsCard channels={data?.channels ?? []} isLoading={isLoading} hidden={notConfigured} />
    </section>
  );
}

function ChannelsCard({ channels, isLoading, hidden }: { channels: ChannelRow[]; isLoading: boolean; hidden: boolean }) {
  if (hidden) return null;
  const totalSessions = channels.reduce((s, c) => s + c.sessions, 0);
  const paid = channels.filter((c) => c.paid);
  const paidSessions = paid.reduce((s, c) => s + c.sessions, 0);
  const paidResults = paid.reduce((s, c) => s + c.keyEvents, 0);
  const allResults = channels.reduce((s, c) => s + c.keyEvents, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paid vs. organic (all sources)</CardTitle>
        <CardDescription>
          {totalSessions > 0
            ? `Paid channels: ${formatNumber(paidSessions)} of ${formatNumber(totalSessions)} sessions (${((paidSessions / totalSessions) * 100).toFixed(0)}%), ${formatNumber(paidResults)} of ${formatNumber(allResults)} key events.`
            : "Sessions and key events by channel, from GA4."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : channels.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No sessions in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Sessions and key events by channel">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Channel</th>
                  <th className="py-2 text-right font-medium">Sessions</th>
                  <th className="py-2 text-right font-medium">Key events</th>
                  <th className="py-2 text-right font-medium">Conv. rate</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.channelGroup} className="border-b last:border-0">
                    <td className="py-2">
                      {c.channelGroup}{" "}
                      {c.paid && <Badge variant="secondary" className="ml-1">Paid</Badge>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(c.sessions)}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(c.keyEvents)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {c.sessions > 0 ? `${((c.keyEvents / c.sessions) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
