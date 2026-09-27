import { getAccessToken } from './googleAuth.js';

/**
 * Read-only Cloud Monitoring client. Derives a backend's *activity* from GCP
 * telemetry — WITHOUT ever touching the service itself. This is the whole point:
 * the admin portal must never wake a scale-to-zero Cloud Run service just to show
 * its status (a direct GET /health cold-starts the container). Reading metrics
 * from the Monitoring API has zero effect on the service.
 *
 * Two signals:
 *  - `run.googleapis.com/request_count`   → when did it last serve traffic
 *    (→ "last activity Xh ago").
 *  - `run.googleapis.com/container/instance_count` → are there instances up right
 *    now (active) or is it scaled to zero (at rest).
 *
 * NO write methods by design; the SA holds only run.viewer + monitoring.viewer.
 */
export interface ServiceActivity {
  available: boolean; // false when no SA key / auth failed
  /** ISO timestamp of the most recent request the service served, if any in the window. */
  lastRequestAt?: string;
  /** Total requests observed within the lookback window. */
  requestsInWindow?: number;
  /** True when at least one container instance is currently running (not scaled to zero). */
  running?: boolean;
  /** Lookback window used, in hours. */
  windowHours?: number;
  error?: string;
}

const MONITORING_BASE = 'https://monitoring.googleapis.com/v3';

function iso(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function queryTimeSeries(
  token: string,
  project: string,
  params: Record<string, string>,
): Promise<any> {
  const qs = new URLSearchParams(params);
  const url = `${MONITORING_BASE}/projects/${project}/timeSeries?${qs.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = new Error(`monitoring_http_${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * @param rawKey  settings.gcp_sa_key JSON string (or null if not connected)
 * @param windowHours  how far back to look for activity (default 7 days)
 */
export async function getServiceActivity(
  rawKey: string | null,
  project: string,
  region: string,
  service: string,
  windowHours = 168,
): Promise<ServiceActivity> {
  if (!rawKey) return { available: false };

  let token: string;
  try {
    token = await getAccessToken(rawKey);
  } catch {
    return { available: false, error: 'gcp_auth' };
  }

  const end = new Date();
  const start = new Date(end.getTime() - windowHours * 3600 * 1000);
  const commonInterval = {
    'interval.startTime': iso(start),
    'interval.endTime': iso(end),
  };

  // ── 1. request_count → last activity + volume in window ────────────────────
  let lastRequestAt: string | undefined;
  let requestsInWindow: number | undefined;
  try {
    const data = await queryTimeSeries(token, project, {
      ...commonInterval,
      filter: `metric.type="run.googleapis.com/request_count" resource.labels.service_name="${service}"`,
      'aggregation.alignmentPeriod': '3600s',
      'aggregation.perSeriesAligner': 'ALIGN_SUM',
      'aggregation.crossSeriesReducer': 'REDUCE_SUM',
      view: 'FULL',
    });
    const series = data.timeSeries ?? [];
    let total = 0;
    let latest: number | null = null; // epoch ms of newest bucket with >0 requests
    for (const s of series) {
      for (const p of s.points ?? []) {
        const v = Number(p.value?.int64Value ?? p.value?.doubleValue ?? 0);
        if (v > 0) {
          total += v;
          const t = Date.parse(p.interval?.endTime ?? '');
          if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t;
        }
      }
    }
    requestsInWindow = total;
    if (latest !== null) lastRequestAt = new Date(latest).toISOString();
  } catch (e: any) {
    // Missing monitoring permission or API: report unknown rather than fail hard.
    return { available: true, error: e?.status === 403 ? 'monitoring_forbidden' : 'monitoring_error', windowHours };
  }

  // ── 2. instance_count → is it running right now (last ~10 min) ─────────────
  let running: boolean | undefined;
  try {
    const recentStart = new Date(end.getTime() - 10 * 60 * 1000);
    const data = await queryTimeSeries(token, project, {
      'interval.startTime': iso(recentStart),
      'interval.endTime': iso(end),
      filter: `metric.type="run.googleapis.com/container/instance_count" resource.labels.service_name="${service}"`,
      'aggregation.alignmentPeriod': '60s',
      'aggregation.perSeriesAligner': 'ALIGN_MAX',
      'aggregation.crossSeriesReducer': 'REDUCE_SUM',
      view: 'FULL',
    });
    const series = data.timeSeries ?? [];
    let maxInstances = 0;
    for (const s of series) {
      for (const p of s.points ?? []) {
        const v = Number(p.value?.int64Value ?? p.value?.doubleValue ?? 0);
        if (v > maxInstances) maxInstances = v;
      }
    }
    running = maxInstances > 0;
  } catch {
    running = undefined; // non-fatal; leave unknown
  }

  return { available: true, lastRequestAt, requestsInWindow, running, windowHours };
}
