import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "app/**/layout.tsx",
        "app/**/page.tsx",
        "app/api/**",
      ],
      // Branches lags lines/statements/functions because the remaining
      // untested surface (colors/materials/products admin clients, image
      // upload sections) is conditional-render-heavy. Ratchet this up as
      // those get test coverage — see Phase 5.7 plan, Step 4.
      thresholds: {
        lines: 40,
        statements: 40,
        functions: 40,
        branches: 27,
      },
    },
  },
});
