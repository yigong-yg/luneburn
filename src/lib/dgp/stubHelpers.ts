import type { Dataset, DGPParams, GroundTruth, Unit } from "./types";
import type { EstimationResult } from "../methods/types";

export interface StubScenarioState {
  readonly dataset: Dataset;
  readonly results: ReadonlyArray<EstimationResult>;
  readonly headline: string;
}

export interface ScenarioResults {
  readonly results: ReadonlyArray<EstimationResult>;
  readonly headline: string;
}

// --- Fake dataset (used only by scenarios whose real DGP is not yet built) ----

interface StubDatasetInput {
  readonly scenarioId: string;
  readonly params: DGPParams;
  readonly seed: number;
  readonly nPeriods: number;
  readonly nUnits: number;
  readonly nChannels: number;
  readonly postPeriodStart: number;
  readonly treatmentAt: (unitIndex: number, period: number) => number;
  readonly truthSeries: ReadonlyArray<number>;
}

const makeCounterfactuals = (
  nUnits: number,
  nPeriods: number,
): ReadonlyArray<ReadonlyArray<number>> =>
  Array.from({ length: nUnits }, () =>
    Array.from({ length: nPeriods }, (_unused, period) => 100 + period * 0.25),
  );

const makeUnits = (
  nUnits: number,
  nPeriods: number,
  nChannels: number,
  treatmentAt: StubDatasetInput["treatmentAt"],
): ReadonlyArray<Unit> =>
  Array.from({ length: nUnits }, (_unused, unitIndex) => {
    const treatment = Array.from({ length: nPeriods }, (_none, period) =>
      treatmentAt(unitIndex, period),
    );

    return {
      id: unitIndex,
      treated: treatment.some((value) => value > 0),
      treatment,
      outcomes: Array.from(
        { length: nPeriods },
        (_none, period) => 100 + unitIndex * 0.15 + period * 0.28,
      ),
      channelSpend: Array.from({ length: nPeriods }, (_none, period) =>
        Array.from(
          { length: nChannels },
          (_ignored, channel) => 10 + channel * 4 + period * 0.05,
        ),
      ),
    };
  });

export const buildStubDataset = ({
  scenarioId,
  params,
  seed,
  nPeriods,
  nUnits,
  nChannels,
  postPeriodStart,
  treatmentAt,
  truthSeries,
}: StubDatasetInput): Dataset => {
  const postSeries = truthSeries.slice(postPeriodStart);
  const comparisonEstimand =
    postSeries.reduce((sum, value) => sum + value, 0) / postSeries.length;

  const groundTruth: GroundTruth = {
    comparisonEstimand,
    averageTreatmentEffectLevel: comparisonEstimand * 100,
    perPeriodEffect: truthSeries,
    perUnitEffect: Array.from({ length: nUnits }, () => comparisonEstimand),
    counterfactualOutcomes: makeCounterfactuals(nUnits, nPeriods),
  };

  return {
    scenarioId,
    params,
    seed,
    nUnits,
    nPeriods,
    nChannels,
    units: makeUnits(nUnits, nPeriods, nChannels, treatmentAt),
    groundTruth,
  };
};

// --- Stub estimator results (derived from the dataset's real ground truth) ---

interface StubResultsInput {
  readonly comparisonEstimand: number;
  readonly nPeriods: number;
  readonly crossChannelCorrelation: number;
  readonly naiveEstimate: number;
  readonly referenceEstimate: number;
  readonly referenceMethodId: string;
  // V0 stub methods always return an estimate; "invalid" (with its null
  // estimate fields) is produced only by the real estimators in Session B.
  // Narrowing here makes an invalid result with non-null fields unrepresentable.
  readonly referenceStatus: "ok" | "warning";
  readonly referenceFlags: ReadonlyArray<string>;
  readonly referenceMessage: string | null;
  readonly headline: string;
}

const horizontalSeries = (
  value: number,
  nPeriods: number,
): ReadonlyArray<number> => Array.from({ length: nPeriods }, () => value);

const includesTruth = (
  confidenceInterval: readonly [number, number],
  comparisonEstimand: number,
): boolean =>
  confidenceInterval[0] <= comparisonEstimand &&
  comparisonEstimand <= confidenceInterval[1];

const ciAround = (
  estimate: number,
  fraction: number,
  floor: number,
): readonly [number, number] => {
  const half = Math.max(floor, Math.abs(estimate) * fraction);
  return [estimate - half, estimate + half];
};

export const buildStubResults = ({
  comparisonEstimand,
  nPeriods,
  crossChannelCorrelation,
  naiveEstimate,
  referenceEstimate,
  referenceMethodId,
  referenceStatus,
  referenceFlags,
  referenceMessage,
  headline,
}: StubResultsInput): ScenarioResults => {
  const lastTouchCi = ciAround(naiveEstimate, 0.18, 0.005);
  const referenceCi = ciAround(referenceEstimate, 0.15, 0.004);

  const lastTouchResult: EstimationResult = {
    methodId: "last-touch",
    status: "warning",
    assumptionFlags: ["high_channel_correlation"],
    message: "Attribution is absorbing correlated channel activity.",
    pointEstimate: naiveEstimate,
    confidenceInterval: lastTouchCi,
    coverage95: includesTruth(lastTouchCi, comparisonEstimand),
    perPeriodEstimate: horizontalSeries(naiveEstimate, nPeriods),
    diagnostics: {
      crossChannelCorrelation,
    },
    runtimeMs: 0,
  };

  const referenceResult: EstimationResult = {
    methodId: referenceMethodId,
    status: referenceStatus,
    assumptionFlags: referenceFlags,
    message: referenceMessage,
    pointEstimate: referenceEstimate,
    confidenceInterval: referenceCi,
    coverage95: includesTruth(referenceCi, comparisonEstimand),
    perPeriodEstimate: horizontalSeries(referenceEstimate, nPeriods),
    diagnostics: {
      stubState: "session-0",
    },
    runtimeMs: 0,
  };

  return {
    results: [lastTouchResult, referenceResult],
    headline,
  };
};
