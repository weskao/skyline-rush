import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

const bodyOpacity = page => page.evaluate(() => window.gameScene.player.userData.body.material.opacity);

async function checkContactFeedback({ page, gameplayURL }, testInfo) {
  test.setTimeout(ciTimeout(90000));
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' })));
  await captureHooks(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(gameplayURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.gameplay && !!window.gameScene);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
  await page.evaluate(() => {
    const race = window.gameplay.race, player = race.player;
    race.countdown = 0.01;
    Object.assign(race, { rivals: [], props: [], hazards: [], traffic: [] });
    Object.assign(player, { x: 0, distance: 300, speed: 55 });
    race.traffic = [[0, 304.45], [-2, 301], [2, 301]].map(([x, distance], color) => ({
      x, homeX: x, distance, speed: 22, cruise: 22, altitude: 0, cooldown: 0, laneShift: 0, color,
    }));
  });
  const report = page.locator('#impact-report');
  await expect(report).toBeVisible();
  await expect(report).toContainText('VEHICLE');
  expect(await bodyOpacity(page)).toBe(1); // settled: the crash report confirms the collision frame rendered
  // Move to the recovery phase of this real hit without waiting on the software renderer's race clock.
  await page.evaluate(() => {
    const { player, elapsed } = window.gameplay.race;
    player.impact.time = elapsed - 1;
    player.cooldown = 0.5;
  });
  await expect(report).toContainText('CONTACT PROTECTION');
  await expect(report).toBeVisible();
  const recovery = await page.screenshot({ path: testInfo.outputPath('contact-protection.png') });
  await testInfo.attach('contact-protection', { body: recovery, contentType: 'image/png' });
  const following = await page.evaluate(() => {
    const { player, traffic: [leader] } = window.gameplay.race;
    const state = { collisions: player.collisions, x: player.x, gap: leader.distance - player.distance,
      paceDelta: Math.abs(player.speed - leader.speed) };
    player.effects.ghost = 3;
    return state;
  });
  expect(following.collisions).toBe(1);
  expect(Math.abs(following.x)).toBeLessThan(0.3);
  expect(following.gap).toBeGreaterThanOrEqual(4.4);
  expect(following.paceDelta).toBeLessThan(0.2);
  await expect(page.locator('#ghost-phase-status')).toBeVisible();
  await expect.poll(() => bodyOpacity(page)).toBeLessThan(0.8);
  const ghost = await page.screenshot({ path: testInfo.outputPath('ghost-phase.png') });
  await testInfo.attach('ghost-phase', { body: ghost, contentType: 'image/png' });
  await page.evaluate(() => { window.gameplay.race.player.effects.ghost = 0.05; });
  await expect(page.locator('#ghost-phase-status')).toBeHidden();
  await expect.poll(() => bodyOpacity(page)).toBe(1);
  expect(errors).toEqual([]);
}

test('collision protection stays solid and only Ghost Phase fades the car', checkContactFeedback);
for (const [label, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  test.describe(`touch ${label}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    test('collision and phase remain distinguishable with reduced motion', checkContactFeedback);
  });
}
