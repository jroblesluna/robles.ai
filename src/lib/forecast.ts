/**
 * Browser-only time-series forecasting for the "Forecast" demo (D6).
 *
 * No backend, no ML library: a small, transparent additive decomposition
 * (Holt-Winters style) computed in pure TypeScript over an array of numbers.
 *
 *   value ≈ level + trend·t + seasonal[t mod m]
 *
 * The season length `m` is auto-detected by autocorrelation. Uncertainty bands
 * (q10 / q50 / q90) come from the spread of in-sample residuals, widening with
 * the forecast horizon. Everything runs locally — the visitor's data never
 * leaves the page.
 */

export interface ForecastPoint {
  /** 0-based index over history ∪ forecast. */
  t: number;
  history: number | null;
  /** Median forecast (q50). Null over the history range except the last point. */
  forecast: number | null;
  /** Fitted trend line (level + slope·t), drawn across the whole range. */
  trend: number | null;
  q10: number | null;
  q90: number | null;
}

export interface ForecastResult {
  points: ForecastPoint[];
  season: number;
  /** Trend per step (slope of the fitted line). */
  slope: number;
  /** Mean absolute residual in-sample (a rough error read-out). */
  mae: number;
  horizon: number;
  historyLength: number;
}

/** Ordinary least-squares line y = a + b·x over indices 0..n-1. */
function linearTrend(y: number[]): { a: number; b: number } {
  const n = y.length;
  if (n === 0) return { a: 0, b: 0 };
  if (n === 1) return { a: y[0], b: 0 };
  const meanX = (n - 1) / 2;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (y[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = meanY - b * meanX;
  return { a, b };
}

/**
 * Detect the dominant season length by autocorrelation of the detrended
 * series, scanning lags 2..maxLag. Returns 1 (no seasonality) when nothing
 * stands out.
 */
function detectSeason(detrended: number[]): number {
  const n = detrended.length;
  const maxLag = Math.min(Math.floor(n / 2), 60);
  if (n < 8 || maxLag < 2) return 1;
  const mean = detrended.reduce((s, v) => s + v, 0) / n;
  const variance = detrended.reduce((s, v) => s + (v - mean) ** 2, 0) / n || 1;

  let bestLag = 1;
  let bestScore = 0.2; // threshold: below this we treat it as non-seasonal
  for (let lag = 2; lag <= maxLag; lag++) {
    let cov = 0;
    for (let i = lag; i < n; i++) cov += (detrended[i] - mean) * (detrended[i - lag] - mean);
    const score = cov / (n - lag) / variance;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestLag;
}

/** Quantile of a sorted-agnostic array via linear interpolation. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Forecast `horizon` steps ahead from `history`.
 * @param clampNonNegative  keep the forecast ≥ 0 (counts, sales, demand).
 */
export function forecast(history: number[], horizon: number, clampNonNegative = true): ForecastResult {
  const n = history.length;
  const H = Math.max(1, Math.floor(horizon));

  // Degenerate: too little data → flat line at the mean with no bands.
  if (n < 3) {
    const level = n ? history.reduce((s, v) => s + v, 0) / n : 0;
    const points: ForecastPoint[] = [];
    for (let i = 0; i < n; i++) points.push({ t: i, history: history[i], forecast: null, trend: level, q10: null, q90: null });
    for (let h = 0; h < H; h++) {
      points.push({ t: n + h, history: null, forecast: level, trend: level, q10: level, q90: level });
    }
    return { points, season: 1, slope: 0, mae: 0, horizon: H, historyLength: n };
  }

  // 1. Trend by OLS.
  const { a, b } = linearTrend(history);
  const detrended = history.map((v, i) => v - (a + b * i));

  // 2. Seasonality: average the detrended value at each phase of the season.
  const m = detectSeason(detrended);
  const seasonal = new Array(m).fill(0);
  if (m > 1) {
    const counts = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      seasonal[i % m] += detrended[i];
      counts[i % m]++;
    }
    for (let k = 0; k < m; k++) seasonal[k] = counts[k] ? seasonal[k] / counts[k] : 0;
    // Center the seasonal profile so it sums to ~0 (keeps the trend meaningful).
    const meanSeason = seasonal.reduce((s, v) => s + v, 0) / m;
    for (let k = 0; k < m; k++) seasonal[k] -= meanSeason;
  }

  const fitted = (i: number) => a + b * i + (m > 1 ? seasonal[i % m] : 0);

  // 3. Residuals in-sample → error spread for the bands.
  const residuals = history.map((v, i) => v - fitted(i));
  const absResiduals = residuals.map(Math.abs);
  const mae = absResiduals.reduce((s, v) => s + v, 0) / n;
  const sortedResid = [...residuals].sort((x, y) => x - y);
  const rLo = quantile(sortedResid, 0.1);
  const rHi = quantile(sortedResid, 0.9);

  const clamp = (v: number) => (clampNonNegative ? Math.max(0, v) : v);

  const points: ForecastPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      t: i,
      history: history[i],
      // Bridge the last history point into the forecast line for a continuous curve.
      forecast: i === n - 1 ? clamp(fitted(i)) : null,
      trend: a + b * i,
      q10: null,
      q90: null,
    });
  }

  for (let h = 1; h <= H; h++) {
    const i = n - 1 + h;
    const center = fitted(i);
    // Bands widen with horizon: √h growth of the residual spread.
    const widen = Math.sqrt(h);
    points.push({
      t: i,
      history: null,
      forecast: clamp(center),
      trend: a + b * i,
      q10: clamp(center + rLo * widen),
      q90: clamp(center + rHi * widen),
    });
  }

  return { points, season: m, slope: b, mae, horizon: H, historyLength: n };
}

// ── Example series generators (deterministic, seeded) ──────────────────────────

/** Small seeded PRNG so example data is stable across renders. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export type PresetId = "standard" | "trending" | "seasonal" | "noisy";

/** Generate an example daily-like series of `n` points for a preset. */
export function samplePreset(preset: PresetId, n = 120): number[] {
  const rnd = mulberry32(preset.length * 97 + n);
  const season = 7; // weekly pattern
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const week = Math.sin((2 * Math.PI * i) / season);
    const week2 = Math.cos((2 * Math.PI * i) / season);
    let base: number;
    switch (preset) {
      case "trending":
        base = 100 + i * 1.4 + 18 * week + 6 * (rnd() - 0.5) * 4;
        break;
      case "seasonal":
        base = 200 + 60 * week + 25 * week2 + 8 * (rnd() - 0.5) * 4;
        break;
      case "noisy":
        base = 150 + i * 0.3 + 20 * week + 45 * (rnd() - 0.5) * 4;
        break;
      case "standard":
      default:
        base = 120 + i * 0.5 + 22 * week + 7 * (rnd() - 0.5) * 4;
        break;
    }
    out.push(Math.max(0, Math.round(base)));
  }
  return out;
}

/**
 * Parse a CSV of numbers. Accepts one value per row, or "date,value" / any
 * "…,value" where the last column is numeric. Skips a header row and blanks.
 * Returns the numeric series (capped) or throws if nothing parses.
 */
export function parseCsvSeries(text: string, cap = 2000): number[] {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  const out: number[] = [];
  for (const row of rows) {
    const cols = row.split(/[,;\t]/).map((c) => c.trim());
    const last = cols[cols.length - 1];
    const cleaned = last.replace(/[^0-9.\-]/g, "");
    // Require a real numeric token: reject header/text cells like "sales" or "a"
    // that would otherwise clean down to "" and parse as 0.
    if (cleaned === "" || !/\d/.test(cleaned)) continue;
    const num = Number(cleaned);
    if (Number.isFinite(num)) out.push(num);
    if (out.length >= cap) break;
  }
  if (out.length < 3) throw new Error("not enough numeric rows");
  return out;
}

/** Build a CSV string of the forecast for download. */
export function forecastToCsv(result: ForecastResult): string {
  const header = "t,type,value,q10,q90";
  const lines = [header];
  for (const p of result.points) {
    if (p.history != null) {
      lines.push(`${p.t},history,${p.history},,`);
    } else if (p.forecast != null) {
      lines.push(`${p.t},forecast,${round(p.forecast)},${round(p.q10)},${round(p.q90)}`);
    }
  }
  return "\uFEFF" + lines.join("\r\n");
}

function round(v: number | null): string {
  return v == null ? "" : String(Math.round(v * 100) / 100);
}
