import { useState } from "react";
import { emitLabEvent } from "../../lib/analytics";
import type { EstimandQuestion } from "../../lib/estimands/ledger";

const answers: ReadonlyArray<{
  readonly id: EstimandQuestion;
  readonly label: string;
  readonly method: string;
}> = [
  { id: "credit", label: "Recorded path credit", method: "Markov MTA" },
  {
    id: "channel-off",
    label: "Channel-off incrementality",
    method: "MMM / experiment",
  },
  {
    id: "joint-allocation",
    label: "Allocated share of joint lift",
    method: "Causal Shapley",
  },
];

export const DecisionCheck = (): JSX.Element => {
  const [answer, setAnswer] = useState<EstimandQuestion | null>(null);
  const correct = answer === "channel-off";

  const choose = (next: EstimandQuestion): void => {
    setAnswer(next);
    emitLabEvent({
      name: "decision_check_answered",
      page: "estimands",
      detail: { answer: next, correct: next === "channel-off" },
    });
  };

  return (
    <section className="grid gap-6 border-y border-lunar-border py-7 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
          Decision check
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-lunar-ink">
          The team may pause Paid Search next week. Which number belongs in the
          decision memo?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-lunar-muted">
          Choose the estimand before debating model quality.
        </p>
      </div>

      <div>
        <div className="grid gap-2 sm:grid-cols-3">
          {answers.map((candidate) => {
            const selected = answer === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={selected}
                className={`min-h-[92px] border px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-lunar-primary ${
                  selected
                    ? "border-lunar-primary bg-white"
                    : "border-lunar-border bg-lunar-background hover:border-lunar-primary"
                }`}
                onClick={() => choose(candidate.id)}
              >
                <span className="block text-xs font-bold leading-tight text-lunar-ink">
                  {candidate.label}
                </span>
                <span className="mt-2 block text-[10px] uppercase tracking-[0.08em] text-lunar-muted">
                  {candidate.method}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 min-h-[56px]" aria-live="polite">
          {answer && (
            <p
              className={`border-l-2 px-3 py-2 text-xs leading-relaxed ${
                correct
                  ? "border-[#2E7D58] bg-[#2E7D58]/5 text-lunar-text"
                  : "border-lunar-warning bg-lunar-warning/5 text-lunar-text"
              }`}
            >
              {correct
                ? "Decision-aligned. Turning Search off is an intervention, so the memo needs a channel-off causal contrast and its uncertainty."
                : answer === "credit"
                  ? "Path credit describes recorded journeys under the current exposure process; pausing Search changes that process, so that credit share cannot forecast the intervention."
                  : "Shapley divides the joint total under an allocation convention; it is not the marginal effect of turning one channel off."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
