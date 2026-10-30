import { useState } from "react";
import WebsiteChannels from "./WebsiteChannels";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Loader2, Monitor, Smartphone, Tablet, Tv, type LucideIcon } from "lucide-react";
import type { DateRange } from "./DateRangeSelector";

// --- Types matching backend response ---

interface PageData {
  pagePath: string;
  screenPageViews: number;
  averageSessionDuration: number;
}

interface TrafficSourceData {
  channelGroup: string;
  sessions: number;
  activeUsers: number;
}

interface CountryData {
  country: string;
  activeUsers: number;
}

interface DeviceData {
  deviceCategory: string;
  activeUsers: number;
}

interface TrafficResponse {
  topPages: PageData[];
  sources: TrafficSourceData[];
  countries: CountryData[];
  devices: DeviceData[];
  error?: string;
}

// --- Colors ---

const CHART_COLORS = [
  "hsl(var(--chart-1, 220 70% 50%))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

// Bar color for the ranked channel list (one hue: it encodes magnitude, not identity)
const SOURCE_BAR_COLOR = "#2a78d6";

// Fixed color per device so a filter never repaints the survivors
const DEVICE_STYLES: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  desktop: { label: "Desktop", color: "#2a78d6", icon: Monitor },
  mobile: { label: "Mobile", color: "#eb6834", icon: Smartphone },
  tablet: { label: "Tablet", color: "#1baf7a", icon: Tablet },
};
const DEVICE_FALLBACK = { color: "#6250d6", icon: Tv };

// --- Helpers ---

function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (part / total) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}

function deviceStyle(category: string) {
  const known = DEVICE_STYLES[category.toLowerCase()];
  if (known) return known;
  return { ...DEVICE_FALLBACK, label: category.charAt(0).toUpperCase() + category.slice(1) };
}

// --- Traffic sources: ranked bar list ---

function TrafficSourcesCard({ sources }: { sources: TrafficSourceData[] }) {
  const rows = [...sources].sort((a, b) => b.sessions - a.sessions);
  const totalSessions = rows.reduce((sum, s) => sum + s.sessions, 0);
  const totalUsers = rows.reduce((sum, s) => sum + s.activeUsers, 0);
  const max = rows[0]?.sessions || 1;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Traffic Sources</CardTitle>
            <CardDescription>Sessions by default channel group</CardDescription>
          </div>
          {rows.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums leading-none">{formatNumber(totalSessions)}</p>
              <p className="mt-1 text-xs text-muted-foreground">sessions · {formatNumber(totalUsers)} users</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No source data available.</p>
        ) : (
          <div role="table" aria-label="Sessions by traffic source" className="text-sm">
            <div role="row" className="grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem] gap-3 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span role="columnheader">Channel</span>
              <span role="columnheader" className="text-right">Sessions</span>
              <span role="columnheader" className="text-right">Share</span>
            </div>
            <ul className="divide-y">
              {rows.map((s) => (
                <li
                  key={s.channelGroup}
                  role="row"
                  title={`${s.channelGroup}: ${s.sessions.toLocaleString()} sessions, ${s.activeUsers.toLocaleString()} users`}
                  className="group grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem] items-center gap-3 rounded-sm py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div role="cell" className="min-w-0">
                    <p className="truncate font-medium">{s.channelGroup}</p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full opacity-80 transition-opacity group-hover:opacity-100"
                        style={{ width: `${Math.max((s.sessions / max) * 100, 1.5)}%`, backgroundColor: SOURCE_BAR_COLOR }}
                      />
                    </div>
                  </div>
                  <span role="cell" className="text-right tabular-nums">{formatNumber(s.sessions)}</span>
                  <span role="cell" className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(s.sessions, totalSessions)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Devices: segmented share bar + per-device tiles ---

function DeviceDistributionCard({ devices }: { devices: DeviceData[] }) {
  const [active, setActive] = useState<string | null>(null);
  const rows = [...devices].sort((a, b) => b.activeUsers - a.activeUsers);
  const total = rows.reduce((sum, d) => sum + d.activeUsers, 0);
  const visible = rows.filter((d) => d.activeUsers > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Device Distribution</CardTitle>
            <CardDescription>Active users by device category</CardDescription>
          </div>
          {rows.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums leading-none">{formatNumber(total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">active users</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No device data available.</p>
        ) : (
          <div className="space-y-6">
            <div
              className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={rows.map((d) => `${deviceStyle(d.deviceCategory).label} ${formatPercent(d.activeUsers, total)}`).join(", ")}
              onMouseLeave={() => setActive(null)}
            >
              {visible.map((d) => {
                const style = deviceStyle(d.deviceCategory);
                const dimmed = active !== null && active !== d.deviceCategory;
                return (
                  <div
                    key={d.deviceCategory}
                    title={`${style.label}: ${d.activeUsers.toLocaleString()} users (${formatPercent(d.activeUsers, total)})`}
                    onMouseEnter={() => setActive(d.deviceCategory)}
                    className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${(d.activeUsers / total) * 100}%`,
                      minWidth: 4,
                      backgroundColor: style.color,
                      opacity: dimmed ? 0.35 : 1,
                    }}
                  />
                );
              })}
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {rows.map((d) => {
                const style = deviceStyle(d.deviceCategory);
                const Icon = style.icon;
                const isActive = active === d.deviceCategory;
                return (
                  <li
                    key={d.deviceCategory}
                    onMouseEnter={() => setActive(d.deviceCategory)}
                    onMouseLeave={() => setActive(null)}
                    className={`rounded-lg border p-3 transition-colors ${isActive ? "bg-muted/60" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: style.color }} aria-hidden="true" />
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{style.label}</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums leading-none">
                      {formatPercent(d.activeUsers, total)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {d.activeUsers.toLocaleString()} users
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Formatting helpers ---

function truncatePath(path: string, maxLen = 30): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 3) + "...";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// Social platforms filter from traffic sources
const SOCIAL_PLATFORMS = ["linkedin", "instagram", "facebook", "twitter", "x", "youtube", "reddit", "pinterest"];

function extractSocialTraffic(sources: TrafficSourceData[]): { platform: string; sessions: number }[] {
  // Find the "Organic Social" or "Social" channel and look for platform-level data
  // Since GA4 groups by channelGroup, we filter sources that look like social platforms
  // If the source data has separate platform entries, use them; otherwise derive from social channel
  const socialSources = sources.filter(
    (s) => SOCIAL_PLATFORMS.some((p) => s.channelGroup.toLowerCase().includes(p))
  );

  if (socialSources.length > 0) {
    return socialSources.map((s) => ({ platform: s.channelGroup, sessions: s.sessions }));
  }

  // Fallback: show the Social channel group as a single bar
  const socialChannel = sources.find(
    (s) => s.channelGroup.toLowerCase().includes("social")
  );
  if (socialChannel) {
    return [{ platform: "Social", sessions: socialChannel.sessions }];
  }
  return [];
}

// --- Component ---

interface TrafficTabProps {
  dateRange: DateRange;
}

export default function TrafficTab({ dateRange }: TrafficTabProps) {
  const { data, isLoading, error } = useQuery<TrafficResponse>({
    queryKey: [`/api/admin/analytics/traffic?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">Failed to load traffic data: {error.message}</p>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Globe className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">GA4 Not Configured</h3>
        <p className="mt-1 text-sm text-muted-foreground">{data.error}</p>
      </div>
    );
  }

  const { topPages = [], sources = [], countries = [], devices = [] } = data || {};
  const socialTraffic = extractSocialTraffic(sources);

  // Compute total users for country percentage
  const totalCountryUsers = countries.reduce((sum, c) => sum + c.activeUsers, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2"><WebsiteChannels dateRange={dateRange} /></div>
      {/* Top Pages - Bar Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Top Pages by Views</CardTitle>
        </CardHeader>
        <CardContent>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No page data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPages} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="pagePath"
                  width={110}
                  tickFormatter={(v: string) => truncatePath(v, 20)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [formatNumber(Number(value)), "Views"]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="screenPageViews" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Views" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <TrafficSourcesCard sources={sources} />
      <DeviceDistributionCard devices={devices} />

      {/* Top Countries - Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Countries</CardTitle>
        </CardHeader>
        <CardContent>
          {countries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No country data available.</p>
          ) : (
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm" aria-label="Top countries by user count">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Country</th>
                    <th className="py-2 text-right font-medium">Users</th>
                    <th className="py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((c) => (
                    <tr key={c.country} className="border-b last:border-0">
                      <td className="py-2">{c.country}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(c.activeUsers)}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {totalCountryUsers > 0 ? ((c.activeUsers / totalCountryUsers) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Platform Traffic - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traffic by Social Platform</CardTitle>
        </CardHeader>
        <CardContent>
          {socialTraffic.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No social traffic data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={socialTraffic} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => [formatNumber(Number(value)), "Sessions"]} />
                <Bar dataKey="sessions" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
