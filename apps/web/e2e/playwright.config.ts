import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./",
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: {
      "x-admin-passcode": process.env.ADMIN_PASSCODE ?? "watch-admin",
    },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
})
