import { describe, expect, it } from "vitest";
import { estimateMmmLite } from "../../src/lib/estimands/mmmLite";
import type { MmmObservedData } from "../../src/lib/estimands/types";
import { geometricAdstock } from "../../src/lib/math/adstock";

const buildConditionallyCollinearFixture = (): MmmObservedData => {
  const periods = 104;
  return {
    channels: ["search", "social", "video"],
    weekly: Array.from({ length: periods }, (_unused, week) => {
      const social = Math.sin(week * 0.43);
      const video = Math.cos(week * 0.29);
      const trend = week / (periods - 1) - 0.5;
      const seasonalSin = Math.sin((2 * Math.PI * week) / 52);
      const seasonalCos = Math.cos((2 * Math.PI * week) / 52);
      return {
        week,
        spend: {
          search: 2 + social + video,
          social: 2 + social,
          video: 2 + video,
        },
        conversions:
          80 + 4 * social + 6 * video + 2 * trend + seasonalSin - seasonalCos,
        trend,
        seasonalSin,
        seasonalCos,
      };
    }),
  };
};

const buildLowerBoundaryFixture = (): MmmObservedData => {
  const periods = 104;
  const spend = {
    search: Array.from(
      { length: periods },
      (_, week) => 2 + Math.sin(week * 0.37),
    ),
    social: Array.from(
      { length: periods },
      (_, week) => 2 + Math.cos(week * 0.23),
    ),
    video: Array.from(
      { length: periods },
      (_, week) => 2 + Math.sin(week * 0.13 + 1),
    ),
  };
  const adstock = {
    search: geometricAdstock(spend.search, 0.1),
    social: geometricAdstock(spend.social, 0.35),
    video: geometricAdstock(spend.video, 0.65),
  };
  return {
    channels: ["search", "social", "video"],
    weekly: Array.from({ length: periods }, (_unused, week) => {
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
          50 +
          300 * (adstock.search[week] ?? 0) +
          400 * (adstock.social[week] ?? 0) +
          500 * (adstock.video[week] ?? 0) +
          2 * trend +
          seasonalSin -
          seasonalCos,
        trend,
        seasonalSin,
        seasonalCos,
      };
    }),
  };
};

const buildSeasonallyCollinearFixture = (): MmmObservedData => {
  const periods = 104;
  const decay = 0.1;
  let priorAdstock = 0;
  return {
    channels: ["search", "social", "video"],
    weekly: Array.from({ length: periods }, (_unused, week) => {
      const trend = week / (periods - 1) - 0.5;
      const seasonalSin = Math.sin((2 * Math.PI * week) / 52);
      const seasonalCos = Math.cos((2 * Math.PI * week) / 52);
      const targetSearchAdstock =
        2 + 0.5 * seasonalSin + 0.01 * Math.sin(week * 0.71);
      const searchSpend =
        (targetSearchAdstock - decay * priorAdstock) / (1 - decay);
      priorAdstock = targetSearchAdstock;
      return {
        week,
        spend: {
          search: searchSpend,
          social: 2 + 0.4 * Math.sin(week * 0.37),
          video: 2 + 0.4 * Math.cos(week * 0.23),
        },
        conversions:
          70 +
          3 * targetSearchAdstock +
          2 * Math.sin(week * 0.37) +
          2 * Math.cos(week * 0.23),
        trend,
        seasonalSin,
        seasonalCos,
      };
    }),
  };
};

describe("MMM-lite identification diagnostics", () => {
  it("diagnoses each adstocked channel against all other media and controls", () => {
    const result = estimateMmmLite(buildConditionallyCollinearFixture(), {
      bootstrapReplications: 0,
    });

    expect(result.status).toBe("warning");
    expect(result.assumptionFlags).toContain("high_media_collinearity");
    expect(result.diagnostics.maxMediaCorrelation).toBeLessThan(0.8);
    const identification = result.diagnostics.mediaIdentification;
    expect(identification).not.toBeNull();
    if (identification === null) throw new Error("expected diagnostics");
    expect(identification.search.rSquared).toBeGreaterThan(0.8);
    expect(identification.search.vif).toBeGreaterThan(5);
    expect(identification.search.residualVariationShare).toBeLessThan(0.2);
    expect(result.message).toMatch(/predictive fit cannot establish/i);
  });

  it("detects a media channel explained by seasonal controls", () => {
    const result = estimateMmmLite(buildSeasonallyCollinearFixture(), {
      bootstrapReplications: 0,
    });

    const identification = result.diagnostics.mediaIdentification;
    expect(identification).not.toBeNull();
    if (identification === null) throw new Error("expected diagnostics");
    expect(result.diagnostics.maxMediaCorrelation).toBeLessThan(0.8);
    expect(identification.search.rSquared).toBeGreaterThan(0.99);
    expect(identification.search.residualVariationShare).toBeLessThan(0.01);
    expect(result.assumptionFlags).toContain("high_media_collinearity");
  });

  it("does not warn when cross-validation selects the lower ridge-grid edge", () => {
    const result = estimateMmmLite(buildLowerBoundaryFixture(), {
      bootstrapReplications: 0,
    });

    expect(result.selectedLambda).toBe(0.01);
    expect(result.assumptionFlags).not.toContain("regularization_boundary");
  });

  it("warns when cross-validation selects the upper ridge-grid edge", () => {
    const fixture = buildLowerBoundaryFixture();
    const result = estimateMmmLite(
      {
        ...fixture,
        weekly: fixture.weekly.map((row) => ({
          ...row,
          conversions: 75,
        })),
      },
      { bootstrapReplications: 0 },
    );

    expect(result.selectedLambda).toBe(100);
    expect(result.assumptionFlags).toContain("regularization_boundary");
    expect(result.status).toBe("warning");
  });
});
