import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/browser.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:5178',
    viewport: { width: 1440, height: 900 },
    // shortcut: CPU-only CI renders fewer pixels; use a GPU runner for visual fidelity tests.
    deviceScaleFactor: process.env.CI ? 0.25 : 1,
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: !process.env.CI,
  },
});
