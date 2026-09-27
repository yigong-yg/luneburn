export interface RidgeFit {
  readonly coefficients: ReadonlyArray<number>;
}

const assertDesign = (
  design: ReadonlyArray<ReadonlyArray<number>>,
  outcome: ReadonlyArray<number>,
): number => {
  if (design.length === 0 || design.length !== outcome.length) {
    throw new Error(
      `ridge row mismatch: design has ${design.length} rows and outcome has ${outcome.length}`,
    );
  }

  const columns = design[0]?.length ?? 0;
  if (columns === 0) {
    throw new Error("ridge design must contain at least one column");
  }

  for (const row of design) {
    if (row.length !== columns || row.some((value) => !Number.isFinite(value))) {
      throw new Error("ridge design rows must be rectangular and finite");
    }
  }
  if (outcome.some((value) => !Number.isFinite(value))) {
    throw new Error("ridge outcome must be finite");
  }

  return columns;
};

const solve = (
  matrix: ReadonlyArray<ReadonlyArray<number>>,
  vector: ReadonlyArray<number>,
): number[] => {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [
    ...row,
    vector[index] ?? Number.NaN,
  ]);

  for (let pivot = 0; pivot < n; pivot += 1) {
    let strongest = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (
        Math.abs(augmented[row]?.[pivot] ?? 0) >
        Math.abs(augmented[strongest]?.[pivot] ?? 0)
      ) {
        strongest = row;
      }
    }

    const pivotValue = augmented[strongest]?.[pivot] ?? 0;
    if (Math.abs(pivotValue) < 1e-12) {
      throw new Error("ridge normal equations are singular");
    }

    [augmented[pivot], augmented[strongest]] = [
      augmented[strongest] ?? [],
      augmented[pivot] ?? [],
    ];

    const pivotRow = augmented[pivot];
    if (pivotRow === undefined) {
      throw new Error("ridge solver lost its pivot row");
    }
    for (let column = pivot; column <= n; column += 1) {
      pivotRow[column] = (pivotRow[column] ?? 0) / pivotValue;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const target = augmented[row];
      if (target === undefined) {
        throw new Error("ridge solver lost a row");
      }
      const factor = target[pivot] ?? 0;
      for (let column = pivot; column <= n; column += 1) {
        target[column] =
          (target[column] ?? 0) - factor * (pivotRow[column] ?? 0);
      }
    }
  }

  return augmented.map((row) => {
    const value = row[n];
    if (value === undefined || !Number.isFinite(value)) {
      throw new Error("ridge solver produced a non-finite coefficient");
    }
    return value;
  });
};

export const fitRidge = (
  design: ReadonlyArray<ReadonlyArray<number>>,
  outcome: ReadonlyArray<number>,
  lambda: number,
  unpenalizedColumns: ReadonlyArray<number> = [],
): RidgeFit => {
  const columns = assertDesign(design, outcome);
  if (!Number.isFinite(lambda) || lambda < 0) {
    throw new Error("ridge lambda must be a non-negative finite number");
  }
  const unpenalized = new Set(unpenalizedColumns);
  for (const column of unpenalized) {
    if (!Number.isInteger(column) || column < 0 || column >= columns) {
      throw new Error(`unpenalized column ${column} is outside the design`);
    }
  }

  const gram = Array.from({ length: columns }, (_unused, left) =>
    Array.from({ length: columns }, (_none, right) =>
      design.reduce(
        (sum, row) => sum + (row[left] ?? 0) * (row[right] ?? 0),
        left === right && !unpenalized.has(left) ? lambda : 0,
      ),
    ),
  );
  const crossProduct = Array.from({ length: columns }, (_unused, column) =>
    design.reduce(
      (sum, row, rowIndex) =>
        sum + (row[column] ?? 0) * (outcome[rowIndex] ?? 0),
      0,
    ),
  );

  return { coefficients: solve(gram, crossProduct) };
};

export const predictLinear = (
  design: ReadonlyArray<ReadonlyArray<number>>,
  coefficients: ReadonlyArray<number>,
): number[] => {
  if (coefficients.length === 0) {
    throw new Error("linear prediction requires coefficients");
  }
  return design.map((row) => {
    if (row.length !== coefficients.length) {
      throw new Error("linear prediction row does not match coefficient count");
    }
    return row.reduce(
      (sum, value, index) => sum + value * (coefficients[index] ?? 0),
      0,
    );
  });
};
