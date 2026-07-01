import type { EstimationStatus } from "../../lib/methods/types";
import { railStatusLabel } from "../../lib/content/superBowlNarrative";

interface StatusPillProps {
  readonly status: EstimationStatus;
  readonly className?: string;
}

// Status is never color-only: each pill carries a glyph + an uppercase word.
const GLYPH: Readonly<Record<EstimationStatus, string>> = {
  ok: "●",
  warning: "▲",
  invalid: "⊘",
};

const CLASSES: Readonly<Record<EstimationStatus, string>> = {
  ok: "border-lunar-didAccent/40 bg-lunar-didAccent/10 text-lunar-didAccent",
  warning:
    "border-lunar-lastTouchAccent/50 bg-lunar-lastTouchAccent/10 text-lunar-lastTouchAccent",
  invalid: "border-lunar-muted/40 bg-lunar-muted/10 text-lunar-muted",
};

export const StatusPill = ({ status, className = "" }: StatusPillProps): JSX.Element => (
  <span
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${CLASSES[status]} ${className}`}
  >
    <span aria-hidden="true">{GLYPH[status]}</span>
    {railStatusLabel(status)}
  </span>
);
