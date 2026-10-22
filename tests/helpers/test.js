import { test as base, expect, chromium } from '@playwright/test';

// The app picks its first-launch graphics tier from the device (src/device-quality.js). CI's ubuntu-latest runner
// reports 4 cores and Chrome's 8 GiB memory cap, which selects Medium at 1440x900 and shows the downgrade notice;
// a faster dev machine gets High and never sees it. Pin every page to the CI profile so local runs match CI.
// A test can still override it with its own page.addInitScript (page scripts run after this context script).
export const CI_DEVICE = Object.freeze({ cores: 4, memoryGiB: 8 });

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(({ cores, memoryGiB }) => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => cores });
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => memoryGiB });
    }, CI_DEVICE);
    await use(context);
  },
});

export { expect, chromium };
