import { useState } from "react";
import { methodologySections } from "../../lib/content/superBowlNarrative";

interface MethodologyProofStripProps {
  readonly sweep?: { readonly aboveTruth: number; readonly total: number } | null;
}

export const MethodologyProofStrip = ({
  sweep = null,
}: MethodologyProofStripProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const sections = methodologySections({ sweep });

  return (
    <section className="rounded-[10px] border border-lunar-border bg-lunar-surface p-4 shadow-instrument">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
            Methodology
          </span>
          <span className="mt-0.5 text-sm text-lunar-muted">
            Auditable synthetic design — estimators never see the truth.
          </span>
        </span>
        <span className="shrink-0 rounded-md border border-lunar-border px-2.5 py-1 text-xs font-semibold text-lunar-text">
          {open ? "− close" : "+ open proof"}
        </span>
      </button>

      {open && (
        <dl className="mt-4 grid gap-x-6 gap-y-4 border-t border-lunar-border pt-4 sm:grid-cols-2">
          {sections.map((section, index) => (
            <div key={section.title} className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 font-display text-sm font-semibold text-lunar-ink">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-lunar-border text-[11px] tabular-nums text-lunar-mutedSoft">
                  {index + 1}
                </span>
                {section.title}
              </dt>
              <dd className="text-sm leading-relaxed text-lunar-muted">
                {section.body}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};
