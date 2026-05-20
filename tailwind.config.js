/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lunar: {
          background: "#F6F8FA",
          surface: "#FFFFFF",
          text: "#17202A",
          muted: "#5F6F7F",
          border: "#D8E0E8",
          primary: "#3A6EA5",
          warning: "#D9902F",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 12px 40px rgba(23, 32, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
