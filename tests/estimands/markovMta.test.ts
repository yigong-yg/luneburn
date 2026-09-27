import { describe, expect, it } from "vitest";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMtaObservedData,
} from "../../src/lib/estimands/multichannelDgp";
import { estimateMarkovMta } from "../../src/lib/estimands/markovMta";
import {
  CHANNELS,
  type ChannelId,
  type CustomerJourney,
  type MtaObservedData,
} from "../../src/lib/estimands/types";

const journey = (
  id: number,
  channels: ReadonlyArray<ChannelId>,
  converted: boolean,
): CustomerJourney => ({
  id,
  week: 0,
  touches: channels.map((channel, order) => ({ channel, order })),
  converted,
});

const symmetricFixture = (): MtaObservedData => {
  const journeys: CustomerJourney[] = [];
  let id = 0;
  for (let i = 0; i < 80; i += 1) {
    journeys.push(journey(id, ["search"], true));
    id += 1;
    journeys.push(journey(id, ["social"], true));
    id += 1;
    journeys.push(journey(id, ["search"], false));
    id += 1;
    journeys.push(journey(id, ["social"], false));
    id += 1;
  }
  return { channels: ["search", "social"], journeys };
};

describe("Markov MTA", () => {
  it("recovers a symmetric native path-credit allocation", () => {
    const result = estimateMarkovMta(symmetricFixture());

    expect(result.status).toBe("ok");
    expect(result.creditShare).not.toBeNull();
    expect(result.creditShare?.search).toBeCloseTo(0.5, 8);
    expect(result.creditShare?.social).toBeCloseTo(0.5, 8);
    expect(result.creditedConversions?.search).toBeCloseTo(80, 8);
    expect(result.creditedConversions?.social).toBeCloseTo(80, 8);
    expect(result.assumptionFlags).toContain("observational_credit_only");
  });

  it("allocates all observed conversions without claiming incrementality", () => {
    const dataset = generateEstimandLab(estimandLabDefaults, 2307);
    const result = estimateMarkovMta(toMtaObservedData(dataset));
    const totalCredit = CHANNELS.reduce(
      (sum, channel) =>
        sum + (result.creditedConversions?.[channel] ?? 0),
      0,
    );

    expect(totalCredit).toBeCloseTo(dataset.oracle.observedOutcome, 8);
    expect(result.message?.toLowerCase()).toContain("not incremental");
  });

  it("over-credits demand-capturing Search relative to channel-off truth", () => {
    const dataset = generateEstimandLab(estimandLabDefaults, 2307);
    const result = estimateMarkovMta(toMtaObservedData(dataset));
    const credited = result.creditedConversions?.search ?? 0;
    const incremental = dataset.oracle.channelOffIncremental.search;

    expect(credited).toBeGreaterThan(incremental * 1.4);
    expect(result.removalScores?.search).toBeGreaterThan(0);
  });

  it("returns invalid rather than inventing credit without non-converting paths", () => {
    const data: MtaObservedData = {
      channels: ["search", "social"],
      journeys: [
        journey(1, ["search"], true),
        journey(2, ["social"], true),
      ],
    };
    const result = estimateMarkovMta(data);

    expect(result.status).toBe("invalid");
    expect(result.creditShare).toBeNull();
    expect(result.creditedConversions).toBeNull();
  });

  it("returns invalid when fewer than two channels are available", () => {
    const data: MtaObservedData = {
      channels: ["search"],
      journeys: [
        journey(1, ["search"], true),
        journey(2, ["search"], false),
      ],
    };

    expect(estimateMarkovMta(data).status).toBe("invalid");
  });
});
