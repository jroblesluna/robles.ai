import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { JsonHighlight } from "./JsonHighlight";

/**
 * API log shared by the live-API demo pages: a "Robly on the phone" session
 * card, then one minimal row per call (method · endpoint · status) that expands
 * to the full detail (URL, timing, request and response).
 */

export interface ApiCallEntry {
  key: string;
  /** "GET", "POST", "WS" (WebSocket message) or "ERR" (client-side failure). */
  method: string;
  /** Full URL (shown as its path in the row) or a short label such as "→ start". */
  url: string;
  /** HTTP status, or a short code like "ERR"; omitted when there is none (e.g. WS messages). */
  status?: number | string;
  /** Overrides the success color derived from `status`. */
  ok?: boolean;
  ms?: number;
  at: number;
  request?: unknown;
  response?: unknown;
  /** Extra chips in the detail line, e.g. a pipeline step or the job status. */
  chips?: { label: string; className?: string; dot?: string }[];
}

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-sky-100 text-sky-700",
  POST: "bg-amber-100 text-amber-700",
  WS: "bg-violet-100 text-violet-700",
  RUN: "bg-indigo-100 text-indigo-700",
  ERR: "bg-red-100 text-red-700",
};

export const formatCallMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

function displayPath(url: string) {
  if (!/^(https?|wss?):\/\//.test(url)) return { path: url, absolute: false };
  try {
    const u = new URL(url);
    return { path: u.pathname + u.search, absolute: true };
  } catch {
    return { path: url, absolute: false };
  }
}

function isOk(call: ApiCallEntry) {
  if (call.ok !== undefined) return call.ok;
  if (typeof call.status === "number") return call.status >= 200 && call.status < 400;
  return call.status === undefined;
}

export function ApiCallLog({
  calls,
  active,
  failed,
  activeDescription,
  empty,
  renderActions,
}: {
  /** Newest first. */
  calls: ApiCallEntry[];
  /** True while requests are in flight (Robly is "on the call"). */
  active: boolean;
  failed?: boolean;
  activeDescription?: string;
  empty: { title: ReactNode; description: string; extra?: ReactNode };
  renderActions?: (call: ApiCallEntry) => ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (calls.length === 0 && !active) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <img src="/robly-avatar/robly-standby.svg" alt="" className="mb-2 h-24 w-24 opacity-50" />
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">{empty.title}</p>
        <p className="mt-1 max-w-xs text-sm text-gray-400">{empty.description}</p>
        {empty.extra}
      </div>
    );
  }

  const totalMs = calls.reduce((sum, c) => sum + (c.ms ?? 0), 0);
  const formatTime = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div>
      {/* Call session: Robly on the phone with the API */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-white p-2 pr-4">
        <img src="/robly-avatar/robly-calling.svg" alt="" className="h-20 w-20 shrink-0 opacity-80" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {active && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>
            )}
            {active ? t("apiLog.live") : failed ? t("apiLog.failed") : t("apiLog.done")}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            {active
              ? activeDescription || t("apiLog.waiting")
              : t("apiLog.summary", { count: calls.length, time: formatCallMs(totalMs) })}
          </p>
        </div>
      </div>

      <ol className="space-y-2.5">
        <AnimatePresence initial={false}>
          {calls.map((call, i) => {
            const isOpen = open[call.key] ?? false;
            const ok = isOk(call);
            const { path, absolute } = displayPath(call.url);
            const extra = renderActions?.(call);
            return (
              <motion.li
                key={call.key}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`overflow-hidden rounded-xl border bg-white transition-shadow ${
                  isOpen ? "border-gray-300 shadow-sm" : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((o) => ({ ...o, [call.key]: !isOpen }))}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  <span
                    className={`w-11 shrink-0 rounded-md py-0.5 text-center font-mono text-[10px] font-bold ${
                      METHOD_STYLE[call.method] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {call.method}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-gray-900" title={call.url}>
                    {path}
                  </span>
                  {call.status !== undefined && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold ${
                        ok ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                      {call.status}
                    </span>
                  )}
                  <ChevronRight className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 p-3">
                        {absolute && <p className="break-all font-mono text-[11px] text-gray-500">{call.url}</p>}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
                          <span className="font-mono tabular-nums text-gray-400">#{calls.length - i}</span>
                          {call.ms !== undefined && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="font-mono tabular-nums">{formatCallMs(call.ms)}</span>
                            </>
                          )}
                          <span className="text-gray-300">·</span>
                          <span className="tabular-nums">{formatTime(call.at)}</span>
                          {call.chips?.map((chip) => (
                            <span
                              key={chip.label}
                              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px] ${
                                chip.className ?? "border-gray-200 bg-gray-50 text-gray-600"
                              }`}
                            >
                              {chip.dot && <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />}
                              {chip.label}
                            </span>
                          ))}
                          {extra && <span className="ml-auto">{extra}</span>}
                        </div>
                        {call.request !== undefined && (
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                              {t("apiLog.request")}
                            </p>
                            <JsonHighlight data={call.request} />
                          </div>
                        )}
                        {call.response !== undefined && (
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                              {t("apiLog.response")}
                            </p>
                            <JsonHighlight data={call.response} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
