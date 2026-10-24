import { test as base, expect, chromium } from '@playwright/test';

// The app picks its first-launch graphics tier from the device (src/device-quality.js). CI's ubuntu-latest runner
// reports 4 cores and Chrome's 8 GiB memory cap, which selects Medium at 1440x900 and shows the downgrade notice;
// a faster dev machine gets High and never sees it. Pin every page to the CI profile so local runs match CI.
// A test can still override it with its own page.addInitScript (page scripts run after this context script).
export const CI_DEVICE = Object.freeze({ cores: 4, memoryGiB: 8 });

export const test = base.extend({
  guideSeen: [true, { option: true }],
  // A seeded guide marks a returning player, who would get the What's New notes on load; mark them read.
  whatsNewSeen: ['999.0.0', { option: true }],
  context: async ({ context, guideSeen, whatsNewSeen }, use) => {
    if (guideSeen) await context.addInitScript(() => localStorage.setItem('skyline-rush-guide-seen', '1'));
    if (whatsNewSeen) await context.addInitScript(seen => localStorage.setItem('skyline-rush-whats-new-seen-v1', seen), whatsNewSeen);
    await context.addInitScript(({ cores, memoryGiB }) => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => cores });
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => memoryGiB });
    }, CI_DEVICE);
    await use(context);
  },
});

export { expect, chromium };
