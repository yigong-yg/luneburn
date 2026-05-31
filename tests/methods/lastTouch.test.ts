import { describe, expect, it } from "vitest";
import { estimateLastTouch } from "../../src/lib/methods/lastTouch";
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
  readonly nChannels: number;
  readonly baseline: (unitIndex: number, period: number, treated: boolean) => number;
  readonly kernel: ReadonlyArray<number>;
  readonly spend: (period: number, channel: number, treated: boolean) => number;
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
    const channelSpend = Array.from({ length: o.nPeriods }, (_n, t) =>
      Array.from({ length: o.nChannels }, (_m, k) => o.spend(t, k, treated)),
    );
    return { id: i, treated, treatment, outcomes, channelSpend };
  });

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
    counterfactualOutcomes: Array.from({ length: o.nUnits }, (_n, i) =>
      Array.from({ length: o.nPeriods }, (_m, t) => o.baseline(i, t, i < o.nTreated)),
    ),
  };

  return {
    scenarioId: "test",
    params: PARAMS,
    seed: 1,
    nUnits: o.nUnits,
    nPeriods: o.nPeriods,
    nChannels: o.nChannels,
    units,
    groundTruth,
  };
};

const relErr = (estimate: number, truth: number): number =>
  Math.abs(estimate - truth) / Math.abs(truth);

describe("last-touch - validity", () => {
  it("recovers tau_comp within 1% when only the treatment channel is active and trends are flat", () => {
    const dataset = makeDataset({
      nUnits: 20,
      nTreated: 10,
      nPeriods: 10,
      onset: 5,
      nChannels: 3,
      baseline: () => 100, // flat: pre-period baseline equals the counterfactual
      kernel: [0.2, 0.1],
      // Only the treatment channel (0) carries spend; others are dark.
      spend: (_t, channel) => (channel === 0 ? 10 : 0),
    });
    const result = estimateLastTouch(dataset);

    expect(result.methodId).toBe("last-touch");
    expect(result.status).toBe("ok");
    expect(result.assumptionFlags).toEqual([]);
    expect(result.pointEstimate).not.toBeNull();
    expect(relErr(result.pointEstimate ?? 0, dataset.groundTruth.comparisonEstimand)).toBeLessThan(
      0.01,
    );
  });
});

describe("last-touch - stress (high cross-channel correlation)", () => {
  it("over-attributes and warns when correlated channels feed the treatment channel", () => {
    // A post-period media surge sits in the baseline (so tau_comp excludes it),
    // but last-touch credits it to the winning treatment channel.
    const dataset = makeDataset({
      nUnits: 20,
      nTreated: 10,
      nPeriods: 10,
      onset: 5,
      nChannels: 3,
      baseline: (_i, t) => 100 + (t >= 5 ? 30 : 0),
      kernel: [0.1, 0.05],
      // All channels co-move with a shared signal; channel 0 stays the winner.
      spend: (t, channel) => {
        const shared = 10 * Math.sin((t + 1) * 0.7) + 12;
        const baseByChannel = [8, 4, 0][channel] ?? 0;
        return baseByChannel + shared;
      },
    });
    const result = estimateLastTouch(dataset);

    expect(result.status).toBe("warning");
    expect(result.assumptionFlags).toContain("high_channel_correlation");
    expect(result.pointEstimate ?? 0).toBeGreaterThan(
      dataset.groundTruth.comparisonEstimand,
    );
  });
});

describe("last-touch - unsupported", () => {
  it("is invalid when the treatment channel has no spend during the campaign window", () => {
    const dataset = makeDataset({
      nUnits: 20,
      nTreated: 10,
      nPeriods: 10,
      onset: 5,
      nChannels: 3,
      baseline: () => 100,
      kernel: [0.2, 0.1],
      // Treatment channel (0) is dark; other channels carry the spend.
      spend: (_t, channel) => (channel === 0 ? 0 : 12),
    });
    const result = estimateLastTouch(dataset);

    expect(result.status).toBe("invalid");
    expect(result.pointEstimate).toBeNull();
    expect(result.confidenceInterval).toBeNull();
    expect(result.coverage95).toBeNull();
    expect(result.message).not.toBeNull();
  });

  it("is invalid with no treated units", () => {
    const dataset = makeDataset({
      nUnits: 10,
      nTreated: 0,
      nPeriods: 10,
      onset: 5,
      nChannels: 3,
      baseline: () => 100,
      kernel: [0.2],
      spend: (_t, channel) => (channel === 0 ? 10 : 0),
    });
    expect(estimateLastTouch(dataset).status).toBe("invalid");
  });
});
