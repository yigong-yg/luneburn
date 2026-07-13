import { DecisionCheck } from "../components/estimands/DecisionCheck";
import { EstimandControls } from "../components/estimands/EstimandControls";
import { EstimandCurrentRead } from "../components/estimands/EstimandCurrentRead";
import { EstimandHero } from "../components/estimands/EstimandHero";
import { EstimandLedgerBoard } from "../components/estimands/EstimandLedgerBoard";
import { EstimandMethodology } from "../components/estimands/EstimandMethodology";
import { QuestionSelector } from "../components/estimands/QuestionSelector";
import { LabNavigation } from "../components/layout/LabNavigation";
import { useEstimandLab } from "../hooks/useEstimandLab";

export const EstimandLabPage = (): JSX.Element => {
  const lab = useEstimandLab();

  return (
    <main className="min-h-screen bg-lunar-page text-lunar-text">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 border-b border-lunar-border/70 pb-3">
          <LabNavigation activeRoute="estimands" />
          <div className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-lunar-mutedSoft md:flex">
            <span>3 channels</span>
            <span aria-hidden="true">/</span>
            <span>104 weeks</span>
            <span aria-hidden="true">/</span>
            <span>8 paired interventions</span>
          </div>
        </div>

        <EstimandHero ledger={lab.ledger} />

        <QuestionSelector
          value={lab.state.question}
          onChange={lab.setQuestion}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <EstimandLedgerBoard
            ledger={lab.ledger}
            selected={lab.state.question}
            intervalsPending={lab.intervalsPending}
          />
          <div className="flex flex-col gap-4 xl:sticky xl:top-5">
            <EstimandControls
              state={lab.state}
              onDemandCaptureChange={lab.setDemandCapture}
              onSynergyChange={lab.setSynergy}
              onNoiseChange={lab.setNoiseStd}
              onRegenerate={lab.regenerate}
              onReset={lab.reset}
            />
            <EstimandCurrentRead
              dataset={lab.dataset}
              ledger={lab.ledger}
              mta={lab.mta}
              mmm={lab.mmm}
              scenarioDiagnostics={lab.scenarioDiagnostics}
            />
          </div>
        </div>

        <DecisionCheck />
        <EstimandMethodology />

        <footer className="flex flex-col justify-between gap-2 border-t border-lunar-border pt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-lunar-mutedSoft sm:flex-row">
          <span>Luneburn / A Measurement Assumption Lab</span>
          <span>One truth per well-defined causal question</span>
        </footer>
      </div>
    </main>
  );
};
