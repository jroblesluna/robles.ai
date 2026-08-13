import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Loader2 } from "lucide-react";
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

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

// --- Helpers ---

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

      {/* Traffic Sources - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No source data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="sessions"
                  nameKey="channelGroup"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props: PieLabelRenderProps) => {
                    const name = String(props.name || "");
                    const pct = typeof props.percent === "number" ? (props.percent * 100).toFixed(0) : "0";
                    return `${name} (${pct}%)`;
                  }}
                  labelLine={false}
                >
                  {sources.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(Number(value)), "Sessions"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Device Distribution - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No device data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={devices}
                  dataKey="activeUsers"
                  nameKey="deviceCategory"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props: PieLabelRenderProps) => {
                    const name = String(props.name || "");
                    const pct = typeof props.percent === "number" ? (props.percent * 100).toFixed(0) : "0";
                    return `${name} (${pct}%)`;
                  }}
                  labelLine={false}
                >
                  {devices.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(Number(value)), "Users"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

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
