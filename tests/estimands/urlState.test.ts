import { describe, expect, it } from "vitest";
import {
  estimandLabUrlDefaults,
  parseEstimandHash,
  serializeEstimandHash,
} from "../../src/lib/estimands/urlState";

describe("estimand lab URL state", () => {
  it("round-trips shareable state", () => {
    const state = {
      ...estimandLabUrlDefaults,
      demandCapture: 0.42,
      synergy: 0.71,
      seed: 99,
      question: "joint-allocation" as const,
    };
    expect(parseEstimandHash(serializeEstimandHash(state))).toEqual(state);
  });

  it("clamps malformed numeric values and falls back on unknown questions", () => {
    expect(
      parseEstimandHash("#/estimands?d=99&s=-4&seed=nope&q=universal-truth"),
    ).toEqual({
      ...estimandLabUrlDefaults,
      demandCapture: 0.9,
      synergy: 0,
    });
  });

  it("uses the curated seed when the estimand hash omits seed", () => {
    expect(parseEstimandHash("#/estimands").seed).toBe(
      estimandLabUrlDefaults.seed,
    );
    expect(parseEstimandHash("#/estimands?d=0.5").seed).toBe(
      estimandLabUrlDefaults.seed,
    );
  });

  it("returns defaults outside the estimand route", () => {
    expect(parseEstimandHash("#/assumptions")).toEqual(estimandLabUrlDefaults);
  });
});
