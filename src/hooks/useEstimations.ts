import { useMemo } from "react";
import { buildScenarioResults } from "../lib/dgp";
import type { Dataset, DGPParams } from "../lib/dgp/types";
import type { ScenarioResults } from "../lib/dgp/stubHelpers";

export const useEstimations = (
  scenarioId: string,
  dataset: Dataset,
  params: DGPParams,
): ScenarioResults =>
  useMemo(
    () => buildScenarioResults(scenarioId, dataset, params),
    [scenarioId, dataset, params],
  );
