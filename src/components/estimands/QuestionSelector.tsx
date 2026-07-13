import type { EstimandQuestion } from "../../lib/estimands/ledger";

interface QuestionSelectorProps {
  readonly value: EstimandQuestion;
  readonly onChange: (question: EstimandQuestion) => void;
}

const questions: ReadonlyArray<{
  readonly id: EstimandQuestion;
  readonly number: string;
  readonly shortLabel: string;
  readonly question: string;
}> = [
  {
    id: "credit",
    number: "01",
    shortLabel: "Path credit",
    question: "What gets credit?",
  },
  {
    id: "channel-off",
    number: "02",
    shortLabel: "Turn-off effect",
    question: "What would disappear?",
  },
  {
    id: "joint-allocation",
    number: "03",
    shortLabel: "Joint allocation",
    question: "How should joint lift be divided?",
  },
];

export const QuestionSelector = ({
  value,
  onChange,
}: QuestionSelectorProps): JSX.Element => (
  <div
    role="tablist"
    aria-label="Measurement question"
    className="grid border-y border-lunar-border bg-lunar-background sm:grid-cols-3"
  >
    {questions.map((question) => {
      const active = value === question.id;
      return (
        <button
          key={question.id}
          type="button"
          role="tab"
          aria-selected={active}
          aria-controls={`estimand-panel-${question.id}`}
          className={`min-h-[78px] border-b border-lunar-border px-4 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lunar-primary sm:border-b-0 sm:border-r last:sm:border-r-0 ${
            active
              ? "bg-white text-lunar-ink"
              : "bg-lunar-background text-lunar-muted hover:bg-white/70 hover:text-lunar-ink"
          }`}
          onClick={() => onChange(question.id)}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
              {question.number} / {question.shortLabel}
            </span>
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${active ? "bg-lunar-primary" : "bg-lunar-border"}`}
            />
          </span>
          <span className="mt-1.5 block font-display text-sm font-semibold leading-tight">
            {question.question}
          </span>
        </button>
      );
    })}
  </div>
);
