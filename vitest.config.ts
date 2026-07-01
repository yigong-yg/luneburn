import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // Only collect the project's own suites. Without this, Vitest's default
    // `**/*.{test,spec}.*` glob also picks up gitignored browser-profile
    // `*.spec.js` files under `.codex-screenshots/`, which throw and fail the run.
    include: ["tests/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "dist/**",
      ".codex-screenshots/**",
      "demo/**",
    ],
  },
});
