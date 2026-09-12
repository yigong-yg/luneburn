import { describe, expect, it } from "vitest";
import { buildEstimandLedger } from "../../src/lib/estimands/ledger";
import { firstSignFlipChannel } from "../../src/lib/estimands/narrative";
import { estimateMarkovMta } from "../../src/lib/estimands/markovMta";
import { estimateMmmLite } from "../../src/lib/estimands/mmmLite";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
  toMtaObservedData,
} from "../../src/lib/estimands/multichannelDgp";

const ledgerAtDemandCapture = (demandCapture: number) => {
  const dataset = generateEstimandLab(
    { ...estimandLabDefaults, demandCapture },
    2307,
  );
  return buildEstimandLedger(
    dataset,
    estimateMarkovMta(toMtaObservedData(dataset)),
    estimateMmmLite(toMmmObservedData(dataset), {
      bootstrapReplications: 0,
    }),
  );
};

describe("estimand narrative", () => {
  it("surfaces the landing-state Video sign flip from estimate and oracle values", () => {
    expect(firstSignFlipChannel(ledgerAtDemandCapture(0.68).channelOff.rows)).toBe(
      "video",
    );
  });

  it("hides the sign-flip narrative when every displayed estimate agrees in sign", () => {
    const alignedRows = ledgerAtDemandCapture(0).channelOff.rows.map((row) => ({
      ...row,
      value: row.oracleValue,
    }));

    expect(firstSignFlipChannel(alignedRows)).toBeNull();
  });
});
