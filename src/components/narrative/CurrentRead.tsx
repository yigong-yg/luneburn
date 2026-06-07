import { currentReadSegments } from "../../lib/content/superBowlNarrative";
import type { EstimationResult } from "../../lib/methods/types";

interface CurrentReadProps {
  readonly rho: number;
  readonly tau: number;
  readonly lastTouch: EstimationResult;
  readonly did: EstimationResult;
}

export const CurrentRead = ({
  rho,
  tau,
  lastTouch,
  did,
}: CurrentReadProps): JSX.Element => {
  const segments = currentReadSegments({ rho, tau, lt: lastTouch, did });

  return (
    <section className="rounded-[10px] border border-lunar-border bg-lunar-surface p-5 shadow-instrument">
      <p className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
        Current read
      </p>
      <p
        aria-live="polite"
        className="mt-3 text-lg leading-relaxed text-lunar-text sm:text-xl"
      >
        {segments.map((segment, index) =>
          segment.bold ? (
            <strong
              key={index}
              className="font-display font-semibold text-lunar-ink"
            >
              {segment.text}
            </strong>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>
    </section>
  );
};
