import { emitLabEvent } from "../../lib/analytics";

const stages = [
  {
    number: "01",
    label: "One paired DGP",
    detail: "104 weeks, three media channels, shared latent demand and customers",
  },
  {
    number: "02",
    label: "Two observed views",
    detail: "Ordered journeys for MTA; weekly spend and conversions for MMM",
  },
  {
    number: "03",
    label: "Eight interventions",
    detail: "Every channel coalition reuses the same latent state and random draws",
  },
  {
    number: "04",
    label: "Three contracts",
    detail: "Path allocation, channel-off effect, and Shapley allocation stay separate",
  },
] as const;

export const EstimandMethodology = (): JSX.Element => (
  <section aria-labelledby="estimand-methodology-heading">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
          Methodology proof
        </p>
        <h2
          id="estimand-methodology-heading"
          className="mt-1 font-display text-2xl font-bold text-lunar-ink"
        >
          The observed data are shared. The targets are not.
        </h2>
      </div>
      <p className="max-w-md text-xs leading-relaxed text-lunar-muted sm:text-right">
        Estimators receive observed-data views only. The paired intervention
        oracle is reserved for display, diagnostics, and tests.
      </p>
    </div>

    <div className="mt-5 grid border border-lunar-border bg-white sm:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage) => (
        <div
          key={stage.number}
          className="min-h-[150px] border-b border-lunar-border p-4 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 sm:[&:nth-child(3)]:border-b-0 lg:border-b-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(3)]:border-r"
        >
          <span className="font-display text-2xl font-bold text-lunar-border">
            {stage.number}
          </span>
          <h3 className="mt-4 text-sm font-bold text-lunar-ink">{stage.label}</h3>
          <p className="mt-2 text-xs leading-relaxed text-lunar-muted">
            {stage.detail}
          </p>
        </div>
      ))}
    </div>

    <details
      className="mt-3 border border-lunar-border bg-lunar-background px-4 py-3"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          emitLabEvent({
            name: "methodology_open",
            page: "estimands",
            detail: { section: "model_contracts" },
          });
        }
      }}
    >
      <summary className="cursor-pointer text-xs font-bold text-lunar-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-lunar-primary">
        Inspect model and inference contracts
      </summary>
      <div className="mt-4 grid gap-5 border-t border-lunar-border pt-4 text-xs leading-relaxed text-lunar-muted md:grid-cols-3">
        <div>
          <h3 className="font-bold text-lunar-ink">Markov MTA</h3>
          <p className="mt-1">
            First-order START-to-channel-to-outcome chain. Removal scores
            allocate observed conversions; they are explicitly non-causal.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-lunar-ink">MMM-lite</h3>
          <p className="mt-1">
            Fixed geometric adstock, trend and seasonality controls, ridge chosen
            by expanding-window validation, and moving-block residual intervals.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-lunar-ink">Causal oracle</h3>
          <p className="mt-1">
            Paired channel-off and coalition outcomes. Six channel orderings
            produce exact three-player Shapley allocation of joint lift.
          </p>
        </div>
      </div>
    </details>
  </section>
);
