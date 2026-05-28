export type Matrix = ReadonlyArray<ReadonlyArray<number>>;

// Verify every row has the same length and return the column count. Ragged
// matrices throw rather than silently zero-filling: a malformed design matrix
// must fail loudly, never become a plausible-looking estimate.
const assertRectangular = (m: Matrix, name: string): number => {
  const cols = m[0]?.length ?? 0;
  for (const row of m) {
    if (row.length !== cols) {
      throw new Error(
        `${name} is not rectangular: expected ${cols} columns, found a row with ${row.length}`,
      );
    }
  }
  return cols;
};

// Bounds-checked access. Throws on out-of-range rather than yielding undefined,
// so an indexing bug cannot leak a zero into a numeric result.
const at = <T>(row: ReadonlyArray<T>, index: number, name: string): T => {
  const value = row[index];
  if (value === undefined) {
    throw new Error(`${name} index ${index} out of bounds (length ${row.length})`);
  }
  return value;
};

export const identity = (n: number): number[][] =>
  Array.from({ length: n }, (_unused, i) =>
    Array.from({ length: n }, (_none, j) => (i === j ? 1 : 0)),
  );

export const transpose = (m: Matrix): number[][] => {
  const cols = assertRectangular(m, "transpose input");
  return Array.from({ length: cols }, (_unused, j) =>
    Array.from({ length: m.length }, (_none, i) => at(at(m, i, "matrix"), j, "row")),
  );
};

export const multiply = (a: Matrix, b: Matrix): number[][] => {
  const inner = assertRectangular(a, "multiply left operand");
  if (inner !== b.length) {
    throw new Error(
      `matrix multiply dimension mismatch: left has ${inner} columns, right has ${b.length} rows`,
    );
  }
  const cols = assertRectangular(b, "multiply right operand");
  return a.map((row) =>
    Array.from({ length: cols }, (_unused, j) =>
      row.reduce((sum, value, k) => sum + value * at(at(b, k, "right operand"), j, "right row"), 0),
    ),
  );
};

export const matVec = (m: Matrix, v: ReadonlyArray<number>): number[] => {
  const cols = assertRectangular(m, "matVec matrix");
  if (cols !== v.length) {
    throw new Error(
      `matrix-vector dimension mismatch: matrix has ${cols} columns, vector has ${v.length} entries`,
    );
  }
  return m.map((row) => row.reduce((sum, value, j) => sum + value * at(v, j, "vector"), 0));
};
