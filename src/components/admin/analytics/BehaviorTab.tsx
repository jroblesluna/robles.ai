import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Clock, MousePointerClick, FileText, Users } from "lucide-react";
import type { DateRange } from "@/components/admin/analytics/DateRangeSelector";

interface LandingPageData {
  landingPage: string;
  sessions: number;
  bounceRate: number;
}

interface NewVsReturningData {
  segment: string;
  activeUsers: number;
}

interface BehaviorResponse {
  landingPages: LandingPageData[];
  newVsReturning: NewVsReturningData[];
  error?: string;
}

interface OverviewKPIs {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
  comparison: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    bounceRate: number;
    averageSessionDuration: number;
  };
}

interface OverviewResponse {
  kpis: OverviewKPIs;
  trend: unknown[];
  error?: string;
}

interface BehaviorTabProps {
  dateRange: DateRange;
}

const DONUT_COLORS = ["#3b82f6", "#f59e0b"];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function truncatePath(path: string, maxLen = 30): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 3) + "...";
}

export default function BehaviorTab({ dateRange }: BehaviorTabProps) {
  const behaviorQuery = useQuery<BehaviorResponse>({
    queryKey: [
      `/api/admin/analytics/behavior?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    ],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: [
      `/api/admin/analytics/overview?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    ],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const isLoading = behaviorQuery.isLoading || overviewQuery.isLoading;
  const error = behaviorQuery.error || overviewQuery.error;
  const behaviorData = behaviorQuery.data;
  const overviewData = overviewQuery.data;

  if (isLoading) {
    return <BehaviorSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">
          Failed to load behavior data. {error instanceof Error ? error.message : ""}
        </p>
      </div>
    );
  }

  if (behaviorData?.error || overviewData?.error) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {behaviorData?.error || overviewData?.error}
        </p>
      </div>
    );
  }

  const kpis = overviewData?.kpis;
  const landingPages = behaviorData?.landingPages || [];
  const newVsReturning = behaviorData?.newVsReturning || [];

  // Compute pages per session
  const pagesPerSession =
    kpis && kpis.sessions > 0
      ? (kpis.screenPageViews / kpis.sessions).toFixed(2)
      : "0";

  // Donut chart data
  const donutData = newVsReturning.map((item) => ({
    name: item.segment === "new" ? "New Users" : "Returning Users",
    value: item.activeUsers,
  }));

  const totalUsers = donutData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={FileText}
          label="Pages / Session"
          value={pagesPerSession}
          comparison={
            kpis?.comparison && kpis.comparison.sessions > 0
              ? (kpis.comparison.screenPageViews / kpis.comparison.sessions).toFixed(2)
              : undefined
          }
        />
        <MetricCard
          icon={Clock}
          label="Avg Session Duration"
          value={formatDuration(kpis?.averageSessionDuration || 0)}
          comparison={
            kpis?.comparison
              ? formatDuration(kpis.comparison.averageSessionDuration)
              : undefined
          }
        />
        <MetricCard
          icon={MousePointerClick}
          label="Bounce Rate"
          value={`${((kpis?.bounceRate || 0) * 100).toFixed(1)}%`}
          comparison={
            kpis?.comparison
              ? `${((kpis.comparison.bounceRate || 0) * 100).toFixed(1)}%`
              : undefined
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Landing Pages Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Landing Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {landingPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No landing page data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={landingPages}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="landingPage"
                    width={140}
                    tickFormatter={(val) => truncatePath(val, 20)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [String(value), "Sessions"]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="sessions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* New vs Returning Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New vs Returning Users</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No user segment data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {donutData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `${value} (${totalUsers > 0 ? ((Number(value) / totalUsers) * 100).toFixed(1) : 0}%)`,
                      "Users",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-page Engagement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Page Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {landingPages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No page engagement data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Page engagement metrics">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium text-right">Sessions</th>
                    <th className="pb-2 font-medium text-right">Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {landingPages.map((page) => (
                    <tr key={page.landingPage} className="border-b last:border-0">
                      <td className="py-2 max-w-[300px] truncate" title={page.landingPage}>
                        {page.landingPage}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {page.sessions.toLocaleString()}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {(page.bounceRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Metric card for the behavior KPIs */
function MetricCard({
  icon: Icon,
  label,
  value,
  comparison,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  comparison?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          {comparison !== undefined && (
            <p className="text-xs text-muted-foreground">
              Previous: {comparison}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Loading skeleton for the Behavior tab */
function BehaviorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-[300px] animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="h-[200px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
