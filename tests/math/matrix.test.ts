import { describe, expect, it } from "vitest";
import { identity, matVec, multiply, transpose } from "../../src/lib/math/matrix";

describe("identity", () => {
  it("builds an n x n identity matrix", () => {
    expect(identity(3)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});

describe("transpose", () => {
  it("swaps rows and columns", () => {
    expect(
      transpose([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it("is its own inverse", () => {
    const m = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(transpose(transpose(m))).toEqual(m);
  });
});

describe("multiply", () => {
  it("computes a known matrix product", () => {
    expect(
      multiply(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ),
    ).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it("leaves a matrix unchanged when multiplied by identity", () => {
    const m = [
      [2, -1],
      [0, 3],
    ];
    expect(multiply(m, identity(2))).toEqual(m);
  });

  it("throws when inner dimensions disagree", () => {
    expect(() =>
      multiply(
        [
          [1, 2],
          [3, 4],
        ],
        [[5, 6]],
      ),
    ).toThrow(/dimension/i);
  });
});

describe("matVec", () => {
  it("multiplies a matrix by a vector", () => {
    expect(
      matVec(
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
      ),
    ).toEqual([17, 39]);
  });

  it("throws when the vector length does not match the column count", () => {
    expect(() => matVec([[1, 2]], [1, 2, 3])).toThrow(/dimension/i);
  });
});

describe("rectangularity validation", () => {
  // Ragged matrices must throw, not silently zero-fill — a malformed design
  // matrix becoming a credible-looking estimate is exactly the failure this
  // project cannot ship.
  it("throws when transposing a ragged matrix", () => {
    expect(() => transpose([[1, 2], [3]])).toThrow(/rectangular/i);
  });

  it("throws when the left operand of multiply is ragged", () => {
    expect(() => multiply([[1, 2], [3]], identity(2))).toThrow(/rectangular/i);
  });

  it("throws when the right operand of multiply is ragged", () => {
    expect(() =>
      multiply(
        [
          [1, 2],
          [3, 4],
        ],
        [[1], [2, 3]],
      ),
    ).toThrow(/rectangular/i);
  });

  it("throws when the matVec matrix is ragged", () => {
    expect(() => matVec([[1, 2], [3]], [1, 2])).toThrow(/rectangular/i);
  });
});
