import type { Dataset, DGP, DGPParams, GroundTruth, ParamSchema, Unit } from "./types";
import { buildStubResults, type StubScenarioResults } from "./stubHelpers";
import { gaussian, mulberry32, type Rng } from "../math/random";

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

export const buildSuperBowlStubResults = (
  dataset: Dataset,
  params: DGPParams,
): StubScenarioResults => {
  const tau = dataset.groundTruth.comparisonEstimand;
  const naiveEstimate =
    tau * (1.35 + params.crossChannelCorrelation * 1.7 + params.noiseStd * 0.04);
  const referenceEstimate = tau * (0.96 + params.noiseStd * 0.025);

  return buildStubResults({
    comparisonEstimand: tau,
    nPeriods: dataset.nPeriods,
    crossChannelCorrelation: params.crossChannelCorrelation,
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

// --- Real V0 Super Bowl data-generating process -----------------------------
// Panel: 50 DMAs x 52 weeks x 3 channels. A single-week Super Bowl spot is
// assigned to 25 DMAs at week 26; its outcome lift decays over a few weeks via
// a response kernel (the treatment array stays a single impulse — DiD must see
// one event). Lift is multiplicative so (Y1 - Y0)/Y0 = liftPct exactly, which
// is why ground truth is noise-invariant.

const N_UNITS = 50;
const N_PERIODS = 52;
const N_CHANNELS = 3;
const TREATMENT_PERIOD = 26;
const N_TREATED = 25;

// Per-week multiplicative lift = trueEffect * kernel[weeksSinceSpot].
const EFFECT_KERNEL = [1, 0.55, 0.25, 0.1] as const;

const BASE_LEVEL = 100;
const UNIT_FE_STD = 8;
const TREND_SLOPE = 0.25;
const SEASONAL_AMP = 6;
const CHANNEL_BETA = [2, 1.5, 1] as const; // TV, paid search, social
const CHANNEL_LOG_MEAN = [0.5, 0.2, 0] as const;
const SPEND_LOG_STD = 0.35;
const NOISE_BASE = 2.5;
const TWO_PI = Math.PI * 2;

const liftPctFor = (treated: boolean, period: number, trueEffect: number): number => {
  const lag = period - TREATMENT_PERIOD;
  if (!treated || lag < 0 || lag >= EFFECT_KERNEL.length) {
    return 0;
  }
  return trueEffect * (EFFECT_KERNEL[lag] ?? 0);
};

const assignTreated = (rng: Rng): boolean[] => {
  const order = Array.from({ length: N_UNITS }, (_unused, i) => i);
  for (let i = N_UNITS - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = order[i] ?? 0;
    order[i] = order[j] ?? 0;
    order[j] = swap;
  }
  const treated = new Array<boolean>(N_UNITS).fill(false);
  for (let k = 0; k < N_TREATED; k += 1) {
    treated[order[k] ?? 0] = true;
  }
  return treated;
};

export const generateSuperBowl = (params: DGPParams, seed: number): Dataset => {
  const rng = mulberry32(seed);
  const rho = Math.min(Math.max(params.crossChannelCorrelation, 0), 1);
  const sharedWeight = Math.sqrt(rho);
  const idioWeight = Math.sqrt(1 - rho);

  const treatedFlags = assignTreated(rng);
  const seasonal = Array.from(
    { length: N_PERIODS },
    (_unused, t) => TREND_SLOPE * t + SEASONAL_AMP * Math.sin((TWO_PI * t) / N_PERIODS),
  );

  const units: Unit[] = [];
  const counterfactualOutcomes: number[][] = [];

  for (let i = 0; i < N_UNITS; i += 1) {
    const treated = treatedFlags[i] ?? false;
    const unitFe = BASE_LEVEL + gaussian(rng) * UNIT_FE_STD;

    const treatment = new Array<number>(N_PERIODS).fill(0);
    const outcomes = new Array<number>(N_PERIODS).fill(0);
    const counterfactual = new Array<number>(N_PERIODS).fill(0);
    const channelSpend: number[][] = [];

    for (let t = 0; t < N_PERIODS; t += 1) {
      const common = gaussian(rng);
      let channelContribution = 0;
      const spend = new Array<number>(N_CHANNELS).fill(0);
      for (let k = 0; k < N_CHANNELS; k += 1) {
        const latent = sharedWeight * common + idioWeight * gaussian(rng);
        const value = Math.exp((CHANNEL_LOG_MEAN[k] ?? 0) + SPEND_LOG_STD * latent);
        spend[k] = value;
        channelContribution += (CHANNEL_BETA[k] ?? 0) * value;
      }

      const noise = gaussian(rng) * NOISE_BASE * params.noiseStd;
      const y0 = unitFe + (seasonal[t] ?? 0) + channelContribution + noise;
      const liftPct = liftPctFor(treated, t, params.trueEffect);

      counterfactual[t] = y0;
      outcomes[t] = y0 * (1 + liftPct);
      channelSpend[t] = spend;
      if (treated && t === TREATMENT_PERIOD) {
        treatment[t] = 1;
      }
    }

    units.push({ id: i, treated, treatment, outcomes, channelSpend });
    counterfactualOutcomes.push(counterfactual);
  }

  // Ground truth is computed directly from the DGP (homogeneous lift across
  // treated units), so perPeriodEffect is the analytic per-week lift.
  const perPeriodEffect = Array.from({ length: N_PERIODS }, (_unused, t) =>
    liftPctFor(true, t, params.trueEffect),
  );
  const postEffect = perPeriodEffect.slice(TREATMENT_PERIOD);
  const comparisonEstimand =
    postEffect.reduce((sum, value) => sum + value, 0) / postEffect.length;

  let levelSum = 0;
  let levelCount = 0;
  units.forEach((unit, unitIndex) => {
    if (!unit.treated) {
      return;
    }
    for (let t = TREATMENT_PERIOD; t < N_PERIODS; t += 1) {
      const y1 = unit.outcomes[t] ?? 0;
      const y0 = counterfactualOutcomes[unitIndex]?.[t] ?? 0;
      levelSum += y1 - y0;
      levelCount += 1;
    }
  });

  const groundTruth: GroundTruth = {
    comparisonEstimand,
    averageTreatmentEffectLevel: levelCount > 0 ? levelSum / levelCount : 0,
    perPeriodEffect,
    perUnitEffect: units.map((unit) => (unit.treated ? comparisonEstimand : 0)),
    counterfactualOutcomes,
  };

  return {
    scenarioId: "super-bowl",
    params,
    seed,
    nUnits: N_UNITS,
    nPeriods: N_PERIODS,
    nChannels: N_CHANNELS,
    units,
    groundTruth,
  };
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
  generate: generateSuperBowl,
};
