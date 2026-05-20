import type { DGPParams, ParamSchemaField } from "../../lib/dgp/types";

interface SliderControlProps {
  readonly id: keyof DGPParams;
  readonly field: ParamSchemaField;
  readonly value: number;
  readonly isPrimary: boolean;
  readonly onChange: (key: keyof DGPParams, value: number) => void;
}

export const SliderControl = ({
  id,
  field,
  value,
  isPrimary,
  onChange,
}: SliderControlProps): JSX.Element => {
  const displayValue = field.format?.(value) ?? String(value);

  return (
    <label
      className={`block rounded-lg border px-3 py-3 ${
        isPrimary
          ? "border-lunar-primary bg-lunar-primary/5"
          : "border-lunar-border bg-lunar-surface"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-lunar-text">
          {field.label}
        </span>
        <span className="min-w-12 text-right text-sm tabular-nums text-lunar-muted">
          {displayValue}
        </span>
      </span>
      <input
        className="mt-3 block w-full"
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        aria-label={field.label}
        onChange={(event) => onChange(id, Number(event.currentTarget.value))}
      />
    </label>
  );
};
