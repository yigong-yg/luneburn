import type { EstimandLedger } from "../../lib/estimands/ledger";

interface EstimandHeroProps {
  readonly ledger: EstimandLedger;
}

const percent = (value: number | null): string =>
  value === null ? "Unavailable" : `${Math.round(value * 100)}%`;

const count = (value: number | null): string =>
  value === null
    ? "Unavailable"
    : `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("en-US")}`;

const searchRow = (
  ledger: EstimandLedger,
  panel: "credit" | "channelOff" | "jointAllocation",
) => ledger[panel].rows.find((row) => row.channel === "search");

export const EstimandHero = ({ ledger }: EstimandHeroProps): JSX.Element => {
  const credit = searchRow(ledger, "credit");
  const channelOff = searchRow(ledger, "channelOff");
  const allocation = searchRow(ledger, "jointAllocation");

  return (
    <header className="grid gap-7 border-b border-lunar-border pb-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)] lg:items-end">
      <div className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
          Estimand Lab / Always-on multichannel demand
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] text-lunar-ink sm:text-5xl lg:text-[58px]">
          The methods disagree because the{" "}
          <span className="whitespace-nowrap">questions do.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lunar-muted sm:text-base">
          One synthetic campaign supports several well-defined targets. First
          align the intervention, denominator, and allocation rule. Then ask
          whether the method can identify that target.
        </p>
      </div>

      <div className="border-l-2 border-lunar-ink pl-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
            Paid Search / same campaign
          </p>
          <span className="border border-lunar-border bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-lunar-muted">
            Target layer
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-lunar-border border-y border-lunar-border py-3">
          <div className="pr-3">
            <p className="font-display text-2xl font-bold tabular-nums text-lunar-ink">
              {percent(credit?.share ?? null)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-lunar-muted">
              path credit
            </p>
            <p className="mt-1 text-[9px] text-lunar-mutedSoft">Markov MTA</p>
          </div>
          <div className="px-3">
            <p className="font-display text-2xl font-bold tabular-nums text-lunar-ink">
              {count(channelOff?.oracleValue ?? null)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-lunar-muted">
              true Search-off effect
            </p>
            <p className="mt-1 text-[9px] text-lunar-mutedSoft">
              Paired oracle / conversions
            </p>
          </div>
          <div className="pl-3">
            <p className="font-display text-2xl font-bold tabular-nums text-lunar-ink">
              {percent(allocation?.share ?? null)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-lunar-muted">
              of joint lift
            </p>
            <p className="mt-1 text-[9px] text-lunar-mutedSoft">Shapley oracle</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-lunar-muted">
          These are three targets, not three estimates of one universal fact.
          The ledger below evaluates the method separately from the question.
        </p>
      </div>
    </header>
  );
};
