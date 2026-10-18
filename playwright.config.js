import { defineConfig } from '@playwright/test';

// CPU-only CI renders WebGL several times slower than a GPU, so wall-clock timeouts scale up.
const slow = process.env.CI ? 3 : 1;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/browser.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 45000 * slow,
  expect: { timeout: 10000 * slow },
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
