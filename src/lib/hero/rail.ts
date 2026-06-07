import type { EstimationResult, EstimationStatus } from "../methods/types";

// Geometry + truth-relative semantics for the FIG.01 estimate rail. Pure, so the
// rail component stays declarative and these rules stay unit-tested.

export type CiVsTruth = "covers" | "clears-above" | "clears-below" | "unknown";

/** Gap between an estimate and truth, as a fraction of truth (e.g. 0.82 = +82%). */
export const biasVsTruth = (estimate: number, tau: number): number =>
  tau === 0 ? 0 : (estimate - tau) / tau;

/** Where a 95% CI sits relative to truth — the rail's honesty label. */
export const ciVsTruth = (
  ci: readonly [number, number] | null,
  tau: number,
): CiVsTruth => {
  if (!ci) {
    return "unknown";
  }
  if (ci[0] <= tau && tau <= ci[1]) {
    return "covers";
  }
  return ci[0] > tau ? "clears-above" : "clears-below";
};

const TICK_STEPS: ReadonlyArray<number> = [
  0.0025, 0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.2,
];

const niceStep = (rawStep: number): number =>
  TICK_STEPS.find((step) => step >= rawStep) ?? 0.2;

/**
 * Rail x-domain [0, upper] covering every shown value with a little headroom,
 * rounded up to a nice tick step. `minUpper` keeps the default showcase on the
 * 0–3% axis the design uses even before the seed band is computed.
 */
export const niceRailDomain = (
  values: ReadonlyArray<number>,
  minUpper = 0.03,
): [number, number] => {
  const finite = values.filter((v) => Number.isFinite(v));
  const rawMax = Math.max(minUpper, ...(finite.length > 0 ? finite : [minUpper]));
  const step = niceStep(rawMax / 6);
  const upper = Math.ceil((rawMax - 1e-12) / step) * step;
  return [0, Number(upper.toFixed(6))];
};

/** Evenly spaced "nice" tick values across [0, upper]; ~6 ticks. */
export const railTicks = (upper: number, target = 6): number[] => {
  if (upper <= 0) {
    return [0];
  }
  const step = niceStep(upper / target);
  const ticks: number[] = [];
  for (let v = 0; v <= upper + step * 1e-6; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
};

export const scaleLinear =
  (domain: readonly [number, number], range: readonly [number, number]) =>
  (value: number): number => {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    if (d1 === d0) {
      return r0;
    }
    return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  };

export interface SeedBand {
  readonly min: number;
  readonly max: number;
}

export interface RailLane {
  readonly methodId: string;
  readonly label: string;
  readonly status: EstimationStatus;
  readonly estimate: number | null;
  readonly biasPct: number | null;
  readonly ci: readonly [number, number] | null;
  readonly ciStatus: CiVsTruth;
  readonly refEstimate: number | null;
  readonly band: SeedBand | null;
}

export interface BuildLaneInput {
  readonly methodId: string;
  readonly label: string;
  readonly result: EstimationResult;
  readonly tau: number;
  readonly refEstimate?: number | null;
  readonly band?: SeedBand | null;
}

/** Compose a lane from a real estimator result; never fabricates numbers. */
export const buildLane = ({
  methodId,
  label,
  result,
  tau,
  refEstimate = null,
  band = null,
}: BuildLaneInput): RailLane => ({
  methodId,
  label,
  status: result.status,
  estimate: result.pointEstimate,
  biasPct:
    result.pointEstimate === null ? null : biasVsTruth(result.pointEstimate, tau),
  ci: result.confidenceInterval,
  ciStatus: ciVsTruth(result.confidenceInterval, tau),
  refEstimate,
  band: result.pointEstimate === null ? null : band,
});
