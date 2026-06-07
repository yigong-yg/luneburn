import { describe, expect, it } from "vitest";
import {
  easeInOut,
  REFERENCE_CORRELATION,
  REPLAY_MS,
  replayValue,
  SHOWCASE_CORRELATION,
} from "../../src/lib/hero/replay";
import { superBowlDefaults } from "../../src/lib/dgp/superBowl";

describe("replay constants", () => {
  it("anchors the reference at rho 0.20 and the showcase at the default", () => {
    expect(REFERENCE_CORRELATION).toBe(0.2);
    expect(SHOWCASE_CORRELATION).toBe(superBowlDefaults.crossChannelCorrelation);
    expect(REPLAY_MS).toBeGreaterThan(400);
  });
});

describe("replay.easeInOut", () => {
  it("pins endpoints and midpoint", () => {
    expect(easeInOut(0)).toBeCloseTo(0, 6);
    expect(easeInOut(1)).toBeCloseTo(1, 6);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });
});

describe("replay.replayValue", () => {
  it("starts on the reference and ends on the showcase", () => {
    expect(replayValue(0)).toBeCloseTo(REFERENCE_CORRELATION, 6);
    expect(replayValue(1)).toBeCloseTo(SHOWCASE_CORRELATION, 6);
  });
  it("increases monotonically and stays in range mid-flight", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 10; i += 1) {
      const v = replayValue(i / 10);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(v).toBeGreaterThanOrEqual(REFERENCE_CORRELATION - 1e-9);
      expect(v).toBeLessThanOrEqual(SHOWCASE_CORRELATION + 1e-9);
      prev = v;
    }
  });
  it("clamps progress outside [0,1]", () => {
    expect(replayValue(-1)).toBeCloseTo(REFERENCE_CORRELATION, 6);
    expect(replayValue(2)).toBeCloseTo(SHOWCASE_CORRELATION, 6);
  });
});
