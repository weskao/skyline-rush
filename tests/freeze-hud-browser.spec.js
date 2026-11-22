import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { settled } from './helpers/test.js';

// The Freeze HUD in a real browser (user 2026-11-21): frost grows from all four corners at full size (a global svg
// height rule once squashed it to a 22px strip), the centre and the controls stay clear, a repeated hit replays the
// frost, it thaws on recovery, and reduced motion or disabled VFX leave it still.
const frost = page => page.locator('#player-hit-screen [data-hit-layer="freeze"] .freeze-frost');

test('Freeze frames the screen with frost from its four corners, replays on a repeated hit and thaws', async ({ page, gameplayURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=zh-TW`);
  await page.waitForFunction(() => !!window.debuffHud);
  await page.evaluate(() => window.debuffHud.hit('freeze', 220));
  await expect(frost(page)).toHaveCount(4);
  await page.emulateMedia({ reducedMotion: 'reduce' }); // measure the frost at rest, not mid-grow
  await settled(page.locator('#race-player-hit-center [data-debuff="freeze"]'));
  const boxes = await frost(page).evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(120);
    expect(Math.abs(box.height - box.width)).toBeLessThan(1);
  }
  const corners = boxes.map(box => [Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)]);
  expect(corners.some(([l, t]) => l === 0 && t === 0)).toBe(true);
  expect(corners.some(([, , r, b]) => r === 390 && b === 844)).toBe(true);
  const screen = page.locator('#player-hit-screen [data-hit-layer="freeze"] .freeze-screen');
  await expect(screen).toHaveCSS('mask-image', /radial-gradient\(.*rgba\(0, 0, 0, 0\)/);
  await expect(page.locator('#player-hit-screen')).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('#race-player-hit-center [data-debuff="freeze"] .freeze-panel-icicles')).toBeVisible();

  await frost(page).first().evaluate(node => { node.dataset.probe = 'first'; });
  const layer = page.locator('#player-hit-screen [data-hit-layer="freeze"]');
  await page.evaluate(() => {
    const { race, update } = window.debuffHud;
    race.elapsed += 1; // into the active phase
    update();
  });
  await expect(layer).toHaveAttribute('data-phase', 'active');
  await page.evaluate(() => window.debuffHud.hit('freeze', 230));
  await expect(layer).toHaveAttribute('data-phase', 'impact');
  await expect(page.locator('[data-probe="first"]')).toHaveCount(0); // the frost remounted, so it grows again

  await page.evaluate(() => {
    const { race, update } = window.debuffHud;
    race.elapsed = race.player.freezeUntil - 0.3;
    update();
  });
  await expect(page.locator('#player-hit-screen [data-hit-layer="freeze"]')).toHaveAttribute('data-phase', 'recovery');
  await expect(page.locator('#player-hit-screen [data-hit-layer="freeze"] .freeze-crack').first()).toHaveCSS('opacity', '1');
});

test('reduced motion and disabled VFX keep the Freeze frost still', async ({ page, gameplayURL }) => {
  await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=en`);
  await page.waitForFunction(() => !!window.debuffHud);
  await page.evaluate(() => window.debuffHud.hit('freeze', 220));
  const moving = () => page.evaluate(() => [...document.querySelectorAll('.freeze-screen *, .freeze-panel *')]
    .some(node => getComputedStyle(node).animationName !== 'none'));
  await expect.poll(moving).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(moving).toBe(false);
  await expect(frost(page).first()).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });
  await expect.poll(moving).toBe(false);
});
