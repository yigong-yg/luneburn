import { describe, expect, it } from "vitest";
import { buildScenarioStateFromParams, getDgp } from "../../src/lib/dgp";
import type { EstimationResult } from "../../src/lib/methods/types";

const average = (values: ReadonlyArray<number>): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const activePeriods = (treatment: ReadonlyArray<number>): ReadonlyArray<number> =>
  treatment.flatMap((value, period) => (value > 0 ? [period] : []));

const ciContainsTruth = (
  result: EstimationResult,
  comparisonEstimand: number,
): boolean => {
  if (result.confidenceInterval === null) {
    return false;
  }

  return (
    result.confidenceInterval[0] <= comparisonEstimand &&
    comparisonEstimand <= result.confidenceInterval[1]
  );
};

describe("Session 0 stub scenarios", () => {
  it("builds the Super Bowl validates hero state", () => {
    const dgp = getDgp("super-bowl");
    const state = buildScenarioStateFromParams(
      dgp.id,
      dgp.defaultParams,
      42,
    );
    const lastTouch = state.results.find(
      (result) => result.methodId === "last-touch",
    );
    const did = state.results.find((result) => result.methodId === "did-twfe");

    expect(dgp.hero.narrativeMode).toBe("validates");
    expect(state.dataset.groundTruth.perPeriodEffect).toHaveLength(52);
    expect(lastTouch?.status).toBe("warning");
    expect(did?.status).toBe("ok");
    expect(lastTouch?.pointEstimate ?? 0).toBeGreaterThan(
      did?.pointEstimate ?? Number.POSITIVE_INFINITY,
    );
  });

  it("uses post-period lift for the Super Bowl comparison estimand", () => {
    const dgp = getDgp("super-bowl");
    const state = buildScenarioStateFromParams(
      dgp.id,
      dgp.defaultParams,
      42,
    );
    const series = state.dataset.groundTruth.perPeriodEffect;
    const allPeriodAverage = average(series);
    const postPeriodAverage = average(series.slice(26));

    expect(state.dataset.groundTruth.comparisonEstimand).toBeCloseTo(
      postPeriodAverage,
      12,
    );
    expect(state.dataset.groundTruth.comparisonEstimand).toBeGreaterThan(
      allPeriodAverage,
    );
  });

  it("keeps Super Bowl treatment concentrated at period 26", () => {
    const dgp = getDgp("super-bowl");
    const state = buildScenarioStateFromParams(
      dgp.id,
      dgp.defaultParams,
      42,
    );
    const treatedUnits = state.dataset.units.filter((unit) => unit.treated);
    const untreatedUnits = state.dataset.units.filter((unit) => !unit.treated);

    expect(treatedUnits).toHaveLength(25);
    expect(untreatedUnits).toHaveLength(25);
    for (const unit of treatedUnits) {
      expect(activePeriods(unit.treatment)).toEqual([26]);
    }
    for (const unit of untreatedUnits) {
      expect(activePeriods(unit.treatment)).toEqual([]);
    }
  });

  it("moves the Super Bowl method disagreement when correlation changes", () => {
    const dgp = getDgp("super-bowl");
    const highCorrelationState = buildScenarioStateFromParams(
      dgp.id,
      dgp.defaultParams,
      42,
    );
    const lowCorrelationState = buildScenarioStateFromParams(
      dgp.id,
      {
        ...dgp.defaultParams,
        crossChannelCorrelation: 0.2,
      },
      42,
    );

    const highLastTouch = highCorrelationState.results.find(
      (result) => result.methodId === "last-touch",
    );
    const lowLastTouch = lowCorrelationState.results.find(
      (result) => result.methodId === "last-touch",
    );

    expect(highLastTouch?.pointEstimate ?? 0).toBeGreaterThan(
      lowLastTouch?.pointEstimate ?? Number.POSITIVE_INFINITY,
    );
  });

  it("builds the Commerce Launch fails-instructively hero state", () => {
    const dgp = getDgp("commerce-channel-launch");
    const state = buildScenarioStateFromParams(
      dgp.id,
      dgp.defaultParams,
      42,
    );
    const syntheticControl = state.results.find(
      (result) => result.methodId === "synthetic-control",
    );

    expect(dgp.hero.narrativeMode).toBe("fails-instructively");
    expect(state.dataset.groundTruth.perPeriodEffect).toHaveLength(104);
    expect(syntheticControl?.status).toBe("warning");
    expect(syntheticControl?.assumptionFlags).toContain("convex_hull_exit");
  });

  it("keeps Commerce Launch treatment starting at period 60", () => {
    const dgp = getDgp("commerce-channel-launch");
    const state = buildScenarioStateFromParams(
      dgp.id,
      dgp.defaultParams,
      42,
    );
    const treatedUnits = state.dataset.units.filter((unit) => unit.treated);
    const untreatedUnits = state.dataset.units.filter((unit) => !unit.treated);

    expect(treatedUnits).toHaveLength(25);
    expect(untreatedUnits).toHaveLength(25);
    for (const unit of treatedUnits) {
      const periods = activePeriods(unit.treatment);
      expect(periods[0]).toBe(60);
      expect(periods).toHaveLength(44);
    }
    for (const unit of untreatedUnits) {
      expect(activePeriods(unit.treatment)).toEqual([]);
    }
  });

  it("computes coverage95 from each confidence interval containing tau_comp", () => {
    for (const scenarioId of ["super-bowl", "commerce-channel-launch"]) {
      const dgp = getDgp(scenarioId);
      const state = buildScenarioStateFromParams(
        dgp.id,
        dgp.defaultParams,
        42,
      );

      for (const result of state.results) {
        expect(result.coverage95).toBe(
          ciContainsTruth(result, state.dataset.groundTruth.comparisonEstimand),
        );
      }
    }
  });
});
