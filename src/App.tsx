import { AssumptionStressPanel } from "./components/controls/AssumptionStressPanel";
import { Header } from "./components/layout/Header";
import { CurrentRead } from "./components/narrative/CurrentRead";
import { MethodCard } from "./components/narrative/MethodCard";
import { MethodologyProofStrip } from "./components/narrative/MethodologyProofStrip";
import { AxisProblemPanel } from "./components/viz/AxisProblemPanel";
import { EstimateRail } from "./components/viz/EstimateRail";
import { StatusPill } from "./components/viz/StatusPill";
import { getDgp } from "./lib/dgp";
import { methodReadsAs } from "./lib/content/superBowlNarrative";
import { pct2, pct2Range, signedPctInt } from "./lib/hero/format";
import {
  biasVsTruth,
  buildLane,
  type CiVsTruth,
  niceRailDomain,
  railTicks,
} from "./lib/hero/rail";
import { estimatorById } from "./lib/methods";
import type { EstimationResult } from "./lib/methods/types";
import { instrumentPalette } from "./lib/visual/palette";
import { useDataset } from "./hooks/useDataset";
import { useEstimations } from "./hooks/useEstimations";
import { useReferenceEstimations } from "./hooks/useReferenceEstimations";
import { useReplay } from "./hooks/useReplay";
import { useSeedBand } from "./hooks/useSeedBand";
import { useAppStore } from "./state/store";

const SCENARIO_ID = "super-bowl";

const nativeEstimand = (methodId: string): string =>
  estimatorById.get(methodId)?.nativeEstimand ?? "";

const ciRelation = (status: CiVsTruth): string =>
  status === "covers" ? "covers truth" : "clears truth";

const biasLabel = (result: EstimationResult, tau: number): string | null =>
  result.pointEstimate === null
    ? null
    : `${signedPctInt(biasVsTruth(result.pointEstimate, tau))} vs truth`;

export const App = (): JSX.Element => {
  const params = useAppStore((state) => state.dgpParams);
  const seed = useAppStore((state) => state.seed);
  const setParam = useAppStore((state) => state.setParam);
  const reset = useAppStore((state) => state.reset);

  const dgp = getDgp(SCENARIO_ID);
  const dataset = useDataset(SCENARIO_ID, params, seed);
  const { results } = useEstimations(SCENARIO_ID, dataset, params);
  const reference = useReferenceEstimations(params, seed);
  const { isReplaying, replay, toReference } = useReplay(setParam);
  const seedBands = useSeedBand(params, !isReplaying);

  const lastTouch = results.find((r) => r.methodId === "last-touch");
  const did = results.find((r) => r.methodId === "did-twfe");
  const tau = dataset.groundTruth.comparisonEstimand;

  if (!lastTouch || !did) {
    return (
      <main className="min-h-screen bg-lunar-page p-6 text-lunar-text">
        Missing Super Bowl estimator state.
      </main>
    );
  }

  const lastTouchLane = buildLane({
    methodId: "last-touch",
    label: "Last-touch",
    result: lastTouch,
    tau,
    refEstimate: reference.lastTouch.pointEstimate,
    band: seedBands
      ? { min: seedBands.lastTouch.min, max: seedBands.lastTouch.max }
      : null,
  });
  const didLane = buildLane({
    methodId: "did-twfe",
    label: "DiD-TWFE",
    result: did,
    tau,
    refEstimate: reference.did.pointEstimate,
    band: seedBands ? { min: seedBands.did.min, max: seedBands.did.max } : null,
  });
  const lanes = [lastTouchLane, didLane];

  const domainValues = [tau];
  for (const lane of lanes) {
    if (lane.estimate !== null) {
      domainValues.push(lane.estimate);
    }
    if (lane.ci) {
      domainValues.push(lane.ci[0], lane.ci[1]);
    }
    if (lane.refEstimate !== null) {
      domainValues.push(lane.refEstimate);
    }
    if (lane.band && Number.isFinite(lane.band.max)) {
      domainValues.push(lane.band.min, lane.band.max);
    }
  }
  const domain = niceRailDomain(domainValues);
  const ticks = railTicks(domain[1]);

  const truthBadge = (
    <span className="inline-flex items-center gap-1 rounded-md border border-lunar-ink/20 bg-lunar-ink/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-lunar-ink">
      <span aria-hidden="true">◈</span>
      Ground truth
    </span>
  );

  const methodRows = (
    result: EstimationResult,
    lane: typeof lastTouchLane,
  ): { label: string; value: string }[] => {
    const rows: { label: string; value: string }[] = [];
    if (result.confidenceInterval) {
      rows.push({
        label: "95% CI",
        value: `${pct2Range(result.confidenceInterval)} · ${ciRelation(lane.ciStatus)}`,
      });
    }
    rows.push({ label: "Assumption", value: nativeEstimand(result.methodId) });
    rows.push({ label: "Reads as", value: methodReadsAs(result.methodId) });
    return rows;
  };

  return (
    <main className="min-h-screen bg-lunar-page text-lunar-text">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Header seed={seed} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <EstimateRail tau={tau} lanes={lanes} domain={domain} ticks={ticks} />
          <AssumptionStressPanel
            paramSchema={dgp.paramSchema}
            params={params}
            isReplaying={isReplaying}
            onParamChange={setParam}
            onReset={reset}
            onReplay={replay}
            onToReference={toReference}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CurrentRead
            rho={params.crossChannelCorrelation}
            tau={tau}
            lastTouch={lastTouch}
            did={did}
          />
          <AxisProblemPanel
            perPeriodEffect={dataset.groundTruth.perPeriodEffect}
            tau={tau}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MethodCard
            name="Synthetic truth"
            badge={truthBadge}
            value={pct2(tau)}
            accentColor={instrumentPalette.truth}
            note="τ_comp = mean post-period weekly lift. Recomputed from the same seed with the spot removed — invariant to correlation, noise and seed."
          />
          <MethodCard
            name="Last-touch"
            badge={<StatusPill status={lastTouch.status} />}
            value={lastTouch.pointEstimate === null ? "—" : pct2(lastTouch.pointEstimate)}
            accentColor={instrumentPalette.lastTouch}
            bias={biasLabel(lastTouch, tau)}
            rows={methodRows(lastTouch, lastTouchLane)}
          />
          <MethodCard
            name="DiD-TWFE"
            badge={<StatusPill status={did.status} />}
            value={did.pointEstimate === null ? "—" : pct2(did.pointEstimate)}
            accentColor={instrumentPalette.did}
            bias={biasLabel(did, tau)}
            rows={methodRows(did, didLane)}
          />
        </div>

        <MethodologyProofStrip
          sweep={
            seedBands
              ? {
                  aboveTruth: seedBands.lastTouch.aboveTruth,
                  total: seedBands.lastTouch.total,
                }
              : null
          }
        />
      </div>
    </main>
  );
};
