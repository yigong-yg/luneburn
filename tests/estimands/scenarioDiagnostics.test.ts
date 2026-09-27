import { describe, expect, it } from "vitest";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
  toMtaObservedData,
} from "../../src/lib/estimands/multichannelDgp";
import { buildEstimandLedger } from "../../src/lib/estimands/ledger";
import { estimateMarkovMta } from "../../src/lib/estimands/markovMta";
import { estimateMmmLite } from "../../src/lib/estimands/mmmLite";
import { deriveScenarioDiagnostics } from "../../src/lib/estimands/scenarioDiagnostics";

describe("estimand scenario diagnostics", () => {
  it("surfaces any positive omitted demand as simulation context", () => {
    expect(
      deriveScenarioDiagnostics({
        ...estimandLabDefaults,
        demandCapture: 0.001,
      }).assumptionFlags,
    ).toContain("omitted_demand_confounder");
    expect(
      deriveScenarioDiagnostics({
        ...estimandLabDefaults,
        demandCapture: 0,
      }).assumptionFlags,
    ).not.toContain("omitted_demand_confounder");
  });

  it("surfaces any positive omitted media interaction", () => {
    expect(
      deriveScenarioDiagnostics({
        ...estimandLabDefaults,
        synergy: 0.001,
      }).assumptionFlags,
    ).toContain("omitted_media_interaction");
    expect(
      deriveScenarioDiagnostics({
        ...estimandLabDefaults,
        synergy: 0,
      }).assumptionFlags,
    ).not.toContain("omitted_media_interaction");
  });

  it("makes the ledger warn when scenario knowledge invalidates an otherwise clean fit", () => {
    const dataset = generateEstimandLab(
      { ...estimandLabDefaults, demandCapture: 0.001, synergy: 0 },
      31,
    );
    const fittedMmm = estimateMmmLite(toMmmObservedData(dataset), {
      bootstrapReplications: 0,
    });
    const ledger = buildEstimandLedger(
      dataset,
      estimateMarkovMta(toMtaObservedData(dataset)),
      { ...fittedMmm, status: "ok", assumptionFlags: [] },
    );

    expect(ledger.channelOff.status).toBe("warning");
  });
});
