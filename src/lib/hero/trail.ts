export interface EstimateTrailSample {
  readonly lastTouch: number | null;
  readonly did: number | null;
}

export const MAX_TRAIL_SAMPLES = 6;
export const TRAIL_CLEAR_MS = 1400;

export const estimateTrailSampleChanged = (
  a: EstimateTrailSample,
  b: EstimateTrailSample,
): boolean => a.lastTouch !== b.lastTouch || a.did !== b.did;

export const appendEstimateTrail = (
  trail: ReadonlyArray<EstimateTrailSample>,
  sample: EstimateTrailSample,
  maxSamples = MAX_TRAIL_SAMPLES,
): ReadonlyArray<EstimateTrailSample> => {
  const last = trail[trail.length - 1];
  if (last && !estimateTrailSampleChanged(last, sample)) {
    return trail;
  }

  return [...trail.slice(-(maxSamples - 1)), sample];
};
