import { pct2, signedPctInt } from "../../lib/hero/format";
import { railStatusLabel } from "../../lib/content/superBowlNarrative";
import type { CiVsTruth, RailLane } from "../../lib/hero/rail";
import { instrumentPalette } from "../../lib/visual/palette";
import { StatusPill } from "./StatusPill";

interface EstimateRailProps {
  readonly tau: number;
  readonly lanes: ReadonlyArray<RailLane>;
  readonly domain: readonly [number, number];
  readonly ticks: ReadonlyArray<number>;
}

interface LaneColors {
  readonly dot: string;
  readonly ci: string;
  readonly band: string;
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

const laneColors = (methodId: string): LaneColors =>
  methodId === "did-twfe"
    ? {
        dot: instrumentPalette.did,
        ci: instrumentPalette.didCiFill,
        band: instrumentPalette.didBandFill,
      }
    : {
        dot: instrumentPalette.lastTouch,
        ci: instrumentPalette.lastTouchCiFill,
        band: instrumentPalette.lastTouchBandFill,
      };

const ciStatusText = (status: CiVsTruth): string => {
  if (status === "covers") {
    return "⟂ CI covers truth";
  }
  if (status === "clears-above" || status === "clears-below") {
    return "⊘ CI clears truth";
  }
  return "";
};

const ariaLabel = (tau: number, lanes: ReadonlyArray<RailLane>): string => {
  const parts = [`Estimate rail. Truth ${pct2(tau)}, fixed anchor.`];
  for (const lane of lanes) {
    parts.push(
      lane.estimate === null
        ? `${lane.label} not applicable.`
        : `${lane.label} ${pct2(lane.estimate)}, status ${railStatusLabel(lane.status)}.`,
    );
  }
  return parts.join(" ");
};

const TrackLane = ({
  lane,
  pct,
}: {
  lane: RailLane;
  pct: (value: number) => number;
}): JSX.Element => {
  const colors = laneColors(lane.methodId);
  const biasGlyph =
    lane.biasPct === null ? "" : lane.biasPct >= 0 ? "▲" : "▼";

  return (
    <div className="relative z-10 mt-3 first:mt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[11px] font-bold uppercase tracking-wide text-lunar-muted">
          {lane.label}
        </span>
        <div className="flex items-center gap-2">
          {lane.biasPct !== null && (
            <span
              className="hidden text-xs font-semibold tabular-nums sm:inline"
              style={{ color: colors.dot }}
            >
              {biasGlyph} {signedPctInt(lane.biasPct)} vs truth
            </span>
          )}
          <span className="hidden text-[11px] font-medium text-lunar-mutedSoft md:inline">
            {ciStatusText(lane.ciStatus)}
          </span>
          <StatusPill status={lane.status} />
        </div>
      </div>

      <div className="relative mt-1.5 h-10">
        {/* lane hairline */}
        <div
          className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
          style={{ backgroundColor: instrumentPalette.border }}
        />

        {lane.estimate === null ? (
          <div className="absolute inset-0 flex items-center">
            <span className="rounded-md border border-lunar-border bg-lunar-page px-2 py-0.5 text-xs font-medium text-lunar-muted">
              Not applicable for this panel
            </span>
          </div>
        ) : (
          <>
            {/* seed stability band */}
            {lane.band && Number.isFinite(lane.band.min) && (
              <div
                className="absolute top-1/2 h-7 -translate-y-1/2 rounded"
                style={{
                  left: `${pct(lane.band.min)}%`,
                  width: `${Math.max(0, pct(lane.band.max) - pct(lane.band.min))}%`,
                  backgroundColor: colors.band,
                }}
                title="seed-to-seed spread"
              />
            )}

            {/* 95% CI */}
            {lane.ci && (
              <>
                <div
                  className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm"
                  style={{
                    left: `${pct(lane.ci[0])}%`,
                    width: `${Math.max(0, pct(lane.ci[1]) - pct(lane.ci[0]))}%`,
                    backgroundColor: colors.ci,
                  }}
                />
                <div
                  className="absolute top-1/2 h-px -translate-y-1/2"
                  style={{
                    left: `${pct(lane.ci[0])}%`,
                    width: `${Math.max(0, pct(lane.ci[1]) - pct(lane.ci[0]))}%`,
                    backgroundColor: colors.dot,
                    opacity: 0.55,
                  }}
                />
                {[lane.ci[0], lane.ci[1]].map((bound, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pct(bound)}%`, backgroundColor: colors.dot, opacity: 0.7 }}
                  />
                ))}
              </>
            )}

            {/* reference ghost (ρ 0.20) */}
            {lane.refEstimate !== null && (
              <div
                className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed bg-lunar-surface"
                style={{ left: `${pct(lane.refEstimate)}%`, borderColor: instrumentPalette.mutedSoft }}
                title={`reference ρ 0.20: ${pct2(lane.refEstimate)}`}
              />
            )}

            {/* estimate dot */}
            <div
              className="absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
              style={{ left: `${pct(lane.estimate)}%`, backgroundColor: colors.dot }}
            />

            {/* floating value, anchored to avoid clipping at the right edge */}
            <FloatingValue value={lane.estimate} pct={pct(lane.estimate)} color={colors.dot} />
          </>
        )}
      </div>

      {/* compact, mobile-only readout (desktop shows it in the header) */}
      {lane.biasPct !== null && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-lunar-mutedSoft sm:hidden">
          <span className="font-semibold tabular-nums" style={{ color: colors.dot }}>
            {biasGlyph} {signedPctInt(lane.biasPct)} vs truth
          </span>
          <span>· {ciStatusText(lane.ciStatus)}</span>
        </div>
      )}
    </div>
  );
};

const FloatingValue = ({
  value,
  pct,
  color,
}: {
  value: number;
  pct: number;
  color: string;
}): JSX.Element => {
  const anchorRight = pct > 60;
  return (
    <div
      className="absolute top-1/2 z-30 whitespace-nowrap"
      style={{
        left: `${pct}%`,
        transform: `translate(${anchorRight ? "-100%" : "0"}, -50%)`,
        paddingLeft: anchorRight ? 0 : 12,
        paddingRight: anchorRight ? 12 : 0,
      }}
    >
      <span className="font-display text-sm font-bold" style={{ color }}>
        {pct2(value)}
      </span>
    </div>
  );
};

export const EstimateRail = ({
  tau,
  lanes,
  domain,
  ticks,
}: EstimateRailProps): JSX.Element => {
  const span = domain[1] - domain[0];
  const pct = (value: number): number =>
    span === 0 ? 0 : clamp(((value - domain[0]) / span) * 100, 0, 100);
  const tauPct = pct(tau);
  const tauLabelPct = clamp(tauPct, 12, 88);

  return (
    <section className="rounded-[10px] border border-lunar-border bg-lunar-surface p-4 shadow-instrument">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xs font-bold tracking-wide text-lunar-mutedSoft">
            FIG.01
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-lunar-muted">
            Truth-calibrated estimate rail
          </span>
        </div>
        <span className="hidden text-[11px] text-lunar-mutedSoft sm:inline">
          lift axis · % of baseline
        </span>
      </div>

      <div role="img" aria-label={ariaLabel(tau, lanes)} className="mt-3">
        <div className="relative">
          {/* tick gridlines */}
          {ticks.map((t) => (
            <div
              key={`grid-${t}`}
              className="absolute bottom-0 top-9 w-px"
              style={{ left: `${pct(t)}%`, backgroundColor: instrumentPalette.grid }}
            />
          ))}

          {/* truth vertical anchor */}
          <div
            className="absolute top-2 bottom-0 z-0 w-0.5"
            style={{ left: `${tauPct}%`, backgroundColor: instrumentPalette.truth }}
          />

          {/* truth pill */}
          <div className="relative h-9">
            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${tauLabelPct}%` }}
            >
              <span className="inline-block whitespace-nowrap rounded-md bg-lunar-ink px-2 py-0.5 font-display text-xs font-bold text-white">
                TRUTH {pct2(tau)}
              </span>
              <span className="mt-0.5 hidden whitespace-nowrap text-[10px] text-lunar-mutedSoft sm:block">
                known counterfactual · invariant
              </span>
            </div>
          </div>

          {lanes.map((lane) => (
            <TrackLane key={lane.methodId} lane={lane} pct={pct} />
          ))}
        </div>

        {/* axis ticks */}
        <div className="relative mt-3 h-4">
          {ticks.map((t) => (
            <span
              key={`tick-${t}`}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-lunar-mutedSoft"
              style={{ left: `${pct(t)}%` }}
            >
              {(t * 100).toFixed(1)}
            </span>
          ))}
        </div>
        <div className="mt-1 text-right text-[10px] text-lunar-mutedSoft">
          estimated lift (% of baseline) →
        </div>
      </div>

      {/* caption */}
      <div className="mt-3 flex flex-col gap-1 border-t border-lunar-border pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-lunar-muted">
          Drag <strong className="font-semibold text-lunar-text">channel correlation</strong>, or
          stress it.
        </span>
        {lanes[0]?.biasPct != null && (
          <span
            className="font-semibold tabular-nums"
            style={{ color: laneColors(lanes[0].methodId).dot }}
          >
            ▲ {lanes[0].label.toLowerCase()} {signedPctInt(lanes[0].biasPct)} vs truth
          </span>
        )}
      </div>

      {/* legend — status is text, not color-only */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-lunar-mutedSoft">
        <span className="font-semibold uppercase tracking-wide">Read</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-0.5" style={{ backgroundColor: instrumentPalette.truth }} />
          truth — fixed
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: instrumentPalette.lastTouch }} />
          estimate — drifts
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-1.5 w-4 rounded-sm" style={{ backgroundColor: instrumentPalette.lastTouchCiFill }} />
          95% CI
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: instrumentPalette.mutedSoft }} />
          ref ρ 0.20
        </span>
      </div>
    </section>
  );
};
