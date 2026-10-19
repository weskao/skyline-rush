import { test, expect } from '@playwright/test';

const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

test('shared motion tokens control button feedback and comfort removes movement', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.documentElement.style.setProperty('--dur-base', '370ms'));
  await expect(page.locator('#start-button')).toHaveCSS('transition-duration', /0\.37s/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#start-button')).toHaveCSS('transition-duration', '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="comfortable"]').check();
  await expect(page.locator('#start-button')).toHaveCSS('transition-duration', '0s');
});

test('buttons compress on press and spring back after a cancelled click', async ({ page }) => {
  await open(page);
  const button = page.locator('#start-button');
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button).toHaveCSS('scale', '0.96');
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(button).toHaveCSS('scale', '1');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});

test.describe('touch button feedback', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('held flight glows and releasing or pausing clears its pressed state', async ({ page, context }) => {
    await open(page);
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    // AUTO holds throttle logically; only an actual press compresses the button.
    await expect(page.locator('[data-control="throttle"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-control="throttle"]')).toHaveCSS('scale', '1');
    const button = page.locator('[data-control="fly"]');
    const box = await button.boundingBox();
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveCSS('box-shadow', /rgb/);
    await expect(button).toHaveCSS('scale', '0.96');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveCSS('scale', '1');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 2, x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect(button).toHaveCSS('scale', '0.96');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#race-status')).toHaveText('PAUSED');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).not.toHaveClass(/is-pressed/);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  });

  test('optional haptics acknowledge contact once and respect the disabled setting', async ({ page }) => {
    await page.addInitScript(() => {
      window.vibrations = [];
      Object.defineProperty(navigator, 'vibrate', { value: pattern => { window.vibrations.push(pattern); return true; } });
    });
    await open(page);
    await page.locator('#vfx-panel > summary').click();
    await page.locator('[data-vfx="haptics"]').check();
    await page.locator('#vfx-panel > summary').click();
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(100);
    await page.keyboard.down('d');
    await expect(page.locator('#impact-report')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.vibrations.filter(Array.isArray).length)).toBe(1);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.vibrations.filter(Array.isArray).length)).toBe(1);
    await page.keyboard.up('d');
    await page.locator('#vfx-panel > summary').click();
    await page.locator('[data-vfx="haptics"]').uncheck();
    await page.locator('#vfx-panel > summary').click();
    const count = await page.evaluate(() => window.vibrations.length);
    await page.keyboard.down('d');
    await page.waitForTimeout(1800);
    expect(await page.evaluate(() => window.vibrations.length)).toBe(count);
    await page.keyboard.up('d');
  });
});

test('speed dial eases as speed rises and a lost place flips with a readable down arrow', async ({ page }) => {
  await open(page);
  await expect(page.locator('#speed-needle')).toBeVisible();
  const initial = await page.locator('#speed-needle').evaluate(element => getComputedStyle(element).transform);
  await page.evaluate(() => {
    window.placeChanges = [];
    const position = document.querySelector('#position');
    new MutationObserver(() => {
      const arrow = document.querySelector('#position-change');
      window.placeChanges.push({ arrow: arrow?.textContent, direction: arrow?.dataset.direction,
        animated: position.getAnimations().length > 0 });
    }).observe(position, { childList: true });
  });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect.poll(() => page.evaluate(() => window.placeChanges.some(change => change.arrow === '↓' && change.direction === 'lost' && change.animated))).toBe(true);
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(60);
  const needle = page.locator('#speed-needle');
  await expect(needle).not.toHaveCSS('transform', initial);
  await expect(needle).toHaveCSS('transition-duration', '0.24s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(needle).toHaveCSS('transition-duration', '0s');
  expect(await page.locator('#position').evaluate(element => element.getAnimations().length)).toBe(0);
});

test('leaderboard moves the same racer rows with FLIP only when order changes', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const board = document.querySelector('#leaderboard');
    const original = new Map([...board.children].map(row => [row.querySelector('strong').textContent, row]));
    window.reorders = [];
    new MutationObserver(() => window.reorders.push({
      stable: [...board.children].every(row => original.get(row.querySelector('strong').textContent) === row),
      animated: [...board.children].some(row => row.getAnimations().some(animation => animation.effect.getKeyframes().some(frame => frame.transform?.includes('translateY')))),
    })).observe(board, { childList: true });
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.reorders)).toEqual([]);
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect.poll(() => page.evaluate(() => window.reorders.some(change => change.stable && change.animated))).toBe(true);
  await page.locator('#pause-button').click();
  await page.waitForTimeout(600);
  expect(await page.locator('#leaderboard .racer').evaluateAll(rows => rows.reduce((count, row) => count + row.getAnimations().length, 0))).toBe(0);
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`race callout is a small translucent chip clear of the centre view at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const chip = await page.evaluate(() => {
      const callout = document.querySelector('#event-callout');
      callout.hidden = false;
      const report = callout.querySelector('#skill-report');
      report.hidden = false;
      report.innerHTML = 'NEAR MISS ×3<span>CLOSE PASS · +20% CHARGE</span>';
      const { top, bottom, height } = callout.getBoundingClientRect();
      const style = getComputedStyle(callout);
      const alpha = style.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean)[3];
      return { top, bottom, height, alpha: alpha === undefined ? 1 : Number(alpha), border: parseFloat(style.borderTopWidth) };
    });
    expect(chip.alpha).toBeLessThanOrEqual(0.45);
    expect(chip.border).toBe(0);
    expect(chip.height).toBeLessThanOrEqual(viewport.height * 0.2);
    expect(chip.bottom).toBeLessThanOrEqual(viewport.height * 0.45);
  });
}

for (const [name, viewport] of [
  ['portrait', { width: 390, height: 844 }],
  ['narrow', { width: 320, height: 740 }],
  ['landscape', { width: 844, height: 390 }],
]) test.describe(`motion on ${name}`, () => {
  test.use({ hasTouch: true, viewport });
  test('race feedback fits, reduced motion stays readable, and restart clears queued events', async ({ page }) => {
    await open(page);
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const callout = page.locator('#event-callout');
    await expect(callout).toBeVisible({ timeout: 35000 });
    await expect(page.locator('#event-callout > div:visible')).toHaveCount(1);
    // One synchronous read: the callout expires after 1.2s, so separate boundingBox() round trips can miss it on slow CI.
    const boxes = await page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
      const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
      return [selector, { x, y, width, height }];
    })), ['#event-callout', '.speed-dial', '#leaderboard', '.race-progress', '.mode-indicator']);
    for (const selector of ['#event-callout', '.speed-dial', '#leaderboard']) {
      const box = boxes[selector];
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    const popup = boxes['#event-callout'];
    for (const selector of ['.race-progress', '.mode-indicator']) {
      const panel = boxes[selector];
      expect(popup.x + popup.width <= panel.x || panel.x + panel.width <= popup.x ||
        popup.y + popup.height <= panel.y || panel.y + panel.height <= popup.y, `Callout overlaps ${selector} ${JSON.stringify([popup, panel])}`).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('#speed-needle')).toHaveCSS('transition-duration', '0s');
    await expect.poll(() => callout.evaluate(element => element.getAnimations().length)).toBe(0);
    await expect(page.locator('#speed')).not.toHaveText('0');
    await page.locator('#pause-button').click();
    await expect(callout).toBeHidden();
    await page.locator('#restart-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
    await expect(callout).toBeHidden();
  });
});
