import { defineConfig, devices } from "@playwright/test";

/**
 * FinAlly E2E config.
 *
 * - `APP_BASE_URL` defaults to the docker-compose service name `app` (http://app:8000).
 *   When running locally against a host-mounted stack, set `APP_BASE_URL=http://localhost:8000`.
 * - Single Chromium project keeps the run fast and deterministic. We don't need
 *   cross-browser coverage for a backend-driven SPA.
 * - `retries: 1` guards only against genuinely flaky scenarios (SSE reconnect).
 *   Anything that retries twice should be filed as a bug in planning/BUGS.md.
 */
const BASE_URL =
  process.env.APP_BASE_URL ??
  (process.env.CI ? "http://app:8000" : "http://localhost:8000");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
