import type { DGP } from "../../lib/dgp/types";

interface ScenarioSelectorProps {
  readonly scenarios: ReadonlyArray<DGP>;
  readonly activeScenarioId: string;
  readonly onScenarioChange: (id: string) => void;
}

export const ScenarioSelector = ({
  scenarios,
  activeScenarioId,
  onScenarioChange,
}: ScenarioSelectorProps): JSX.Element => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-lunar-muted">
      Scenario
    </p>
    <div className="grid grid-cols-2 rounded-lg border border-lunar-border bg-lunar-background p-1">
      {scenarios.map((scenario) => {
        const isActive = scenario.id === activeScenarioId;

        return (
          <button
            key={scenario.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onScenarioChange(scenario.id)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-lunar-surface text-lunar-text shadow-sm"
                : "text-lunar-muted hover:text-lunar-text"
            }`}
          >
            {scenario.displayName}
          </button>
        );
      })}
    </div>
  </div>
);
