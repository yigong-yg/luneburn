import { describe, expect, it } from "vitest";
import { superBowlDefaults, superBowlDgp } from "../../src/lib/dgp/superBowl";
import type { Dataset } from "../../src/lib/dgp/types";

const POST_START = 26;
const SEED = 42;

const generate = (overrides: Partial<typeof superBowlDefaults> = {}): Dataset =>
  superBowlDgp.generate({ ...superBowlDefaults, ...overrides }, SEED);

const activePeriods = (treatment: ReadonlyArray<number>): number[] =>
  treatment.flatMap((value, period) => (value > 0 ? [period] : []));

const pearson = (xs: ReadonlyArray<number>, ys: ReadonlyArray<number>): number => {
  const mean = (a: ReadonlyArray<number>): number =>
    a.reduce((sum, value) => sum + value, 0) / a.length;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  return cov / Math.sqrt(vx * vy);
};

// Average Pearson correlation of log channel spend across every channel pair,
// pooled over all unit-periods. This measures actual co-movement, not just
// "the numbers changed" — a scale-only change leaves this near zero.
const avgPairwiseLogSpendCorrelation = (dataset: Dataset): number => {
  const columns: number[][] = Array.from({ length: dataset.nChannels }, () => []);
  for (const unit of dataset.units) {
    for (const periodSpend of unit.channelSpend) {
      periodSpend.forEach((spend, channel) => {
        columns[channel]?.push(Math.log(spend));
      });
    }
  }
  const pairCorrelations: number[] = [];
  for (let a = 0; a < columns.length; a += 1) {
    for (let b = a + 1; b < columns.length; b += 1) {
      pairCorrelations.push(pearson(columns[a] ?? [], columns[b] ?? []));
    }
  }
  return (
    pairCorrelations.reduce((sum, value) => sum + value, 0) / pairCorrelations.length
  );
};

describe("super bowl DGP — shape and contract", () => {
  it("produces the declared panel dimensions", () => {
    const dataset = generate();
    expect(dataset.scenarioId).toBe("super-bowl");
    expect(dataset.seed).toBe(SEED);
    expect(dataset.nUnits).toBe(50);
    expect(dataset.nPeriods).toBe(52);
    expect(dataset.nChannels).toBe(3);
    expect(dataset.units).toHaveLength(50);
    expect(dataset.groundTruth.perPeriodEffect).toHaveLength(52);
    expect(dataset.groundTruth.perUnitEffect).toHaveLength(50);
    expect(dataset.groundTruth.counterfactualOutcomes).toHaveLength(50);

    for (const unit of dataset.units) {
      expect(unit.treatment).toHaveLength(52);
      expect(unit.outcomes).toHaveLength(52);
      expect(unit.channelSpend).toHaveLength(52);
      for (const periodSpend of unit.channelSpend) {
        expect(periodSpend).toHaveLength(3);
        for (const spend of periodSpend) {
          expect(spend).toBeGreaterThan(0);
        }
      }
    }
    for (const row of dataset.groundTruth.counterfactualOutcomes) {
      expect(row).toHaveLength(52);
    }
  });
});

describe("super bowl DGP — determinism", () => {
  it("is byte-for-byte identical for the same seed and params", () => {
    expect(JSON.stringify(generate())).toEqual(JSON.stringify(generate()));
  });

  it("differs for a different seed", () => {
    const a = superBowlDgp.generate(superBowlDefaults, 42);
    const b = superBowlDgp.generate(superBowlDefaults, 7);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });
});

describe("super bowl DGP — treatment assignment", () => {
  it("treats exactly 25 of 50 units", () => {
    const dataset = generate();
    expect(dataset.units.filter((u) => u.treated)).toHaveLength(25);
    expect(dataset.units.filter((u) => !u.treated)).toHaveLength(25);
  });

  it("keeps treated === treatment.some(x > 0) for every unit", () => {
    for (const unit of generate().units) {
      expect(unit.treated).toBe(unit.treatment.some((x) => x > 0));
    }
  });

  it("fires the treatment impulse only at period 26", () => {
    const dataset = generate();
    for (const unit of dataset.units) {
      expect(activePeriods(unit.treatment)).toEqual(unit.treated ? [POST_START] : []);
    }
  });
});

describe("super bowl DGP — ground truth", () => {
  it("recomputes comparisonEstimand from observed and counterfactual outcomes", () => {
    const dataset = generate();
    const { counterfactualOutcomes } = dataset.groundTruth;

    const ratios: number[] = [];
    dataset.units.forEach((unit, unitIndex) => {
      if (!unit.treated) {
        return;
      }
      for (let period = POST_START; period < dataset.nPeriods; period += 1) {
        const y1 = unit.outcomes[period] ?? Number.NaN;
        const y0 = counterfactualOutcomes[unitIndex]?.[period] ?? Number.NaN;
        ratios.push((y1 - y0) / y0);
      }
    });
    const recomputed = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;

    expect(dataset.groundTruth.comparisonEstimand).toBeCloseTo(recomputed, 10);
  });

  it("has comparisonEstimand equal to the post-period average of perPeriodEffect", () => {
    const dataset = generate();
    const post = dataset.groundTruth.perPeriodEffect.slice(POST_START);
    const postAverage = post.reduce((sum, v) => sum + v, 0) / post.length;
    expect(dataset.groundTruth.comparisonEstimand).toBeCloseTo(postAverage, 12);
  });

  it("has zero true effect before treatment and a positive peak at period 26", () => {
    const dataset = generate();
    const effect = dataset.groundTruth.perPeriodEffect;
    for (let period = 0; period < POST_START; period += 1) {
      expect(effect[period]).toBe(0);
    }
    expect(effect[POST_START]).toBeGreaterThan(0);
    expect(effect[POST_START]).toBeGreaterThanOrEqual(effect[POST_START + 1] ?? 0);
  });

  it("reports per-unit effects: ~comparisonEstimand for treated, 0 for control", () => {
    const dataset = generate();
    const tau = dataset.groundTruth.comparisonEstimand;
    dataset.units.forEach((unit, index) => {
      const effect = dataset.groundTruth.perUnitEffect[index] ?? Number.NaN;
      if (unit.treated) {
        expect(effect).toBeCloseTo(tau, 10);
      } else {
        expect(effect).toBe(0);
      }
    });
  });
});

describe("super bowl DGP — parameter sensitivity", () => {
  it("scales the comparison estimand linearly with the true effect", () => {
    const base = generate({ trueEffect: 0.1 }).groundTruth.comparisonEstimand;
    const doubled = generate({ trueEffect: 0.2 }).groundTruth.comparisonEstimand;
    expect(doubled).toBeCloseTo(2 * base, 10);
  });

  it("leaves ground truth invariant to noise but changes observed outcomes", () => {
    const quiet = generate({ noiseStd: 0.5 });
    const loud = generate({ noiseStd: 3 });
    expect(loud.groundTruth.perPeriodEffect).toEqual(quiet.groundTruth.perPeriodEffect);
    expect(loud.groundTruth.comparisonEstimand).toBeCloseTo(
      quiet.groundTruth.comparisonEstimand,
      12,
    );
    expect(loud.units[0]?.outcomes).not.toEqual(quiet.units[0]?.outcomes);
  });

  it("raises pairwise channel-spend co-movement as correlation rises, without moving ground truth", () => {
    const low = generate({ crossChannelCorrelation: 0.1 });
    const high = generate({ crossChannelCorrelation: 0.85 });

    const lowCorr = avgPairwiseLogSpendCorrelation(low);
    const highCorr = avgPairwiseLogSpendCorrelation(high);

    expect(lowCorr).toBeLessThan(0.35);
    expect(highCorr).toBeGreaterThan(0.6);
    expect(highCorr).toBeGreaterThan(lowCorr + 0.4);

    expect(high.groundTruth.comparisonEstimand).toBeCloseTo(
      low.groundTruth.comparisonEstimand,
      12,
    );
  });
});
