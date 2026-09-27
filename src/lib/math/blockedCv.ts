export interface TimeSeriesFold {
  readonly trainIndices: ReadonlyArray<number>;
  readonly validationIndices: ReadonlyArray<number>;
}

export const expandingWindowFolds = (
  length: number,
  minimumTrainingLength: number,
  validationLength: number,
): TimeSeriesFold[] => {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error("series length must be a non-negative integer");
  }
  if (!Number.isInteger(minimumTrainingLength) || minimumTrainingLength <= 0) {
    throw new Error("minimum training length must be a positive integer");
  }
  if (!Number.isInteger(validationLength) || validationLength <= 0) {
    throw new Error("validation length must be a positive integer");
  }

  const folds: TimeSeriesFold[] = [];
  for (
    let validationStart = minimumTrainingLength;
    validationStart + validationLength <= length;
    validationStart += validationLength
  ) {
    folds.push({
      trainIndices: Array.from({ length: validationStart }, (_unused, index) => index),
      validationIndices: Array.from(
        { length: validationLength },
        (_unused, index) => validationStart + index,
      ),
    });
  }

  return folds;
};
