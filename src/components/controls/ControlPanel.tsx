import type { ControlPanelProps } from "../../types/ui";
import { SliderControl } from "./SliderControl";

export const ControlPanel = ({
  paramSchema,
  params,
  primarySliderKey,
  onParamChange,
  onReset,
}: ControlPanelProps): JSX.Element => (
  <section className="rounded-lg border border-lunar-border bg-lunar-surface p-4 shadow-panel">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-lunar-text">Controls</h2>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-lunar-border px-3 py-2 text-sm font-semibold text-lunar-text hover:border-lunar-primary hover:text-lunar-primary"
      >
        Reset
      </button>
    </div>

    <div className="mt-4 space-y-3">
      {paramSchema.map(([key, field]) => (
        <SliderControl
          key={key}
          id={key}
          field={field}
          value={params[key]}
          isPrimary={key === primarySliderKey}
          onChange={onParamChange}
        />
      ))}
    </div>
  </section>
);
