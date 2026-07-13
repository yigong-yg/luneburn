import type { EstimationStatus } from "../methods/types";
import type { MarkovMtaResult } from "./markovMta";
import type { MmmLiteResult } from "./mmmLite";
import { deriveScenarioDiagnostics } from "./scenarioDiagnostics";
import {
  channelRecord,
  type ChannelId,
  type EstimandLabDataset,
} from "./types";

export type EstimandQuestion =
  | "credit"
  | "channel-off"
  | "joint-allocation";

export type ClaimAdditivity =
  | "sums-to-observed"
  | "overlapping-effects"
  | "sums-to-joint";

export interface EstimandLedgerRow {
  readonly channel: ChannelId;
  readonly value: number | null;
  readonly share: number | null;
  readonly oracleValue: number | null;
  readonly confidenceInterval: readonly [number, number] | null;
}

export interface EstimandLedgerPanel {
  readonly question: EstimandQuestion;
  readonly questionLabel: string;
  readonly decisionLabel: string;
  readonly methodLabel: string;
  readonly methodQualifier: string;
  readonly unitLabel: string;
  readonly denominatorLabel: string;
  readonly status: EstimationStatus | "oracle";
  readonly additivity: ClaimAdditivity;
  readonly compatibilityKey: EstimandQuestion;
  readonly total: number;
  readonly comparisonTotal: number | null;
  readonly rows: ReadonlyArray<EstimandLedgerRow>;
  readonly note: string;
}

export interface EstimandLedger {
  readonly credit: EstimandLedgerPanel;
  readonly channelOff: EstimandLedgerPanel;
  readonly jointAllocation: EstimandLedgerPanel;
  readonly comparisonMessage: string;
}

const safeShare = (value: number | null, total: number): number | null =>
  value === null || Math.abs(total) < 1e-12 ? null : value / total;

export const buildEstimandLedger = (
  dataset: EstimandLabDataset,
  mta: MarkovMtaResult,
  mmm: MmmLiteResult,
): EstimandLedger => {
  const observedConversions = dataset.oracle.observedOutcome;
  const jointIncremental = dataset.oracle.jointIncremental;
  const channelOffTruthTotal = dataset.channels.reduce(
    (sum, channel) => sum + dataset.oracle.channelOffIncremental[channel],
    0,
  );
  const mtaValues = mta.creditedConversions ?? channelRecord(() => null);
  const mmmValues = mmm.channelOffIncremental ?? channelRecord(() => null);
  const mmmIntervals =
    mmm.confidenceIntervals ?? channelRecord(() => null);
  const scenarioDiagnostics = deriveScenarioDiagnostics(dataset.params);
  const channelOffStatus =
    mmm.status === "invalid"
      ? "invalid"
      : mmm.status === "warning" ||
          scenarioDiagnostics.assumptionFlags.length > 0
        ? "warning"
        : "ok";

  return {
    credit: {
      question: "credit",
      questionLabel: "What gets credit?",
      decisionLabel: "Describe recorded conversion paths",
      methodLabel: "Markov MTA",
      methodQualifier: "Observational allocation",
      unitLabel: "credited observed conversions",
      denominatorLabel: `${observedConversions.toLocaleString("en-US")} observed conversions`,
      status: mta.status,
      additivity: "sums-to-observed",
      compatibilityKey: "credit",
      total: observedConversions,
      comparisonTotal: observedConversions,
      rows: dataset.channels.map((channel) => {
        const value = mtaValues[channel];
        return {
          channel,
          value,
          share: safeShare(value, observedConversions),
          oracleValue: null,
          confidenceInterval: null,
        };
      }),
      note: "Removal scores divide recorded path credit. They do not estimate what would happen if media disappeared.",
    },
    channelOff: {
      question: "channel-off",
      questionLabel: "What would disappear if a channel turned off?",
      decisionLabel: "Evaluate one actionable media intervention",
      methodLabel: "MMM-lite",
      methodQualifier: "Model-based causal estimate",
      unitLabel: "incremental conversions under channel-off",
      denominatorLabel: "observed execution vs one-channel-off counterfactual",
      status: channelOffStatus,
      additivity: "overlapping-effects",
      compatibilityKey: "channel-off",
      total: dataset.channels.reduce(
        (sum, channel) => sum + (mmmValues[channel] ?? 0),
        0,
      ),
      comparisonTotal: jointIncremental,
      rows: dataset.channels.map((channel) => {
        const value = mmmValues[channel];
        return {
          channel,
          value,
          share: null,
          oracleValue: dataset.oracle.channelOffIncremental[channel],
          confidenceInterval: mmmIntervals[channel],
        };
      }),
      note: `True channel-off effects total ${Math.round(channelOffTruthTotal).toLocaleString("en-US")}, while joint lift is ${Math.round(jointIncremental).toLocaleString("en-US")}. Interaction is counted in more than one channel-off contrast; that overlap is not estimator error.`,
    },
    jointAllocation: {
      question: "joint-allocation",
      questionLabel: "How should joint lift be divided?",
      decisionLabel: "Allocate a non-additive causal total",
      methodLabel: "Causal Shapley oracle",
      methodQualifier: "Allocation convention over interventions",
      unitLabel: "allocated share of joint lift",
      denominatorLabel: `${Math.round(jointIncremental).toLocaleString("en-US")} joint incremental conversions`,
      status: "oracle",
      additivity: "sums-to-joint",
      compatibilityKey: "joint-allocation",
      total: jointIncremental,
      comparisonTotal: jointIncremental,
      rows: dataset.channels.map((channel) => {
        const value = dataset.oracle.shapleyIncremental[channel];
        return {
          channel,
          value,
          share: safeShare(value, jointIncremental),
          oracleValue: value,
          confidenceInterval: null,
        };
      }),
      note: "Shapley divides the joint causal total exactly. It is a transparent allocation rule, not a uniquely true per-channel intervention effect.",
    },
    comparisonMessage:
      "These outputs do not share an estimand. Align intervention, outcome, population, horizon, denominator, and allocation rule before ranking them.",
  };
};
