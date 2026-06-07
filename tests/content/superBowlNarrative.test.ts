import { describe, expect, it } from "vitest";
import {
  pct2,
  pct2Range,
  rho2,
  signedPctInt,
} from "../../src/lib/hero/format";
import {
  currentReadSegments,
  methodReadsAs,
  methodologySections,
  railStatusLabel,
  scenarioChips,
} from "../../src/lib/content/superBowlNarrative";
import type { EstimationResult } from "../../src/lib/methods/types";

const lt: EstimationResult = {
  methodId: "last-touch",
  status: "warning",
  assumptionFlags: ["high_channel_correlation"],
  message: "stress",
  pointEstimate: 0.0239,
  confidenceInterval: [0.0214, 0.0265],
  coverage95: false,
  perPeriodEstimate: null,
  diagnostics: {},
  runtimeMs: 0,
};
const did: EstimationResult = {
  methodId: "did-twfe",
  status: "ok",
  assumptionFlags: [],
  message: null,
  pointEstimate: 0.016,
  confidenceInterval: [0.0117, 0.0203],
  coverage95: true,
  perPeriodEstimate: null,
  diagnostics: {},
  runtimeMs: 0,
};

describe("format", () => {
  it("formats percents, ranges, signed ints, and rho", () => {
    expect(pct2(0.0239)).toBe("2.39%");
    expect(pct2(0.0132)).toBe("1.32%");
    expect(pct2Range([0.0214, 0.0265])).toBe("2.14–2.65%");
    expect(signedPctInt(0.8106)).toBe("+81%");
    expect(signedPctInt(-0.05)).toBe("−5%");
    expect(rho2(0.68)).toBe("0.68");
  });
});

describe("railStatusLabel", () => {
  it("maps status to instrument vocabulary", () => {
    expect(railStatusLabel("warning")).toBe("STRESSED");
    expect(railStatusLabel("ok")).toBe("STABLE");
    expect(railStatusLabel("invalid")).toBe("NOT APPLICABLE");
  });
});

describe("currentReadSegments", () => {
  it("states the live numbers and the mechanism contrast", () => {
    const segments = currentReadSegments({ rho: 0.68, tau: 0.0132, lt, did });
    const text = segments.map((s) => s.text).join("");
    expect(text).toContain("0.68");
    expect(text).toContain("2.39%");
    expect(text).toContain("1.32%");
    expect(text).toContain("1.60%");
    expect(text).toContain("co-moving media as if the spot caused it");
    expect(text).toContain("timing — not co-movement");
    // bias vs truth is computed live, not hard-coded
    expect(text).toContain("+81%");
    // some segments are emphasized
    expect(segments.some((s) => s.bold)).toBe(true);
  });

  it("degrades safely if last-touch is not applicable", () => {
    const invalidLt: EstimationResult = {
      ...lt,
      status: "invalid",
      pointEstimate: null,
      confidenceInterval: null,
      coverage95: null,
    };
    const segments = currentReadSegments({ rho: 0.4, tau: 0.0132, lt: invalidLt, did });
    const text = segments.map((s) => s.text).join("");
    expect(text.toLowerCase()).toContain("not applicable");
    expect(text).not.toContain("null");
    expect(text).not.toContain("NaN");
  });
});

describe("methodReadsAs", () => {
  it("returns the interpretation per method", () => {
    expect(methodReadsAs("last-touch")).toMatch(/co-moving media/i);
    expect(methodReadsAs("did-twfe")).toMatch(/shared movement/i);
  });
});

describe("methodologySections", () => {
  it("returns the seven proof sections in order", () => {
    const sections = methodologySections();
    expect(sections.map((s) => s.title)).toEqual([
      "Target estimand",
      "Synthetic panel",
      "Known counterfactual",
      "Estimators see",
      "Companion media",
      "Inference",
      "Determinism",
    ]);
  });

  it("reflects a real seed sweep in the determinism section, and omits the claim without one", () => {
    const withSweep = methodologySections({ sweep: { aboveTruth: 24, total: 24 } });
    const determinism = withSweep[6]?.body ?? "";
    expect(determinism).toContain("24/24");
    expect(determinism.toLowerCase()).toContain("seed");

    const withoutSweep = methodologySections();
    expect(withoutSweep[6]?.body ?? "").not.toContain("/");
  });

  it("never claims a fixed seed count like 100 in static copy", () => {
    const all = methodologySections().map((s) => s.body).join(" ");
    expect(all).not.toContain("100 seeds");
  });
});

describe("scenarioChips", () => {
  it("includes the seed", () => {
    expect(scenarioChips(42)).toContain("SEED 42");
  });
});
