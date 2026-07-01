import { useState } from "react";
import type { DGPParams } from "../../lib/dgp/types";
import { RangeSlider } from "./RangeSlider";

export interface CalibrationItem {
  readonly key: keyof DGPParams;
  readonly label: string;
  readonly value: number;
  readonly displayValue: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

interface CalibrationPanelProps {
  readonly items: ReadonlyArray<CalibrationItem>;
  readonly disabled: boolean;
  readonly onParamChange: (key: keyof DGPParams, value: number) => void;
  readonly onResetAll: () => void;
}

// Secondary calibration. These sliders are genuinely wired to the real DGP (peak
// weekly lift moves truth; outcome noise moves the CIs) but they must not compete
// with channel correlation, so they live behind a collapsed, de-emphasized toggle.
export const CalibrationPanel = ({
  items,
  disabled,
  onParamChange,
  onResetAll,
}: CalibrationPanelProps): JSX.Element => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-lunar-border pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
          Calibration · secondary
        </span>
        <span className="text-xs font-semibold text-lunar-muted">
          {open ? "− hide" : "+ adjust"}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {items.map((item) => (
            <RangeSlider
              key={String(item.key)}
              id={String(item.key)}
              label={item.label}
              value={item.value}
              displayValue={item.displayValue}
              min={item.min}
              max={item.max}
              step={item.step}
              disabled={disabled}
              onChange={(value) => onParamChange(item.key, value)}
            />
          ))}
          <button
            type="button"
            onClick={onResetAll}
            className="self-start rounded-md border border-lunar-border px-3 py-1.5 text-xs font-semibold text-lunar-text hover:border-lunar-primary hover:text-lunar-primary"
          >
            reset all
          </button>
        </div>
      )}
    </div>
  );
};
