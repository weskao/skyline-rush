import { test, expect } from '@playwright/test';

for (const [width, height, hasTouch] of [
  [320, 568, true], [390, 844, true], [568, 320, true], [844, 390, true],
  [768, 1024, true], [768, 600, true], [761, 501, false], [760, 501, true],
  [1024, 768, true], [900, 600, false],
  [1280, 720, false], [1440, 900, false], [1804, 504, false], [2560, 1440, false],
]) {
  test.describe(`start layout ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch });

    test('intro content stays clear of the HUD and actions remain reachable', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const intro = page.locator('#intro');
      await intro.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const bounds = await intro.boundingBox();
      for (const selector of ['.telemetry', '.topbar', '.aero-tools', '.bottomline']) {
        const panel = page.locator(selector);
        if (!await panel.isVisible()) continue;
        const box = await panel.boundingBox();
        expect(bounds.x + bounds.width <= box.x || box.x + box.width <= bounds.x ||
          bounds.y + bounds.height <= box.y || box.y + box.height <= bounds.y,
        `Intro overlaps ${selector}`).toBe(true);
      }
      expect(await intro.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      for (const selector of ['#start-button', '.history-button', '.flight-tip']) {
        const item = intro.locator(selector);
        if (!await item.isVisible()) continue;
        await item.scrollIntoViewIfNeeded();
        const box = await item.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(bounds.x);
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        expect(box.y).toBeGreaterThanOrEqual(bounds.y);
        expect(box.y + box.height).toBeLessThanOrEqual(Math.min(bounds.y + bounds.height, height));
      }
      const [start, history] = await Promise.all([
        intro.locator('#start-button').boundingBox(), intro.locator('.history-button').boundingBox(),
      ]);
      expect(start.x + start.width <= history.x || history.x + history.width <= start.x ||
        start.y + start.height <= history.y || history.y + history.height <= start.y).toBe(true);
      await intro.locator('.history-button').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close history' }).click();
      await page.locator('#start-button').click();
      await expect(intro).toBeHidden();
      await expect(page.locator('.telemetry')).toBeVisible();
      await expect(page.locator('#race-status')).toHaveText('RACING');
    });
  });
}

// 874x339 is iPhone landscape Safari with its toolbar showing (402 pt screen minus ~63 pt of chrome).
for (const [width, height] of [[844, 390], [874, 339]]) {
  test.describe(`touch race HUD ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('START RACE is on screen without scrolling the intro', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const intro = page.locator('#intro');
      await intro.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const [panel, start] = await Promise.all([intro.boundingBox(), page.locator('#start-button').boundingBox()]);
      expect(start.y + start.height).toBeLessThanOrEqual(Math.min(panel.y + panel.height, height));
      expect(await intro.evaluate(el => el.scrollTop)).toBe(0);
    });

    test('racing HUD blocks stay apart', async ({ page, context }) => {
      // iPhone landscape keeps a home-indicator inset below the page; it lifts every bottom-anchored block.
      if (height < 380) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 62, right: 62, top: 0, bottom: 21 } });
      await page.goto('/');
      await page.waitForTimeout(700);
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      await expect(page.locator('#countdown')).toBeHidden();
      const blocks = ['.position-stat', '.leaderboard', '.race-progress', '.mode-indicator', '.speedometer',
        '.flight-telemetry', '.aero-tools', '#controls-button', '#pause-button',
        // .touch-pad is left out: it is the invisible slide zone the pointer-transparent HUD sits on.
        ...['fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];
      const boxes = [];
      for (const selector of blocks) {
        const block = page.locator(selector).first();
        if (await block.isVisible()) boxes.push([selector, await block.boundingBox()]);
      }
      const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      const overlaps = boxes.flatMap(([name, box], i) => boxes.slice(i + 1).filter(([, other]) => !apart(box, other)).map(([other]) => `${name} × ${other}`));
      expect(overlaps).toEqual([]);
      for (const [name, box] of boxes) expect(box.y + box.height, `${name} below the screen`).toBeLessThanOrEqual(height);
    });
  });
}
