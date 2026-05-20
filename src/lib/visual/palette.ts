import type { ChartPalette } from "../../types/ui";

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
