import type { ReactNode } from "react";

export interface MethodCardRow {
  readonly label: string;
  readonly value: string;
}

interface MethodCardProps {
  readonly name: string;
  readonly badge: ReactNode;
  readonly value: string;
  readonly accentColor: string;
  readonly bias?: string | null;
  readonly note?: string | null;
  readonly rows?: ReadonlyArray<MethodCardRow>;
}

export const MethodCard = ({
  name,
  badge,
  value,
  accentColor,
  bias = null,
  note = null,
  rows = [],
}: MethodCardProps): JSX.Element => (
  <section className="flex flex-col gap-3 rounded-[10px] border border-lunar-border bg-lunar-surface p-4 shadow-instrument">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <h3 className="font-display text-base font-semibold text-lunar-ink">
          {name}
        </h3>
      </div>
      {badge}
    </div>

    <div className="flex items-baseline gap-2">
      <span className="font-display text-3xl font-bold text-lunar-ink">
        {value}
      </span>
      {bias && (
        <span className="text-sm font-semibold tabular-nums text-lunar-muted">
          {bias}
        </span>
      )}
    </div>

    {note && (
      <p className="text-sm leading-relaxed text-lunar-muted">{note}</p>
    )}

    {rows.length > 0 && (
      <dl className="flex flex-col gap-2 border-t border-lunar-border pt-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[88px_1fr] gap-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-lunar-mutedSoft">
              {row.label}
            </dt>
            <dd className="text-sm leading-snug text-lunar-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    )}
  </section>
);
