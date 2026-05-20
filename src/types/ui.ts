import type { Dataset, DGPParams, GroundTruth, ParamSchema } from "../lib/dgp/types";
import type { EstimationResult } from "../lib/methods/types";

export type ViewMode = "hero" | "compare-all" | "scoreboard";

export type HeroNarrativeMode = "validates" | "fails-instructively";

export type HeroSeriesRole =
  | "ground-truth"
  | "naive-baseline"
  | "reference-method";

export interface HeroScenarioConfig {
  readonly naiveMethodId: string;
  readonly referenceMethodId: string;
  readonly narrativeMode: HeroNarrativeMode;
  readonly primarySliderKey: keyof DGPParams;
  readonly headlineTemplateId: string;
}

export type ChartPaletteKind = "hero-role" | "method-identity";

export interface UiPalette {
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly mutedText: string;
  readonly border: string;
  readonly primary: string;
  readonly warning: string;
}

export interface ChartPalette {
  readonly kind: ChartPaletteKind;
  readonly ui: UiPalette;
  readonly heroRoleColors: Readonly<Record<HeroSeriesRole, string>>;
  readonly stressedReferenceColor: string;
  readonly methodColors: Readonly<Record<string, string>>;
}

export interface HeroChartProps {
  readonly dataset: Dataset;
  readonly groundTruthSeries: ReadonlyArray<number>;
  readonly naiveResult: EstimationResult;
  readonly referenceResult: EstimationResult;
  readonly hero: HeroScenarioConfig;
  readonly palette: ChartPalette;
}

export interface ControlPanelProps {
  readonly paramSchema: ParamSchema;
  readonly params: DGPParams;
  readonly primarySliderKey: keyof DGPParams;
  readonly onParamChange: (key: keyof DGPParams, value: number) => void;
  readonly onReset: () => void;
}

export interface ExplanationPanelProps {
  readonly scenarioId: string;
  readonly hero: HeroScenarioConfig;
  readonly params: DGPParams;
  readonly results: ReadonlyArray<EstimationResult>;
}

export interface CompareAllViewProps {
  readonly dataset: Dataset;
  readonly results: ReadonlyArray<EstimationResult>;
  readonly palette: ChartPalette;
}

export interface ScoreboardProps {
  readonly groundTruth: GroundTruth;
  readonly results: ReadonlyArray<EstimationResult>;
}
