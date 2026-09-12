import { useState } from "react";
import { emitLabEvent } from "../../lib/analytics";
import type { EstimandLabUrlState } from "../../lib/estimands/urlState";
import { channelPalette } from "../../lib/visual/palette";
import { RangeSlider } from "../controls/RangeSlider";

interface EstimandControlsProps {
  readonly state: EstimandLabUrlState;
  readonly serializedHash: string;
  readonly onDemandCaptureChange: (value: number) => void;
  readonly onSynergyChange: (value: number) => void;
  readonly onNoiseChange: (value: number) => void;
  readonly onRegenerate: () => void;
  readonly onReset: () => void;
}

export const EstimandControls = ({
  state,
  serializedHash,
  onDemandCaptureChange,
  onSynergyChange,
  onNoiseChange,
  onRegenerate,
  onReset,
}: EstimandControlsProps): JSX.Element => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const copyLink = async (): Promise<void> => {
    try {
      const url = `${window.location.origin}${window.location.pathname}${serializedHash}`;
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      emitLabEvent({
        name: "permalink_copy",
        page: "estimands",
        detail: { question: state.question },
      });
      window.setTimeout(() => setCopyState("idle"), 1_800);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <aside className="border border-lunar-border bg-white p-4 shadow-instrument sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
            Assumption controls
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-lunar-ink">
            Stress the contract
          </h2>
        </div>
        <span className="border border-lunar-border bg-lunar-background px-2 py-1 font-mono text-[10px] text-lunar-muted">
          seed {state.seed}
        </span>
      </div>

      <div className="mt-5 space-y-6">
        <div>
          <RangeSlider
            id="demand-capture"
            label="Demand capture"
            value={state.demandCapture}
            displayValue={state.demandCapture.toFixed(2)}
            min={0}
            max={0.9}
            step={0.01}
            accent={channelPalette.search}
            emphasis={state.demandCapture > 0.55}
            onChange={onDemandCaptureChange}
          />
          <div className="mt-2 flex justify-between px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-lunar-mutedSoft">
            <span>Exogenous reach</span>
            <span>Intent capture</span>
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-lunar-muted">
            Raises Search exposure and spend among high-intent customers without
            changing Search's structural response coefficient.
          </p>
        </div>

        <div>
          <RangeSlider
            id="search-video-synergy"
            label="Search x Video synergy"
            value={state.synergy}
            displayValue={state.synergy.toFixed(2)}
            min={0}
            max={0.8}
            step={0.01}
            accent={channelPalette.video}
            emphasis={state.synergy > 0.55}
            onChange={onSynergyChange}
          />
          <div className="mt-2 flex justify-between px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-lunar-mutedSoft">
            <span>Additive</span>
            <span>Strong interaction</span>
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-lunar-muted">
            Makes channel-off effects overlap. Shapley divides that interaction;
            the direct turn-off contrasts do not.
          </p>
        </div>
      </div>

      <details className="mt-5 border-t border-lunar-border pt-4">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-lunar-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-lunar-primary">
          Calibration
        </summary>
        <div className="mt-4">
          <RangeSlider
            id="outcome-noise"
            label="Outcome noise"
            value={state.noiseStd}
            displayValue={state.noiseStd.toFixed(1)}
            min={0.2}
            max={2}
            step={0.1}
            onChange={onNoiseChange}
          />
        </div>
      </details>

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-lunar-border pt-4">
        <button
          type="button"
          className="border border-lunar-border bg-lunar-background px-3 py-2 text-xs font-semibold text-lunar-text hover:border-lunar-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-lunar-primary"
          onClick={onRegenerate}
        >
          New seed
        </button>
        <button
          type="button"
          className="border border-lunar-border bg-white px-3 py-2 text-xs font-semibold text-lunar-muted hover:border-lunar-primary hover:text-lunar-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-lunar-primary"
          onClick={onReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="col-span-2 border border-lunar-ink bg-lunar-ink px-3 py-2 text-xs font-semibold text-white hover:bg-lunar-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lunar-primary"
          onClick={() => void copyLink()}
        >
          {copyState === "copied"
            ? "Link copied"
            : copyState === "failed"
              ? "Copy failed"
              : "Copy this state"}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copyState === "copied"
            ? "Link copied"
            : copyState === "failed"
              ? "Copy failed"
              : ""}
        </span>
      </div>
    </aside>
  );
};
