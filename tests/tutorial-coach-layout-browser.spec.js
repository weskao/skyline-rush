import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { toggleSettingsSection } from './helpers/settings-browser.js';

// Layout contract: the same live lesson, controls and readable toast on every device class.
const viewports = [
  { width: 320, height: 568, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 743, height: 340, mobile: true },
  { width: 844, height: 390, mobile: true },
  { width: 1280, height: 800, mobile: false },
];

for (const { width, height, mobile } of viewports) {
  test.describe(`tutorial coach ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });

    test('keeps a compact, readable lesson and stable nonblocking cue', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
        // AUTO suppresses the GAS cue by design; exercise the visible cue layout in manual mode.
        localStorage.setItem('skyline-rush-auto', 'off');
      });
      await page.goto('/');
      await toggleSettingsSection(page, 'driving');
      await page.locator('#tutorial-open').click();
      await expect(page.locator('#tutorial-coach')).toBeVisible();
      await expect(page.locator('#tutorial-cue')).toBeVisible({ timeout: ciTimeout(20000) });
      // No device loses the practice disclaimer, progress or input hint.
      for (const id of ['#tutorial-title', '#tutorial-progress', '#tutorial-instruction', '#tutorial-input', '#tutorial-assist']) {
        await expect(page.locator(id)).toBeVisible();
      }

      const layout = await page.evaluate(() => {
        const bounds = element => {
          const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const coach = document.querySelector('#tutorial-coach');
        const cue = document.querySelector('#tutorial-cue');
        const card = bounds(coach);
        const toast = bounds(cue);
        const controls = [...document.querySelectorAll('#touch-controls [data-control], #pause-button')]
          .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
          .map(bounds);
        // The existing clock, instruments and app controls have priority over tutorial hints.
        // A compact coach is still a regression if it covers race time (reported at 1440x859).
        const hud = [...document.querySelectorAll(
          '#race-clock, #position, .race-progress > :not([hidden]), .telemetry > *, .topbar .brand, .topbar button, .aero-tools button, .aero-tools summary, #touch-controls .touch-pad'
        )].filter(el => {
          const style = getComputedStyle(el);
          return el.getClientRects().length && style.visibility !== 'hidden' && style.display !== 'none';
        }).map(el => ({ ...bounds(el), name: el.id || el.className }));
        const background = getComputedStyle(coach).backgroundColor;
        const alpha = background.startsWith('rgba(') ? Number(background.split(',').at(-1).replace(')', '')) : 1;
        return {
          card, toast, alpha, screen: { width: innerWidth, height: innerHeight },
          copyFont: parseFloat(getComputedStyle(document.querySelector('#tutorial-instruction')).fontSize),
          inputsCovered: controls.some(box => intersects(card, box) || intersects(toast, box)),
          coachCoversCue: intersects(card, toast),
          coachCoversHud: hud.some(box => intersects(card, box)),
          cueCoversHud: hud.filter(box => intersects(toast, box)),
        };
      });

      const { card, toast, screen } = layout;
      const maxWidth = height <= 500 ? 350 : mobile ? 342 : 370;
      expect(card.width).toBeLessThanOrEqual(maxWidth);
      // The road follows the viewport centre, not the left HUD rail, at every orientation.
      expect(Math.abs((card.left + card.right) / 2 - screen.width / 2)).toBeLessThanOrEqual(2);
      expect(card.top).toBeLessThan(screen.height * 0.48); // The coach floats above the road, away from the driving thumbs.
      if (mobile && height > 500) {
        expect(Math.abs((toast.left + toast.right) / 2 - screen.width / 2)).toBeLessThanOrEqual(2);
      }
      expect(layout.alpha).toBeGreaterThanOrEqual(0.68);
      expect(layout.alpha).toBeLessThanOrEqual(0.88);
      expect(layout.copyFont).toBeGreaterThanOrEqual(13);
      expect(layout.inputsCovered).toBe(false);
      expect(layout.coachCoversCue).toBe(false);
      expect(layout.coachCoversHud).toBe(false);
      expect(layout.cueCoversHud).toEqual([]);
      for (const rect of [card, toast]) {
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(screen.width + 1);
        expect(rect.top).toBeGreaterThanOrEqual(0);
        expect(rect.bottom).toBeLessThanOrEqual(screen.height + 1);
      }
      // Toasts keep the existing upper-screen zone rather than jumping into the driving thumb area.
      expect((toast.top + toast.bottom) / (2 * screen.height)).toBeLessThan(0.64);
    });
  });
}

test.describe('Traditional Chinese landscape practice', () => {
  test.use({ viewport: { width: 844, height: 390 }, locale: 'zh-TW', isMobile: true, hasTouch: true });

  test('keeps the turn instruction and completion actions readable', async ({ page }, testInfo) => {
    await page.goto('/');
    await toggleSettingsSection(page, 'driving');
    await page.locator('#tutorial-open').click();
    const skip = page.locator('#tutorial-skip-step');
    await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
    for (const next of ['left', 'right', 'brake', 'drift', 'fly', 'boost', 'airChain', 'barrelRoll', 'nitro', 'complete']) {
      await skip.tap();
      await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', next);
      if (next === 'right') {
        await expect(page.locator('#tutorial-title')).toContainText('3/11');
        await testInfo.attach('turn', { body: await page.screenshot(), contentType: 'image/png' });
      }
    }
    await expect(page.locator('#tutorial-done')).toBeInViewport();
    await expect(page.locator('.tutorial-celebration')).toBeHidden();
    const fits = await page.locator('.tutorial-copy').evaluate(el => el.scrollHeight <= el.clientHeight + 1);
    expect(fits).toBe(true);
    await testInfo.attach('complete', { body: await page.screenshot(), contentType: 'image/png' });
  });
});
