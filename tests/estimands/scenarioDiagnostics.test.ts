import { describe, expect, it } from "vitest";
import { estimandLabDefaults } from "../../src/lib/estimands/multichannelDgp";
import { deriveScenarioDiagnostics } from "../../src/lib/estimands/scenarioDiagnostics";

describe("estimand scenario diagnostics", () => {
  it("surfaces omitted demand as simulation context, outside the estimator", () => {
    expect(
      deriveScenarioDiagnostics({
        ...estimandLabDefaults,
        demandCapture: 0.68,
      }).assumptionFlags,
    ).toContain("omitted_demand_confounder");
    expect(
      deriveScenarioDiagnostics({
        ...estimandLabDefaults,
        demandCapture: 0.2,
      }).assumptionFlags,
    ).not.toContain("omitted_demand_confounder");
  });
});
