import { test, expect } from './helpers/test.js';

// RED baseline: the existing HUD repeats DOM lookups and rewrites unchanged labels.
// Count observable work in the real browser rather than checking source formatting.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`steady racing HUD does not query elements or rewrite static labels at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      window.__hudAudit = { queries: 0, textWrites: 0 };
      window.__hudAuditActive = false;
      const query = Document.prototype.querySelector;
      Document.prototype.querySelector = function(selector) {
        if (window.__hudAuditActive && typeof selector === 'string' && selector.startsWith('#'))
          window.__hudAudit.queries++;
        return query.call(this, selector);
      };
      const text = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      const steady = new Set(['race-length', 'aero-flow', 'aero-floor', 'aero-jet']);
      Object.defineProperty(Node.prototype, 'textContent', {
        configurable: true,
        get: text.get,
        set(value) {
          if (window.__hudAuditActive && this.nodeType === Node.ELEMENT_NODE && steady.has(this.id))
            window.__hudAudit.textWrites++;
          text.set.call(this, value);
        },
      });
    });
    await page.goto('/');
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await page.evaluate(() => { window.__hudAudit.queries = 0; window.__hudAudit.textWrites = 0; window.__hudAuditActive = true; });
    await page.waitForTimeout(900);
    const measured = await page.evaluate(() => { window.__hudAuditActive = false; return window.__hudAudit; });
    console.log(`HUD baseline/optimized ${viewport.width}px: ${JSON.stringify(measured)} (900 ms)`);
    expect(measured.queries, 'static HUD lookup count').toBeLessThanOrEqual(2);
    expect(measured.textWrites, 'unchanged HUD label writes').toBe(0);
  });
}
