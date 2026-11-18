import { test as base, expect, chromium } from '@playwright/test';
import { initialDeviceVisuals, QUALITY_STORAGE_KEY } from '../../src/device-quality.ts';

// The app picks its first-launch graphics tier from the device (src/device-quality.js). CI's ubuntu-latest runner
// reports 4 cores and Chrome's 8 GiB memory cap, which selects Medium at 1440x900 and shows the downgrade notice;
// a faster dev machine gets High and never sees it. Pin every page to the CI profile so local runs match CI.
// A test can still override it with its own page.addInitScript (page scripts run after this context script).
export const CI_DEVICE = Object.freeze({ cores: 4, memoryGiB: 8 });
// CI_DEVICE alone picks Medium, which draws the full 3D look (HDRI, PBR road, scenery GLBs, wet mirror): on CI's software
// WebGL that doubled every spec's time and timed out 13 of 16 shards. Specs start with the settings a weak device gets
// (saved, so no downgrade notice); a spec about the look pins its tier, one about the automatic choice sets lowGraphics: false.
const LOW_VISUALS = initialDeviceVisuals({ device: { cores: 2 } }).settings;

export const test = base.extend({
  guideSeen: [true, { option: true }],
  keepAcquisitionOpen: [false, { option: true }],
  page: async ({ page, keepAcquisitionOpen }, use) => {
    // Existing flows exercise the real results/Garage controls after accepting any earned rewards.
    // The acquisition suite opts out to assert the modal's behavior and focus directly.
    if (!keepAcquisitionOpen) await page.addLocatorHandler(page.locator('#acquisition-reveal[open]'), async reveal => {
      await reveal.locator('.acquisition-continue').click();
    });
    await use(page);
  },
  // A player with no What's New record gets the notes on load; mark them read so other specs start clean.
  whatsNewSeen: ['999.0.0', { option: true }],
  lowGraphics: [true, { option: true }],
  context: async ({ context, guideSeen, whatsNewSeen, lowGraphics }, use) => {
    if (guideSeen) await context.addInitScript(() => localStorage.setItem('skyline-rush-guide-seen', '1'));
    if (whatsNewSeen) await context.addInitScript(seen => localStorage.setItem('skyline-rush-whats-new-seen-v1', seen), whatsNewSeen);
    // Only when unset: a reload keeps a tier the spec chose in Settings, and page scripts that seed one run after this.
    if (lowGraphics) await context.addInitScript(([key, visuals]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, visuals);
    }, [QUALITY_STORAGE_KEY, JSON.stringify(LOW_VISUALS)]);
    await context.addInitScript(({ cores, memoryGiB }) => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => cores });
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => memoryGiB });
    }, CI_DEVICE);
    await use(context);
  },
});

// Overlays enter with a transform (Garage/history `history-in` translateX 22px; pause and results `.overlay-content`
// translateY 12px / translateX 48px). A rect read mid-entry is shifted and goes through float32 transform math: a 144 px
// thumbnail measured 144.00001526 and a 44 px button 43.99998474. Resolves once the element is visible and every finite
// animation on it and its ancestors has finished; measure anything inside an overlay only after this.
export const settled = async locator => {
  await expect(locator).toBeVisible();
  await locator.evaluate(el => Promise.all(document.getAnimations().filter(animation => {
    const target = animation.effect?.target;
    return target?.contains(el) && animation.effect.getComputedTiming().endTime !== Infinity;
  }).map(animation => animation.finished.catch(() => {}))));
};

export const openGarage = async (page, action = 'click') => {
  await page.locator('#garage-button')[action]();
  await settled(page.locator('#garage-screen'));
};

export { expect, chromium };
