import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  format?: "number" | "percent" | "duration";
  isLoading?: boolean;
}

/**
 * Compute percentage change between previous and current values.
 */
function computeChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format a duration in seconds to a readable string (e.g., "2m 35s").
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Format a value based on the specified format type.
 */
function formatValue(value: string | number, format?: KpiCardProps["format"]): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  switch (format) {
    case "percent":
      return `${(num * 100).toFixed(1)}%`;
    case "duration":
      return formatDuration(num);
    case "number":
    default:
      return num.toLocaleString();
  }
}

export default function KpiCard({
  label,
  value,
  previousValue,
  currentValue,
  format,
  isLoading = false,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  const change =
    currentValue !== undefined && previousValue !== undefined
      ? computeChange(currentValue, previousValue)
      : null;

  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;
  const isNeutral = change === null || change === 0;

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          {formatValue(value, format)}
        </p>
        {change !== null && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-sm font-medium",
              isPositive && "text-green-600",
              isNegative && "text-red-600",
              isNeutral && "text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="h-4 w-4" />}
            {isNegative && <TrendingDown className="h-4 w-4" />}
            {isNeutral && <Minus className="h-4 w-4" />}
            <span>
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground font-normal">vs prev period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
