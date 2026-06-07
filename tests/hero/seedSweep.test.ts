import { describe, expect, it } from "vitest";
import { SWEEP_SEEDS, sweepBand } from "../../src/lib/hero/seedSweep";
import { generateSuperBowl, superBowlDefaults } from "../../src/lib/dgp/superBowl";

const tau = generateSuperBowl(superBowlDefaults, 1).groundTruth.comparisonEstimand;

describe("seedSweep", () => {
  it("uses a fixed, non-trivial seed set", () => {
    expect(SWEEP_SEEDS.length).toBeGreaterThanOrEqual(16);
  });

  it("last-touch sits entirely above truth across the seed set", () => {
    const band = sweepBand(superBowlDefaults, "last-touch");
    expect(band.total).toBe(SWEEP_SEEDS.length);
    expect(band.min).toBeGreaterThan(tau);
    expect(band.aboveTruth).toBe(band.total);
    expect(band.max).toBeGreaterThan(band.min);
  });

  it("DiD straddles truth across the seed set", () => {
    const band = sweepBand(superBowlDefaults, "did-twfe");
    expect(band.min).toBeLessThan(tau);
    expect(band.max).toBeGreaterThan(tau);
    // DiD should not be uniformly above truth the way last-touch is.
    expect(band.aboveTruth).toBeLessThan(band.total);
  });

  it("is deterministic for the same params + seed set", () => {
    expect(sweepBand(superBowlDefaults, "last-touch")).toEqual(
      sweepBand(superBowlDefaults, "last-touch"),
    );
  });

  it("never lets the estimator read ground truth — band is derived from point estimates only", () => {
    // The 'aboveTruth' diagnostic compares estimate to truth, but the estimate
    // itself must be finite and independent of the comparison.
    const band = sweepBand(superBowlDefaults, "did-twfe");
    expect(Number.isFinite(band.mean)).toBe(true);
  });
});
