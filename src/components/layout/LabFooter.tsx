import type { LabRoute } from "./LabNavigation";

interface LabFooterProps {
  readonly route: LabRoute;
}

export const LabFooter = ({ route }: LabFooterProps): JSX.Element => (
  <footer className="flex flex-col justify-between gap-2 border-t border-lunar-border pt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-lunar-mutedSoft sm:flex-row">
    <span>Luneburn / A Measurement Assumption Lab</span>
    <span>
      {route === "estimands"
        ? "One truth per well-defined causal question"
        : "Assumptions are the estimate's fine print"}
    </span>
  </footer>
);
