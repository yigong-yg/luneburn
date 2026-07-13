import { useEffect, useRef, useState } from "react";
import {
  appendEstimateTrail,
  estimateTrailSampleChanged,
  TRAIL_CLEAR_MS,
  type EstimateTrailSample,
} from "../lib/hero/trail";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useEstimateTrail = (
  sample: EstimateTrailSample,
): ReadonlyArray<EstimateTrailSample> => {
  const [trail, setTrail] = useState<ReadonlyArray<EstimateTrailSample>>([]);
  const previousRef = useRef<EstimateTrailSample | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = sample;

    if (!previous || !estimateTrailSampleChanged(previous, sample)) {
      return;
    }

    if (prefersReducedMotion()) {
      setTrail([]);
      return;
    }

    setTrail((current) => appendEstimateTrail(current, previous));

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setTrail([]);
      timeoutRef.current = null;
    }, TRAIL_CLEAR_MS);
  }, [sample]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return trail;
};
