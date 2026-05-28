export type Rng = () => number;

// Mulberry32: a fast seedable PRNG (Tommy Ettinger). Constants and shifts are
// the published reference values; changing them breaks reproducibility, which
// is load-bearing because permalinks must regenerate identical datasets.
export const mulberry32 = (seed: number): Rng => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Standard-normal draw via Box-Muller. Consumes two uniforms per call and
// returns one normal; using (1 - u1) keeps the log argument in (0, 1].
export const gaussian = (rng: Rng): number => {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
};
