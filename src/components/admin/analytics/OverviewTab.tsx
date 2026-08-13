import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { Users } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import KpiCard from "./KpiCard";
import type { DateRange } from "./DateRangeSelector";

// --- Types matching the backend API response ---

interface GA4KPIs {
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

interface TrendDataPoint {
  date: string;
  activeUsers: number;
  sessions: number;
}

interface OverviewResponse {
  kpis: GA4KPIs;
  trend: TrendDataPoint[];
  error?: string;
}

interface RealtimeResponse {
  activeUsers: number;
  error?: string;
}

// --- Component ---

interface OverviewTabProps {
  dateRange: DateRange;
}

export default function OverviewTab({ dateRange }: OverviewTabProps) {
  // Fetch overview KPIs + trend data
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
  } = useQuery<OverviewResponse>({
    queryKey: [`/api/admin/analytics/overview?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch real-time active users (refetch every 30s)
  const {
    data: realtimeData,
    isLoading: isRealtimeLoading,
  } = useQuery<RealtimeResponse>({
    queryKey: ["/api/admin/analytics/realtime"],
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const kpis = overviewData?.kpis;
  const trend = overviewData?.trend;
  const hasError = overviewData?.error;

  // Format trend chart dates from "YYYYMMDD" to readable labels
  const chartData = trend?.map((point) => {
    let displayDate: string;
    try {
      const parsed = parse(point.date, "yyyyMMdd", new Date());
      displayDate = format(parsed, "MMM d");
    } catch {
      displayDate = point.date;
    }
    return {
      ...point,
      displayDate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Real-time active users badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {isRealtimeLoading ? (
            <Skeleton className="h-4 w-8 inline-block" />
          ) : (
            <span className="font-semibold">
              {realtimeData?.activeUsers ?? 0}
            </span>
          )}
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">active now</span>
        </Badge>
      </div>

      {/* Error state */}
      {hasError && !isOverviewLoading && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {overviewData.error === "GA4 not configured"
                ? "GA4 is not configured. Upload your Service Account credentials and set the Property ID in Settings."
                : `Error fetching analytics: ${overviewData.error}`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Users"
          value={kpis?.activeUsers ?? 0}
          currentValue={kpis?.activeUsers}
          previousValue={kpis?.comparison.activeUsers}
          format="number"
          isLoading={isOverviewLoading}
        />
        <KpiCard
          label="Page Views"
          value={kpis?.screenPageViews ?? 0}
          currentValue={kpis?.screenPageViews}
          previousValue={kpis?.comparison.screenPageViews}
          format="number"
          isLoading={isOverviewLoading}
        />
        <KpiCard
          label="Avg Session Duration"
          value={kpis?.averageSessionDuration ?? 0}
          currentValue={kpis?.averageSessionDuration}
          previousValue={kpis?.comparison.averageSessionDuration}
          format="duration"
          isLoading={isOverviewLoading}
        />
        <KpiCard
          label="Bounce Rate"
          value={kpis?.bounceRate ?? 0}
          currentValue={kpis?.bounceRate}
          previousValue={kpis?.comparison.bounceRate}
          format="percent"
          isLoading={isOverviewLoading}
        />
      </div>

      {/* Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users & Sessions Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isOverviewLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  name="Users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke="hsl(210, 70%, 60%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              <p>No trend data available for the selected date range.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
