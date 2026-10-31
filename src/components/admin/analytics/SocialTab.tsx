import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Instagram, Facebook, AlertTriangle, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { FacebookData, InstagramData, MetaInsightsError } from "@shared/socialAnalytics";
import {
  normalizeFacebookPosts,
  normalizeInstagramPosts,
  postingCadence,
  scorePosts,
  type Cadence,
  type ScoredPost,
} from "@shared/socialInsights";
import type { DateRange } from "./DateRangeSelector";
import ContentInsights from "./social/ContentInsights";
import GrowthChart, { type GrowthSeries } from "./social/GrowthChart";
import PostsTable from "./social/PostsTable";
import SocialKpis, { formatCompact, type SocialKpi } from "./social/SocialKpis";

// ─── Types ──────────────────────────────────────────────────────────────────────

type InstagramResponse = InstagramData | MetaInsightsError;
type FacebookResponse = FacebookData | MetaInsightsError;
type PlatformId = "instagram" | "facebook";

function isMetaError(data: unknown): data is MetaInsightsError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    (data as MetaInsightsError).error === true
  );
}

const PLATFORM = {
  instagram: { label: "Instagram", icon: Instagram, color: "#E1306C", iconClass: "text-pink-500" },
  facebook: { label: "Facebook", icon: Facebook, color: "#1877F2", iconClass: "text-blue-600" },
} as const;

/** Everything one platform section renders, derived from the API response. */
interface PlatformModel {
  followers: number;
  followerChange: number | null;
  headline: { label: string; change: number | null };
  kpis: SocialKpi[];
  series: GrowthSeries[];
  posts: ScoredPost[];
  cadence: Cadence;
  warnings?: string[];
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const change = (cur: number, prev: number | null | undefined) =>
  prev == null || prev === 0 ? null : ((cur - prev) / prev) * 100;

// ─── Models ─────────────────────────────────────────────────────────────────────

function instagramModel(data: InstagramData, range: DateRange): PlatformModel {
  const { insights, previous } = data;
  const posts = scorePosts(normalizeInstagramPosts(data.recentMedia));
  const cadence = postingCadence(posts, range.startDate, range.endDate);
  const newFollowers = sum(insights.dailyMetrics.map((d) => d.followerCount));
  const prevNewFollowers = previous ? sum(previous.dailyMetrics.map((d) => d.followerCount)) : null;
  const interactions = insights.totalInteractions ?? null;
  const prevInteractions = previous?.totalInteractions ?? null;
  const rate = interactions != null && insights.reach > 0 ? interactions / insights.reach : null;
  const prevRate = prevInteractions != null && previous && previous.reach > 0 ? prevInteractions / previous.reach : null;
  const savesShares = insights.saves != null && insights.shares != null ? insights.saves + insights.shares : null;
  const prevSavesShares = previous?.saves != null && previous?.shares != null ? previous.saves + previous.shares : null;

  return {
    followers: insights.followerCount,
    followerChange: newFollowers,
    headline: { label: "reach", change: change(insights.reach, previous?.reach) },
    kpis: [
      { label: "Followers", value: insights.followerCount, note: `+${formatCompact(newFollowers)} new in period` },
      { label: "New followers", value: newFollowers, previous: prevNewFollowers, hint: "Accounts that started following you in the period. Instagram does not report unfollows." },
      { label: "Reach", value: insights.reach, previous: previous?.reach ?? null, hint: "Sum of daily unique accounts reached." },
      { label: "Views", value: insights.views, previous: previous?.views ?? null, hint: "Times your content was played or displayed." },
      { label: "Accounts engaged", value: insights.accountsEngaged, previous: previous?.accountsEngaged ?? null, hint: "Accounts that interacted with your content." },
      { label: "Interactions", value: interactions, previous: prevInteractions, hint: "Likes, comments, saves, shares and replies." },
      { label: "Engagement rate", value: rate, previous: prevRate, format: "percent", hint: "Interactions ÷ reach. Higher means the content resonates with the people who see it." },
      {
        label: "Saves + shares",
        value: savesShares,
        previous: prevSavesShares,
        note: savesShares != null ? `${formatCompact(insights.saves ?? 0)} saves · ${formatCompact(insights.shares ?? 0)} shares` : undefined,
        hint: "The strongest signals for reaching people who don't follow you yet.",
      },
    ],
    series: [
      { key: "reach", label: "Reach", kind: "flow", description: "Accounts reached per day. Dashed lines mark days you published.", points: insights.dailyMetrics.map((d) => ({ date: d.date, value: d.reach })) },
      { key: "followers", label: "New followers", kind: "flow", description: "New followers per day. Look for the posts that came right before the spikes.", points: insights.dailyMetrics.map((d) => ({ date: d.date, value: d.followerCount })) },
    ],
    posts,
    cadence,
    warnings: data.warnings,
  };
}

function facebookModel(data: FacebookData, range: DateRange): PlatformModel {
  const { insights, previous } = data;
  const posts = scorePosts(normalizeFacebookPosts(data.recentPosts));
  const cadence = postingCadence(posts, range.startDate, range.endDate);
  const daily = insights.dailyMetrics;
  const followSeries = daily.map((d) => d.pageFollows).filter((v) => v > 0);
  const followerChange = followSeries.length > 1 ? followSeries[followSeries.length - 1] - followSeries[0] : null;
  const hasFlows = insights.newFollows != null && insights.unfollows != null;

  return {
    followers: insights.pageFollows,
    followerChange: hasFlows ? insights.newFollows! - insights.unfollows! : followerChange,
    headline: { label: "page views", change: change(insights.pageViews, previous?.pageViews) },
    kpis: [
      { label: "Page followers", value: insights.pageFollows, note: followerChange != null ? `${followerChange >= 0 ? "+" : ""}${formatCompact(followerChange)} in period` : undefined },
      { label: "New follows", value: insights.newFollows ?? null, previous: previous?.newFollows ?? null },
      { label: "Unfollows", value: insights.unfollows ?? null, previous: previous?.unfollows ?? null, invert: true, hint: "Fewer is better. Spikes usually follow off-topic or too-promotional posts." },
      { label: "Page views", value: insights.pageViews, previous: previous?.pageViews ?? null },
      { label: "Post engagements", value: insights.postEngagements, previous: previous?.postEngagements ?? null, hint: "Reactions, comments, shares and clicks on your posts." },
      { label: "Posts published", value: cadence.postsInRange, note: `${cadence.postsPerWeek.toFixed(1)} / week` },
    ],
    series: [
      { key: "engagements", label: "Post engagements", kind: "flow", description: "Engagements per day. Dashed lines mark days you published.", points: daily.map((d) => ({ date: d.date, value: d.postEngagements })) },
      { key: "views", label: "Page views", kind: "flow", description: "Visits to the Page per day.", points: daily.map((d) => ({ date: d.date, value: d.pageViews })) },
      ...(hasFlows
        ? [{ key: "net", label: "Net follows", kind: "flow" as const, description: "New follows minus unfollows per day. Days below zero lost followers.", points: daily.map((d) => ({ date: d.date, value: (d.newFollows ?? 0) - (d.unfollows ?? 0) })) }]
        : []),
      { key: "followers", label: "Followers", kind: "level", description: "Total Page followers over time.", points: daily.filter((d) => d.pageFollows > 0).map((d) => ({ date: d.date, value: d.pageFollows })) },
    ],
    posts,
    cadence,
    warnings: data.warnings,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface SocialTabProps {
  dateRange: DateRange;
}

export default function SocialTab({ dateRange }: SocialTabProps) {
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const params = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;

  const igQuery = useQuery<InstagramResponse>({
    queryKey: [`/api/admin/analytics/social/instagram?${params}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const fbQuery = useQuery<FacebookResponse>({
    queryKey: [`/api/admin/analytics/social/facebook?${params}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const igError = igQuery.data && isMetaError(igQuery.data) ? igQuery.data : null;
  const igData = igQuery.data && !isMetaError(igQuery.data) ? igQuery.data : null;
  const fbError = fbQuery.data && isMetaError(fbQuery.data) ? fbQuery.data : null;
  const fbData = fbQuery.data && !isMetaError(fbQuery.data) ? fbQuery.data : null;

  const models = useMemo(
    () => ({
      instagram: igData ? instagramModel(igData, dateRange) : null,
      facebook: fbData ? facebookModel(fbData, dateRange) : null,
    }),
    [igData, fbData, dateRange]
  );


  const loading = { instagram: igQuery.isLoading, facebook: fbQuery.isLoading };
  const errors = { instagram: igError, facebook: fbError };
  const active = models[platform];
  const meta = PLATFORM[platform];

  return (
    <div className="space-y-6">
      {(igError || fbError) && <TokenWarning igError={igError} fbError={fbError} />}

      {/* Platform switcher with a headline for each account */}
      <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Social network">
        {(Object.keys(PLATFORM) as PlatformId[]).map((id) => (
          <PlatformSummary
            key={id}
            id={id}
            selected={platform === id}
            onSelect={() => setPlatform(id)}
            model={models[id]}
            loading={loading[id]}
            error={errors[id]}
          />
        ))}
      </div>

      <section aria-label={`${meta.label} metrics`} className="space-y-6">
        <div className="flex items-center gap-2">
          <meta.icon className={cn("h-5 w-5", meta.iconClass)} />
          <h2 className="text-lg font-semibold">{meta.label} in detail</h2>
        </div>

        {loading[platform] ? (
          <MetricsSkeleton />
        ) : errors[platform] ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {meta.label} is not available: {errors[platform]!.message}
          </p>
        ) : active ? (
          <>
            <PartialDataNotice warnings={active.warnings} />
            <SocialKpis kpis={active.kpis} />
            <GrowthChart key={platform} series={active.series} color={meta.color} posts={active.posts} />
            <ContentInsights posts={active.posts} cadence={active.cadence} color={meta.color} />
            <PostsTable posts={active.posts} platformLabel={meta.label} />
          </>
        ) : null}
      </section>
    </div>
  );
}

// ─── Platform Summary (switcher) ─────────────────────────────────────────────────

function PlatformSummary({
  id,
  selected,
  onSelect,
  model,
  loading,
  error,
}: {
  id: PlatformId;
  selected: boolean;
  onSelect: () => void;
  model: PlatformModel | null;
  loading: boolean;
  error: MetaInsightsError | null;
}) {
  const meta = PLATFORM[id];
  const headlineChange = model?.headline.change ?? null;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-4 text-left transition-shadow hover:shadow-sm",
        selected ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100"
      )}
      style={selected ? ({ "--tw-ring-color": meta.color } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center gap-2">
        <meta.icon className={cn("h-4 w-4", meta.iconClass)} />
        <span className="text-sm font-semibold">{meta.label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-40" />
      ) : error ? (
        <p className="mt-3 text-sm text-muted-foreground">Not connected</p>
      ) : model ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-2xl font-semibold tabular-nums">{formatCompact(model.followers)}</span>
          <span className="text-xs text-muted-foreground">followers</span>
          {model.followerChange != null && (
            <span className={cn("text-xs font-medium tabular-nums", model.followerChange > 0 ? "text-green-700" : model.followerChange < 0 ? "text-red-600" : "text-muted-foreground")}>
              {model.followerChange > 0 ? "+" : ""}
              {formatCompact(model.followerChange)} in period
            </span>
          )}
          {headlineChange != null && (
            <span className={cn("text-xs font-medium tabular-nums", headlineChange > 0 ? "text-green-700" : headlineChange < 0 ? "text-red-600" : "text-muted-foreground")}>
              {headlineChange > 0 ? "+" : ""}
              {headlineChange.toFixed(0)}% {model.headline.label}
            </span>
          )}
        </div>
      ) : null}
    </button>
  );
}

// ─── Partial Data Notice ────────────────────────────────────────────────────────

function PartialDataNotice({ warnings }: { warnings?: string[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {warnings.map((w) => (
        <p key={w}>{w}</p>
      ))}
    </div>
  );
}

// ─── Token Warning ──────────────────────────────────────────────────────────────

function TokenWarning({
  igError,
  fbError,
}: {
  igError: MetaInsightsError | null;
  fbError: MetaInsightsError | null;
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
