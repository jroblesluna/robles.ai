import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { pctChange } from "@shared/socialInsights";

export interface SocialKpi {
  label: string;
  value: number | null;
  previous?: number | null;
  format?: "number" | "percent";
  /** Short line under the value, e.g. "+42 new this period". */
  note?: string;
  hint?: string;
  /** For metrics where going down is good (e.g. unfollows). */
  invert?: boolean;
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString("en-US");
}

function formatValue(value: number, format: SocialKpi["format"]) {
  return format === "percent" ? `${(value * 100).toFixed(2)}%` : formatCompact(value);
}

export default function SocialKpis({ kpis }: { kpis: SocialKpi[] }) {
  const visible = kpis.filter((k) => k.value != null);
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", visible.length % 4 === 0 && "xl:grid-cols-4")}>
      {visible.map((k) => {
        const change = pctChange(k.value, k.previous);
        const good = change !== null && (k.invert ? change < 0 : change > 0);
        const bad = change !== null && (k.invert ? change > 0 : change < 0);
        return (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span className="truncate">{k.label}</span>
                {k.hint && (
                  <span title={k.hint} className="shrink-0 cursor-help">
                    <Info className="h-3 w-3" aria-label={k.hint} />
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums leading-none">{formatValue(k.value!, k.format)}</p>
              <div className="mt-2 flex min-h-[1.25rem] flex-wrap items-center gap-x-2 text-xs">
                {change !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-medium tabular-nums",
                      good && "text-green-700",
                      bad && "text-red-600",
                      !good && !bad && "text-muted-foreground"
                    )}
                    title={`Previous period: ${formatValue(k.previous ?? 0, k.format)}`}
                  >
                    {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : change < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                ) : k.previous === undefined ? null : (
                  <span className="text-muted-foreground">no comparison</span>
                )}
                {k.note && <span className="text-muted-foreground">{k.note}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
