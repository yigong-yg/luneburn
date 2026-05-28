import { useMemo } from "react";
import { getDgp } from "../lib/dgp";
import type { Dataset, DGPParams } from "../lib/dgp/types";

// Derived state: the dataset is regenerated (memoized) from the active scenario,
// params, and seed rather than stored. DGP generation is deterministic in seed.
export const useDataset = (
  scenarioId: string,
  params: DGPParams,
  seed: number,
): Dataset =>
  useMemo(() => getDgp(scenarioId).generate(params, seed), [scenarioId, params, seed]);
