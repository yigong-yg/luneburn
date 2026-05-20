import type { Dataset, DGPParams, GroundTruth, Unit } from "./types";
import type { EstimationResult } from "../methods/types";

export interface StubScenarioState {
  readonly dataset: Dataset;
  readonly results: ReadonlyArray<EstimationResult>;
  readonly headline: string;
}

interface StubStateInput {
  readonly scenarioId: string;
  readonly params: DGPParams;
  readonly seed: number;
  readonly nPeriods: number;
  readonly nUnits: number;
  readonly nChannels: number;
  readonly postPeriodStart: number;
  readonly treatmentAt: (unitIndex: number, period: number) => number;
  readonly truthSeries: ReadonlyArray<number>;
  readonly naiveEstimate: number;
  readonly referenceEstimate: number;
  readonly referenceMethodId: string;
  readonly referenceStatus: EstimationResult["status"];
  readonly referenceFlags: ReadonlyArray<string>;
  readonly referenceMessage: string | null;
  readonly headline: string;
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
  treatmentAt: StubStateInput["treatmentAt"],
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

export const buildStubState = ({
  scenarioId,
  params,
  seed,
  nPeriods,
  nUnits,
  nChannels,
  postPeriodStart,
  treatmentAt,
  truthSeries,
  naiveEstimate,
  referenceEstimate,
  referenceMethodId,
  referenceStatus,
  referenceFlags,
  referenceMessage,
  headline,
}: StubStateInput): StubScenarioState => {
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

  const dataset: Dataset = {
    scenarioId,
    params,
    seed,
    nUnits,
    nPeriods,
    nChannels,
    units: makeUnits(nUnits, nPeriods, nChannels, treatmentAt),
    groundTruth,
  };

  const lastTouchCi = [naiveEstimate - 0.035, naiveEstimate + 0.035] as const;
  const referenceCi = [
    referenceEstimate - 0.025,
    referenceEstimate + 0.025,
  ] as const;

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
      crossChannelCorrelation: params.crossChannelCorrelation,
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
    coverage95:
      referenceStatus !== "invalid" &&
      includesTruth(referenceCi, comparisonEstimand),
    perPeriodEstimate: horizontalSeries(referenceEstimate, nPeriods),
    diagnostics: {
      stubState: "session-0",
    },
    runtimeMs: 0,
  };

  return {
    dataset,
    results: [lastTouchResult, referenceResult],
    headline,
  };
};

export const smoothPulse = (
  length: number,
  center: number,
  width: number,
  amplitude: number,
): ReadonlyArray<number> =>
  Array.from({ length }, (_unused, period) => {
    const distance = (period - center) / width;
    return amplitude * Math.exp(-0.5 * distance * distance);
  });
