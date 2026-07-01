interface RangeSliderProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly displayValue: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly accent?: string;
  readonly emphasis?: boolean;
  readonly disabled?: boolean;
  readonly onChange: (value: number) => void;
}

// A styled native range input — accessible (real <input type="range">, arrow/Page
// keys work for free) with an optional accent color and emphasis treatment.
export const RangeSlider = ({
  id,
  label,
  value,
  displayValue,
  min,
  max,
  step,
  accent = "#3A6EA5",
  emphasis = false,
  disabled = false,
  onChange,
}: RangeSliderProps): JSX.Element => (
  <div
    className={
      emphasis
        ? "rounded-lg border border-lunar-lastTouch/30 bg-lunar-lastTouch/[0.04] px-3 py-3"
        : "px-1"
    }
  >
    <div className="flex items-baseline justify-between gap-3">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-lunar-muted"
      >
        {label}
      </label>
      <span className="font-display text-base font-semibold tabular-nums text-lunar-ink">
        {displayValue}
      </span>
    </div>
    <input
      id={id}
      type="range"
      className="mt-2 block w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      style={{ accentColor: accent }}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={displayValue}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
    />
  </div>
);
