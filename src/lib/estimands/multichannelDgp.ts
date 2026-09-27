import { gaussian, mulberry32, type Rng } from "../math/random";
import {
  ALL_CHANNELS_MASK,
  buildChannelOracle,
  maskHasChannel,
} from "./oracle";
import {
  CHANNELS,
  channelRecord,
  type ChannelId,
  type CustomerJourney,
  type EstimandLabDataset,
  type EstimandLabParams,
  type JourneyTouch,
  type MmmObservedData,
  type MtaObservedData,
  type StructuralEffects,
  type WeeklyAggregate,
} from "./types";

const TWO_PI = Math.PI * 2;

export const estimandLabDefaults: EstimandLabParams = {
  demandCapture: 0.68,
  synergy: 0.35,
  noiseStd: 1,
  nWeeks: 104,
  opportunitiesPerWeek: 120,
};

export const estimandLabStructuralEffects: StructuralEffects = {
  directProbabilityLift: {
    search: 0.007,
    social: 0.01,
    video: 0.014,
  },
  adstockDecay: {
    search: 0.1,
    social: 0.35,
    video: 0.65,
  },
  synergyProbabilityLift: 0.006,
};

interface WeekEnvironment {
  readonly week: number;
  readonly demand: number;
  readonly trend: number;
  readonly seasonalSin: number;
  readonly seasonalCos: number;
  readonly spend: Readonly<Record<ChannelId, number>>;
  readonly adstock: Readonly<Record<ChannelId, number>>;
}

interface TouchCandidate {
  readonly channel: ChannelId;
  readonly timing: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const logistic = (value: number): number => 1 / (1 + Math.exp(-value));

const positive = (value: number): number => Math.max(0.08, value);

const spendFor = (
  channel: ChannelId,
  demand: number,
  seasonalSin: number,
  seasonalCos: number,
  demandCapture: number,
  planned: number,
  rng: Rng,
): number => {
  const noise = gaussian(rng) * 0.11;
  if (channel === "search") {
    return positive(
      1.05 +
        planned +
        0.14 * seasonalSin +
        demandCapture * 0.9 * demand +
        noise,
    );
  }
  if (channel === "social") {
    return positive(
      0.9 +
        planned +
        0.12 * seasonalCos +
        demandCapture * 0.04 * demand +
        noise,
    );
  }
  return positive(
    0.82 + planned - 0.1 * seasonalSin + 0.08 * seasonalCos + noise,
  );
};

const buildEnvironment = (
  params: EstimandLabParams,
  rng: Rng,
  planRng: Rng,
): ReadonlyArray<WeekEnvironment> => {
  let previousDemandShock = 0;
  const previousAdstock = channelRecord(() => 0);
  const weeks: WeekEnvironment[] = [];

  for (let week = 0; week < params.nWeeks; week += 1) {
    // Independently randomized weekly flights supply variation beyond
    // seasonal controls. The plan is fixed before demand and outcomes.
    const planned = channelRecord(() => (planRng() < 0.8 ? -0.7 : 2.8));
    const trend = params.nWeeks <= 1 ? 0 : week / (params.nWeeks - 1) - 0.5;
    const seasonalSin = Math.sin((TWO_PI * week) / 52);
    const seasonalCos = Math.cos((TWO_PI * week) / 52);
    const innovation = gaussian(rng);
    const demandShock =
      0.55 * previousDemandShock + Math.sqrt(1 - 0.55 ** 2) * innovation;
    previousDemandShock = demandShock;
    const demand =
      0.2 * trend +
      0.42 * seasonalSin +
      0.16 * seasonalCos +
      0.55 * params.noiseStd * demandShock;

    const spend = channelRecord((channel) =>
      spendFor(
        channel,
        demand,
        seasonalSin,
        seasonalCos,
        params.demandCapture,
        planned[channel],
        rng,
      ),
    );
    const adstock = channelRecord((channel) => {
      const decay = estimandLabStructuralEffects.adstockDecay[channel];
      const value =
        (1 - decay) * spend[channel] + decay * previousAdstock[channel];
      previousAdstock[channel] = value;
      return value;
    });

    weeks.push({
      week,
      demand,
      trend,
      seasonalSin,
      seasonalCos,
      spend,
      adstock,
    });
  }

  return weeks;
};

const touchProbability = (
  channel: ChannelId,
  environment: WeekEnvironment,
  individualIntent: number,
  demandCapture: number,
): number => {
  if (channel === "search") {
    return logistic(
      -1.6 +
        1.05 * environment.spend.search +
        demandCapture * (0.35 + 1.35 * individualIntent),
    );
  }
  if (channel === "social") {
    return logistic(
      -1.45 + 0.95 * environment.spend.social + 0.18 * individualIntent,
    );
  }
  return logistic(
    -1.35 + 0.88 * environment.spend.video + 0.08 * individualIntent,
  );
};

const timingCenter = (channel: ChannelId): number => {
  if (channel === "video") {
    return 0.2;
  }
  if (channel === "social") {
    return 0.5;
  }
  return 0.8;
};

const generateTouches = (
  environment: WeekEnvironment,
  individualIntent: number,
  demandCapture: number,
  rng: Rng,
): ReadonlyArray<JourneyTouch> => {
  const candidates: TouchCandidate[] = [];
  for (const channel of CHANNELS) {
    if (
      rng() <
      touchProbability(channel, environment, individualIntent, demandCapture)
    ) {
      candidates.push({
        channel,
        timing: timingCenter(channel) + gaussian(rng) * 0.12,
      });
    }
  }
  candidates.sort((a, b) => a.timing - b.timing);
  return candidates.map((candidate, order) => ({
    channel: candidate.channel,
    order,
  }));
};

const conversionProbability = (
  environment: WeekEnvironment,
  individualNoise: number,
  params: EstimandLabParams,
  coalitionMask: number,
): number => {
  const base =
    0.055 +
    0.008 * environment.trend +
    0.008 * environment.seasonalSin +
    0.018 * environment.demand +
    0.009 * params.noiseStd * individualNoise;

  let probability = base;
  for (const channel of CHANNELS) {
    if (maskHasChannel(coalitionMask, channel)) {
      probability +=
        estimandLabStructuralEffects.directProbabilityLift[channel] *
        environment.adstock[channel];
    }
  }

  if (
    maskHasChannel(coalitionMask, "search") &&
    maskHasChannel(coalitionMask, "video")
  ) {
    probability +=
      params.synergy *
      estimandLabStructuralEffects.synergyProbabilityLift *
      environment.adstock.search *
      environment.adstock.video;
  }

  return clamp(probability, 0.005, 0.75);
};

export const generateEstimandLab = (
  params: EstimandLabParams,
  seed: number,
): EstimandLabDataset => {
  if (params.nWeeks < 1 || params.opportunitiesPerWeek < 1) {
    throw new Error("Estimand DGP requires positive weeks and opportunities.");
  }

  const rng = mulberry32(seed);
  const environments = buildEnvironment(
    params,
    rng,
    mulberry32(seed ^ 0x504c414e),
  );
  const customerRng = mulberry32(seed ^ 0x43555354);
  const touchRng = mulberry32(seed ^ 0x544f5543);
  const coalitionOutcomes = new Array<number>(8).fill(0);
  const journeys: CustomerJourney[] = [];
  const weekly: WeeklyAggregate[] = [];
  let journeyId = 0;

  for (const environment of environments) {
    let observedConversions = 0;
    for (
      let opportunity = 0;
      opportunity < params.opportunitiesPerWeek;
      opportunity += 1
    ) {
      const individualNoise = gaussian(customerRng);
      const individualIntent = environment.demand + 0.85 * individualNoise;
      const touches = generateTouches(
        environment,
        individualIntent,
        params.demandCapture,
        touchRng,
      );
      const conversionUniform = customerRng();

      for (let coalitionMask = 0; coalitionMask < 8; coalitionMask += 1) {
        if (
          conversionUniform <
          conversionProbability(
            environment,
            individualNoise,
            params,
            coalitionMask,
          )
        ) {
          coalitionOutcomes[coalitionMask] =
            (coalitionOutcomes[coalitionMask] ?? 0) + 1;
        }
      }

      const converted =
        conversionUniform <
        conversionProbability(
          environment,
          individualNoise,
          params,
          ALL_CHANNELS_MASK,
        );
      if (converted) {
        observedConversions += 1;
      }
      journeys.push({
        id: journeyId,
        week: environment.week,
        touches,
        converted,
      });
      journeyId += 1;
    }

    weekly.push({
      week: environment.week,
      spend: environment.spend,
      conversions: observedConversions,
      trend: environment.trend,
      seasonalSin: environment.seasonalSin,
      seasonalCos: environment.seasonalCos,
    });
  }

  return {
    seed,
    params,
    channels: CHANNELS,
    journeys,
    weekly,
    oracle: buildChannelOracle(coalitionOutcomes),
    structuralEffects: estimandLabStructuralEffects,
  };
};

export const toMtaObservedData = (
  dataset: EstimandLabDataset,
): MtaObservedData => ({
  channels: dataset.channels,
  journeys: dataset.journeys,
});

export const toMmmObservedData = (
  dataset: EstimandLabDataset,
): MmmObservedData => ({
  channels: dataset.channels,
  weekly: dataset.weekly,
});
