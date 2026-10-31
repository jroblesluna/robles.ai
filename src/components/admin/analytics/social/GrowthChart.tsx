import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { findOutliers, movingAverage, recentMomentum, type SocialPost } from "@shared/socialInsights";
import { formatCompact } from "./SocialKpis";

export interface GrowthSeries {
  key: string;
  label: string;
  description: string;
  /** "flow" = daily amounts (bars + 7-day average); "level" = a running total (line). */
  kind: "flow" | "level";
  points: Array<{ date: string; value: number }>;
}

const AVG_COLOR = "#52514e";

export default function GrowthChart({
  series,
  color,
  posts,
}: {
  series: GrowthSeries[];
  color: string;
  posts: SocialPost[];
}) {
  const available = series.filter((s) => s.points.length > 0);
  const [selected, setSelected] = useState(available[0]?.key);
  const active = available.find((s) => s.key === selected) ?? available[0];

  const postsByDay = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
    for (const p of posts) {
      const day = format(new Date(p.publishedAt), "yyyy-MM-dd");
      map.set(day, [...(map.get(day) ?? []), p]);
    }
    return map;
  }, [posts]);

  if (!active) return null;

  const values = active.points.map((p) => p.value);
  const avg7 = movingAverage(values, 7);
  const data = active.points.map((p, i) => ({
    date: p.date,
    value: p.value,
    avg7: avg7[i],
    posts: postsByDay.get(p.date) ?? [],
  }));
  const postDays = data.filter((d) => d.posts.length > 0).map((d) => d.date);

  const total = values.reduce((a, b) => a + b, 0);
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
  const outliers = active.kind === "flow" ? findOutliers(active.points) : [];
  const momentum = active.kind === "flow" ? recentMomentum(values) : null;
  const levelChange = active.kind === "level" && values.length > 1 ? values[values.length - 1] - values[0] : null;

  // Days with a post vs without: does publishing move this metric?
  const withPost = data.filter((d) => d.posts.length > 0).map((d) => d.value);
  const withoutPost = data.filter((d) => d.posts.length === 0).map((d) => d.value);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const postLift = active.kind === "flow" && withPost.length >= 2 && withoutPost.length >= 2 && avg(withoutPost) > 0
    ? avg(withPost) / avg(withoutPost)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-base">Growth over time</CardTitle>
            <CardDescription>{active.description}</CardDescription>
          </div>
          {available.length > 1 && (
            <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1" role="group" aria-label="Metric">
              {available.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelected(s.key)}
                  aria-pressed={s.key === active.key}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    s.key === active.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {active.kind === "flow" ? (
            <>
              <Stat label="Total in period" value={formatCompact(total)} />
              <Stat label="Daily average" value={formatCompact(total / Math.max(values.length, 1))} />
            </>
          ) : (
            <>
              <Stat label="Current" value={formatCompact(values[values.length - 1] ?? 0)} />
              <Stat
                label="Net change"
                value={`${(levelChange ?? 0) > 0 ? "+" : ""}${formatCompact(levelChange ?? 0)}`}
                tone={levelChange == null ? undefined : levelChange > 0 ? "up" : levelChange < 0 ? "down" : undefined}
              />
            </>
          )}
          <Stat label="Best day" value={peak ? `${formatCompact(peak.value)} · ${format(parseISO(peak.date), "MMM d")}` : "—"} />
          {momentum?.change != null ? (
            <Stat
              label="Last 7 days vs prior 7"
              value={`${momentum.change > 0 ? "+" : ""}${momentum.change.toFixed(0)}%`}
              tone={momentum.change > 0 ? "up" : momentum.change < 0 ? "down" : undefined}
            />
          ) : postLift !== null ? (
            <Stat label="Days with a post" value={`${postLift.toFixed(1)}× the rest`} />
          ) : (
            <Stat label="Posts in chart" value={String(postDays.length)} />
          )}
        </dl>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCompact(v)}
                domain={active.kind === "level" ? ["auto", "auto"] : [0, "auto"]}
                allowDecimals={false}
              />
              {postDays.map((d) => (
                <ReferenceLine key={d} x={d} stroke={color} strokeOpacity={0.25} strokeDasharray="2 3" />
              ))}
              <Tooltip content={<ChartTooltip label={active.label} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
              {active.kind === "flow" ? (
                <>
                  <Bar dataKey="value" fill={color} fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Line dataKey="avg7" stroke={AVG_COLOR} strokeWidth={2} dot={false} connectNulls type="monotone" />
                </>
              ) : (
                <Line dataKey="value" stroke={color} strokeWidth={2} dot={false} type="monotone" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
            {active.label}
          </span>
          {active.kind === "flow" && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: AVG_COLOR }} />
              7-day average
            </span>
          )}
          {postDays.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 border-l border-dashed" style={{ borderColor: color }} />
              Day with a post
            </span>
          )}
        </div>

        {outliers.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Unusual days — check what happened</p>
            <ul className="space-y-1">
              {outliers.slice(0, 5).map((o) => {
                const dayPosts = postsByDay.get(o.date) ?? [];
                return (
                  <li key={o.date} className="flex items-start gap-2 text-sm">
                    {o.direction === "spike" ? (
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-label="Spike" />
                    ) : (
                      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Drop" />
                    )}
                    <span>
                      <span className="font-medium">{format(parseISO(o.date), "EEE, MMM d")}</span>
                      {": "}
                      {formatCompact(o.value)} {active.label.toLowerCase()}
                      {" · "}
                      <span className="text-muted-foreground">
                        {dayPosts.length > 0
                          ? `posted "${(dayPosts[0].text ?? "untitled").slice(0, 60)}${(dayPosts[0].text?.length ?? 0) > 60 ? "…" : ""}"`
                          : "no post that day (shares, mentions or an older post picking up)"}
                      </span>
                    </span>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold tabular-nums", tone === "up" && "text-green-700", tone === "down" && "text-red-600")}>{value}</dd>
    </div>
  );
}

interface TooltipPayload {
  payload: { date: string; value: number; avg7: number | null; posts: SocialPost[] };
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="max-w-xs rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{format(parseISO(d.date), "EEEE, MMM d")}</p>
      <p className="mt-1 tabular-nums">
        {label}: <span className="font-semibold">{d.value.toLocaleString("en-US")}</span>
      </p>
      {d.avg7 != null && <p className="tabular-nums text-muted-foreground">7-day average: {Math.round(d.avg7).toLocaleString("en-US")}</p>}
      {d.posts.length > 0 && (
        <div className="mt-1.5 border-t pt-1.5">
          <p className="text-muted-foreground">Published that day:</p>
          {d.posts.slice(0, 3).map((p) => (
            <p key={p.id} className="truncate">• {p.format}: {p.text?.slice(0, 50) || "untitled"}</p>
          ))}
        </div>
      )}
    </div>
  );
}
