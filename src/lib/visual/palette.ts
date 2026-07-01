import type { ChartPalette } from "../../types/ui";

/**
 * Raw instrument tokens for the bespoke SVG figures (rail, axis problem). These
 * are the literal hex values the standalone design uses; Tailwind classes cover
 * chrome, but SVG fills/strokes need raw colors. Keep in sync with
 * tailwind.config.js `colors.lunar`.
 */
export interface InstrumentPalette {
  readonly page: string;
  readonly surface: string;
  readonly ink: string;
  readonly text: string;
  readonly muted: string;
  readonly mutedSoft: string;
  readonly border: string;
  readonly grid: string;
  readonly truth: string;
  readonly lastTouch: string;
  readonly lastTouchAccent: string;
  readonly lastTouchCiFill: string;
  readonly lastTouchBandFill: string;
  readonly did: string;
  readonly didAccent: string;
  readonly didCiFill: string;
  readonly didBandFill: string;
}

export const instrumentPalette: InstrumentPalette = {
  page: "#E4EAF0",
  surface: "#FFFFFF",
  ink: "#161D26",
  text: "#1B2530",
  muted: "#5F6F7F",
  mutedSoft: "#8A98A6",
  border: "#D2DBE4",
  grid: "#E5EBF1",
  truth: "#161D26",
  lastTouch: "#D55E00",
  lastTouchAccent: "#C77B1F",
  lastTouchCiFill: "rgba(199,123,31,0.16)",
  lastTouchBandFill: "rgba(213,94,0,0.08)",
  did: "#0072B2",
  didAccent: "#2E7D58",
  didCiFill: "rgba(0,114,178,0.14)",
  didBandFill: "rgba(0,114,178,0.07)",
};

export const chartPalette: ChartPalette = {
  kind: "hero-role",
  ui: {
    background: "#F6F8FA",
    surface: "#FFFFFF",
    text: "#17202A",
    mutedText: "#5F6F7F",
    border: "#D8E0E8",
    primary: "#3A6EA5",
    warning: "#D9902F",
  },
  heroRoleColors: {
    "ground-truth": "#111827",
    "naive-baseline": "#D55E00",
    "reference-validates": "#009E73",
    "reference-fails-instructively": "#0072B2",
  },
  methodColors: {
    "ground-truth": "#111827",
    "last-touch": "#D55E00",
    "geo-holdout": "#56B4E9",
    "did-twfe": "#0072B2",
    "mmm-lite": "#E69F00",
    "synthetic-control": "#009E73",
  },
};
