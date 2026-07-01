import { superBowlDefaults } from "../dgp/superBowl";

// Replay drives channel correlation from the reference state (where last-touch
// happens to land on truth) up to the stressed showcase, so the reader watches
// the estimate drift while truth stays pinned. Pure math here; the rAF loop that
// commits values to the store lives in useReplay.

export const REFERENCE_CORRELATION = 0.2;
export const SHOWCASE_CORRELATION = superBowlDefaults.crossChannelCorrelation;
export const REPLAY_MS = 1100;

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Smootherstep-ish ease: symmetric, zero-velocity at both ends. */
export const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};

/** Channel correlation at animation progress `t01` ∈ [0,1]. */
export const replayValue = (
  t01: number,
  from: number = REFERENCE_CORRELATION,
  to: number = SHOWCASE_CORRELATION,
): number => from + (to - from) * easeInOut(t01);
