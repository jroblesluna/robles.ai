import { describe, it, expect } from "vitest";
import { forecast, samplePreset, parseCsvSeries, forecastToCsv } from "../forecast";

describe("forecast", () => {
  it("extends a linear series along its trend", () => {
    const history = Array.from({ length: 30 }, (_, i) => 10 + 2 * i);
    const r = forecast(history, 5, false);
    expect(r.historyLength).toBe(30);
    expect(r.horizon).toBe(5);
    expect(r.slope).toBeCloseTo(2, 1);
    const fc = r.points.filter((p) => p.history == null && p.forecast != null);
    expect(fc.length).toBe(5);
    // Next value after 10+2*29=68 should be ~70.
    expect(fc[0].forecast!).toBeGreaterThan(68);
    expect(fc[0].forecast!).toBeLessThan(74);
  });

  it("produces widening q10<=q50<=q90 bands", () => {
    const history = samplePreset("seasonal", 90);
    const r = forecast(history, 24);
    const fc = r.points.filter((p) => p.q10 != null && p.q90 != null && p.forecast != null);
    expect(fc.length).toBe(24);
    for (const p of fc) {
      expect(p.q10!).toBeLessThanOrEqual(p.forecast! + 1e-6);
      expect(p.forecast!).toBeLessThanOrEqual(p.q90! + 1e-6);
    }
    // Band at the far horizon is wider than near.
    const near = fc[0].q90! - fc[0].q10!;
    const far = fc[fc.length - 1].q90! - fc[fc.length - 1].q10!;
    expect(far).toBeGreaterThanOrEqual(near);
  });

  it("detects a weekly season on seasonal data", () => {
    const r = forecast(samplePreset("seasonal", 120), 24);
    expect(r.season).toBeGreaterThan(1);
  });

  it("clamps non-negative forecasts by default", () => {
    const history = Array.from({ length: 20 }, (_, i) => Math.max(0, 5 - i));
    const r = forecast(history, 10);
    for (const p of r.points) {
      if (p.forecast != null) expect(p.forecast).toBeGreaterThanOrEqual(0);
      if (p.q10 != null) expect(p.q10).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles too-short series without crashing", () => {
    const r = forecast([5], 4);
    expect(r.points.filter((p) => p.forecast != null).length).toBeGreaterThan(0);
  });
});

describe("parseCsvSeries", () => {
  it("reads one value per row", () => {
    expect(parseCsvSeries("10\n20\n30\n40")).toEqual([10, 20, 30, 40]);
  });

  it("reads the last column of date,value rows and skips a header", () => {
    const csv = "date,sales\n2026-01-01,100\n2026-01-02,120\n2026-01-03,90";
    expect(parseCsvSeries(csv)).toEqual([100, 120, 90]);
  });

  it("throws on non-numeric input", () => {
    expect(() => parseCsvSeries("a\nb\nc")).toThrow();
  });
});

describe("forecastToCsv", () => {
  it("emits history and forecast rows", () => {
    const csv = forecastToCsv(forecast(samplePreset("standard", 30), 5));
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain("type,value,q10,q90");
    expect(lines.some((l) => l.includes(",history,"))).toBe(true);
    expect(lines.some((l) => l.includes(",forecast,"))).toBe(true);
  });
});
