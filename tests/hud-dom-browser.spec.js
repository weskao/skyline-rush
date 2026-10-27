import { test, expect } from './helpers/test.js';

// RED baseline: the existing HUD repeats DOM lookups and rewrites unchanged labels.
// Count observable work in the real browser rather than checking source formatting.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`steady racing HUD does not query elements or rewrite static labels at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      window.__hudAudit = { queries: 0, textWrites: 0, hiddenWrites: 0, redundantTextWrites: 0 };
      window.__hudAuditActive = false;
      const query = Document.prototype.querySelector;
      Document.prototype.querySelector = function(selector) {
        if (window.__hudAuditActive && typeof selector === 'string' && selector.startsWith('#'))
          window.__hudAudit.queries++;
        return query.call(this, selector);
      };
      const text = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      const watchRedundancy = new Set(['item-status', 'style-score', 'flight-state', 'flight-instruction', 'fuel-caption', 'climb-rate', 'driving-message', 'speed', 'timer', 'distance', 'nitro-status', 'boost-status']);
      const steady = new Set(['race-length', 'aero-flow', 'aero-floor', 'aero-jet', 'race-status', 'speed-caption', 'countdown-label']);
      const hiddenSteady = new Set(['clean-trial-hud', 'hazard-warning', 'elimination-hud', 'checkpoint-hud', 'sprint-stage', 'item-slot', 'stunt-hud', 'practice-hud', 'ghost-split']);
      const hidden = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
      Object.defineProperty(HTMLElement.prototype, 'hidden', {
        configurable: true,
        get: hidden.get,
        set(value) {
          if (window.__hudAuditActive && hiddenSteady.has(this.id)) window.__hudAudit.hiddenWrites++;
          hidden.set.call(this, value);
        },
      });
      Object.defineProperty(Node.prototype, 'textContent', {
        configurable: true,
        get: text.get,
        set(value) {
          if (window.__hudAuditActive && this.nodeType === Node.ELEMENT_NODE && watchRedundancy.has(this.id) && text.get.call(this) === value)
            window.__hudAudit.redundantTextWrites++;
          if (window.__hudAuditActive && this.nodeType === Node.ELEMENT_NODE && steady.has(this.id))
            window.__hudAudit.textWrites++;
          text.set.call(this, value);
        },
      });
    });
    await page.goto('/');
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await page.evaluate(() => { window.__hudAudit.queries = 0; window.__hudAudit.textWrites = 0; window.__hudAudit.hiddenWrites = 0; window.__hudAudit.redundantTextWrites = 0; window.__hudAuditActive = true; });
    await page.waitForTimeout(900);
    const measured = await page.evaluate(() => { window.__hudAuditActive = false; return window.__hudAudit; });
    console.log(`HUD baseline/optimized ${viewport.width}px: ${JSON.stringify(measured)} (900 ms)`);
    expect(measured.queries, 'static HUD lookup count').toBeLessThanOrEqual(2);
    expect(measured.textWrites, 'unchanged HUD label writes').toBe(0);
    expect(measured.hiddenWrites, 'unchanged HUD visibility writes').toBe(0);
    expect(measured.redundantTextWrites, 'redundant HUD text setters').toBe(0);
  });
}
