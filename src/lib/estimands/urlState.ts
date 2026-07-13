import type { EstimandQuestion } from "./ledger";

export interface EstimandLabUrlState {
  readonly demandCapture: number;
  readonly synergy: number;
  readonly noiseStd: number;
  readonly seed: number;
  readonly question: EstimandQuestion;
}

export const estimandLabUrlDefaults: EstimandLabUrlState = {
  demandCapture: 0.68,
  synergy: 0.35,
  noiseStd: 1,
  seed: 2307,
  question: "channel-off",
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const numericParam = (
  params: URLSearchParams,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp(value, minimum, maximum) : fallback;
};

const isQuestion = (value: string | null): value is EstimandQuestion =>
  value === "credit" ||
  value === "channel-off" ||
  value === "joint-allocation";

export const parseEstimandHash = (hash: string): EstimandLabUrlState => {
  if (!hash.startsWith("#/estimands")) return estimandLabUrlDefaults;
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const seedParam = params.get("seed");
  const rawSeed = seedParam === null ? Number.NaN : Number(seedParam);
  const seed = Number.isInteger(rawSeed)
    ? clamp(rawSeed, 1, 999_999)
    : estimandLabUrlDefaults.seed;
  const rawQuestion = params.get("q");

  return {
    demandCapture: numericParam(
      params,
      "d",
      estimandLabUrlDefaults.demandCapture,
      0,
      0.9,
    ),
    synergy: numericParam(
      params,
      "s",
      estimandLabUrlDefaults.synergy,
      0,
      0.8,
    ),
    noiseStd: numericParam(
      params,
      "n",
      estimandLabUrlDefaults.noiseStd,
      0.2,
      2,
    ),
    seed,
    question: isQuestion(rawQuestion)
      ? rawQuestion
      : estimandLabUrlDefaults.question,
  };
};

const compact = (value: number): string =>
  Number(value.toFixed(2)).toString();

export const serializeEstimandHash = (
  state: EstimandLabUrlState,
): string => {
  const params = new URLSearchParams({
    d: compact(state.demandCapture),
    s: compact(state.synergy),
    n: compact(state.noiseStd),
    seed: Math.round(state.seed).toString(),
    q: state.question,
  });
  return `#/estimands?${params.toString()}`;
};
