import { describe, expect, it } from "vitest";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
  toMtaObservedData,
} from "../../src/lib/estimands/multichannelDgp";
import { CHANNELS } from "../../src/lib/estimands/types";

const relativeGap = (a: number, b: number): number =>
  Math.abs(a - b) / Math.max(Math.abs(b), 1);

describe("multichannel estimand DGP", () => {
  it("is deterministic for the same seed and parameters", () => {
    expect(generateEstimandLab(estimandLabDefaults, 42)).toEqual(
      generateEstimandLab(estimandLabDefaults, 42),
    );
  });

  it("produces one coherent journey and aggregate view", () => {
    const dataset = generateEstimandLab(estimandLabDefaults, 42);

    expect(dataset.weekly).toHaveLength(estimandLabDefaults.nWeeks);
    expect(dataset.journeys).toHaveLength(
      estimandLabDefaults.nWeeks * estimandLabDefaults.opportunitiesPerWeek,
    );

    for (const week of dataset.weekly) {
      const journeyConversions = dataset.journeys.filter(
        (journey) => journey.week === week.week && journey.converted,
      ).length;
      expect(week.conversions).toBe(journeyConversions);
    }

    expect(dataset.oracle.observedOutcome).toBe(
      dataset.weekly.reduce((sum, week) => sum + week.conversions, 0),
    );
  });

  it("satisfies Shapley efficiency against the joint incremental oracle", () => {
    const dataset = generateEstimandLab(estimandLabDefaults, 42);
    const allocated = CHANNELS.reduce(
      (sum, channel) => sum + dataset.oracle.shapleyIncremental[channel],
      0,
    );

    expect(relativeGap(allocated, dataset.oracle.jointIncremental)).toBeLessThan(
      1e-10,
    );
  });

  it("makes positive interaction visible as non-additive channel-off effects", () => {
    const dataset = generateEstimandLab(
      { ...estimandLabDefaults, synergy: 0.7 },
      42,
    );
    const sumChannelOff = CHANNELS.reduce(
      (sum, channel) => sum + dataset.oracle.channelOffIncremental[channel],
      0,
    );

    expect(sumChannelOff).toBeGreaterThan(dataset.oracle.jointIncremental);
    expect(
      sumChannelOff - dataset.oracle.jointIncremental,
    ).toBeGreaterThan(dataset.oracle.jointIncremental * 0.03);
  });

  it("uses demand capture to change observed Search presence without changing structural coefficients", () => {
    const uncoupled = generateEstimandLab(
      { ...estimandLabDefaults, demandCapture: 0 },
      42,
    );
    const coupled = generateEstimandLab(
      { ...estimandLabDefaults, demandCapture: 0.85 },
      42,
    );

    const convertedSearchShare = (
      journeys: typeof coupled.journeys,
    ): number => {
      const converted = journeys.filter((journey) => journey.converted);
      const withSearch = converted.filter((journey) =>
        journey.touches.some((touch) => touch.channel === "search"),
      );
      return converted.length === 0 ? 0 : withSearch.length / converted.length;
    };

    expect(convertedSearchShare(coupled.journeys)).toBeGreaterThan(
      convertedSearchShare(uncoupled.journeys) + 0.08,
    );
    expect(coupled.structuralEffects).toEqual(uncoupled.structuralEffects);
  });

  it("creates observed-data views that structurally exclude oracle truth", () => {
    const dataset = generateEstimandLab(estimandLabDefaults, 42);
    const mta = toMtaObservedData(dataset);
    const mmm = toMmmObservedData(dataset);

    expect(Object.keys(mta).sort()).toEqual(["channels", "journeys"]);
    expect(Object.keys(mmm).sort()).toEqual(["channels", "weekly"]);
    expect("oracle" in mta).toBe(false);
    expect("oracle" in mmm).toBe(false);
  });
});
