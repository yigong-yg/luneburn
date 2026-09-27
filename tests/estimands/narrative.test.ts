import { describe, expect, it } from "vitest";
import type { EstimandLedgerRow } from "../../src/lib/estimands/ledger";
import { firstSignFlipChannel } from "../../src/lib/estimands/narrative";

const row = (
  channel: EstimandLedgerRow["channel"],
  value: number | null,
  oracleValue: number | null,
): EstimandLedgerRow => ({
  channel,
  value,
  oracleValue,
  share: null,
  confidenceInterval: null,
});

describe("estimand narrative", () => {
  it("surfaces the first actual sign disagreement rather than a fixed channel", () => {
    expect(
      firstSignFlipChannel([
        row("search", 120, 120),
        row("social", -20, 80),
        row("video", -40, 40),
      ]),
    ).toBe("social");
    expect(firstSignFlipChannel([row("video", -40, 40)])).toBe("video");
  });

  it("hides the sign-flip narrative for aligned, zero, or unavailable estimates", () => {
    expect(
      firstSignFlipChannel([
        row("search", 120, 120),
        row("social", 80, 80),
        row("video", 40, 40),
      ]),
    ).toBeNull();
    expect(
      firstSignFlipChannel([
        row("search", null, 120),
        row("social", 0, 80),
        row("video", 40, null),
      ]),
    ).toBeNull();
  });
});
