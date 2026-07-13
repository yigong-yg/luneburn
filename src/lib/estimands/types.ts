export type ChannelId = "search" | "social" | "video";

export const CHANNELS: ReadonlyArray<ChannelId> = [
  "search",
  "social",
  "video",
];

export const channelRecord = <T>(
  valueFor: (channel: ChannelId) => T,
): Record<ChannelId, T> => ({
  search: valueFor("search"),
  social: valueFor("social"),
  video: valueFor("video"),
});

export interface JourneyTouch {
  readonly channel: ChannelId;
  readonly order: number;
}

export interface CustomerJourney {
  readonly id: number;
  readonly week: number;
  readonly touches: ReadonlyArray<JourneyTouch>;
  readonly converted: boolean;
}

export interface WeeklyAggregate {
  readonly week: number;
  readonly spend: Readonly<Record<ChannelId, number>>;
  readonly conversions: number;
  readonly trend: number;
  readonly seasonalSin: number;
  readonly seasonalCos: number;
}

export interface EstimandLabParams {
  readonly demandCapture: number;
  readonly synergy: number;
  readonly noiseStd: number;
  readonly nWeeks: number;
  readonly opportunitiesPerWeek: number;
}

export interface StructuralEffects {
  readonly directProbabilityLift: Readonly<Record<ChannelId, number>>;
  readonly adstockDecay: Readonly<Record<ChannelId, number>>;
  readonly synergyProbabilityLift: number;
}

export interface ChannelOracle {
  readonly observedOutcome: number;
  readonly noMediaOutcome: number;
  readonly jointIncremental: number;
  readonly channelOffIncremental: Readonly<Record<ChannelId, number>>;
  readonly shapleyIncremental: Readonly<Record<ChannelId, number>>;
  readonly coalitionOutcomes: ReadonlyArray<number>;
}

export interface EstimandLabDataset {
  readonly seed: number;
  readonly params: EstimandLabParams;
  readonly channels: ReadonlyArray<ChannelId>;
  readonly journeys: ReadonlyArray<CustomerJourney>;
  readonly weekly: ReadonlyArray<WeeklyAggregate>;
  readonly oracle: ChannelOracle;
  readonly structuralEffects: StructuralEffects;
}

export interface MtaObservedData {
  readonly channels: ReadonlyArray<ChannelId>;
  readonly journeys: ReadonlyArray<CustomerJourney>;
}

export interface MmmObservedData {
  readonly channels: ReadonlyArray<ChannelId>;
  readonly weekly: ReadonlyArray<WeeklyAggregate>;
}
