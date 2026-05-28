import { describe, expect, it } from "vitest";
import { gaussian, mulberry32 } from "../../src/lib/math/random";

const take = (rng: () => number, count: number): number[] =>
  Array.from({ length: count }, () => rng());

describe("mulberry32", () => {
  it("produces values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (const value of take(rng, 1000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is deterministic for a given seed", () => {
    expect(take(mulberry32(42), 10)).toEqual(take(mulberry32(42), 10));
  });

  it("produces different sequences for different seeds", () => {
    expect(take(mulberry32(1), 5)).not.toEqual(take(mulberry32(2), 5));
  });

  it("matches the published Mulberry32 reference sequence", () => {
    const seed42 = take(mulberry32(42), 5);
    const expected42 = [
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
      0.6697340414393693, 0.17481389874592423,
    ];
    seed42.forEach((value, index) => {
      expect(value).toBeCloseTo(expected42[index] ?? Number.NaN, 12);
    });

    const seed1 = take(mulberry32(1), 3);
    const expected1 = [
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ];
    seed1.forEach((value, index) => {
      expect(value).toBeCloseTo(expected1[index] ?? Number.NaN, 12);
    });
  });

  it("is approximately uniform over many draws", () => {
    const rng = mulberry32(123456);
    const samples = take(rng, 200000);
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(mean).toBeCloseTo(0.5, 2);
  });
});

describe("gaussian", () => {
  it("is deterministic for a given seeded source", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const drawA = Array.from({ length: 10 }, () => gaussian(a));
    const drawB = Array.from({ length: 10 }, () => gaussian(b));
    expect(drawA).toEqual(drawB);
  });

  it("has approximately zero mean and unit standard deviation", () => {
    const rng = mulberry32(2024);
    const n = 100000;
    const samples = Array.from({ length: n }, () => gaussian(rng));
    const mean = samples.reduce((sum, value) => sum + value, 0) / n;
    const variance =
      samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
    expect(mean).toBeCloseTo(0, 1);
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1);
  });
});
