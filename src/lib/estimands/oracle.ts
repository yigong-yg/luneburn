import {
  CHANNELS,
  channelRecord,
  type ChannelId,
  type ChannelOracle,
} from "./types";

export const ALL_CHANNELS_MASK = 0b111;
export const NO_CHANNELS_MASK = 0;

export const channelBit = (channel: ChannelId): number => {
  if (channel === "search") {
    return 0b001;
  }
  if (channel === "social") {
    return 0b010;
  }
  return 0b100;
};

export const maskHasChannel = (mask: number, channel: ChannelId): boolean =>
  (mask & channelBit(channel)) !== 0;

const channelPermutations = (): ReadonlyArray<ReadonlyArray<ChannelId>> => [
  ["search", "social", "video"],
  ["search", "video", "social"],
  ["social", "search", "video"],
  ["social", "video", "search"],
  ["video", "search", "social"],
  ["video", "social", "search"],
];

const coalitionValue = (
  coalitionOutcomes: ReadonlyArray<number>,
  mask: number,
): number => coalitionOutcomes[mask] ?? 0;

export const shapleyFromCoalitions = (
  coalitionOutcomes: ReadonlyArray<number>,
): Readonly<Record<ChannelId, number>> => {
  if (coalitionOutcomes.length !== 8) {
    throw new Error(
      `Shapley oracle requires all 8 coalitions; received ${coalitionOutcomes.length}`,
    );
  }

  const totals = channelRecord(() => 0);
  const permutations = channelPermutations();

  for (const ordering of permutations) {
    let mask = NO_CHANNELS_MASK;
    for (const channel of ordering) {
      const nextMask = mask | channelBit(channel);
      totals[channel] +=
        coalitionValue(coalitionOutcomes, nextMask) -
        coalitionValue(coalitionOutcomes, mask);
      mask = nextMask;
    }
  }

  return channelRecord(
    (channel) => totals[channel] / permutations.length,
  );
};

export const buildChannelOracle = (
  coalitionOutcomes: ReadonlyArray<number>,
): ChannelOracle => {
  if (coalitionOutcomes.length !== 8) {
    throw new Error(
      `Channel oracle requires all 8 coalitions; received ${coalitionOutcomes.length}`,
    );
  }

  const observedOutcome = coalitionValue(
    coalitionOutcomes,
    ALL_CHANNELS_MASK,
  );
  const noMediaOutcome = coalitionValue(
    coalitionOutcomes,
    NO_CHANNELS_MASK,
  );
  const channelOffIncremental = channelRecord(
    (channel) =>
      observedOutcome -
      coalitionValue(
        coalitionOutcomes,
        ALL_CHANNELS_MASK & ~channelBit(channel),
      ),
  );

  return {
    observedOutcome,
    noMediaOutcome,
    jointIncremental: observedOutcome - noMediaOutcome,
    channelOffIncremental,
    shapleyIncremental: shapleyFromCoalitions(coalitionOutcomes),
    coalitionOutcomes: [...coalitionOutcomes],
  };
};

export const sumChannelValues = (
  values: Readonly<Record<ChannelId, number>>,
): number => CHANNELS.reduce((sum, channel) => sum + values[channel], 0);
