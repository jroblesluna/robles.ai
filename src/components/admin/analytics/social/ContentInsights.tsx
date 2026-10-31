import { CalendarClock, Clock, LayoutGrid, Type } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TIME_BLOCKS,
  WEEKDAYS,
  captionLengthBucket,
  groupPerformance,
  hasQuestion,
  median,
  timingGrid,
  type Cadence,
  type ScoredPost,
} from "@shared/socialInsights";
import { formatCompact } from "./SocialKpis";

/** Formats, best timing, captions and cadence: what to publish, when and how often. */
export default function ContentInsights({
  posts,
  cadence,
  color,
}: {
  posts: ScoredPost[];
  cadence: Cadence;
  color: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormatCard posts={posts} color={color} />
      <TimingCard posts={posts} color={color} />
      <CaptionCard posts={posts} color={color} />
      <CadenceCard cadence={cadence} />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: typeof Clock; title: string; description: string }) {
  return (
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function ComparisonBars({
  rows,
  color,
}: {
  rows: Array<{ key: string; posts: number; value: number; extra?: string }>;
  color: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">
              {r.key}
              {i === 0 && rows.length > 1 && (
                <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">Best</span>
              )}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatCompact(r.value)} <span className="text-xs text-muted-foreground">median · {r.posts} post{r.posts === 1 ? "" : "s"}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, backgroundColor: color, opacity: i === 0 ? 1 : 0.55 }} />
          </div>
          {r.extra && <p className="mt-1 text-xs text-muted-foreground">{r.extra}</p>}
        </li>
      ))}
    </ul>
  );
}

function FormatCard({ posts, color }: { posts: ScoredPost[]; color: string }) {
  const groups = groupPerformance(posts, (p) => p.format);
  return (
    <Card>
      <SectionHeader icon={LayoutGrid} title="Which formats work" description="Median interactions per post by format. Favour the leader, test the rest." />
      <CardContent>
        {groups.length === 0 ? (
          <Empty text="No posts to compare yet." />
        ) : (
          <ComparisonBars
            color={color}
            rows={groups.map((g) => ({
              key: g.key,
              posts: g.posts,
              value: g.medianInteractions,
              extra: [
                g.medianReach != null ? `${formatCompact(g.medianReach)} median reach` : null,
                g.medianEngagementRate != null ? `${(g.medianEngagementRate * 100).toFixed(1)}% engagement rate` : null,
              ].filter(Boolean).join(" · ") || undefined,
            }))}
          />
        )}
        {groups.length === 1 && (
          <p className="mt-4 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
            Every post uses the same format, so there is nothing to compare yet. Test another one (short video, carousel or a photo with text) for a few weeks to find out what this audience prefers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TimingCard({ posts, color }: { posts: ScoredPost[]; color: string }) {
  const grid = timingGrid(posts);
  const max = Math.max(...grid.flat().map((c) => c.median ?? 0), 1);
  const best = grid
    .flatMap((row, d) => row.map((c, b) => ({ ...c, d, b })))
    .filter((c) => c.posts > 0)
    .sort((a, b) => (b.median ?? 0) - (a.median ?? 0))[0];
  // Monday first reads more naturally in a weekly plan
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Card>
      <SectionHeader
        icon={Clock}
        title="When to publish"
        description="Median interactions by day and time you posted (your local time). Darker = better; empty = untested slot."
      />
      <CardContent>
        {posts.length === 0 ? (
          <Empty text="No posts to analyse yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-separate border-spacing-1 text-xs" aria-label="Median interactions by weekday and time of day">
                <thead>
                  <tr>
                    <th />
                    {TIME_BLOCKS.map((t) => (
                      <th key={t} className="px-1 pb-1 text-center font-medium text-muted-foreground">
                        {t.split(" ")[0]}
                        <span className="block text-[10px] font-normal">{t.match(/\((.*)\)/)?.[1]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.map((d) => (
                    <tr key={d}>
                      <th scope="row" className="pr-1 text-left font-medium text-muted-foreground">{WEEKDAYS[d]}</th>
                      {grid[d].map((cell, b) => {
                        const intensity = cell.median != null ? 0.15 + 0.85 * (cell.median / max) : 0;
                        return (
                          <td
                            key={b}
                            title={cell.posts ? `${WEEKDAYS[d]} ${TIME_BLOCKS[b]}: median ${cell.median} interactions, ${cell.posts} post(s)` : `${WEEKDAYS[d]} ${TIME_BLOCKS[b]}: no posts yet`}
                            className={cn("h-9 rounded text-center tabular-nums", cell.posts === 0 && "border border-dashed")}
                            style={cell.posts ? { backgroundColor: hexWithAlpha(color, intensity), color: intensity > 0.6 ? "#fff" : undefined } : undefined}
                          >
                            {cell.posts ? formatCompact(cell.median ?? 0) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {best && (
              <p className="mt-3 text-sm">
                Best slot so far: <span className="font-semibold">{WEEKDAYS[best.d]} · {TIME_BLOCKS[best.b].toLowerCase()}</span>{" "}
                <span className="text-muted-foreground">({best.posts} post{best.posts === 1 ? "" : "s"}{best.posts < 2 ? ": test again before deciding" : ""})</span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CaptionCard({ posts, color }: { posts: ScoredPost[]; color: string }) {
  const lengths = groupPerformance(posts, (p) => captionLengthBucket(p.text));
  const withQ = posts.filter((p) => hasQuestion(p.text));
  const withoutQ = posts.filter((p) => !hasQuestion(p.text));
  return (
    <Card>
      <SectionHeader icon={Type} title="How to write it" description="Caption length and whether asking a question brings more conversation." />
      <CardContent>
        {posts.length === 0 ? (
          <Empty text="No posts to analyse yet." />
        ) : (
          <div className="space-y-5">
            <ComparisonBars color={color} rows={lengths.map((g) => ({ key: g.key, posts: g.posts, value: g.medianInteractions }))} />
            <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Median comments, with a question</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{withQ.length ? median(withQ.map((p) => p.comments)).toFixed(1) : "—"}</p>
                <p className="text-xs text-muted-foreground">{withQ.length} posts</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Median comments, without</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{withoutQ.length ? median(withoutQ.map((p) => p.comments)).toFixed(1) : "—"}</p>
                <p className="text-xs text-muted-foreground">{withoutQ.length} posts</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CadenceCard({ cadence }: { cadence: Cadence }) {
  const status =
    cadence.daysSinceLastPost != null && cadence.daysSinceLastPost >= 7
      ? { text: "Inactive: publish this week", className: "bg-red-100 text-red-800" }
      : cadence.postsPerWeek >= 3
        ? { text: "Healthy rhythm", className: "bg-green-100 text-green-800" }
        : { text: "Below 3 posts a week", className: "bg-amber-100 text-amber-900" };
  const items = [
    { label: "Posts in period", value: String(cadence.postsInRange) },
    { label: "Posts per week", value: cadence.postsPerWeek.toFixed(1) },
    { label: "Days since last post", value: cadence.daysSinceLastPost != null ? String(cadence.daysSinceLastPost) : "—" },
    { label: "Longest gap (days)", value: cadence.longestGapDays != null ? String(cadence.longestGapDays) : "—" },
  ];
  return (
    <Card>
      <SectionHeader icon={CalendarClock} title="Posting rhythm" description="Consistency in the selected period. Gaps usually show up later as drops in reach." />
      <CardContent>
        <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold", status.className)}>{status.text}</span>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          {items.map((i) => (
            <div key={i.label}>
              <dt className="text-xs text-muted-foreground">{i.label}</dt>
              <dd className="mt-0.5 text-2xl font-semibold tabular-nums">{i.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(2)})`;
}
