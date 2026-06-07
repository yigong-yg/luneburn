import { Fragment } from "react";
import { scenarioChips } from "../../lib/content/superBowlNarrative";

interface HeaderProps {
  readonly seed: number;
}

export const Header = ({ seed }: HeaderProps): JSX.Element => {
  const chips = scenarioChips(seed);

  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 border-b border-lunar-border/70 pb-3">
        <span className="font-display text-lg font-bold tracking-tight text-lunar-ink">
          luneburn
        </span>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-lunar-mutedSoft">
          {chips.map((chip, index) => (
            <Fragment key={chip}>
              {index > 0 && (
                <span aria-hidden="true" className="text-lunar-border">
                  ·
                </span>
              )}
              <span>{chip}</span>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-lunar-mutedSoft">
          A Measurement Assumption Lab
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-lunar-ink sm:text-4xl lg:text-5xl">
          The estimate moves. The truth does not.
        </h1>
        <p className="mt-3 text-sm text-lunar-muted sm:text-base">
          Same campaign. Same truth. Different assumptions.
        </p>
      </div>
    </header>
  );
};
