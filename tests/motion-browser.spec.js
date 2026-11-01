import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['touch', { width: 390, height: 844 }, true],
]) test.describe(`air tricks ${name}`, () => {
  test.use({ viewport, hasTouch });
  test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); });
  test('an airborne flick rolls the car, announces the landing and acknowledges its payout once', async ({ gameplayPage: page }) => {
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.locator('#countdown')).toBeHidden();
    await page.locator('#vfx-panel > summary').click();
    await page.locator('[data-vfx="haptics"]').check();
    await page.locator('#vfx-panel > summary').click();
    // Keep the flick and landing on simulation time, independent of software-rendering speed.
    await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
    await page.evaluate(() => {
      window.vibrations = [];
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value: pattern => { window.vibrations.push(pattern); return true; } });
      const race = window.gameplay.race;
      race.rivals = []; race.traffic = []; race.pickups = []; race.rings = [];
      Object.assign(race.player, { speed: 60, altitude: 4, verticalSpeed: 0, fuel: 95 });
    });
    if (hasTouch) {
      const pad = page.locator('.touch-pad'), box = await pad.boundingBox();
      const pointer = { pointerId: 91, pointerType: 'touch', clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
      await pad.dispatchEvent('pointerdown', pointer);
      await pad.dispatchEvent('pointermove', { ...pointer, clientX: pointer.clientX - 30 });
      await page.clock.runFor(50);
      await pad.dispatchEvent('pointermove', { ...pointer, clientX: pointer.clientX + 30 });
      await page.clock.runFor(70);
      await pad.dispatchEvent('pointerup', pointer);
    } else {
      await page.keyboard.down('a');
      await page.clock.runFor(50);
      await page.keyboard.up('a');
      await page.keyboard.down('d');
      await page.clock.runFor(70);
      await page.keyboard.up('d');
    }
    await page.clock.runFor(100);
    await expect(page.locator('#flight-state')).toHaveText('TRICK');
    await expect(page.locator('#event-callout')).toContainText('BARREL ROLL');
    await expect.poll(() => page.evaluate(() => Math.abs(Math.sin(window.gameScene.player.rotation.z)))).toBeGreaterThan(.4);
    // A 4 m glide lands on its own (~1.1 s, 7.5 m/s) after the 0.7 s roll: a clean, paid landing.
    await page.clock.runFor(1000);
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.trickPayout?.nitro)).toBe(.25);
    await page.clock.runFor(500); // Let the queued landing callout replace BARREL ROLL.
    await expect(page.locator('#event-callout')).toContainText('TRICK +0.25');
    expect(await page.evaluate(() => window.vibrations.filter(value => JSON.stringify(value) === '[12,20,12]').length)).toBe(hasTouch ? 1 : 0);
    await page.clock.runFor(500);
    expect(await page.evaluate(() => window.vibrations.filter(value => Array.isArray(value) && value[0] === 12).length)).toBe(hasTouch ? 1 : 0);
    await expect.poll(() => page.evaluate(() => Math.cos(window.gameScene.player.rotation.z))).toBeGreaterThan(.99);
  });

  test('reduced motion and comfort suppress roll movement while keeping trick feedback readable', async ({ gameplayPage: page }) => {
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.locator('#countdown')).toBeHidden();
    for (const mode of ['reduce', 'comfortable']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
      if (mode === 'comfortable') {
        await page.locator('#vfx-panel > summary').click();
        await page.locator('[data-vfx="comfortable"]').check();
        await page.locator('#vfx-panel > summary').click();
      }
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.traffic = []; race.pickups = []; race.rings = [];
        Object.assign(race.player, { speed: 60, altitude: 8, verticalSpeed: 0, fuel: 95, trick: { dir: 1, time: .2, done: false } });
      });
      await expect(page.locator('#flight-state')).toHaveText('TRICK');
      await expect(page.locator('#event-callout')).toContainText('BARREL ROLL');
      await expect.poll(() => page.evaluate(() => Math.abs(window.gameScene.player.rotation.z))).toBeLessThan(.01);
      expect(await page.locator('#event-callout').evaluate(element => element.getAnimations().length)).toBe(0);
      await page.evaluate(() => { window.gameplay.race.player.trick = null; });
      await page.waitForTimeout(1400);
    }
  });
});

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

test('buttons darken on press without shrinking, so a click at the border lands and a dragged-off one cancels', async ({ page }) => {
  await open(page);
  const button = page.locator('#start-button');
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button).toHaveCSS('filter', 'brightness(0.82)');
  expect(await button.boundingBox()).toEqual(box);
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(button).toHaveCSS('filter', 'none');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  // A shrinking press moved the edge out from under the pointer and sent this click to the container.
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveAttribute('data-phase', 'ready');
});

test.describe('touch button feedback', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('held flight glows and releasing or pausing clears its pressed state', async ({ page, context }) => {
    await open(page);
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    // AUTO holds throttle logically; only an actual press darkens the button.
    await expect(page.locator('[data-control="throttle"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-control="throttle"]')).toHaveCSS('filter', 'none');
    const button = page.locator('[data-control="fly"]');
    const box = await button.boundingBox();
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveCSS('box-shadow', /rgb/);
    await expect(button).toHaveCSS('filter', 'brightness(0.82)');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveCSS('filter', 'none');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 2, x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await expect(button).toHaveCSS('filter', 'brightness(0.82)');
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
  await expect(page.locator('#speed-needle')).toBeVisible();
  const initial = await page.locator('#speed-needle').evaluate(element => getComputedStyle(element).transform);
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
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const chip = await page.evaluate(() => {
      const callout = document.querySelector('#event-callout');
      callout.hidden = false;
      const report = callout.querySelector('#skill-report');
      report.hidden = false;
      report.innerHTML = 'NEAR MISS ×3<span>CLOSE PASS · +20% CHARGE</span>';
      const box = element => { const { left, right, top, bottom } = element.getBoundingClientRect(); return { left, right, top, bottom }; };
      const style = getComputedStyle(callout);
      const alpha = style.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean)[3];
      return { ...box(callout), height: callout.offsetHeight, progress: box(document.querySelector('.race-progress')),
        alpha: alpha === undefined ? 1 : Number(alpha), border: parseFloat(style.borderTopWidth) };
    });
    expect(chip.alpha).toBeLessThanOrEqual(0.45);
    expect(chip.border).toBe(0);
    expect(chip.height).toBeLessThanOrEqual(viewport.height * 0.2);
    expect(chip.bottom).toBeLessThanOrEqual(viewport.height * 0.45);
    const { progress } = chip;
    expect(chip.right <= progress.left || progress.right <= chip.left || chip.bottom <= progress.top || progress.bottom <= chip.top,
      `Callout covers the race progress bar ${JSON.stringify(chip)}`).toBe(true);
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
    await expect(callout).toBeVisible({ timeout: ciTimeout(35000) });
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
