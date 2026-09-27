import { describe, expect, it } from "vitest";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
  toMtaObservedData,
} from "../../src/lib/estimands/multichannelDgp";
import { estimateMarkovMta } from "../../src/lib/estimands/markovMta";
import { estimateMmmLite } from "../../src/lib/estimands/mmmLite";
import { buildEstimandLedger } from "../../src/lib/estimands/ledger";

describe("estimand ledger", () => {
  const dataset = generateEstimandLab(estimandLabDefaults, 2307);
  const mta = estimateMarkovMta(toMtaObservedData(dataset));
  const mmm = estimateMmmLite(toMmmObservedData(dataset), {
    bootstrapReplications: 0,
  });
  const ledger = buildEstimandLedger(dataset, mta, mmm);

  it("keeps each question's method, unit, and denominator explicit", () => {
    expect(ledger.credit.methodLabel).toBe("Markov MTA");
    expect(ledger.credit.unitLabel).toMatch(/observed conversions/i);
    expect(ledger.channelOff.methodLabel).toBe("MMM-lite");
    expect(ledger.channelOff.unitLabel).toMatch(/incremental conversions/i);
    expect(ledger.jointAllocation.methodLabel).toBe("Causal Shapley oracle");
    expect(ledger.jointAllocation.unitLabel).toMatch(/joint lift/i);
    expect(
      new Set(
        [ledger.credit, ledger.channelOff, ledger.jointAllocation].map(
          (panel) => panel.question,
        ),
      ),
    ).toHaveLength(3);
  });

  it("preserves the allocation invariants without pretending channel-off effects add", () => {
    const creditSum = ledger.credit.rows.reduce(
      (sum, row) => sum + (row.value ?? 0),
      0,
    );
    const shapleySum = ledger.jointAllocation.rows.reduce(
      (sum, row) => sum + (row.value ?? 0),
      0,
    );
    const channelOffTruthSum = ledger.channelOff.rows.reduce(
      (sum, row) => sum + (row.oracleValue ?? 0),
      0,
    );

    expect(creditSum).toBeCloseTo(ledger.credit.total, 8);
    expect(shapleySum).toBeCloseTo(dataset.oracle.jointIncremental, 8);
    expect(channelOffTruthSum).toBeGreaterThan(dataset.oracle.jointIncremental);
    expect(ledger.channelOff.additivity).toBe("overlapping-effects");
  });

  it("labels the three panels incompatible for direct ranking", () => {
    for (const panel of Object.values(ledger)) {
      expect(panel.compatibilityKey).toBe(panel.question);
    }
    expect(ledger.comparisonMessage).toMatch(/do not share an estimand/i);
  });
});
