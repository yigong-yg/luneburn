import { pct2, pctInt } from "../../lib/hero/format";
import { instrumentPalette } from "../../lib/visual/palette";

interface AxisProblemPanelProps {
  readonly perPeriodEffect: ReadonlyArray<number>;
  readonly tau: number;
  readonly treatmentIndex?: number;
}

const W = 360;
const H = 150;
const PAD_L = 26;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

export const AxisProblemPanel = ({
  perPeriodEffect,
  tau,
  treatmentIndex = 26,
}: AxisProblemPanelProps): JSX.Element => {
  const n = Math.max(perPeriodEffect.length, 2);
  const peak = Math.max(0, ...perPeriodEffect);
  const yMax = Math.max(0.2, Math.ceil((peak * 1.05) / 0.05) * 0.05);

  const x = (i: number): number => PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number): number =>
    H - PAD_B - (v / yMax) * (H - PAD_T - PAD_B);

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += 0.05) {
    yTicks.push(Number(v.toFixed(2)));
  }

  const line = perPeriodEffect
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <section className="rounded-[10px] border border-lunar-border bg-lunar-surface p-4 shadow-instrument">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xs font-bold tracking-wide text-lunar-mutedSoft">
          FIG.02
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-lunar-muted">
          The axis problem
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="mt-3 h-auto"
        role="img"
        aria-label={`Per-week lift spikes to ${pctInt(peak)} at the Super Bowl week, then decays. Averaged over the post period it is the ${pct2(tau)} estimand — far below the spike.`}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(t)}
              y2={y(t)}
              stroke={instrumentPalette.grid}
              strokeWidth={1}
            />
            <text
              x={PAD_L - 4}
              y={y(t) + 3}
              textAnchor="end"
              fontSize={9}
              fill={instrumentPalette.mutedSoft}
            >
              {Math.round(t * 100)}
            </text>
          </g>
        ))}

        {/* τ_comp average line — the tiny number the spike collapses into. */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={y(tau)}
          y2={y(tau)}
          stroke={instrumentPalette.truth}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.7}
        />
        <text
          x={W - PAD_R}
          y={y(tau) - 4}
          textAnchor="end"
          fontSize={9.5}
          fontWeight={600}
          fill={instrumentPalette.truth}
        >
          τ_comp {pct2(tau)}
        </text>

        {/* The per-week effect: flat, then one sharp spike that decays. */}
        <polyline
          points={line}
          fill="none"
          stroke={instrumentPalette.truth}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <text
          x={x(treatmentIndex) + 4}
          y={y(peak) + 2}
          fontSize={9.5}
          fontWeight={600}
          fill={instrumentPalette.lastTouch}
        >
          {pctInt(peak)} peak · 1 week
        </text>

        {/* x ticks */}
        <text x={x(0)} y={H - 6} textAnchor="start" fontSize={9} fill={instrumentPalette.mutedSoft}>
          w1
        </text>
        <text x={x(treatmentIndex)} y={H - 6} textAnchor="middle" fontSize={9} fill={instrumentPalette.mutedSoft}>
          w26
        </text>
        <text x={x(n - 1)} y={H - 6} textAnchor="end" fontSize={9} fill={instrumentPalette.mutedSoft}>
          w52
        </text>
      </svg>

      <p className="mt-3 text-sm leading-relaxed text-lunar-muted">
        One {pctInt(peak)} week, averaged over 26 post weeks, is the {pct2(tau)}{" "}
        estimand. On this axis the methods collapse onto one band — which is why the
        rail magnifies it.
      </p>
    </section>
  );
};
