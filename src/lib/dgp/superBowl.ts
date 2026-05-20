import type { DGP, DGPParams, ParamSchema } from "./types";
import { buildStubState, smoothPulse, type StubScenarioState } from "./stubHelpers";

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;
const formatNoise = (value: number): string => `${value.toFixed(1)}x`;

export const superBowlParamSchema: ParamSchema = [
  [
    "trueEffect",
    {
      label: "Peak weekly lift",
      min: 0,
      max: 0.5,
      step: 0.01,
      default: 0.18,
      format: formatPercent,
    },
  ],
  [
    "crossChannelCorrelation",
    {
      label: "Channel correlation",
      min: 0,
      max: 0.9,
      step: 0.01,
      default: 0.68,
      format: formatPercent,
    },
  ],
  [
    "noiseStd",
    {
      label: "Outcome noise",
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1,
      format: formatNoise,
    },
  ],
];

export const superBowlDefaults: DGPParams = {
  trueEffect: 0.18,
  crossChannelCorrelation: 0.68,
  noiseStd: 1,
  nUnits: 50,
  nPeriods: 52,
  treatmentTimingJitter: 0,
  baselineTrendCurvature: 0,
  structuralBreakIntensity: 0,
};

export const buildSuperBowlStubState = (
  params: DGPParams,
  seed: number,
): StubScenarioState => {
  const nPeriods = 52;
  const pulse = smoothPulse(nPeriods, 26, 2.7 + params.noiseStd * 0.3, params.trueEffect);
  const tail = smoothPulse(nPeriods, 31, 4.2, params.trueEffect * 0.35);
  const truthSeries = pulse.map((value, period) =>
    Math.max(0, value + (tail[period] ?? 0)),
  );
  const postPeriodStart = 26;
  const postSeries = truthSeries.slice(postPeriodStart);
  const meanTruth =
    postSeries.reduce((sum, value) => sum + value, 0) / postSeries.length;
  const naiveEstimate =
    meanTruth *
    (1.35 + params.crossChannelCorrelation * 1.7 + params.noiseStd * 0.04);
  const referenceEstimate = meanTruth * (0.96 + params.noiseStd * 0.025);

  return buildStubState({
    scenarioId: "super-bowl",
    params,
    seed,
    nPeriods,
    nUnits: 50,
    nChannels: 3,
    postPeriodStart,
    treatmentAt: (unitIndex, period) =>
      unitIndex < 25 && period === postPeriodStart ? 1 : 0,
    truthSeries,
    naiveEstimate,
    referenceEstimate,
    referenceMethodId: "did-twfe",
    referenceStatus: "ok",
    referenceFlags: [],
    referenceMessage: null,
    headline:
      "The same Super Bowl spike has known truth; last-touch over-attributes while DiD stays near the synthetic counterfactual.",
  });
};

export const superBowlDgp: DGP = {
  id: "super-bowl",
  displayName: "Super Bowl",
  description: "Single-week lift across treated DMAs.",
  paramSchema: superBowlParamSchema,
  defaultParams: superBowlDefaults,
  hero: {
    naiveMethodId: "last-touch",
    referenceMethodId: "did-twfe",
    narrativeMode: "validates",
    primarySliderKey: "crossChannelCorrelation",
    headlineTemplateId: "super-bowl-validates",
  },
  generate: (params, seed) => buildSuperBowlStubState(params, seed).dataset,
};
