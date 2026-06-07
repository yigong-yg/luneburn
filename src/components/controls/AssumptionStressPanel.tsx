import type { DGPParams, ParamSchema, ParamSchemaField } from "../../lib/dgp/types";
import { rho2 } from "../../lib/hero/format";
import { REFERENCE_CORRELATION } from "../../lib/hero/replay";
import { instrumentPalette } from "../../lib/visual/palette";
import { CalibrationPanel, type CalibrationItem } from "./CalibrationPanel";
import { RangeSlider } from "./RangeSlider";

const CORRELATION_KEY: keyof DGPParams = "crossChannelCorrelation";

interface AssumptionStressPanelProps {
  readonly paramSchema: ParamSchema;
  readonly params: DGPParams;
  readonly isReplaying: boolean;
  readonly onParamChange: (key: keyof DGPParams, value: number) => void;
  readonly onReset: () => void;
  readonly onReplay: () => void;
  readonly onToReference: () => void;
}

const paramDisplay = (
  key: keyof DGPParams,
  value: number,
  field: ParamSchemaField,
): string => {
  if (key === CORRELATION_KEY) {
    return rho2(value);
  }
  if (key === "noiseStd") {
    return `${value.toFixed(1)}×`;
  }
  return field.format ? field.format(value) : String(value);
};

export const AssumptionStressPanel = ({
  paramSchema,
  params,
  isReplaying,
  onParamChange,
  onReset,
  onReplay,
  onToReference,
}: AssumptionStressPanelProps): JSX.Element | null => {
  const correlationEntry = paramSchema.find(([key]) => key === CORRELATION_KEY);
  if (!correlationEntry) {
    return null;
  }
  const [, correlationField] = correlationEntry;
  const correlationValue = params[CORRELATION_KEY];
  const refPct =
    ((REFERENCE_CORRELATION - correlationField.min) /
      (correlationField.max - correlationField.min)) *
    100;

  const calibrationItems: CalibrationItem[] = paramSchema
    .filter(([key]) => key !== CORRELATION_KEY)
    .map(([key, field]) => ({
      key,
      label: field.label,
      value: params[key],
      displayValue: paramDisplay(key, params[key], field),
      min: field.min,
      max: field.max,
      step: field.step,
    }));

  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-lunar-border bg-lunar-surface p-4 shadow-instrument">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
          Assumption stress
        </p>
        <button
          type="button"
          onClick={onToReference}
          disabled={isReplaying}
          className="rounded-md border border-lunar-border px-2.5 py-1 text-xs font-semibold text-lunar-text hover:border-lunar-primary hover:text-lunar-primary disabled:opacity-50"
        >
          ρ → ref
        </button>
      </div>

      <div>
        <RangeSlider
          id={CORRELATION_KEY}
          label="Channel correlation"
          value={correlationValue}
          displayValue={rho2(correlationValue)}
          min={correlationField.min}
          max={correlationField.max}
          step={correlationField.step}
          accent={instrumentPalette.lastTouch}
          emphasis
          disabled={isReplaying}
          onChange={(value) => onParamChange(CORRELATION_KEY, value)}
        />
        <div className="relative mt-2 h-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-lunar-mutedSoft">
          <span className="absolute left-3">valid</span>
          <span
            className="absolute -translate-x-1/2 text-lunar-muted"
            style={{ left: `${refPct}%` }}
          >
            <span aria-hidden="true" className="mr-1 text-lunar-border">
              |
            </span>
            ref
          </span>
          <span className="absolute right-3">stress →</span>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onReplay}
          disabled={isReplaying}
          aria-busy={isReplaying}
          aria-label="Replay the drift from the reference state"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-lunar-ink px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-lunar-text disabled:opacity-70"
        >
          {isReplaying ? (
            "Replaying drift…"
          ) : (
            <>
              <span aria-hidden="true">↺</span>
              Replay drift from reference
            </>
          )}
        </button>
        <p className="mt-2 text-xs leading-relaxed text-lunar-muted">
          Replays the drift from the reference (ρ 0.20, where last-touch happens to
          sit on truth) up to the stressed showcase.
        </p>
      </div>

      <CalibrationPanel
        items={calibrationItems}
        disabled={isReplaying}
        onParamChange={onParamChange}
        onResetAll={onReset}
      />
    </section>
  );
};
