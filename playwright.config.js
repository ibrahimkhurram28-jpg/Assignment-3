import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a live copy of the app.
//   BASE_URL=http://localhost:3000   (default) the app under test
// If nothing is listening there, Playwright starts `npm run dev` itself, so the
// database must already be migrated and seeded (see README).
const baseURL = process.env.BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: `${baseURL}/health`,
        reuseExistingServer: true,
        timeout: 120000,
      },
});
