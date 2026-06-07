import { biasVsTruth } from "../hero/rail";
import { pct2, rho2, signedPctInt } from "../hero/format";
import type { EstimationResult, EstimationStatus } from "../methods/types";

// Typed narrative for the Super Bowl scenario. All branching on status/estimates
// lives here, not inside components, and every dynamic number is passed in from
// real estimator state — nothing is hard-coded to match the mock.

/** Rail/card status vocabulary. Never the only signal — paired with a glyph + text. */
export const railStatusLabel = (status: EstimationStatus): string => {
  if (status === "warning") {
    return "STRESSED";
  }
  if (status === "ok") {
    return "STABLE";
  }
  return "NOT APPLICABLE";
};

const READS_AS: Readonly<Record<string, string>> = {
  "last-touch": "Credits co-moving media as if the spot caused it.",
  "did-twfe":
    "Differences out shared movement; drifts only modestly — not anchored on truth.",
};

export const methodReadsAs = (methodId: string): string => READS_AS[methodId] ?? "";

export interface ReadSegment {
  readonly text: string;
  readonly bold: boolean;
}

const plain = (text: string): ReadSegment => ({ text, bold: false });
const strong = (text: string): ReadSegment => ({ text, bold: true });

export interface CurrentReadInput {
  readonly rho: number;
  readonly tau: number;
  readonly lt: EstimationResult;
  readonly did: EstimationResult;
}

/**
 * The state-driven "current read" sentence as typed segments (bold = emphasized
 * number/phrase). Mechanism is explicit: co-moving media vs timing. Degrades to a
 * truthful sentence if a method is not applicable, never printing null/NaN.
 */
export const currentReadSegments = ({
  rho,
  tau,
  lt,
  did,
}: CurrentReadInput): ReadSegment[] => {
  const segments: ReadSegment[] = [
    plain("At "),
    strong(rho2(rho)),
    plain(" channel correlation, "),
  ];

  if (lt.pointEstimate === null) {
    segments.push(
      plain("last-touch is "),
      strong("not applicable"),
      plain(" for this panel"),
    );
  } else {
    const bias = biasVsTruth(lt.pointEstimate, tau);
    const overUnder = bias >= 0 ? "over" : "under";
    segments.push(
      plain("last-touch reads "),
      strong(pct2(lt.pointEstimate)),
      plain(" — "),
      strong(`${signedPctInt(bias)} ${overUnder}`),
      plain(" the "),
      strong(pct2(tau)),
      plain(" truth, because it credits co-moving media as if the spot caused it"),
    );
  }

  segments.push(plain(". "));

  if (did.pointEstimate === null) {
    segments.push(plain("DiD is "), strong("not applicable"), plain(" for this panel."));
  } else {
    const bias = biasVsTruth(did.pointEstimate, tau);
    segments.push(
      plain("DiD reads "),
      strong(pct2(did.pointEstimate)),
      plain(` (${signedPctInt(bias)}): correlation barely moves it, since `),
      strong("timing — not co-movement"),
      plain(" identifies the effect."),
    );
  }

  return segments;
};

export interface MethodologySection {
  readonly title: string;
  readonly body: string;
}

export interface MethodologyOptions {
  readonly sweep?: { readonly aboveTruth: number; readonly total: number } | null;
}

/**
 * The seven proof sections. The Determinism claim is derived from a real seed
 * sweep when one is supplied; without it, only the byte-identical determinism
 * fact (which the DGP tests enforce) is stated. No fixed "100 seeds" claim.
 */
export const methodologySections = (
  options: MethodologyOptions = {},
): MethodologySection[] => {
  const sweep = options.sweep ?? null;
  const determinism =
    sweep && sweep.total > 0
      ? `Seed 42 shown; the same seed yields a byte-identical panel. Across ${sweep.total} re-seeded panels last-touch stays above truth (${sweep.aboveTruth}/${sweep.total}); the faint band on each lane is that spread.`
      : "Seed 42 shown; the same seed yields a byte-identical panel.";

  return [
    {
      title: "Target estimand",
      body: "τ_comp = mean post-period weekly lift = peak × kernel-sum (1.9) ÷ 26 weeks. What every method is trying to recover.",
    },
    {
      title: "Synthetic panel",
      body: "50 DMAs × 52 weeks × 3 channels. Single-week Super Bowl spot at week 26, assigned to 25 DMAs.",
    },
    {
      title: "Known counterfactual",
      body: "Re-run with the spot removed under the same seed; multiplicative lift makes (Y₁−Y₀)/Y₀ = liftPct exactly.",
    },
    {
      title: "Estimators see",
      body: "Observed outcomes, channel spend, treatment assignment — only. Ground truth drives display and coverage diagnostics, never estimation.",
    },
    {
      title: "Companion media",
      body: "Event-window co-moving spend on non-treatment channels lifts everyone's outcome; it is held out of ground truth — the bias last-touch absorbs.",
    },
    {
      title: "Inference",
      body: "Cluster-robust standard errors (clustered by DMA), 95% confidence intervals, Pearson channel correlation.",
    },
    {
      title: "Determinism",
      body: determinism,
    },
  ];
};

export const scenarioChips = (seed: number): string[] => [
  "SUPER BOWL",
  "SYNTHETIC PANEL",
  `SEED ${seed}`,
];
