import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

process.env.E2E_DATABASE_URL ??= `file:./.cache/e2e-${process.pid}.db`;
if (!/^file:\.\/\.cache\/e2e-[a-z0-9-]+\.db$/.test(process.env.E2E_DATABASE_URL)) throw new Error("E2E precisa de um banco exclusivo em .cache/e2e-*.db.");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "npm run db:migrate && npm run db:seed && npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { CATALOG_STORAGE: "sqlite", DATABASE_URL: process.env.E2E_DATABASE_URL },
    timeout: 120000,
  },
});
