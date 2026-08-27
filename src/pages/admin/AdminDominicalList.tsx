import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, RefreshCw, Eye, Newspaper, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 10;

interface DominicalReport {
  id: number;
  week_start: string;
  week_end: string;
  status: string;
  created_at: string;
  last_edited_at: string | null;
  published_at: string | null;
  selected_news_count: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending_review: {
    label: "Pending Review",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  edited: {
    label: "Edited",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  published: {
    label: "Published",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return <Badge className={config.className}>{config.label}</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWeek(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("es-PE", opts)} – ${e.toLocaleDateString("es-PE", { ...opts, year: "numeric" })}`;
}

export default function AdminDominicalList() {
  const [, setLocation] = useLocation();
  const [reports, setReports] = useState<DominicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/dominical");
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports ?? []);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/admin/dominical/generate", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            El Dominical IA
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Weekly LinkedIn post reports
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="w-full sm:w-auto">
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Now"}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
          <Newspaper className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No reports yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Click "Generate Now" to create your first weekly report.
          </p>
        </div>
      )}

      {/* Reports table (desktop) / cards (mobile) */}
      {!loading && reports.length > 0 && (
        <>
          {(() => {
            const totalPages = Math.ceil(reports.length / PAGE_SIZE);
            const pageReports = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            return (
              <>
                {/* Table — sm and up */}
                <div className="hidden overflow-x-auto rounded-lg border sm:block">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Week</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">News</th>
                        <th className="px-4 py-3 text-left font-medium">Created</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageReports.map((report) => (
                        <tr
                          key={report.id}
                          className="border-b transition-colors hover:bg-muted/30 cursor-pointer"
                          onClick={() => setLocation(`/admin/dominical/${report.id}`)}
                        >
                          <td className="px-4 py-3 font-medium">
                            {formatWeek(report.week_start, report.week_end)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={report.status} />
                          </td>
                          <td className="px-4 py-3">{report.selected_news_count}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(report.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/admin/dominical/${report.id}`);
                              }}
                              aria-label={`View report for week ${report.week_start}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards — mobile only */}
                <div className="space-y-3 sm:hidden">
                  {pageReports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setLocation(`/admin/dominical/${report.id}`)}
                      className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">
                          {formatWeek(report.week_start, report.week_end)}
                        </span>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{report.selected_news_count} news</span>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:border-t-0 sm:pt-0">
                    <p className="text-center text-sm text-muted-foreground sm:text-left">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, reports.length)} of {reports.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="flex-1 sm:flex-none"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </Button>
                      <span className="whitespace-nowrap text-sm font-medium">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="flex-1 sm:flex-none"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
