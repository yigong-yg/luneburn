import type { Dataset } from "../dgp/types";
import type { EstimationResult, Estimator } from "./types";

const METHOD_ID = "did-twfe";

// Below this, a per-week trend gap counts as parallel (relative to baseline).
const PRETREND_TOLERANCE = 0.002;

const invalid = (message: string): EstimationResult => ({
  methodId: METHOD_ID,
  status: "invalid",
  assumptionFlags: [],
  message,
  pointEstimate: null,
  confidenceInterval: null,
  coverage95: null,
  perPeriodEstimate: null,
  diagnostics: {},
  runtimeMs: 0,
});

const mean = (xs: ReadonlyArray<number>): number =>
  xs.length === 0 ? 0 : xs.reduce((sum, value) => sum + value, 0) / xs.length;

// Ordinary-least-squares slope of ys against the index 0..n-1.
const slope = (ys: ReadonlyArray<number>): number => {
  const n = ys.length;
  if (n < 2) {
    return 0;
  }
  const xbar = (n - 1) / 2;
  const ybar = mean(ys);
  let num = 0;
  let den = 0;
  for (let t = 0; t < n; t += 1) {
    const dx = t - xbar;
    num += dx * ((ys[t] ?? 0) - ybar);
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
};

/**
 * Difference-in-differences with two-way fixed effects, V0 (single treatment
 * event, treated vs control). Outcome and a derived treated-by-post indicator are
 * residualized by unit and time means, then tau is a scalar regression on the
 * residualized indicator. The level ATT is mapped to percent lift by dividing
 * by the pre-period mean of treated outcomes, matching tau_comp's scale.
 *
 * Uses observed outcomes and the treatment assignment only - never ground truth
 * (coverage95 compares the CI to ground truth purely as a diagnostic).
 */
export const estimateDiD = (dataset: Dataset): EstimationResult => {
  const { units, nPeriods } = dataset;
  const treatedUnits = units.filter((unit) => unit.treated);
  const controlUnits = units.filter((unit) => !unit.treated);

  if (nPeriods < 2) {
    return invalid("Difference-in-differences needs at least two periods.");
  }
  if (treatedUnits.length === 0) {
    return invalid("Difference-in-differences needs at least one treated unit.");
  }
  if (controlUnits.length === 0) {
    return invalid("Difference-in-differences needs at least one control unit.");
  }

  // Treatment onset = the earliest treated impulse week (the post-period starts here).
  let onset = Number.POSITIVE_INFINITY;
  for (const unit of treatedUnits) {
    const first = unit.treatment.findIndex((value) => value > 0);
    if (first >= 0 && first < onset) {
      onset = first;
    }
  }
  if (!Number.isFinite(onset) || onset <= 0) {
    return invalid("Difference-in-differences needs a pre-treatment period.");
  }
  if (onset >= nPeriods) {
    return invalid("Difference-in-differences needs a post-treatment period.");
  }

  const nUnits = units.length;
  const outcome = units.map((unit) => unit.outcomes);
  // D_it = 1 for treated units from onset onward (post-period average is tau_comp's window).
  const treat = units.map((unit) =>
    Array.from({ length: nPeriods }, (_unused, t) => (unit.treated && t >= onset ? 1 : 0)),
  );

  const unitMeanY = outcome.map((row) => mean(row));
  const unitMeanD = treat.map((row) => mean(row));
  const timeMeanY = Array.from({ length: nPeriods }, (_unused, t) =>
    mean(outcome.map((row) => row[t] ?? 0)),
  );
  const timeMeanD = Array.from({ length: nPeriods }, (_unused, t) =>
    mean(treat.map((row) => row[t] ?? 0)),
  );
  const grandY = mean(unitMeanY);
  const grandD = mean(unitMeanD);

  const yTilde: number[][] = [];
  const dTilde: number[][] = [];
  let num = 0;
  let den = 0;
  for (let i = 0; i < nUnits; i += 1) {
    const yRow: number[] = [];
    const dRow: number[] = [];
    for (let t = 0; t < nPeriods; t += 1) {
      const yt = (outcome[i]?.[t] ?? 0) - (unitMeanY[i] ?? 0) - (timeMeanY[t] ?? 0) + grandY;
      const dt = (treat[i]?.[t] ?? 0) - (unitMeanD[i] ?? 0) - (timeMeanD[t] ?? 0) + grandD;
      num += yt * dt;
      den += dt * dt;
      yRow.push(yt);
      dRow.push(dt);
    }
    yTilde.push(yRow);
    dTilde.push(dRow);
  }

  if (den < 1e-12) {
    return invalid("Difference-in-differences found no treatment variation to estimate.");
  }

  const tauLevel = num / den;

  const preTreatedOutcomes: number[] = [];
  for (const unit of treatedUnits) {
    for (let t = 0; t < onset; t += 1) {
      preTreatedOutcomes.push(unit.outcomes[t] ?? 0);
    }
  }
  const preTreatedMean = mean(preTreatedOutcomes);
  if (Math.abs(preTreatedMean) < 1e-9) {
    return invalid("Difference-in-differences cannot normalize a near-zero baseline.");
  }
  const tauPct = tauLevel / preTreatedMean;

  // Cluster-robust standard error, clustered at the unit level.
  let meat = 0;
  for (let i = 0; i < nUnits; i += 1) {
    let scoreI = 0;
    for (let t = 0; t < nPeriods; t += 1) {
      const residual = (yTilde[i]?.[t] ?? 0) - tauLevel * (dTilde[i]?.[t] ?? 0);
      scoreI += (dTilde[i]?.[t] ?? 0) * residual;
    }
    meat += scoreI * scoreI;
  }
  const seLevel = Math.sqrt(meat) / den;
  const sePct = seLevel / Math.abs(preTreatedMean);
  const confidenceInterval: [number, number] = [tauPct - 1.96 * sePct, tauPct + 1.96 * sePct];

  // Parallel-trends diagnostic on pre-period treated vs control mean paths.
  const preTreatedPath = Array.from({ length: onset }, (_unused, t) =>
    mean(treatedUnits.map((unit) => unit.outcomes[t] ?? 0)),
  );
  const preControlPath = Array.from({ length: onset }, (_unused, t) =>
    mean(controlUnits.map((unit) => unit.outcomes[t] ?? 0)),
  );
  const preTrendGap =
    Math.abs(slope(preTreatedPath) - slope(preControlPath)) / Math.abs(preTreatedMean);

  const assumptionFlags: string[] = [];
  let status: EstimationResult["status"] = "ok";
  let message: string | null = null;
  if (onset >= 2 && preTrendGap > PRETREND_TOLERANCE) {
    status = "warning";
    assumptionFlags.push("non_parallel_pretrends");
    message =
      "Pre-treatment trends diverge between treated and control units; the parallel-trends assumption is stressed.";
  }

  const comparison = dataset.groundTruth.comparisonEstimand;

  return {
    methodId: METHOD_ID,
    status,
    assumptionFlags,
    message,
    pointEstimate: tauPct,
    confidenceInterval,
    coverage95: confidenceInterval[0] <= comparison && comparison <= confidenceInterval[1],
    perPeriodEstimate: Array.from({ length: nPeriods }, () => tauPct),
    diagnostics: {
      tauLevel,
      preTreatedMean,
      seLevel,
      onset,
      preTrendGap,
    },
    runtimeMs: 0,
  };
};

export const didEstimator: Estimator = {
  id: METHOD_ID,
  displayName: "DiD-TWFE",
  shortDescription:
    "Difference-in-differences with two-way fixed effects; the V0 reference method for the Super Bowl scenario.",
  applicableScenarios: ["super-bowl"],
  nativeEstimand: "ATT (level), mapped to percent of pre-period treated mean",
  estimate: estimateDiD,
};
