import type { EstimandLabParams } from "./types";

export type EstimandScenarioAssumptionFlag =
  | "omitted_demand_confounder"
  | "omitted_media_interaction";

export interface EstimandScenarioDiagnostics {
  readonly assumptionFlags: ReadonlyArray<EstimandScenarioAssumptionFlag>;
}

/**
 * Diagnostics that are knowable only because this is a synthetic lab. They
 * may annotate the presentation, but must never enter an estimator fit.
 */
export const deriveScenarioDiagnostics = (
  params: EstimandLabParams,
): EstimandScenarioDiagnostics => {
  const assumptionFlags: EstimandScenarioAssumptionFlag[] = [];
  if (params.demandCapture > 0) {
    assumptionFlags.push("omitted_demand_confounder");
  }
  if (params.synergy > 0) {
    assumptionFlags.push("omitted_media_interaction");
  }
  return { assumptionFlags };
};
