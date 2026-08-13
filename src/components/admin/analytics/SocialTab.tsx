import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  Instagram,
  Facebook,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DateRange } from "./DateRangeSelector";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface InstagramInsightsData {
  followerCount: number;
  reach: number;
  impressions: number;
  profileViews: number;
  dailyMetrics: Array<{
    date: string;
    reach: number;
    impressions: number;
    followerCount: number;
    profileViews: number;
  }>;
}

interface InstagramMediaItem {
  id: string;
  caption: string | null;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  mediaType: string;
  reach: number | null;
  impressions: number | null;
}

interface InstagramData {
  insights: InstagramInsightsData;
  recentMedia: InstagramMediaItem[];
}

interface FacebookPageInsightsData {
  pageViews: number;
  pageFans: number;
  engagedUsers: number;
  dailyMetrics: Array<{
    date: string;
    pageViews: number;
    engagedUsers: number;
    pageFans: number;
  }>;
}

interface FacebookPostItem {
  id: string;
  message: string | null;
  createdTime: string;
  shares: number;
  reactions: number;
  comments: number;
}

interface FacebookData {
  insights: FacebookPageInsightsData;
  recentPosts: FacebookPostItem[];
}

interface MetaError {
  error: true;
  code: "TOKEN_EXPIRED" | "NOT_CONFIGURED" | "API_ERROR";
  message: string;
}

type InstagramResponse = InstagramData | MetaError;
type FacebookResponse = FacebookData | MetaError;

function isMetaError(data: unknown): data is MetaError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    (data as MetaError).error === true
  );
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface SocialTabProps {
  dateRange: DateRange;
}

export default function SocialTab({ dateRange }: SocialTabProps) {
  const igQuery = useQuery<InstagramResponse>({
    queryKey: [`/api/admin/analytics/social/instagram?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const fbQuery = useQuery<FacebookResponse>({
    queryKey: [`/api/admin/analytics/social/facebook?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const igError = igQuery.data && isMetaError(igQuery.data) ? igQuery.data : null;
  const igData = igQuery.data && !isMetaError(igQuery.data) ? igQuery.data : null;

  const fbError = fbQuery.data && isMetaError(fbQuery.data) ? fbQuery.data : null;
  const fbData = fbQuery.data && !isMetaError(fbQuery.data) ? fbQuery.data : null;

  return (
    <div className="space-y-8">
      {/* Token warning */}
      {(igError || fbError) && (
        <TokenWarning igError={igError} fbError={fbError} />
      )}

      {/* Instagram Section */}
      <section aria-label="Instagram metrics">
        <div className="mb-4 flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-500" />
          <h2 className="text-lg font-semibold">Instagram</h2>
        </div>

        {igQuery.isLoading ? (
          <MetricsSkeleton />
        ) : igError ? null : igData ? (
          <div className="space-y-6">
            <InstagramMetrics data={igData.insights} />
            {igData.insights.dailyMetrics.length > 0 && (
              <FollowerGrowthChart
                data={igData.insights.dailyMetrics}
                platform="instagram"
              />
            )}
            {igData.recentMedia.length > 0 && (
              <InstagramPostsList posts={igData.recentMedia} />
            )}
          </div>
        ) : null}
      </section>

      {/* Facebook Section */}
      <section aria-label="Facebook metrics">
        <div className="mb-4 flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Facebook</h2>
        </div>

        {fbQuery.isLoading ? (
          <MetricsSkeleton />
        ) : fbError ? null : fbData ? (
          <div className="space-y-6">
            <FacebookMetrics data={fbData.insights} />
            {fbData.insights.dailyMetrics.length > 0 && (
              <FollowerGrowthChart
                data={fbData.insights.dailyMetrics.map((d) => ({
                  date: d.date,
                  followerCount: d.pageFans,
                }))}
                platform="facebook"
              />
            )}
            {fbData.recentPosts.length > 0 && (
              <FacebookPostsList posts={fbData.recentPosts} />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

// ─── Token Warning ──────────────────────────────────────────────────────────────

function TokenWarning({
  igError,
  fbError,
}: {
  igError: MetaError | null;
  fbError: MetaError | null;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Social media connection issue</AlertTitle>
      <AlertDescription className="space-y-1">
        {igError && (
          <p>
            <strong>Instagram:</strong> {igError.message}
          </p>
        )}
        {fbError && (
          <p>
            <strong>Facebook:</strong> {fbError.message}
          </p>
        )}
        <p className="mt-2 flex items-center gap-1 text-xs">
          <Settings className="h-3 w-3" />
          Go to <a href="/admin/settings" className="underline">Settings</a> to configure your social media tokens.
        </p>
      </AlertDescription>
    </Alert>
  );
}

// ─── Instagram Metrics Cards ────────────────────────────────────────────────────

function InstagramMetrics({ data }: { data: InstagramInsightsData }) {
  const metrics = [
    {
      label: "Followers",
      value: formatNumber(data.followerCount),
      icon: Users,
    },
    {
      label: "Reach",
      value: formatNumber(data.reach),
      icon: Eye,
    },
    {
      label: "Impressions",
      value: formatNumber(data.impressions),
      icon: TrendingUp,
    },
    {
      label: "Profile Views",
      value: formatNumber(data.profileViews),
      icon: Eye,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <SocialMetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
        />
      ))}
    </div>
  );
}

// ─── Facebook Metrics Cards ─────────────────────────────────────────────────────

function FacebookMetrics({ data }: { data: FacebookPageInsightsData }) {
  const metrics = [
    {
      label: "Page Fans",
      value: formatNumber(data.pageFans),
      icon: Users,
    },
    {
      label: "Page Views",
      value: formatNumber(data.pageViews),
      icon: Eye,
    },
    {
      label: "Engaged Users",
      value: formatNumber(data.engagedUsers),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <SocialMetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
        />
      ))}
    </div>
  );
}

// ─── Social Metric Card ─────────────────────────────────────────────────────────

function SocialMetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Follower Growth Chart ──────────────────────────────────────────────────────

function FollowerGrowthChart({
  data,
  platform,
}: {
  data: Array<{ date: string; followerCount: number }>;
  platform: "instagram" | "facebook";
}) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    followers: d.followerCount,
  }));

  const color = platform === "instagram" ? "#E1306C" : "#1877F2";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {platform === "instagram" ? "Follower" : "Fan"} Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="followers"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Instagram Posts List ────────────────────────────────────────────────────────

function InstagramPostsList({ posts }: { posts: InstagramMediaItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Recent Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between gap-4 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {post.caption || <span className="italic text-muted-foreground">No caption</span>}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{format(new Date(post.timestamp), "MMM d, yyyy")}</span>
                  <Badge variant="outline" className="text-xs">
                    {post.mediaType.toLowerCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <span className="flex items-center gap-1" title="Likes">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  {formatNumber(post.likeCount)}
                </span>
                <span className="flex items-center gap-1" title="Comments">
                  <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                  {formatNumber(post.commentsCount)}
                </span>
                {post.reach !== null && (
                  <span className="flex items-center gap-1" title="Reach">
                    <Eye className="h-3.5 w-3.5 text-green-500" />
                    {formatNumber(post.reach)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Facebook Posts List ─────────────────────────────────────────────────────────

function FacebookPostsList({ posts }: { posts: FacebookPostItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Recent Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between gap-4 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {post.message || <span className="italic text-muted-foreground">No message</span>}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(post.createdTime), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <span className="flex items-center gap-1" title="Reactions">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  {formatNumber(post.reactions)}
                </span>
                <span className="flex items-center gap-1" title="Comments">
                  <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                  {formatNumber(post.comments)}
                </span>
                <span className="flex items-center gap-1" title="Shares">
                  <Share2 className="h-3.5 w-3.5 text-green-500" />
                  {formatNumber(post.shares)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
