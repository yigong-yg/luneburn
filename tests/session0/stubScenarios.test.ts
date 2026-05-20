import { describe, expect, it } from "vitest";
import { buildScenarioStateFromParams, getDgp } from "../../src/lib/dgp";

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
});
