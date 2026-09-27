import { describe, expect, it } from "vitest";
import { geometricAdstock } from "../../src/lib/math/adstock";

describe("geometricAdstock", () => {
  it("uses a normalized carryover transform", () => {
    expect(geometricAdstock([1, 0, 0], 0.5)).toEqual([0.5, 0.25, 0.125]);
  });

  it("reduces to the raw series at zero decay", () => {
    expect(geometricAdstock([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });

  it("rejects decay outside [0, 1)", () => {
    expect(() => geometricAdstock([1], -0.1)).toThrow(/decay/i);
    expect(() => geometricAdstock([1], 1)).toThrow(/decay/i);
  });
});
