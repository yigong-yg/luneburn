import { useCallback, useEffect, useRef, useState } from "react";
import type { DGPParams } from "../lib/dgp/types";
import {
  REFERENCE_CORRELATION,
  REPLAY_MS,
  replayValue,
  SHOWCASE_CORRELATION,
} from "../lib/hero/replay";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface ReplayController {
  readonly isReplaying: boolean;
  readonly replay: () => void;
  readonly toReference: () => void;
}

/**
 * Drives channel correlation from the reference state up to the stressed showcase
 * on a rAF tween. It mutates the real store param each frame (so the slider and
 * every derived estimate move for real — not an overlay) and lands exactly on the
 * showcase value. Honors prefers-reduced-motion by jumping without a tween.
 */
export const useReplay = (
  setParam: (key: keyof DGPParams, value: number) => void,
): ReplayController => {
  const [isReplaying, setIsReplaying] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const cancel = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const toReference = useCallback(() => {
    cancel();
    setIsReplaying(false);
    setParam("crossChannelCorrelation", REFERENCE_CORRELATION);
  }, [cancel, setParam]);

  const replay = useCallback(() => {
    cancel();
    if (prefersReducedMotion()) {
      setParam("crossChannelCorrelation", REFERENCE_CORRELATION);
      setParam("crossChannelCorrelation", SHOWCASE_CORRELATION);
      return;
    }
    setIsReplaying(true);
    setParam("crossChannelCorrelation", REFERENCE_CORRELATION);
    startRef.current = performance.now();

    const tick = (now: number): void => {
      const t = Math.min(1, (now - startRef.current) / REPLAY_MS);
      setParam("crossChannelCorrelation", Number(replayValue(t).toFixed(4)));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      frameRef.current = null;
      setParam("crossChannelCorrelation", SHOWCASE_CORRELATION);
      setIsReplaying(false);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [cancel, setParam]);

  return { isReplaying, replay, toReference };
};
