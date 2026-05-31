import type { Dataset } from "../dgp/types";
import type { EstimationResult, Estimator } from "./types";
import { didEstimator } from "./did";
import { lastTouchEstimator } from "./lastTouch";

export const methodDisplayNames: Readonly<Record<string, string>> = {
  "last-touch": "Last-touch",
  "did-twfe": "DiD-TWFE",
  "synthetic-control": "Synthetic control",
};

export const estimators: ReadonlyArray<Estimator> = [
  lastTouchEstimator,
  didEstimator,
];

export const estimatorById: ReadonlyMap<string, Estimator> = new Map(
  estimators.map((estimator) => [estimator.id, estimator]),
);

// Run the named estimators against a dataset, in order. Throws on an unknown id
// so a wiring mistake fails loudly rather than silently dropping a method.
export const runEstimators = (
  dataset: Dataset,
  methodIds: ReadonlyArray<string>,
): EstimationResult[] =>
  methodIds.map((id) => {
    const estimator = estimatorById.get(id);
    if (!estimator) {
      throw new Error(`Unknown estimator: ${id}`);
    }
    return estimator.estimate(dataset);
  });
