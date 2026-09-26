import { describe, it, expect } from "vitest";
import { computeSavings, CALCULATOR_DEFAULTS } from "../business";

describe("computeSavings", () => {
  it("turns volume × minutes × automation share into hours and money", () => {
    // 1000 units × 12 min × 80% = 9600 min = 160 h; × $15/h = $2400/month.
    const r = computeSavings({ volume: 1000, minutes: 12, automation: 80, hourlyCost: 15 });
    expect(r.hours).toBe(160);
    expect(r.monthly).toBe(2400);
    expect(r.yearly).toBe(28800);
    // Current cost of the whole process: 1000 × 12 min = 200 h × $15 = $3000.
    expect(r.baseline).toBe(3000);
  });

  it("is zero when nothing is automated", () => {
    expect(computeSavings({ volume: 500, minutes: 10, automation: 0, hourlyCost: 20 }).monthly).toBe(0);
  });

  it("has example inputs for every live demo", () => {
    expect(Object.keys(CALCULATOR_DEFAULTS).sort()).toEqual(
      ["emotion", "identity", "langchain", "objectdetection", "rag", "sitechatbot", "speech"],
    );
  });
});
