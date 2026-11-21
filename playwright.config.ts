import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL;
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Uses the locally installed Google Chrome by default (no browser download).
  // Set PW_CHANNEL=chromium (after `npx playwright install chromium`) to use the bundled build, e.g. in CI.
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome" },
    },
  ],
  // Against a deployed URL (E2E_BASE_URL) no local server is started.
  webServer: externalBaseUrl
    ? undefined
    : {
        // Isolated, throwaway embedded Postgres so E2E never touches dev data.
        command: `npm run db:migrate && npx next dev -p ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        timeout: 180_000,
        reuseExistingServer: false,
        env: {
          DATABASE_URL: "pglite:./.data/e2e-pglite",
          AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-for-production-use-000000",
        },
      },
});
