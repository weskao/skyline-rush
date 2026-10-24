import { defineConfig } from '@playwright/test';

// CPU-only CI renders WebGL several times slower than a GPU, so wall-clock timeouts scale up.
const slow = process.env.CI ? 3 : 1;
const port = process.env.PLAYWRIGHT_PORT || '5178';
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid Playwright port');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*browser.spec.js',
  // These load tests/fixtures/*.html, which only the dev server serves (preview falls back to the app); see playwright.world-tour.config.js.
  testIgnore: ['**/world-tour-mid-race-browser.spec.js', '**/world-tour-showcase-browser.spec.js', '**/cloud-emulator-browser.spec.js'],
  // Lets CI --shard split by test instead of by file (browser.spec.js alone is most of the suite).
  fullyParallel: true,
  workers: 1,
  timeout: 45000 * slow,
  expect: { timeout: 10000 * slow },
  reporter: 'list',
  use: {
    channel: 'chrome',
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    // The UI follows the system language; pin English so English assertions never depend on the host.
    locale: 'en-US',
    // shortcut: CPU-only CI renders fewer pixels; use a GPU runner for visual fidelity tests.
    deviceScaleFactor: process.env.CI ? 0.25 : 1,
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
