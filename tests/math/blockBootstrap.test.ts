import { describe, expect, it } from "vitest";
import { movingBlockIndices } from "../../src/lib/math/blockBootstrap";

describe("movingBlockIndices", () => {
  it("is deterministic and returns the requested length", () => {
    const first = movingBlockIndices(30, 6, 42);
    const second = movingBlockIndices(30, 6, 42);

    expect(first).toEqual(second);
    expect(first).toHaveLength(30);
  });

  it("preserves local adjacency inside sampled blocks", () => {
    const indices = movingBlockIndices(24, 4, 9);
    for (let start = 0; start < indices.length; start += 4) {
      const block = indices.slice(start, start + 4);
      for (let i = 1; i < block.length; i += 1) {
        expect(block[i]).toBe((block[i - 1] ?? 0) + 1);
      }
    }
  });

  it("rejects invalid dimensions", () => {
    expect(() => movingBlockIndices(0, 4, 1)).toThrow(/length/i);
    expect(() => movingBlockIndices(10, 11, 1)).toThrow(/block/i);
  });
});
