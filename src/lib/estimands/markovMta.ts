import type { EstimationStatus } from "../methods/types";
import {
  channelRecord,
  type ChannelId,
  type MtaObservedData,
} from "./types";

const START = "START";
const CONVERSION = "CONVERSION";
const NULL = "NULL";

type MarkovState = ChannelId | typeof START | typeof CONVERSION | typeof NULL;
type TransitionRows = ReadonlyMap<MarkovState, ReadonlyMap<MarkovState, number>>;

export type MarkovMtaAssumptionFlag =
  | "observational_credit_only"
  | "incomplete_path_coverage";

export interface MarkovMtaResult {
  readonly status: EstimationStatus;
  readonly assumptionFlags: ReadonlyArray<MarkovMtaAssumptionFlag>;
  readonly message: string | null;
  readonly creditShare: Readonly<Record<ChannelId, number>> | null;
  readonly creditedConversions: Readonly<Record<ChannelId, number>> | null;
  readonly removalScores: Readonly<Record<ChannelId, number>> | null;
  readonly baselineConversionProbability: number | null;
  readonly diagnostics: Readonly<{
    observedConversions: number;
    pathCoverage: number;
  }>;
}

const invalid = (
  message: string,
  observedConversions: number,
  pathCoverage: number,
): MarkovMtaResult => ({
  status: "invalid",
  assumptionFlags: [],
  message,
  creditShare: null,
  creditedConversions: null,
  removalScores: null,
  baselineConversionProbability: null,
  diagnostics: { observedConversions, pathCoverage },
});

const increment = (
  rows: Map<MarkovState, Map<MarkovState, number>>,
  from: MarkovState,
  to: MarkovState,
): void => {
  const row = rows.get(from);
  if (!row) {
    throw new Error(`Missing Markov row for ${from}`);
  }
  row.set(to, (row.get(to) ?? 0) + 1);
};

const buildTransitionRows = (data: MtaObservedData): TransitionRows => {
  const transient: MarkovState[] = [START, ...data.channels];
  const counts = new Map<MarkovState, Map<MarkovState, number>>();
  for (const state of transient) {
    counts.set(state, new Map());
  }

  for (const journey of data.journeys) {
    const orderedTouches = [...journey.touches]
      .filter((touch) => data.channels.includes(touch.channel))
      .sort((a, b) => a.order - b.order);
    let previous: MarkovState = START;
    for (const touch of orderedTouches) {
      increment(counts, previous, touch.channel);
      previous = touch.channel;
    }
    increment(counts, previous, journey.converted ? CONVERSION : NULL);
  }

  const rows = new Map<MarkovState, ReadonlyMap<MarkovState, number>>();
  for (const state of transient) {
    const row = counts.get(state) ?? new Map<MarkovState, number>();
    const total = [...row.values()].reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      rows.set(state, new Map([[NULL, 1]]));
      continue;
    }
    rows.set(
      state,
      new Map([...row.entries()].map(([to, count]) => [to, count / total])),
    );
  }
  return rows;
};

const conversionAbsorptionProbability = (
  rows: TransitionRows,
  channels: ReadonlyArray<ChannelId>,
): number => {
  const transient: MarkovState[] = [START, ...channels];
  let current = new Map<MarkovState, number>(
    transient.map((state) => [state, 0]),
  );

  for (let iteration = 0; iteration < 2_000; iteration += 1) {
    const next = new Map<MarkovState, number>();
    let maxChange = 0;
    for (const state of transient) {
      const row = rows.get(state) ?? new Map<MarkovState, number>();
      let probability = row.get(CONVERSION) ?? 0;
      for (const destination of transient) {
        probability +=
          (row.get(destination) ?? 0) * (current.get(destination) ?? 0);
      }
      next.set(state, probability);
      maxChange = Math.max(
        maxChange,
        Math.abs(probability - (current.get(state) ?? 0)),
      );
    }
    current = next;
    if (maxChange < 1e-12) {
      return current.get(START) ?? 0;
    }
  }

  throw new Error("Markov absorption probability did not converge.");
};

const removeChannel = (
  rows: TransitionRows,
  channels: ReadonlyArray<ChannelId>,
  removed: ChannelId,
): TransitionRows => {
  const remaining: MarkovState[] = [
    START,
    ...channels.filter((channel) => channel !== removed),
  ];
  const result = new Map<MarkovState, ReadonlyMap<MarkovState, number>>();

  for (const source of remaining) {
    const original = rows.get(source) ?? new Map<MarkovState, number>();
    const row = new Map<MarkovState, number>();
    for (const [destination, probability] of original.entries()) {
      if (destination === removed) {
        row.set(NULL, (row.get(NULL) ?? 0) + probability);
      } else {
        row.set(destination, (row.get(destination) ?? 0) + probability);
      }
    }
    result.set(source, row);
  }

  return result;
};

export const estimateMarkovMta = (
  data: MtaObservedData,
): MarkovMtaResult => {
  const observedConversions = data.journeys.filter(
    (journey) => journey.converted,
  ).length;
  const nonConversions = data.journeys.length - observedConversions;
  const pathsWithTouch = data.journeys.filter(
    (journey) => journey.touches.length > 0,
  ).length;
  const pathCoverage =
    data.journeys.length === 0 ? 0 : pathsWithTouch / data.journeys.length;

  if (data.channels.length < 2) {
    return invalid(
      "Markov MTA needs at least two channels.",
      observedConversions,
      pathCoverage,
    );
  }
  if (observedConversions === 0) {
    return invalid(
      "Markov MTA needs at least one converting journey.",
      observedConversions,
      pathCoverage,
    );
  }
  if (nonConversions === 0) {
    return invalid(
      "Markov MTA needs non-converting journeys to estimate absorption.",
      observedConversions,
      pathCoverage,
    );
  }

  const rows = buildTransitionRows(data);
  const baselineConversionProbability = conversionAbsorptionProbability(
    rows,
    data.channels,
  );
  if (baselineConversionProbability <= 1e-12) {
    return invalid(
      "Markov MTA found zero baseline conversion probability.",
      observedConversions,
      pathCoverage,
    );
  }

  const removalScores = channelRecord(() => 0);
  for (const channel of data.channels) {
    const removedRows = removeChannel(rows, data.channels, channel);
    const removedProbability = conversionAbsorptionProbability(
      removedRows,
      data.channels.filter((candidate) => candidate !== channel),
    );
    removalScores[channel] =
      (baselineConversionProbability - removedProbability) /
      baselineConversionProbability;
  }

  const positiveTotal = data.channels.reduce(
    (sum, channel) => sum + Math.max(0, removalScores[channel]),
    0,
  );
  if (positiveTotal <= 1e-12) {
    return invalid(
      "Markov MTA found no positive channel removal scores.",
      observedConversions,
      pathCoverage,
    );
  }

  const creditShare = channelRecord((channel) =>
    data.channels.includes(channel)
      ? Math.max(0, removalScores[channel]) / positiveTotal
      : 0,
  );
  const creditedConversions = channelRecord(
    (channel) => creditShare[channel] * observedConversions,
  );
  const assumptionFlags: MarkovMtaAssumptionFlag[] = [
    "observational_credit_only",
  ];
  let status: EstimationStatus = "ok";
  if (pathCoverage < 0.9) {
    status = "warning";
    assumptionFlags.push("incomplete_path_coverage");
  }

  return {
    status,
    assumptionFlags,
    message:
      "Markov removal allocates observed path credit; it is descriptive, not incremental causal lift.",
    creditShare,
    creditedConversions,
    removalScores,
    baselineConversionProbability,
    diagnostics: { observedConversions, pathCoverage },
  };
};
