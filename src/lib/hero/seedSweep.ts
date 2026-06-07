import { generateSuperBowl } from "../dgp/superBowl";
import type { Dataset, DGPParams } from "../dgp/types";
import { estimateDiD } from "../methods/did";
import { estimateLastTouch } from "../methods/lastTouch";
import type { EstimationResult } from "../methods/types";

// The "stability band": re-run the synthetic panel under many seeds and record
// the spread of each method's point estimate. This is what makes the determinism
// claim honest — the band is a real distribution, not a decoration. Ground truth
// is read only as a diagnostic (does the estimate sit above truth?), exactly like
// coverage95; the estimate itself comes only from observed data.

// A fixed, modest seed set: large enough to be credible, small enough to stay
// snappy in steady state (~24 panels ≈ 50ms).
export const SWEEP_SEEDS: ReadonlyArray<number> = Array.from(
  { length: 24 },
  (_unused, i) => i + 1,
);

export interface SeedBandResult {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly aboveTruth: number;
  readonly total: number;
}

type EstimatorFn = (dataset: Dataset) => EstimationResult;

const estimatorFor = (methodId: string): EstimatorFn =>
  methodId === "did-twfe" ? estimateDiD : estimateLastTouch;

export const sweepBand = (
  params: DGPParams,
  methodId: string,
  seeds: ReadonlyArray<number> = SWEEP_SEEDS,
): SeedBandResult => {
  const estimate = estimatorFor(methodId);
  const values: number[] = [];
  let aboveTruth = 0;
  for (const seed of seeds) {
    const dataset = generateSuperBowl(params, seed);
    const result = estimate(dataset);
    if (result.pointEstimate === null) {
      continue;
    }
    values.push(result.pointEstimate);
    if (result.pointEstimate > dataset.groundTruth.comparisonEstimand) {
      aboveTruth += 1;
    }
  }
  if (values.length === 0) {
    return { min: NaN, max: NaN, mean: NaN, aboveTruth: 0, total: 0 };
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: sum / values.length,
    aboveTruth,
    total: values.length,
  };
};
