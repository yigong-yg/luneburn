/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lunar: {
          // Surfaces — quiet grey-blue lunar palette.
          page: "#E4EAF0",
          background: "#F6F8FA",
          surface: "#FFFFFF",
          // Ink / text.
          ink: "#161D26",
          text: "#1B2530",
          muted: "#5F6F7F",
          mutedSoft: "#8A98A6",
          border: "#D2DBE4",
          grid: "#E5EBF1",
          primary: "#3A6EA5",
          warning: "#D9902F",
          // Method / status accents (chart semantics).
          lastTouch: "#D55E00",
          lastTouchAccent: "#C77B1F",
          did: "#0072B2",
          didAccent: "#2E7D58",
        },
      },
      fontFamily: {
        display: [
          "Schibsted Grotesk",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        sans: [
          "IBM Plex Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      boxShadow: {
        panel: "0 12px 40px rgba(23, 32, 42, 0.06)",
        // Instrument card: a thin top highlight plus a tight, deep, low-spread drop.
        instrument:
          "inset 0 1px 0 rgba(255,255,255,0.7), 0 10px 30px -22px rgba(22,29,38,0.45)",
      },
    },
  },
  plugins: [],
};
