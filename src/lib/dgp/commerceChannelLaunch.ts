import type { DGP, DGPParams, ParamSchema } from "./types";
import { buildStubState, type StubScenarioState } from "./stubHelpers";

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;
const formatNoise = (value: number): string => `${value.toFixed(1)}x`;

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

export const buildCommerceStubState = (
  params: DGPParams,
  seed: number,
): StubScenarioState => {
  const nPeriods = 104;
  const launchPeriod = 60;
  const truthSeries = Array.from({ length: nPeriods }, (_unused, period) => {
    if (period < launchPeriod) {
      return 0;
    }

    const ramp = 1 - Math.exp(-(period - launchPeriod + 1) / 8);
    const fatigue = 1 - Math.max(0, period - 84) * 0.006;
    return Math.max(0, params.trueEffect * ramp * fatigue);
  });

  const postSeries = truthSeries.slice(launchPeriod);
  const meanTruth =
    postSeries.reduce((sum, value) => sum + value, 0) / postSeries.length;
  const structuralStress =
    0.55 + params.crossChannelCorrelation * 0.8 + params.noiseStd * 0.05;
  const naiveEstimate = meanTruth * (1.45 + params.crossChannelCorrelation);
  const referenceEstimate = meanTruth * (1 + structuralStress);

  return buildStubState({
    scenarioId: "commerce-channel-launch",
    params,
    seed,
    nPeriods,
    nUnits: 50,
    nChannels: 4,
    postPeriodStart: launchPeriod,
    treatmentAt: (unitIndex, period) =>
      unitIndex < 25 && period >= launchPeriod ? 1 : 0,
    truthSeries,
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
  generate: (params, seed) => buildCommerceStubState(params, seed).dataset,
};
