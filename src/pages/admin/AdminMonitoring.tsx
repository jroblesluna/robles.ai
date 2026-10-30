import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LogTail {
  available: boolean;
  lines: string[];
  sizeBytes: number;
  updatedAt: string | null;
}

const STREAMS = [
  { id: "error", label: "Errors" },
  { id: "out", label: "Output" },
] as const;

const lineTone = (line: string) => /error|failed|exception|unhandled/i.test(line) ? "text-red-300" : /warn/i.test(line) ? "text-amber-300" : "text-gray-200";

export default function AdminMonitoring() {
  const [stream, setStream] = useState<"error" | "out">("error");
  const [lines, setLines] = useState(200);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(true);
  const output = useRef<HTMLPreElement>(null);
  const followTail = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(filter.trim()), 300);
    return () => clearTimeout(timer);
  }, [filter]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery<LogTail>({
    queryKey: ["admin-monitoring-logs", stream, lines, query],
    queryFn: async () => {
      const params = new URLSearchParams({ stream, lines: String(lines), q: query });
      const res = await fetch(`/api/admin/monitoring/logs?${params}`);
      if (!res.ok) throw new Error("Failed to load logs");
      return res.json();
    },
    refetchInterval: live ? 5000 : false,
  });

  useEffect(() => {
    if (followTail.current && output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [data]);

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Monitoring</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Live PM2 logs from the VPS. Read-only; secrets are masked.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STREAMS.map(({ id, label }) => (
          <Button key={id} size="sm" variant={stream === id ? "default" : "outline"} aria-pressed={stream === id} onClick={() => setStream(id)}>
            {label}
          </Button>
        ))}
        <Input
          value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Filter, e.g. CarouselGenerator"
          aria-label="Filter log lines"
          maxLength={100}
          className="h-9 w-full sm:w-64"
        />
        <select
          value={lines}
          onChange={event => setLines(Number(event.target.value))}
          aria-label="Lines to show"
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {[200, 500, 1000].map(count => <option key={count} value={count}>{count} lines</option>)}
        </select>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} />
          Live (5 s)
        </label>
        <Button size="sm" variant="outline" className="gap-2" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Failed to load logs.</div>
      )}
      {data && !data.available && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No PM2 log file found. This is expected in local development; on the VPS check that the process runs under PM2.
        </div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {data?.available && (
        <>
          <pre
            ref={output}
            tabIndex={0}
            aria-label="Log output"
            onScroll={event => {
              const el = event.currentTarget;
              followTail.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
            className="min-h-[320px] flex-1 overflow-auto whitespace-pre-wrap rounded-md bg-gray-950 p-4 font-mono text-xs leading-relaxed"
          >
            {data.lines.length === 0
              ? <span className="text-gray-400">No matching lines.</span>
              : data.lines.map((line, index) => <div key={index} className={lineTone(line)}>{line}</div>)}
          </pre>
          <p className="text-xs text-muted-foreground">
            {data.lines.length} lines · file size {(data.sizeBytes / 1024 / 1024).toFixed(1)} MB
            {data.updatedAt && ` · last write ${new Date(data.updatedAt).toLocaleString("en-US")}`}
          </p>
        </>
      )}
    </div>
  );
}
