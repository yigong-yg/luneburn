import type { EstimandLedger } from "../../lib/estimands/ledger";
import type { EstimandLabDataset } from "../../lib/estimands/types";
import type { MarkovMtaResult } from "../../lib/estimands/markovMta";
import type { MmmLiteResult } from "../../lib/estimands/mmmLite";
import { firstSignFlipChannel } from "../../lib/estimands/narrative";
import type { EstimandScenarioDiagnostics } from "../../lib/estimands/scenarioDiagnostics";

interface EstimandCurrentReadProps {
  readonly dataset: EstimandLabDataset;
  readonly ledger: EstimandLedger;
  readonly mta: MarkovMtaResult;
  readonly mmm: MmmLiteResult;
  readonly scenarioDiagnostics: EstimandScenarioDiagnostics;
}

const flagLabel: Readonly<Record<string, string>> = {
  observational_credit_only: "MTA is observational credit",
  incomplete_path_coverage: "Some journeys have no recorded touch",
  omitted_demand_confounder: "Latent demand is omitted from MMM",
  omitted_media_interaction: "MMM omits the Search x Video interaction",
  high_media_collinearity: "A media series has little independent variation",
  regularization_boundary: "Ridge penalty reached the upper search boundary",
};

const channelLabel = {
  search: "Search",
  social: "Social",
  video: "Video",
} as const;

export const EstimandCurrentRead = ({
  dataset,
  ledger,
  mta,
  mmm,
  scenarioDiagnostics,
}: EstimandCurrentReadProps): JSX.Element => {
  const searchCredit = ledger.credit.rows.find(
    (row) => row.channel === "search",
  );
  const channelOffTruthTotal = dataset.channels.reduce(
    (sum, channel) => sum + dataset.oracle.channelOffIncremental[channel],
    0,
  );
  const overlap = channelOffTruthTotal - dataset.oracle.jointIncremental;
  const overlapShare =
    dataset.oracle.jointIncremental === 0
      ? 0
      : overlap / dataset.oracle.jointIncremental;
  const signFlipChannel = firstSignFlipChannel(ledger.channelOff.rows);
  const flags = [
    ...new Set([
      ...mta.assumptionFlags,
      ...mmm.assumptionFlags,
      ...scenarioDiagnostics.assumptionFlags,
    ]),
  ];

  return (
    <section className="border-l-2 border-lunar-primary bg-lunar-background px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lunar-mutedSoft">
        Current read
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-lunar-ink">
        Search receives {Math.round((searchCredit?.share ?? 0) * 100)}% of
        recorded path credit. Its structural media coefficient did not change;
        the exposure process did.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-lunar-muted">
        {dataset.params.synergy > 0 ? (
          <>
            Search x Video interaction creates{" "}
            {Math.round(overlap).toLocaleString("en-US")} overlapping
            channel-off conversions ({Math.round(overlapShare * 100)}% of joint
            lift). Summing those turn-off effects would double count shared
            lift.
          </>
        ) : (
          <>
            There is no structural Search x Video interaction. Realized paired
            conversion counts can still differ slightly from exact additivity.
          </>
        )}
      </p>
      {signFlipChannel && (
        <p className="mt-2 text-xs leading-relaxed text-lunar-muted">
          The {channelLabel[signFlipChannel]} estimate has the opposite sign
          from its paired oracle. This is estimation error within one target,
          not a disagreement between estimands.
        </p>
      )}
      {flags.length > 0 && (
        <div
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="Assumption warnings"
        >
          {flags.map((flag) => (
            <span
              key={flag}
              className="border border-lunar-warning/45 bg-lunar-warning/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-[#8A5B16]"
            >
              {flagLabel[flag] ?? flag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};
