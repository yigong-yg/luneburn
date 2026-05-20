import { create } from "zustand";
import type { DGPParams } from "../lib/dgp/types";
import { getDgp } from "../lib/dgp";
import type { ViewMode } from "../types/ui";

interface AppState {
  readonly scenarioId: string;
  readonly dgpParams: DGPParams;
  readonly seed: number;
  readonly enabledEstimators: ReadonlyArray<string>;
  readonly viewMode: ViewMode;
  readonly setScenario: (id: string) => void;
  readonly setParam: (key: keyof DGPParams, value: number) => void;
  readonly setSeed: (seed: number) => void;
  readonly toggleEstimator: (id: string) => void;
  readonly setViewMode: (mode: ViewMode) => void;
  readonly reset: () => void;
}

const initialDgp = getDgp("super-bowl");

export const useAppStore = create<AppState>((set, get) => ({
  scenarioId: initialDgp.id,
  dgpParams: initialDgp.defaultParams,
  seed: 42,
  enabledEstimators: [
    initialDgp.hero.naiveMethodId,
    initialDgp.hero.referenceMethodId,
  ].sort(),
  viewMode: "hero",
  setScenario: (id) => {
    const dgp = getDgp(id);

    set({
      scenarioId: dgp.id,
      dgpParams: dgp.defaultParams,
      enabledEstimators: [
        dgp.hero.naiveMethodId,
        dgp.hero.referenceMethodId,
      ].sort(),
      viewMode: "hero",
    });
  },
  setParam: (key, value) =>
    set((state) => ({
      dgpParams: {
        ...state.dgpParams,
        [key]: value,
      },
    })),
  setSeed: (seed) => set({ seed }),
  toggleEstimator: (id) => {
    const current = get().enabledEstimators;
    const enabledEstimators = current.includes(id)
      ? current.filter((candidate) => candidate !== id)
      : [...current, id].sort();

    set({ enabledEstimators });
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  reset: () => {
    const dgp = getDgp(get().scenarioId);

    set({
      dgpParams: dgp.defaultParams,
      enabledEstimators: [
        dgp.hero.naiveMethodId,
        dgp.hero.referenceMethodId,
      ].sort(),
      viewMode: "hero",
    });
  },
}));
