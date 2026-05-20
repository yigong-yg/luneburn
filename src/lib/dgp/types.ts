import type { HeroScenarioConfig } from "../../types/ui";

export interface DGPParams {
  readonly trueEffect: number;
  readonly crossChannelCorrelation: number;
  readonly noiseStd: number;
  readonly nUnits: number;
  readonly nPeriods: number;
  readonly treatmentTimingJitter: number;
  readonly baselineTrendCurvature: number;
  readonly structuralBreakIntensity: number;
}

export interface Unit {
  readonly id: number;
  readonly treated: boolean;
  readonly treatment: ReadonlyArray<number>;
  readonly outcomes: ReadonlyArray<number>;
  readonly channelSpend: ReadonlyArray<ReadonlyArray<number>>;
}

export interface GroundTruth {
  readonly comparisonEstimand: number;
  readonly averageTreatmentEffectLevel: number;
  readonly perPeriodEffect: ReadonlyArray<number>;
  readonly perUnitEffect: ReadonlyArray<number>;
  readonly counterfactualOutcomes: ReadonlyArray<ReadonlyArray<number>>;
}

export interface Dataset {
  readonly scenarioId: string;
  readonly params: DGPParams;
  readonly seed: number;
  readonly nUnits: number;
  readonly nPeriods: number;
  readonly nChannels: number;
  readonly units: ReadonlyArray<Unit>;
  readonly groundTruth: GroundTruth;
}

export interface ParamSchemaField {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
  readonly format?: (value: number) => string;
}

export type ParamSchema = ReadonlyArray<readonly [keyof DGPParams, ParamSchemaField]>;

export interface DGP {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly paramSchema: ParamSchema;
  readonly defaultParams: DGPParams;
  readonly hero: HeroScenarioConfig;
  readonly generate: (params: DGPParams, seed: number) => Dataset;
}
