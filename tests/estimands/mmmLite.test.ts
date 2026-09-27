import { describe, expect, it } from "vitest";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
} from "../../src/lib/estimands/multichannelDgp";
import { estimateMmmLite } from "../../src/lib/estimands/mmmLite";
import { geometricAdstock } from "../../src/lib/math/adstock";
import type { ChannelId, MmmObservedData } from "../../src/lib/estimands/types";

const validityParams = {
  ...estimandLabDefaults,
  demandCapture: 0,
  synergy: 0,
  noiseStd: 0.6,
  nWeeks: 156,
  opportunitiesPerWeek: 600,
};

const buildValidityFixture = (): {
  readonly data: MmmObservedData;
  readonly truth: Readonly<Record<ChannelId, number>>;
} => {
  const periods = 156;
  const spend = {
    search: Array.from(
      { length: periods },
      (_unused, week) => 1.1 + 0.28 * Math.sin(week * 0.37),
    ),
    social: Array.from(
      { length: periods },
      (_unused, week) => 0.9 + 0.25 * Math.cos(week * 0.23 + 0.4),
    ),
    video: Array.from(
      { length: periods },
      (_unused, week) => 0.8 + 0.3 * Math.sin(week * 0.13 + 1.1),
    ),
  };
  const adstock = {
    search: geometricAdstock(spend.search, 0.1),
    social: geometricAdstock(spend.social, 0.35),
    video: geometricAdstock(spend.video, 0.65),
  };
  const coefficients: Readonly<Record<ChannelId, number>> = {
    search: 5.5,
    social: 7.25,
    video: 9,
  };
  const weekly = Array.from({ length: periods }, (_unused, week) => {
    const trend = week / (periods - 1) - 0.5;
    const seasonalSin = Math.sin((2 * Math.PI * week) / 52);
    const seasonalCos = Math.cos((2 * Math.PI * week) / 52);
    return {
      week,
      spend: {
        search: spend.search[week] ?? 0,
        social: spend.social[week] ?? 0,
        video: spend.video[week] ?? 0,
      },
      conversions:
        75 +
        coefficients.search * (adstock.search[week] ?? 0) +
        coefficients.social * (adstock.social[week] ?? 0) +
        coefficients.video * (adstock.video[week] ?? 0) +
        3 * trend +
        2.5 * seasonalSin -
        1.5 * seasonalCos +
        0.08 * Math.sin(week * 0.71),
      trend,
      seasonalSin,
      seasonalCos,
    };
  });

  return {
    data: { channels: ["search", "social", "video"], weekly },
    truth: {
      search:
        coefficients.search *
        adstock.search.reduce((sum, value) => sum + value, 0),
      social:
        coefficients.social *
        adstock.social.reduce((sum, value) => sum + value, 0),
      video:
        coefficients.video *
        adstock.video.reduce((sum, value) => sum + value, 0),
    },
  };
};

describe("MMM-lite", () => {
  it.each([2307, 42, 2718])(
    "recovers the real paired DGP oracle in a high-information additive regime (seed %s)",
    (seed) => {
      // More customers reduce binomial error; low campaign noise reduces the
      // independent weekly demand shocks. Neither changes the causal coefficients.
      const dataset = generateEstimandLab(
        {
          ...validityParams,
          noiseStd: 0.2,
          opportunitiesPerWeek: 6000,
        },
        seed,
      );
      const result = estimateMmmLite(toMmmObservedData(dataset), {
        bootstrapReplications: 0,
      });
      expect(result.status).not.toBe("invalid");
      for (const channel of dataset.channels) {
        const truth = dataset.oracle.channelOffIncremental[channel];
        const estimate = result.channelOffIncremental?.[channel] ?? 0;
        expect(Math.abs(estimate - truth) / truth, channel).toBeLessThan(0.1);
      }
    },
  );

  it("recovers known coefficients in a linear algebra sanity fixture", () => {
    const fixture = buildValidityFixture();
    const result = estimateMmmLite(fixture.data, {
      bootstrapReplications: 24,
      bootstrapSeed: 8,
    });

    expect(result.status).not.toBe("invalid");
    expect(result.channelOffIncremental).not.toBeNull();
    expect(result.confidenceIntervals).not.toBeNull();

    for (const channel of fixture.data.channels) {
      const estimate = result.channelOffIncremental?.[channel] ?? 0;
      const truth = fixture.truth[channel];
      expect(Math.abs(estimate - truth) / Math.abs(truth)).toBeLessThan(0.1);
    }
  });

  it("flags positive Search bias when latent demand drives Search spend", () => {
    const lowDemand = generateEstimandLab(validityParams, 2718);
    const lowResult = estimateMmmLite(toMmmObservedData(lowDemand), {
      bootstrapReplications: 0,
    });
    const dataset = generateEstimandLab(
      {
        ...validityParams,
        demandCapture: 0.85,
      },
      2718,
    );
    const result = estimateMmmLite(toMmmObservedData(dataset), {
      bootstrapReplications: 0,
    });

    expect(result.assumptionFlags).not.toContain("omitted_demand_confounder");
    expect(result.channelOffIncremental?.search ?? 0).toBeGreaterThan(
      dataset.oracle.channelOffIncremental.search,
    );
    const lowBias =
      (lowResult.channelOffIncremental?.search ?? 0) -
      lowDemand.oracle.channelOffIncremental.search;
    const highBias =
      (result.channelOffIncremental?.search ?? 0) -
      dataset.oracle.channelOffIncremental.search;
    expect(highBias).toBeGreaterThan(lowBias);
  });

  it("moves signed Search error upward across the canonical demand sweep", () => {
    const errors = [0, 0.2, 0.35, 0.68, 0.9].map((demandCapture) => {
      const dataset = generateEstimandLab(
        { ...estimandLabDefaults, demandCapture },
        2307,
      );
      const result = estimateMmmLite(toMmmObservedData(dataset), {
        bootstrapReplications: 0,
      });
      return (
        (result.channelOffIncremental?.search ?? 0) -
        dataset.oracle.channelOffIncremental.search
      );
    });
    for (let index = 1; index < errors.length; index += 1) {
      expect(errors[index]).toBeGreaterThan(errors[index - 1] ?? Infinity);
    }
    expect(errors[errors.length - 1]).toBeGreaterThan(0);
  });

  it("is deterministic, including its moving-block intervals", () => {
    const fixture = buildValidityFixture();
    const options = {
      bootstrapReplications: 16,
      bootstrapSeed: 101,
    } as const;

    expect(estimateMmmLite(fixture.data, options)).toEqual(
      estimateMmmLite(fixture.data, options),
    );
  });

  it("returns invalid with null estimates for an unsupported short series", () => {
    const dataset = generateEstimandLab(
      {
        ...estimandLabDefaults,
        nWeeks: 24,
      },
      42,
    );
    const result = estimateMmmLite(toMmmObservedData(dataset), {
      bootstrapReplications: 0,
    });

    expect(result.status).toBe("invalid");
    expect(result.channelOffIncremental).toBeNull();
    expect(result.confidenceIntervals).toBeNull();
    expect(result.message).toMatch(/100.*3 forward validation folds/i);
  });

  it("returns the same clear unsupported state in the former 52-period edge", () => {
    const dataset = generateEstimandLab(
      {
        ...estimandLabDefaults,
        nWeeks: 60,
      },
      43,
    );
    const result = estimateMmmLite(toMmmObservedData(dataset), {
      bootstrapReplications: 0,
    });

    expect(result.status).toBe("invalid");
    expect(result.channelOffIncremental).toBeNull();
    expect(result.message).toMatch(/100.*3 forward validation folds/i);
  });

  it("returns invalid when a channel has no spend variation", () => {
    const dataset = generateEstimandLab(validityParams, 77);
    const weekly = dataset.weekly.map((row) => ({
      ...row,
      spend: { ...row.spend, video: 1 },
    }));
    const result = estimateMmmLite(
      { channels: dataset.channels, weekly },
      { bootstrapReplications: 0 },
    );

    expect(result.status).toBe("invalid");
    expect(result.assumptionFlags).toContain("constant_media");
    expect(result.channelOffIncremental).toBeNull();
  });
});
