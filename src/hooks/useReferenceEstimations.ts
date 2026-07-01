import { useMemo } from "react";
import { generateSuperBowl } from "../lib/dgp/superBowl";
import type { DGPParams } from "../lib/dgp/types";
import { REFERENCE_CORRELATION } from "../lib/hero/replay";
import { estimateDiD } from "../lib/methods/did";
import { estimateLastTouch } from "../lib/methods/lastTouch";
import type { EstimationResult } from "../lib/methods/types";

export interface ReferenceEstimations {
  readonly lastTouch: EstimationResult;
  readonly did: EstimationResult;
}

/**
 * The reference state (ρ = 0.20, where last-touch happens to land on truth).
 * Drives the rail's faint "ref ρ.20" ghosts. Real DGP + estimators; never reads
 * ground truth to estimate.
 */
export const useReferenceEstimations = (
  params: DGPParams,
  seed: number,
): ReferenceEstimations =>
  useMemo(() => {
    const dataset = generateSuperBowl(
      { ...params, crossChannelCorrelation: REFERENCE_CORRELATION },
      seed,
    );
    return { lastTouch: estimateLastTouch(dataset), did: estimateDiD(dataset) };
  }, [params, seed]);
