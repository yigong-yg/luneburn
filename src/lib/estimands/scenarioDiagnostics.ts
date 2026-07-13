import type { EstimandLabParams } from "./types";

export type EstimandScenarioAssumptionFlag = "omitted_demand_confounder";

export interface EstimandScenarioDiagnostics {
  readonly assumptionFlags: ReadonlyArray<EstimandScenarioAssumptionFlag>;
}

/**
 * Diagnostics that are knowable only because this is a synthetic lab. They
 * may annotate the presentation, but must never enter an estimator fit.
 */
export const deriveScenarioDiagnostics = (
  params: EstimandLabParams,
): EstimandScenarioDiagnostics => ({
  assumptionFlags:
    params.demandCapture > 0.35 ? ["omitted_demand_confounder"] : [],
});
