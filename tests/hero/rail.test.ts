import { describe, expect, it } from "vitest";
import {
  biasVsTruth,
  buildLane,
  ciVsTruth,
  niceRailDomain,
  railTicks,
  scaleLinear,
} from "../../src/lib/hero/rail";
import type { EstimationResult } from "../../src/lib/methods/types";

const result = (over: Partial<EstimationResult>): EstimationResult => ({
  methodId: "m",
  status: "ok",
  assumptionFlags: [],
  message: null,
  pointEstimate: 0.016,
  confidenceInterval: [0.012, 0.02],
  coverage95: true,
  perPeriodEstimate: null,
  diagnostics: {},
  runtimeMs: 0,
  ...over,
});

describe("rail.biasVsTruth", () => {
  it("expresses the gap as a fraction of truth", () => {
    expect(biasVsTruth(0.0239, 0.0132)).toBeCloseTo(0.8106, 3);
    expect(biasVsTruth(0.016, 0.0132)).toBeCloseTo(0.2121, 3);
  });
  it("is zero when truth is zero (avoids divide-by-zero)", () => {
    expect(biasVsTruth(0.01, 0)).toBe(0);
  });
});

describe("rail.ciVsTruth", () => {
  it("labels a CI that brackets truth as covering it", () => {
    expect(ciVsTruth([0.0117, 0.0203], 0.0132)).toBe("covers");
  });
  it("labels a CI entirely above truth as clearing it", () => {
    expect(ciVsTruth([0.0214, 0.0265], 0.0132)).toBe("clears-above");
  });
  it("labels a CI entirely below truth as clearing it (below)", () => {
    expect(ciVsTruth([0.005, 0.01], 0.0132)).toBe("clears-below");
  });
  it("is unknown when there is no CI", () => {
    expect(ciVsTruth(null, 0.0132)).toBe("unknown");
  });
});

describe("rail.niceRailDomain + railTicks", () => {
  it("covers the showcase spread and rounds to a 0-3% axis", () => {
    const [lo, hi] = niceRailDomain([0.0132, 0.0265, 0.0277, 0.0203]);
    expect(lo).toBe(0);
    expect(hi).toBeGreaterThanOrEqual(0.0277);
    expect(hi).toBeCloseTo(0.03, 6);
    const ticks = railTicks(hi);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeCloseTo(0.03, 6);
    // 0.0,0.5,1.0,1.5,2.0,2.5,3.0
    expect(ticks).toHaveLength(7);
  });
  it("expands for larger lifts while keeping a readable tick count", () => {
    const [, hi] = niceRailDomain([0.066, 0.072, 0.036]);
    expect(hi).toBeGreaterThanOrEqual(0.072);
    const ticks = railTicks(hi);
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    expect(ticks.length).toBeLessThanOrEqual(9);
  });
});

describe("rail.scaleLinear", () => {
  it("maps domain endpoints to range endpoints", () => {
    const s = scaleLinear([0, 0.03], [0, 600]);
    expect(s(0)).toBe(0);
    expect(s(0.03)).toBe(600);
    expect(s(0.015)).toBeCloseTo(300, 6);
  });
});

describe("rail.buildLane", () => {
  it("derives bias and CI status from a real result", () => {
    const lane = buildLane({
      methodId: "last-touch",
      label: "Last-touch",
      result: result({ pointEstimate: 0.0239, confidenceInterval: [0.0214, 0.0265], status: "warning" }),
      tau: 0.0132,
      refEstimate: 0.0129,
      band: { min: 0.019, max: 0.0277 },
    });
    expect(lane.status).toBe("warning");
    expect(lane.estimate).toBe(0.0239);
    expect(lane.biasPct).toBeCloseTo(0.8106, 3);
    expect(lane.ciStatus).toBe("clears-above");
    expect(lane.refEstimate).toBe(0.0129);
    expect(lane.band).toEqual({ min: 0.019, max: 0.0277 });
  });
  it("carries nulls through for an invalid result without inventing numbers", () => {
    const lane = buildLane({
      methodId: "last-touch",
      label: "Last-touch",
      result: result({ status: "invalid", pointEstimate: null, confidenceInterval: null }),
      tau: 0.0132,
    });
    expect(lane.estimate).toBeNull();
    expect(lane.biasPct).toBeNull();
    expect(lane.ci).toBeNull();
    expect(lane.ciStatus).toBe("unknown");
    expect(lane.band).toBeNull();
  });
});
