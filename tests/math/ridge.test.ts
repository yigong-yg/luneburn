import { describe, expect, it } from "vitest";
import { fitRidge, predictLinear } from "../../src/lib/math/ridge";

describe("ridge regression", () => {
  it("recovers a simple linear relationship", () => {
    const x = Array.from({ length: 20 }, (_unused, i) => [1, i]);
    const y = x.map((row) => 2 + 3 * (row[1] ?? 0));
    const fit = fitRidge(x, y, 1e-8, [0]);

    expect(fit.coefficients[0]).toBeCloseTo(2, 6);
    expect(fit.coefficients[1]).toBeCloseTo(3, 6);
    expect(predictLinear(x, fit.coefficients)).toEqual(
      expect.arrayContaining(y.map((value) => expect.closeTo(value, 6))),
    );
  });

  it("does not penalize the intercept", () => {
    const x = Array.from({ length: 8 }, () => [1, 0]);
    const y = Array.from({ length: 8 }, () => 7);
    const fit = fitRidge(x, y, 100, [0]);

    expect(fit.coefficients[0]).toBeCloseTo(7, 10);
  });

  it("rejects malformed dimensions", () => {
    expect(() => fitRidge([[1], [1]], [1], 1, [0])).toThrow(/row/i);
  });
});
