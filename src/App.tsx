import { useMemo } from "react";
import { ControlPanel } from "./components/controls/ControlPanel";
import { ScenarioSelector } from "./components/controls/ScenarioSelector";
import { ExplanationPanel } from "./components/narrative/ExplanationPanel";
import { HeroChart } from "./components/viz/HeroChart";
import { buildScenarioStateFromParams, dgps, getDgp } from "./lib/dgp";
import { chartPalette } from "./lib/visual/palette";
import { useAppStore } from "./state/store";

export const App = (): JSX.Element => {
  const scenarioId = useAppStore((state) => state.scenarioId);
  const params = useAppStore((state) => state.dgpParams);
  const seed = useAppStore((state) => state.seed);
  const setScenario = useAppStore((state) => state.setScenario);
  const setParam = useAppStore((state) => state.setParam);
  const reset = useAppStore((state) => state.reset);

  const dgp = getDgp(scenarioId);
  // TODO(Weekend 1): replace Session 0 stubs with useDataset + useEstimations hooks.
  const stubState = useMemo(
    () => buildScenarioStateFromParams(scenarioId, params, seed),
    [params, scenarioId, seed],
  );
  const naiveResult = stubState.results.find(
    (result) => result.methodId === dgp.hero.naiveMethodId,
  );
  const referenceResult = stubState.results.find(
    (result) => result.methodId === dgp.hero.referenceMethodId,
  );

  if (!naiveResult || !referenceResult) {
    return (
      <main className="min-h-screen bg-lunar-background p-6 text-lunar-text">
        Missing Session 0 estimator state.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-lunar-background px-4 py-5 text-lunar-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-lunar-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-lunar-muted">
              A Measurement Assumption Lab
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-lunar-text md:text-4xl">
              Luneburn
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-lunar-muted md:text-right">
            {stubState.headline}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <HeroChart
            dataset={stubState.dataset}
            groundTruthSeries={stubState.dataset.groundTruth.perPeriodEffect}
            naiveResult={naiveResult}
            referenceResult={referenceResult}
            hero={dgp.hero}
            palette={chartPalette}
          />

          <aside className="flex flex-col gap-5">
            <section className="rounded-lg border border-lunar-border bg-lunar-surface p-4 shadow-panel">
              <ScenarioSelector
                scenarios={dgps}
                activeScenarioId={scenarioId}
                onScenarioChange={setScenario}
              />
            </section>

            <ControlPanel
              paramSchema={dgp.paramSchema}
              params={params}
              primarySliderKey={dgp.hero.primarySliderKey}
              onParamChange={setParam}
              onReset={reset}
            />

            <ExplanationPanel
              scenarioId={scenarioId}
              hero={dgp.hero}
              params={params}
              results={stubState.results}
            />
          </aside>
        </div>
      </div>
    </main>
  );
};
