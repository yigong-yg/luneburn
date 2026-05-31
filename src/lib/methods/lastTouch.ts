import type { Dataset } from "../dgp/types";
import type { EstimationResult, Estimator } from "./types";

const METHOD_ID = "last-touch";
// The Super Bowl spot is carried on a designated treatment channel (channel 0).
const TREATMENT_CHANNEL = 0;

const HIGH_CORRELATION = 0.5;
const MODERATE_CORRELATION = 0.2;

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

const variance = (xs: ReadonlyArray<number>): number => {
  if (xs.length === 0) {
    return 0;
  }
  const m = mean(xs);
  return mean(xs.map((v) => (v - m) ** 2));
};

const pearson = (xs: ReadonlyArray<number>, ys: ReadonlyArray<number>): number => {
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
  return vx === 0 || vy === 0 ? 0 : cov / Math.sqrt(vx * vy);
};

// Average pairwise spend correlation across channels, over the supplied rows.
// Channel pairs without spend variation are skipped (they cannot be correlated).
const averageChannelCorrelation = (
  spendRows: ReadonlyArray<ReadonlyArray<number>>,
  nChannels: number,
): number => {
  const columns: number[][] = Array.from({ length: nChannels }, () => []);
  for (const row of spendRows) {
    for (let k = 0; k < nChannels; k += 1) {
      columns[k]?.push(row[k] ?? 0);
    }
  }
  const correlations: number[] = [];
  for (let a = 0; a < nChannels; a += 1) {
    for (let b = a + 1; b < nChannels; b += 1) {
      const ca = columns[a] ?? [];
      const cb = columns[b] ?? [];
      if (variance(ca) > 1e-12 && variance(cb) > 1e-12) {
        correlations.push(pearson(ca, cb));
      }
    }
  }
  return correlations.length === 0 ? 0 : mean(correlations);
};

const winningChannel = (spend: ReadonlyArray<number>): number => {
  let best = 0;
  let bestValue = spend[0] ?? Number.NEGATIVE_INFINITY;
  for (let k = 1; k < spend.length; k += 1) {
    const value = spend[k] ?? Number.NEGATIVE_INFINITY;
    if (value > bestValue) {
      bestValue = value;
      best = k;
    }
  }
  return best;
};

/**
 * Last-touch attribution, V0. For each treated unit it credits the per-week
 * incremental outcome (observed minus the unit's pre-campaign baseline) to the
 * treatment channel whenever that channel "wins" the last touch (highest spend
 * that week), then expresses the total as a percent of baseline. The naive
 * pre-period baseline and winner-take-all credit are exactly why it over-counts
 * when channels co-move.
 *
 * Observed data only: outcomes, channelSpend, treatment. Ground truth is used
 * solely for the coverage95 diagnostic.
 */
export const estimateLastTouch = (dataset: Dataset): EstimationResult => {
  const { units, nPeriods, nChannels } = dataset;
  const treatedUnits = units.filter((unit) => unit.treated);

  if (nPeriods < 2) {
    return invalid("Last-touch needs at least two periods.");
  }
  if (treatedUnits.length === 0) {
    return invalid("Last-touch needs at least one treated unit.");
  }

  let onset = Number.POSITIVE_INFINITY;
  for (const unit of treatedUnits) {
    const first = unit.treatment.findIndex((value) => value > 0);
    if (first >= 0 && first < onset) {
      onset = first;
    }
  }
  if (!Number.isFinite(onset) || onset <= 0) {
    return invalid("Last-touch needs a pre-campaign period to form a baseline.");
  }
  if (onset >= nPeriods) {
    return invalid("Last-touch needs a post-campaign period.");
  }

  const postLength = nPeriods - onset;

  // Treatment-channel spend during the campaign window must exist to attribute to.
  let treatmentChannelSpend = 0;
  const postSpendRows: number[][] = [];
  for (const unit of treatedUnits) {
    for (let t = onset; t < nPeriods; t += 1) {
      const row = unit.channelSpend[t] ?? [];
      postSpendRows.push(Array.from({ length: nChannels }, (_unused, k) => row[k] ?? 0));
      treatmentChannelSpend += row[TREATMENT_CHANNEL] ?? 0;
    }
  }
  if (treatmentChannelSpend <= 1e-9) {
    return invalid("Last-touch is not applicable: the treatment channel had no spend during the campaign.");
  }

  // Per-unit attributed lift = credited incremental outcome / baseline.
  const perUnitLift: number[] = [];
  for (const unit of treatedUnits) {
    const baseline = mean(
      Array.from({ length: onset }, (_unused, t) => unit.outcomes[t] ?? 0),
    );
    if (Math.abs(baseline) < 1e-9) {
      continue;
    }
    let credited = 0;
    for (let t = onset; t < nPeriods; t += 1) {
      const spend = unit.channelSpend[t] ?? [];
      if (winningChannel(spend) === TREATMENT_CHANNEL) {
        credited += (unit.outcomes[t] ?? 0) - baseline;
      }
    }
    perUnitLift.push(credited / (baseline * postLength));
  }

  if (perUnitLift.length === 0) {
    return invalid("Last-touch cannot normalize a near-zero baseline.");
  }

  const pointEstimate = mean(perUnitLift);
  const se =
    perUnitLift.length > 1
      ? Math.sqrt(variance(perUnitLift) * (perUnitLift.length / (perUnitLift.length - 1))) /
        Math.sqrt(perUnitLift.length)
      : 0;
  const confidenceInterval: [number, number] = [
    pointEstimate - 1.96 * se,
    pointEstimate + 1.96 * se,
  ];

  const correlation = averageChannelCorrelation(postSpendRows, nChannels);
  const assumptionFlags: string[] = [];
  let status: EstimationResult["status"] = "ok";
  let message: string | null = null;
  if (correlation >= HIGH_CORRELATION) {
    status = "warning";
    assumptionFlags.push("high_channel_correlation");
    message = "Channels are strongly correlated; last-touch is absorbing co-moving channel activity.";
  } else if (correlation >= MODERATE_CORRELATION) {
    status = "warning";
    assumptionFlags.push("moderate_channel_correlation");
    message = "Channels are moderately correlated; last-touch attribution is becoming unreliable.";
  }

  const comparison = dataset.groundTruth.comparisonEstimand;

  return {
    methodId: METHOD_ID,
    status,
    assumptionFlags,
    message,
    pointEstimate,
    confidenceInterval,
    coverage95: confidenceInterval[0] <= comparison && comparison <= confidenceInterval[1],
    perPeriodEstimate: Array.from({ length: nPeriods }, () => pointEstimate),
    diagnostics: {
      channelCorrelation: correlation,
      treatmentChannel: TREATMENT_CHANNEL,
      onset,
    },
    runtimeMs: 0,
  };
};

export const lastTouchEstimator: Estimator = {
  id: METHOD_ID,
  displayName: "Last-touch",
  shortDescription:
    "Last-touch attribution; the V0 naive baseline that over-attributes when channels co-move.",
  applicableScenarios: ["super-bowl"],
  nativeEstimand: "Channel-attributed incremental outcome, mapped to percent of baseline",
  estimate: estimateLastTouch,
};
