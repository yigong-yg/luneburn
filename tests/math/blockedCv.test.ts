import { describe, expect, it } from "vitest";
import { expandingWindowFolds } from "../../src/lib/math/blockedCv";

describe("expandingWindowFolds", () => {
  it("creates ordered folds with no future leakage", () => {
    const folds = expandingWindowFolds(104, 52, 16);

    expect(folds.length).toBeGreaterThanOrEqual(3);
    for (const fold of folds) {
      expect(Math.max(...fold.trainIndices)).toBeLessThan(
        Math.min(...fold.validationIndices),
      );
      expect(fold.validationIndices).toHaveLength(16);
    }
  });

  it("returns no folds when there is insufficient history", () => {
    expect(expandingWindowFolds(40, 52, 16)).toEqual([]);
  });
});
