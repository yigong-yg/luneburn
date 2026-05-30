import type { Dataset, DGP, DGPParams, ParamSchema } from "./types";
import {
  buildStubDataset,
  buildStubResults,
  type ScenarioResults,
} from "./stubHelpers";

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;
const formatNoise = (value: number): string => `${value.toFixed(1)}x`;

const COMMERCE_PERIODS = 104;
const COMMERCE_LAUNCH_PERIOD = 60;

export const commerceParamSchema: ParamSchema = [
  [
    "trueEffect",
    {
      label: "Peak weekly lift",
      min: 0,
      max: 0.5,
      step: 0.01,
      default: 0.14,
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
      default: 0.72,
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
      default: 1.3,
      format: formatNoise,
    },
  ],
];

export const commerceDefaults: DGPParams = {
  trueEffect: 0.14,
  crossChannelCorrelation: 0.72,
  noiseStd: 1.3,
  nUnits: 50,
  nPeriods: 104,
  treatmentTimingJitter: 0,
  baselineTrendCurvature: 0.18,
  structuralBreakIntensity: 0.26,
};

// Commerce Launch's real DGP is deferred (Weekend 5); the V0 hero still needs a
// plausible dataset + warning narrative, so it remains a stub for now.
const commerceTruthSeries = (params: DGPParams): number[] =>
  Array.from({ length: COMMERCE_PERIODS }, (_unused, period) => {
    if (period < COMMERCE_LAUNCH_PERIOD) {
      return 0;
    }

    const ramp = 1 - Math.exp(-(period - COMMERCE_LAUNCH_PERIOD + 1) / 8);
    const fatigue = 1 - Math.max(0, period - 84) * 0.006;
    return Math.max(0, params.trueEffect * ramp * fatigue);
  });

export const generateCommerce = (params: DGPParams, seed: number): Dataset =>
  buildStubDataset({
    scenarioId: "commerce-channel-launch",
    params,
    seed,
    nPeriods: COMMERCE_PERIODS,
    nUnits: 50,
    nChannels: 4,
    postPeriodStart: COMMERCE_LAUNCH_PERIOD,
    treatmentAt: (unitIndex, period) =>
      unitIndex < 25 && period >= COMMERCE_LAUNCH_PERIOD ? 1 : 0,
    truthSeries: commerceTruthSeries(params),
  });

export const buildCommerceStubResults = (
  dataset: Dataset,
  params: DGPParams,
): ScenarioResults => {
  const tau = dataset.groundTruth.comparisonEstimand;
  const structuralStress =
    0.55 + params.crossChannelCorrelation * 0.8 + params.noiseStd * 0.05;
  const naiveEstimate = tau * (1.45 + params.crossChannelCorrelation);
  const referenceEstimate = tau * (1 + structuralStress);

  return buildStubResults({
    comparisonEstimand: tau,
    nPeriods: dataset.nPeriods,
    crossChannelCorrelation: params.crossChannelCorrelation,
    naiveEstimate,
    referenceEstimate,
    referenceMethodId: "synthetic-control",
    referenceStatus: "warning",
    referenceFlags: ["convex_hull_exit"],
    referenceMessage:
      "Synthetic control is still plotted, but the post-launch trajectory leaves the donor envelope.",
    headline:
      "The launch creates a structural break; synthetic control is the normally rigorous reference, and here it is visibly under stress.",
  });
};

export const commerceChannelLaunchDgp: DGP = {
  id: "commerce-channel-launch",
  displayName: "Commerce Launch",
  description: "New commerce channel with a post-period structural break.",
  paramSchema: commerceParamSchema,
  defaultParams: commerceDefaults,
  hero: {
    naiveMethodId: "last-touch",
    referenceMethodId: "synthetic-control",
    narrativeMode: "fails-instructively",
    primarySliderKey: "crossChannelCorrelation",
    headlineTemplateId: "commerce-launch-fails-instructively",
  },
  generate: generateCommerce,
};
