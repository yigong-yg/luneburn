import { useMemo } from "react";
import type { DGPParams } from "../lib/dgp/types";
import { sweepBand, type SeedBandResult } from "../lib/hero/seedSweep";
import { useDebouncedValue } from "./useDebouncedValue";

export interface SeedBands {
  readonly lastTouch: SeedBandResult;
  readonly did: SeedBandResult;
}

/**
 * The seed stability band for both lanes. Debounced (the sweep is ~100ms) and
 * gated by `enabled` so it never runs per-frame during replay. Returns null when
 * disabled, so the rail simply omits the band.
 */
export const useSeedBand = (
  params: DGPParams,
  enabled: boolean,
): SeedBands | null => {
  const debounced = useDebouncedValue(params, 180);

  return useMemo(() => {
    if (!enabled) {
      return null;
    }
    return {
      lastTouch: sweepBand(debounced, "last-touch"),
      did: sweepBand(debounced, "did-twfe"),
    };
  }, [debounced, enabled]);
};
