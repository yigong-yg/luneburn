import { describe, expect, it } from "vitest";
import {
  appendEstimateTrail,
  estimateTrailSampleChanged,
  MAX_TRAIL_SAMPLES,
  type EstimateTrailSample,
} from "../../src/lib/hero/trail";

const sample = (lastTouch: number | null, did: number | null): EstimateTrailSample => ({
  lastTouch,
  did,
});

describe("estimate trail helpers", () => {
  it("keeps only the latest trail samples", () => {
    let trail: ReadonlyArray<EstimateTrailSample> = [];

    for (let i = 0; i < MAX_TRAIL_SAMPLES + 3; i += 1) {
      trail = appendEstimateTrail(trail, sample(i / 100, i / 200));
    }

    expect(trail).toHaveLength(MAX_TRAIL_SAMPLES);
    expect(trail[0]).toEqual(sample(0.03, 0.015));
    expect(trail[trail.length - 1]).toEqual(sample(0.08, 0.04));
  });

  it("does not append duplicate samples", () => {
    const first = sample(0.012, 0.011);
    const trail = appendEstimateTrail([first], first);

    expect(trail).toEqual([first]);
  });

  it("detects null-safe sample changes", () => {
    expect(estimateTrailSampleChanged(sample(null, null), sample(null, null))).toBe(
      false,
    );
    expect(estimateTrailSampleChanged(sample(0.01, null), sample(0.01, null))).toBe(
      false,
    );
    expect(estimateTrailSampleChanged(sample(0.01, null), sample(0.012, null))).toBe(
      true,
    );
    expect(estimateTrailSampleChanged(sample(0.01, null), sample(0.01, 0.011))).toBe(
      true,
    );
  });
});
