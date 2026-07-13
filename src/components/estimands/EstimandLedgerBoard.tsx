import type {
  EstimandLedger,
  EstimandLedgerPanel,
  EstimandLedgerRow,
  EstimandQuestion,
} from "../../lib/estimands/ledger";
import type { EstimationStatus } from "../../lib/methods/types";
import { channelPalette } from "../../lib/visual/palette";

interface EstimandLedgerBoardProps {
  readonly ledger: EstimandLedger;
  readonly selected: EstimandQuestion;
  readonly intervalsPending: boolean;
}

const channelLabel: Readonly<Record<EstimandLedgerRow["channel"], string>> = {
  search: "Paid Search",
  social: "Social",
  video: "Video",
};

const statusClass: Readonly<Record<EstimationStatus | "oracle", string>> = {
  ok: "border-[#2E7D58]/35 bg-[#2E7D58]/10 text-[#2E7D58]",
  warning: "border-lunar-warning/45 bg-lunar-warning/10 text-[#8A5B16]",
  invalid: "border-lunar-muted/40 bg-lunar-muted/10 text-lunar-muted",
  oracle: "border-lunar-ink/25 bg-lunar-ink/5 text-lunar-ink",
};

const statusLabel: Readonly<Record<EstimationStatus | "oracle", string>> = {
  ok: "Model supported",
  warning: "Assumption warning",
  invalid: "Unsupported",
  oracle: "Known oracle",
};

const valueLabel = (
  panel: EstimandLedgerPanel,
  row: EstimandLedgerRow,
): string => {
  if (row.value === null) return "Unavailable";
  if (panel.question === "credit" || panel.question === "joint-allocation") {
    return `${Math.round((row.share ?? 0) * 100)}%`;
  }
  return `${row.value >= 0 ? "+" : ""}${Math.round(row.value).toLocaleString("en-US")}`;
};

interface Domain {
  readonly minimum: number;
  readonly maximum: number;
}

const panelDomain = (panel: EstimandLedgerPanel): Domain => {
  const values = [0];
  for (const row of panel.rows) {
    if (row.value !== null) values.push(row.value);
    if (row.oracleValue !== null) values.push(row.oracleValue);
    if (row.confidenceInterval) values.push(...row.confidenceInterval);
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(1, (maximum - minimum) * 0.08);
  return {
    minimum: minimum < 0 ? minimum - padding : 0,
    maximum: maximum + padding,
  };
};

const position = (value: number, domain: Domain): number =>
  ((value - domain.minimum) / (domain.maximum - domain.minimum)) * 100;

const MeasureRow = ({
  panel,
  row,
  domain,
}: {
  readonly panel: EstimandLedgerPanel;
  readonly row: EstimandLedgerRow;
  readonly domain: Domain;
}): JSX.Element => {
  const zero = position(0, domain);
  const value = row.value;
  const valuePosition = value === null ? zero : position(value, domain);
  const left = Math.min(zero, valuePosition);
  const width = Math.max(0, Math.abs(valuePosition - zero));

  return (
    <div className="py-3 first:pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: channelPalette[row.channel] }}
          />
          <span className="truncate text-xs font-semibold text-lunar-text">
            {channelLabel[row.channel]}
          </span>
        </div>
        <div className="text-right">
          <span className="font-display text-lg font-bold tabular-nums text-lunar-ink">
            {valueLabel(panel, row)}
          </span>
          {panel.question === "channel-off" && row.oracleValue !== null && (
            <span className="ml-2 text-[10px] font-semibold tabular-nums text-lunar-muted">
              truth {Math.round(row.oracleValue).toLocaleString("en-US")}
            </span>
          )}
        </div>
      </div>

      <div
        className="relative mt-2 h-5 overflow-hidden bg-lunar-grid/75"
        aria-label={`${channelLabel[row.channel]} ${valueLabel(panel, row)}`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-lunar-mutedSoft/50"
          style={{ left: `${zero}%` }}
        />
        {row.confidenceInterval && (
          <span
            aria-hidden="true"
            className="absolute top-[9px] h-0.5 bg-lunar-ink/35"
            style={{
              left: `${position(row.confidenceInterval[0], domain)}%`,
              width: `${Math.max(
                0,
                position(row.confidenceInterval[1], domain) -
                  position(row.confidenceInterval[0], domain),
              )}%`,
            }}
          />
        )}
        {value !== null && (
          <span
            aria-hidden="true"
            className="absolute top-1 h-3"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.8)}%`,
              backgroundColor: channelPalette[row.channel],
            }}
          />
        )}
        {row.oracleValue !== null && panel.question === "channel-off" && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white bg-lunar-ink shadow-sm"
            style={{ left: `${position(row.oracleValue, domain)}%` }}
          />
        )}
      </div>
    </div>
  );
};

const LedgerPanel = ({
  panel,
  selected,
  intervalsPending,
}: {
  readonly panel: EstimandLedgerPanel;
  readonly selected: boolean;
  readonly intervalsPending: boolean;
}): JSX.Element => {
  const domain = panelDomain(panel);
  const number =
    panel.question === "credit"
      ? "01"
      : panel.question === "channel-off"
        ? "02"
        : "03";

  return (
    <article
      id={`estimand-panel-${panel.question}`}
      role="tabpanel"
      aria-label={panel.questionLabel}
      className={`flex min-h-[430px] flex-col border bg-white px-4 py-4 shadow-instrument transition-[border-color,opacity] sm:px-5 ${
        selected
          ? "border-lunar-primary opacity-100"
          : "border-lunar-border opacity-[0.78]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-display text-3xl font-bold text-lunar-border">
          {number}
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${statusClass[panel.status]}`}
          >
            {statusLabel[panel.status]}
          </span>
          {intervalsPending && panel.question === "channel-off" && (
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-lunar-mutedSoft">
              Updating intervals
            </span>
          )}
        </div>
      </div>
      <h2 className="mt-3 min-h-[44px] font-display text-lg font-bold leading-tight text-lunar-ink">
        {panel.questionLabel}
      </h2>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-lunar-primary">
        {panel.methodLabel} / {panel.methodQualifier}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-lunar-muted">
        {panel.decisionLabel}
      </p>

      <div className="mt-5 flex-1 border-t border-lunar-border pt-3">
        {panel.rows.map((row) => (
          <MeasureRow
            key={row.channel}
            panel={panel}
            row={row}
            domain={domain}
          />
        ))}
      </div>

      <div className="mt-4 border-t border-lunar-border pt-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-lunar-mutedSoft">
          Unit / denominator
        </p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-lunar-text">
          {panel.unitLabel}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-lunar-muted">
          {panel.denominatorLabel}
        </p>
      </div>
    </article>
  );
};

export const EstimandLedgerBoard = ({
  ledger,
  selected,
  intervalsPending,
}: EstimandLedgerBoardProps): JSX.Element => {
  const panels = [ledger.credit, ledger.channelOff, ledger.jointAllocation];
  const selectedPanel = panels.find((panel) => panel.question === selected);

  return (
    <section aria-label="Estimand ledger">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
            Estimand ledger
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-lunar-ink">
            Same channel. Three measurement contracts.
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-lunar-muted sm:text-right">
          Each panel owns its scale. Shared color identifies the channel, not
          whether the number is causal.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {panels.map((panel) => (
          <LedgerPanel
            key={panel.question}
            panel={panel}
            selected={panel.question === selected}
            intervalsPending={intervalsPending}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 border border-lunar-border bg-lunar-background px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.58fr)] sm:items-center">
        <p className="text-sm font-semibold leading-relaxed text-lunar-ink">
          {ledger.comparisonMessage}
        </p>
        <p className="text-xs leading-relaxed text-lunar-muted sm:border-l sm:border-lunar-border sm:pl-4">
          {selectedPanel?.note}
        </p>
      </div>
    </section>
  );
};
