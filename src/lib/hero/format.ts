// Display formatting for the instrument. Centralized so the rail, cards, and
// current-read render numbers identically. Uses typographic en-dash (–) for
// ranges and minus (−) for negative signs.

export const pct2 = (fraction: number): string => `${(fraction * 100).toFixed(2)}%`;

export const pct1 = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;

export const pctInt = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export const pct2Range = (ci: readonly [number, number]): string =>
  `${(ci[0] * 100).toFixed(2)}–${(ci[1] * 100).toFixed(2)}%`;

/** Signed, rounded percent for bias readouts: +82%, −5%. */
export const signedPctInt = (fraction: number): string => {
  const value = Math.round(fraction * 100);
  return value < 0 ? `−${Math.abs(value)}%` : `+${value}%`;
};

export const rho2 = (value: number): string => value.toFixed(2);
