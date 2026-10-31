import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ExternalLink, ImageOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PerformanceLabel, ScoredPost } from "@shared/socialInsights";
import { formatCompact } from "./SocialKpis";

type SortKey = "date" | "reach" | "interactions" | "engagementRate" | "comments" | "shares" | "saves" | "index";

const LABEL_STYLE: Record<PerformanceLabel, { text: string; className: string }> = {
  top: { text: "Top", className: "bg-green-100 text-green-800" },
  average: { text: "Typical", className: "bg-muted text-muted-foreground" },
  low: { text: "Low", className: "bg-red-100 text-red-800" },
};

export default function PostsTable({ posts, platformLabel }: { posts: ScoredPost[]; platformLabel: string }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "index", desc: true });
  const [formatFilter, setFormatFilter] = useState<string>("all");

  const formats = useMemo(() => Array.from(new Set(posts.map((p) => p.format))).sort(), [posts]);
  const hasReach = posts.some((p) => p.reach != null);
  const hasSaves = posts.some((p) => p.saves != null);
  const hasShares = posts.some((p) => p.shares != null);

  const rows = useMemo(() => {
    const value = (p: ScoredPost): number => {
      switch (sort.key) {
        case "date": return new Date(p.publishedAt).getTime();
        case "reach": return p.reach ?? -1;
        case "engagementRate": return p.engagementRate ?? -1;
        case "shares": return p.shares ?? -1;
        case "saves": return p.saves ?? -1;
        default: return p[sort.key];
      }
    };
    return posts
      .filter((p) => formatFilter === "all" || p.format === formatFilter)
      .sort((a, b) => (sort.desc ? value(b) - value(a) : value(a) - value(b)));
  }, [posts, sort, formatFilter]);

  const header = (key: SortKey, label: string, title?: string) => (
    <th scope="col" className="whitespace-nowrap px-2 py-2 text-right font-medium" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        title={title}
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
        className={cn("inline-flex items-center gap-0.5 hover:text-foreground", sort.key === key && "text-foreground")}
      >
        {label}
        {sort.key === key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="text-base">Post performance</CardTitle>
            <CardDescription>
              Latest {posts.length} {platformLabel} posts compared with your typical (median) post. Sort to find what to repeat and what to drop.
            </CardDescription>
          </div>
          {formats.length > 1 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by format">
              {["all", ...formats].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormatFilter(f)}
                  aria-pressed={formatFilter === f}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    formatFilter === f ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "all" ? "All formats" : f}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No posts returned for this account.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left font-medium">Post</th>
                  {header("date", "Published")}
                  {hasReach && header("reach", "Reach")}
                  {header("interactions", "Interactions")}
                  {hasReach && header("engagementRate", "Eng. rate", "Interactions ÷ reach")}
                  {header("comments", "Comments")}
                  {hasShares && header("shares", "Shares")}
                  {hasSaves && header("saves", "Saves")}
                  {header("index", "vs typical", "Interactions compared with your median post")}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p) => {
                  const label = LABEL_STYLE[p.label];
                  return (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="px-2 py-2">
                        <div className="flex max-w-[22rem] items-center gap-3">
                          {p.thumbnailUrl ? (
                            <img src={p.thumbnailUrl} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                              <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm leading-snug">{p.text || <span className="italic text-muted-foreground">No caption</span>}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{p.format}</span>
                              {p.permalink && (
                                <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
                                  Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right text-xs text-muted-foreground tabular-nums">
                        {format(new Date(p.publishedAt), "EEE MMM d")}
                        <span className="block">{format(new Date(p.publishedAt), "HH:mm")}</span>
                      </td>
                      {hasReach && <td className="px-2 py-2 text-right tabular-nums">{p.reach != null ? formatCompact(p.reach) : "—"}</td>}
                      <td className="px-2 py-2 text-right font-medium tabular-nums">{formatCompact(p.interactions)}</td>
                      {hasReach && <td className="px-2 py-2 text-right tabular-nums">{p.engagementRate != null ? `${(p.engagementRate * 100).toFixed(1)}%` : "—"}</td>}
                      <td className="px-2 py-2 text-right tabular-nums">{formatCompact(p.comments)}</td>
                      {hasShares && <td className="px-2 py-2 text-right tabular-nums">{p.shares != null ? formatCompact(p.shares) : "—"}</td>}
                      {hasSaves && <td className="px-2 py-2 text-right tabular-nums">{p.saves != null ? formatCompact(p.saves) : "—"}</td>}
                      <td className="px-2 py-2 text-right">
                        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums", label.className)}>
                          {p.index.toFixed(1)}× · {label.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
