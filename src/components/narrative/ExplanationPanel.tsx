import type { ExplanationPanelProps } from "../../types/ui";
import { methodDisplayNames } from "../../lib/methods";
import { MethodStatusBadge } from "../viz/MethodStatusBadge";

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const ExplanationPanel = ({
  hero,
  params,
  results,
}: ExplanationPanelProps): JSX.Element => {
  const referenceResult = results.find(
    (result) => result.methodId === hero.referenceMethodId,
  );
  const referenceName =
    methodDisplayNames[hero.referenceMethodId] ?? hero.referenceMethodId;

  const sentence =
    hero.narrativeMode === "fails-instructively"
      ? `${referenceName} is the reference method, but its warning status matters: the stressed donor relationship is part of the lesson.`
      : `${referenceName} acts as the reference method here, tracking the known truth while attribution absorbs correlated media activity.`;

  return (
    <section className="rounded-lg border border-lunar-border bg-lunar-surface p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-lunar-text">
            Current Read
          </h2>
          <p className="mt-1 text-sm leading-6 text-lunar-muted">
            Peak weekly lift {formatPercent(params.trueEffect)}, channel
            correlation {formatPercent(params.crossChannelCorrelation)}, noise{" "}
            {params.noiseStd.toFixed(1)}x.
          </p>
        </div>
        {referenceResult ? (
          <MethodStatusBadge status={referenceResult.status} />
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-6 text-lunar-text">{sentence}</p>

      {referenceResult?.message ? (
        <p className="mt-3 rounded-lg border border-lunar-warning/40 bg-lunar-warning/10 px-3 py-2 text-sm leading-6 text-lunar-text">
          {referenceResult.message}
        </p>
      ) : null}
    </section>
  );
};
