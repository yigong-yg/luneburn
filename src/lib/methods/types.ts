import type { Dataset } from "../dgp/types";

export type EstimationStatus = "ok" | "warning" | "invalid";

export interface EstimationResult {
  readonly methodId: string;
  readonly status: EstimationStatus;
  readonly assumptionFlags: ReadonlyArray<string>;
  readonly message: string | null;
  readonly pointEstimate: number | null;
  readonly confidenceInterval: readonly [number, number] | null;
  readonly coverage95: boolean | null;
  readonly perPeriodEstimate: ReadonlyArray<number> | null;
  readonly diagnostics: Readonly<Record<string, number | string>>;
  readonly runtimeMs: number;
}

export interface Estimator {
  readonly id: string;
  readonly displayName: string;
  readonly shortDescription: string;
  readonly applicableScenarios: ReadonlyArray<string>;
  readonly nativeEstimand: string;
  readonly estimate: (dataset: Dataset) => EstimationResult;
}
