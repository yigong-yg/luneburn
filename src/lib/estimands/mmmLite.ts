import type { EstimationStatus } from "../methods/types";
import { geometricAdstock } from "../math/adstock";
import { movingBlockIndices } from "../math/blockBootstrap";
import { expandingWindowFolds } from "../math/blockedCv";
import { fitRidge, predictLinear } from "../math/ridge";
import {
  CHANNELS,
  channelRecord,
  type ChannelId,
  type MmmObservedData,
} from "./types";

const RIDGE_GRID = [0.01, 0.1, 1, 10, 100] as const;
const ADSTOCK_DECAY: Readonly<Record<ChannelId, number>> = {
  search: 0.1,
  social: 0.35,
  video: 0.65,
};
const MINIMUM_TRAINING_PERIODS = 52;
const VALIDATION_PERIODS = 16;
const MINIMUM_CV_FOLDS = 3;
const MINIMUM_PERIODS =
  MINIMUM_TRAINING_PERIODS + MINIMUM_CV_FOLDS * VALIDATION_PERIODS;
const BOOTSTRAP_BLOCK_LENGTH = 8;

export type MmmLiteAssumptionFlag =
  | "constant_media"
  | "high_media_collinearity"
  | "regularization_boundary"
  | "unsupported_channel_contract";

export interface MmmLiteOptions {
  readonly bootstrapReplications?: number;
  readonly bootstrapSeed?: number;
}

export interface MediaIdentificationDiagnostic {
  readonly rSquared: number;
  readonly vif: number;
  readonly residualVariationShare: number;
}

export interface MmmLiteResult {
  readonly status: EstimationStatus;
  readonly assumptionFlags: ReadonlyArray<MmmLiteAssumptionFlag>;
  readonly message: string | null;
  readonly channelOffIncremental: Readonly<Record<ChannelId, number>> | null;
  readonly confidenceIntervals: Readonly<
    Record<ChannelId, readonly [number, number]>
  > | null;
  readonly coefficients: ReadonlyArray<number> | null;
  readonly selectedLambda: number | null;
  readonly diagnostics: Readonly<{
    periods: number;
    folds: number;
    cvRmse: number | null;
    maxMediaCorrelation: number | null;
    mediaIdentification: Readonly<
      Record<ChannelId, MediaIdentificationDiagnostic>
    > | null;
    bootstrapReplications: number;
  }>;
}

interface Scaler {
  readonly means: ReadonlyArray<number>;
  readonly scales: ReadonlyArray<number>;
}

interface ModelInputs {
  readonly rawDesign: ReadonlyArray<ReadonlyArray<number>>;
  readonly outcomes: ReadonlyArray<number>;
  readonly counterfactualDesigns: Readonly<
    Record<ChannelId, ReadonlyArray<ReadonlyArray<number>>>
  >;
  readonly adstock: Readonly<Record<ChannelId, ReadonlyArray<number>>>;
}

const invalidResult = (
  message: string,
  periods: number,
  flags: ReadonlyArray<MmmLiteAssumptionFlag> = [],
): MmmLiteResult => ({
  status: "invalid",
  assumptionFlags: flags,
  message,
  channelOffIncremental: null,
  confidenceIntervals: null,
  coefficients: null,
  selectedLambda: null,
  diagnostics: {
    periods,
    folds: 0,
    cvRmse: null,
    maxMediaCorrelation: null,
    mediaIdentification: null,
    bootstrapReplications: 0,
  },
});

const mean = (values: ReadonlyArray<number>): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const variance = (values: ReadonlyArray<number>): number => {
  const center = mean(values);
  return mean(values.map((value) => (value - center) ** 2));
};

const fitScaler = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>,
): Scaler => {
  const columns = rows[0]?.length ?? 0;
  if (columns === 0 || indices.length === 0) {
    throw new Error("standardization requires rows and training indices");
  }

  const means = Array.from({ length: columns }, (_unused, column) => {
    if (column === 0) return 0;
    return mean(indices.map((index) => rows[index]?.[column] ?? Number.NaN));
  });
  const scales = Array.from({ length: columns }, (_unused, column) => {
    if (column === 0) return 1;
    const values = indices.map((index) => rows[index]?.[column] ?? Number.NaN);
    const scale = Math.sqrt(variance(values));
    if (!Number.isFinite(scale) || scale < 1e-10) {
      throw new Error(`standardized feature ${column} has no variation`);
    }
    return scale;
  });
  return { means, scales };
};

const applyScaler = (
  rows: ReadonlyArray<ReadonlyArray<number>>,
  scaler: Scaler,
): number[][] =>
  rows.map((row) =>
    row.map((value, column) =>
      column === 0
        ? value
        : (value - (scaler.means[column] ?? 0)) / (scaler.scales[column] ?? 1),
    ),
  );

const subsetRows = <T>(
  values: ReadonlyArray<T>,
  indices: ReadonlyArray<number>,
): T[] =>
  indices.map((index) => {
    const value = values[index];
    if (value === undefined) {
      throw new Error(`row index ${index} is outside the series`);
    }
    return value;
  });

const rmse = (
  actual: ReadonlyArray<number>,
  predicted: ReadonlyArray<number>,
): number => {
  if (actual.length !== predicted.length || actual.length === 0) {
    throw new Error("RMSE inputs must have equal positive length");
  }
  return Math.sqrt(
    mean(actual.map((value, index) => (value - (predicted[index] ?? 0)) ** 2)),
  );
};

const pearson = (
  left: ReadonlyArray<number>,
  right: ReadonlyArray<number>,
): number => {
  if (left.length !== right.length || left.length === 0) {
    throw new Error("correlation inputs must have equal positive length");
  }
  const leftMean = mean(left);
  const rightMean = mean(right);
  let covariance = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = (left[index] ?? 0) - leftMean;
    const rightDelta = (right[index] ?? 0) - rightMean;
    covariance += leftDelta * rightDelta;
    leftSquares += leftDelta ** 2;
    rightSquares += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator <= 1e-12 ? 0 : covariance / denominator;
};

const mediaIdentificationDiagnostics = (
  inputs: ModelInputs,
): Record<ChannelId, MediaIdentificationDiagnostic> => {
  const channelColumn: Readonly<Record<ChannelId, number>> = {
    search: 1,
    social: 2,
    video: 3,
  };

  return channelRecord((channel) => {
    const targetColumn = channelColumn[channel];
    const target = inputs.rawDesign.map((row) => row[targetColumn] ?? 0);
    const auxiliaryDesign = inputs.rawDesign.map((row) =>
      row.filter((_value, column) => column !== targetColumn),
    );
    const fit = fitRidge(auxiliaryDesign, target, 0);
    const prediction = predictLinear(auxiliaryDesign, fit.coefficients);
    const targetMean = mean(target);
    const totalVariation = target.reduce(
      (sum, value) => sum + (value - targetMean) ** 2,
      0,
    );
    const residualVariation = target.reduce(
      (sum, value, index) => sum + (value - (prediction[index] ?? 0)) ** 2,
      0,
    );
    const residualVariationShare = Math.min(
      1,
      Math.max(0, residualVariation / totalVariation),
    );
    const rSquared = 1 - residualVariationShare;
    return {
      rSquared,
      vif:
        residualVariationShare <= 1e-12
          ? Number.POSITIVE_INFINITY
          : 1 / residualVariationShare,
      residualVariationShare,
    };
  });
};

const buildInputs = (data: MmmObservedData): ModelInputs => {
  const spend = channelRecord((channel) =>
    data.weekly.map((row) => row.spend[channel]),
  );
  const adstock = channelRecord((channel) =>
    geometricAdstock(spend[channel], ADSTOCK_DECAY[channel]),
  );

  const rawDesign = data.weekly.map((row, index) => [
    1,
    adstock.search[index] ?? 0,
    adstock.social[index] ?? 0,
    adstock.video[index] ?? 0,
    row.trend,
    row.seasonalSin,
    row.seasonalCos,
  ]);

  const channelColumn: Readonly<Record<ChannelId, number>> = {
    search: 1,
    social: 2,
    video: 3,
  };
  const counterfactualDesigns = channelRecord((channel) =>
    rawDesign.map((row) =>
      row.map((value, column) =>
        column === channelColumn[channel] ? 0 : value,
      ),
    ),
  );

  return {
    rawDesign,
    outcomes: data.weekly.map((row) => row.conversions),
    counterfactualDesigns,
    adstock,
  };
};

const selectLambda = (
  inputs: ModelInputs,
): {
  readonly lambda: number;
  readonly cvRmse: number;
  readonly folds: number;
} => {
  const folds = expandingWindowFolds(
    inputs.outcomes.length,
    MINIMUM_TRAINING_PERIODS,
    VALIDATION_PERIODS,
  );
  if (folds.length < MINIMUM_CV_FOLDS) {
    throw new Error(
      `blocked validation requires ${MINIMUM_CV_FOLDS} supported folds`,
    );
  }

  let bestLambda: number = RIDGE_GRID[0];
  let bestRmse = Number.POSITIVE_INFINITY;
  for (const lambda of RIDGE_GRID) {
    const foldErrors = folds.map((fold) => {
      const scaler = fitScaler(inputs.rawDesign, fold.trainIndices);
      const standardized = applyScaler(inputs.rawDesign, scaler);
      const fit = fitRidge(
        subsetRows(standardized, fold.trainIndices),
        subsetRows(inputs.outcomes, fold.trainIndices),
        lambda,
        [0],
      );
      return rmse(
        subsetRows(inputs.outcomes, fold.validationIndices),
        predictLinear(
          subsetRows(standardized, fold.validationIndices),
          fit.coefficients,
        ),
      );
    });
    const candidateRmse = mean(foldErrors);
    if (
      candidateRmse < bestRmse - 1e-10 ||
      (Math.abs(candidateRmse - bestRmse) <= 1e-10 && lambda > bestLambda)
    ) {
      bestLambda = lambda;
      bestRmse = candidateRmse;
    }
  }

  return { lambda: bestLambda, cvRmse: bestRmse, folds: folds.length };
};

const channelContributions = (
  observedDesign: ReadonlyArray<ReadonlyArray<number>>,
  counterfactualDesigns: Readonly<
    Record<ChannelId, ReadonlyArray<ReadonlyArray<number>>>
  >,
  coefficients: ReadonlyArray<number>,
): Record<ChannelId, number> => {
  const observedPrediction = predictLinear(observedDesign, coefficients);
  return channelRecord((channel) => {
    const counterfactualPrediction = predictLinear(
      counterfactualDesigns[channel],
      coefficients,
    );
    return observedPrediction.reduce(
      (sum, value, index) =>
        sum + value - (counterfactualPrediction[index] ?? 0),
      0,
    );
  });
};

const quantile = (
  values: ReadonlyArray<number>,
  probability: number,
): number => {
  if (values.length === 0) {
    throw new Error("quantile requires values");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (position - lower);
};

const bootstrapIntervals = (
  design: ReadonlyArray<ReadonlyArray<number>>,
  counterfactualDesigns: Readonly<
    Record<ChannelId, ReadonlyArray<ReadonlyArray<number>>>
  >,
  outcomes: ReadonlyArray<number>,
  coefficients: ReadonlyArray<number>,
  lambda: number,
  replications: number,
  seed: number,
): Record<ChannelId, readonly [number, number]> | null => {
  if (replications === 0) return null;

  const fitted = predictLinear(design, coefficients);
  const rawResiduals = outcomes.map(
    (value, index) => value - (fitted[index] ?? 0),
  );
  const residualMean = mean(rawResiduals);
  const residuals = rawResiduals.map((value) => value - residualMean);
  const draws = channelRecord(() => [] as number[]);

  for (let replication = 0; replication < replications; replication += 1) {
    const sampledIndices = movingBlockIndices(
      outcomes.length,
      Math.min(BOOTSTRAP_BLOCK_LENGTH, outcomes.length),
      seed + replication * 104_729,
    );
    const bootOutcome = fitted.map(
      (value, index) => value + (residuals[sampledIndices[index] ?? 0] ?? 0),
    );
    const fit = fitRidge(design, bootOutcome, lambda, [0]);
    const contributions = channelContributions(
      design,
      counterfactualDesigns,
      fit.coefficients,
    );
    for (const channel of CHANNELS) {
      draws[channel].push(contributions[channel]);
    }
  }

  return channelRecord(
    (channel) =>
      [
        quantile(draws[channel], 0.025),
        quantile(draws[channel], 0.975),
      ] as const,
  );
};

export const estimateMmmLite = (
  data: MmmObservedData,
  options: MmmLiteOptions = {},
): MmmLiteResult => {
  const periods = data.weekly.length;
  const bootstrapReplications = options.bootstrapReplications ?? 80;
  if (!Number.isInteger(bootstrapReplications) || bootstrapReplications < 0) {
    throw new Error("bootstrap replications must be a non-negative integer");
  }
  if (periods < MINIMUM_PERIODS) {
    return invalidResult(
      `MMM-lite requires at least ${MINIMUM_PERIODS} weekly periods for ${MINIMUM_CV_FOLDS} forward validation folds.`,
      periods,
    );
  }
  if (
    data.channels.length !== CHANNELS.length ||
    CHANNELS.some((channel) => !data.channels.includes(channel))
  ) {
    return invalidResult(
      "MMM-lite currently requires the Search, Social, and Video channel contract.",
      periods,
      ["unsupported_channel_contract"],
    );
  }

  for (const channel of CHANNELS) {
    const spend = data.weekly.map((row) => row.spend[channel]);
    if (variance(spend) < 1e-12) {
      return invalidResult(
        `MMM-lite cannot estimate ${channel}: its spend has no variation.`,
        periods,
        ["constant_media"],
      );
    }
  }

  try {
    const inputs = buildInputs(data);
    const selection = selectLambda(inputs);
    const allIndices = Array.from(
      { length: periods },
      (_unused, index) => index,
    );
    const scaler = fitScaler(inputs.rawDesign, allIndices);
    const standardized = applyScaler(inputs.rawDesign, scaler);
    const standardizedCounterfactuals = channelRecord((channel) =>
      applyScaler(inputs.counterfactualDesigns[channel], scaler),
    );
    const fit = fitRidge(standardized, inputs.outcomes, selection.lambda, [0]);
    const mediaIdentification = mediaIdentificationDiagnostics(inputs);
    const channelOffIncremental = channelContributions(
      standardized,
      standardizedCounterfactuals,
      fit.coefficients,
    );

    let maxMediaCorrelation = 0;
    for (let left = 0; left < CHANNELS.length; left += 1) {
      for (let right = left + 1; right < CHANNELS.length; right += 1) {
        const leftChannel = CHANNELS[left];
        const rightChannel = CHANNELS[right];
        if (leftChannel === undefined || rightChannel === undefined) continue;
        maxMediaCorrelation = Math.max(
          maxMediaCorrelation,
          Math.abs(
            pearson(inputs.adstock[leftChannel], inputs.adstock[rightChannel]),
          ),
        );
      }
    }

    const flags: MmmLiteAssumptionFlag[] = [];
    if (
      CHANNELS.some(
        (channel) => mediaIdentification[channel].residualVariationShare < 0.2,
      )
    ) {
      flags.push("high_media_collinearity");
    }
    if (selection.lambda === RIDGE_GRID[RIDGE_GRID.length - 1]) {
      flags.push("regularization_boundary");
    }

    const confidenceIntervals = bootstrapIntervals(
      standardized,
      standardizedCounterfactuals,
      inputs.outcomes,
      fit.coefficients,
      selection.lambda,
      bootstrapReplications,
      options.bootstrapSeed ?? 8_071,
    );

    return {
      status: flags.length > 0 ? "warning" : "ok",
      assumptionFlags: flags,
      message:
        "MMM-lite targets channel-off incrementality under fixed adstock and conditional exchangeability; predictive fit cannot establish that causal assumption.",
      channelOffIncremental,
      confidenceIntervals,
      coefficients: fit.coefficients,
      selectedLambda: selection.lambda,
      diagnostics: {
        periods,
        folds: selection.folds,
        cvRmse: selection.cvRmse,
        maxMediaCorrelation,
        mediaIdentification,
        bootstrapReplications,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown model error";
    return invalidResult(`MMM-lite could not fit: ${message}`, periods);
  }
};
