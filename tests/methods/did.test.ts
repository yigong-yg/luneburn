import { describe, expect, it } from "vitest";
import { estimateDiD } from "../../src/lib/methods/did";
import type { Dataset, DGPParams, GroundTruth, Unit } from "../../src/lib/dgp/types";

const PARAMS: DGPParams = {
  trueEffect: 0,
  crossChannelCorrelation: 0,
  noiseStd: 0,
  nUnits: 0,
  nPeriods: 0,
  treatmentTimingJitter: 0,
  baselineTrendCurvature: 0,
  structuralBreakIntensity: 0,
};

interface FixtureOptions {
  readonly nUnits: number;
  readonly nTreated: number;
  readonly nPeriods: number;
  readonly onset: number;
  // Counterfactual outcome Y0 for a unit-period (pre-treatment baseline path).
  readonly baseline: (unitIndex: number, period: number, treated: boolean) => number;
  // Multiplicative lift applied to treated units at weeks onset, onset+1, ...
  readonly kernel: ReadonlyArray<number>;
}

const liftAt = (
  treated: boolean,
  period: number,
  onset: number,
  kernel: ReadonlyArray<number>,
): number => {
  const lag = period - onset;
  return treated && lag >= 0 && lag < kernel.length ? (kernel[lag] ?? 0) : 0;
};

const makeDataset = (o: FixtureOptions): Dataset => {
  const units: Unit[] = Array.from({ length: o.nUnits }, (_unused, i) => {
    const treated = i < o.nTreated;
    const counterfactual = Array.from({ length: o.nPeriods }, (_n, t) =>
      o.baseline(i, t, treated),
    );
    const outcomes = counterfactual.map(
      (y0, t) => y0 * (1 + liftAt(treated, t, o.onset, o.kernel)),
    );
    const treatment = Array.from({ length: o.nPeriods }, (_n, t) =>
      treated && t === o.onset ? 1 : 0,
    );
    return {
      id: i,
      treated,
      treatment,
      outcomes,
      channelSpend: Array.from({ length: o.nPeriods }, () => [1]),
    };
  });

  const counterfactualOutcomes = Array.from({ length: o.nUnits }, (_n, i) =>
    Array.from({ length: o.nPeriods }, (_m, t) => o.baseline(i, t, i < o.nTreated)),
  );
  const perPeriodEffect = Array.from({ length: o.nPeriods }, (_n, t) =>
    liftAt(true, t, o.onset, o.kernel),
  );
  const post = perPeriodEffect.slice(o.onset);
  const comparisonEstimand =
    post.length > 0 ? post.reduce((s, v) => s + v, 0) / post.length : 0;

  const groundTruth: GroundTruth = {
    comparisonEstimand,
    averageTreatmentEffectLevel: 0,
    perPeriodEffect,
    perUnitEffect: units.map((u) => (u.treated ? comparisonEstimand : 0)),
    counterfactualOutcomes,
  };

  return {
    scenarioId: "test",
    params: PARAMS,
    seed: 1,
    nUnits: o.nUnits,
    nPeriods: o.nPeriods,
    nChannels: 1,
    units,
    groundTruth,
  };
};

const relErr = (estimate: number, truth: number): number =>
  Math.abs(estimate - truth) / Math.abs(truth);

describe("DiD-TWFE - validity", () => {
  it("recovers tau_comp within 1% under unit FE, parallel trends, no noise", () => {
    const dataset = makeDataset({
      nUnits: 20,
      nTreated: 10,
      nPeriods: 12,
      onset: 6,
      baseline: (i) => 100 + i * 3, // unit fixed effects, no time trend
      kernel: [0.18, 0.1, 0.05],
    });
    const result = estimateDiD(dataset);

    expect(result.methodId).toBe("did-twfe");
    expect(result.status).toBe("ok");
    expect(result.assumptionFlags).toEqual([]);
    expect(result.pointEstimate).not.toBeNull();
    expect(relErr(result.pointEstimate ?? 0, dataset.groundTruth.comparisonEstimand)).toBeLessThan(
      0.01,
    );
  });

  it("recovers across a wider panel with large unit fixed effects", () => {
    const dataset = makeDataset({
      nUnits: 30,
      nTreated: 15,
      nPeriods: 14,
      onset: 7,
      baseline: (i) => 50 + i * 10, // strong unit FE spread, no time trend
      kernel: [0.15, 0.09, 0.04],
    });
    const result = estimateDiD(dataset);
    expect(result.status).toBe("ok");
    expect(result.confidenceInterval).not.toBeNull();
    expect(relErr(result.pointEstimate ?? 0, dataset.groundTruth.comparisonEstimand)).toBeLessThan(
      0.01,
    );
  });
});

describe("DiD-TWFE - stress (non-parallel pre-trends)", () => {
  it("over-estimates and warns when treated trend diverges from control", () => {
    const dataset = makeDataset({
      nUnits: 20,
      nTreated: 10,
      nPeriods: 12,
      onset: 6,
      // Treated units rise pre-treatment; control flat: parallel-trends violated.
      baseline: (_i, t, treated) => 100 + (treated ? 1.5 * t : 0),
      kernel: [0.05, 0.03],
    });
    const result = estimateDiD(dataset);

    expect(result.status).toBe("warning");
    expect(result.assumptionFlags).toContain("non_parallel_pretrends");
    expect(result.pointEstimate ?? 0).toBeGreaterThan(
      dataset.groundTruth.comparisonEstimand,
    );
  });
});

describe("DiD-TWFE - unsupported", () => {
  const expectInvalid = (dataset: Dataset): void => {
    const result = estimateDiD(dataset);
    expect(result.status).toBe("invalid");
    expect(result.pointEstimate).toBeNull();
    expect(result.confidenceInterval).toBeNull();
    expect(result.coverage95).toBeNull();
    expect(result.message).not.toBeNull();
  };

  it("is invalid with no treated units", () => {
    expectInvalid(
      makeDataset({ nUnits: 10, nTreated: 0, nPeriods: 8, onset: 4, baseline: () => 100, kernel: [0.1] }),
    );
  });

  it("is invalid with no control units", () => {
    expectInvalid(
      makeDataset({ nUnits: 10, nTreated: 10, nPeriods: 8, onset: 4, baseline: () => 100, kernel: [0.1] }),
    );
  });

  it("is invalid with a single period", () => {
    expectInvalid(
      makeDataset({ nUnits: 10, nTreated: 5, nPeriods: 1, onset: 0, baseline: () => 100, kernel: [0.1] }),
    );
  });
});
