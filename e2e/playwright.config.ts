import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? "http://localhost:3001";
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  // In CI, the backend/frontend are already built+started by the workflow
  // (so the Postgres-backed backend can be seeded before the suite runs).
  // Locally, start both with `npm run build && npm run start` in each app
  // first, then point E2E_FRONTEND_URL/E2E_BACKEND_URL here if not on the
  // default ports.
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run start:prod",
          cwd: "../backend",
          url: BACKEND_URL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: "npm run start -- -p 3001",
          cwd: "../frontend",
          url: FRONTEND_URL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
