import { Fragment } from "react";
import { scenarioChips } from "../../lib/content/superBowlNarrative";
import { LabNavigation } from "./LabNavigation";

interface HeaderProps {
  readonly seed: number;
}

export const Header = ({ seed }: HeaderProps): JSX.Element => {
  const chips = scenarioChips(seed);

  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 border-b border-lunar-border/70 pb-3 sm:items-center">
        <LabNavigation activeRoute="assumptions" />
        <div className="flex max-w-[68%] flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-lunar-mutedSoft sm:max-w-none sm:text-[10px] sm:tracking-[0.16em]">
          {chips.map((chip, index) => (
            <Fragment key={chip}>
              {index > 0 && (
                <span aria-hidden="true" className="text-lunar-border">
                  ·
                </span>
              )}
              <span className="whitespace-nowrap">{chip}</span>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
          A Measurement Assumption Lab
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] text-lunar-ink sm:text-4xl lg:text-5xl">
          The estimate moves. The truth does not.
        </h1>
        <p className="mt-3 text-sm text-lunar-muted sm:text-base">
          Same campaign. Same truth. Different assumptions.
        </p>
      </div>
    </header>
  );
};
