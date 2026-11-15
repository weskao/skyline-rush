import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Player pickup feedback outside the 3D effect: a light haptic pulse per tier, and a fuel-bar flash with "+N".
async function startRace(page) {
  await page.locator('#start-button').click();
  if (await page.locator('#tutorial-exit').isVisible()) await page.locator('#tutorial-exit').click();
  await page.evaluate(() => { if (window.gameplay.race.phase === 'countdown') window.gameplay.race.countdown = 0; });
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(10000) });
}
// A real take: the magnet pulls an item 3 m ahead into the car on the next simulation step.
const offer = (page, tier, fuel = 50) => page.evaluate(({ tier, fuel }) => {
  const { race } = window.gameplay, car = race.player;
  car.fuel = fuel;
  car.effects.magnet = Math.max(car.effects.magnet, 5);
  car.effects.ghost = Math.max(car.effects.ghost, 5); // no traffic hit pre-empts the pickup pulse
  race.pickups = [{ tier, x: car.x, altitude: car.altitude, distance: car.distance + 3 }];
}, { tier, fuel });
const takenBy = page => page.evaluate(() => window.gameplay.race.player.pickup);

test.describe('pickup haptics on a phone', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('each player take pulses once, lighter for a can than for a tank', async ({ gameplayPage: page }) => {
    await page.addInitScript(() => {
      window.vibrations = [];
      Object.defineProperty(navigator, 'vibrate', { value: pattern => { window.vibrations.push(pattern); return true; } });
    });
    await page.reload();
    await page.locator('#vfx-panel > summary').click();
    await page.locator('[data-vfx="haptics"]').check();
    await page.locator('#vfx-panel > summary').click();
    await startRace(page);
    for (const [tier, pulse] of [['can', 9], ['tank', 14]]) {
      const before = await page.evaluate(() => window.vibrations.length);
      await offer(page, tier);
      await expect.poll(async () => (await takenBy(page))?.tier).toBe(tier);
      await expect.poll(() => page.evaluate(n => window.vibrations.slice(n), before)).toContain(pulse);
      await page.waitForTimeout(ciTimeout(300));
      // settled: an absence check, no second pulse for the same take
      expect(await page.evaluate(({ n, pulse }) => window.vibrations.slice(n).filter(p => p === pulse).length, { n: before, pulse })).toBe(1);
    }
  });
});

// The cue extends the fuel meter's existing data-refilling state; "+N" is the fuel the take actually added.
const fuelCue = page => page.evaluate(() => {
  const gain = document.getElementById('fuel-gain'), box = gain?.getBoundingClientRect();
  const label = document.querySelector('.fuel-heading .stat-label').getBoundingClientRect();
  return {
    refilling: document.getElementById('fuel-meter').dataset.refilling,
    shown: !!gain && !gain.hidden && box.width > 0 && getComputedStyle(gain).visibility === 'visible',
    text: gain?.textContent,
    inView: !!box && box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
    clearOfLabel: !box || box.left >= label.right || box.right <= label.left || box.top >= label.bottom || box.bottom <= label.top,
    moves: (gain?.getAnimations() ?? []).some(a => a.effect.getKeyframes().some(k => k.transform && k.transform !== 'none')),
  };
});
for (const [name, viewport, reducedMotion] of [
  ['desktop', { width: 1440, height: 900 }, 'no-preference'],
  ['phone portrait', { width: 390, height: 844 }, 'no-preference'],
  ['phone landscape', { width: 844, height: 390 }, 'no-preference'],
  ['phone portrait, Reduced Motion', { width: 390, height: 844 }, 'reduce'],
]) test.describe(`pickup fuel cue, ${name}`, () => {
  test.use({ viewport, hasTouch: name.startsWith('phone') });
  test('a can flashes the fuel bar and shows the fuel it added, then clears', async ({ gameplayPage: page }) => {
    await page.emulateMedia({ reducedMotion });
    await startRace(page);
    // phones hide the telemetry while the GO countdown shows (style.css :has(#countdown))
    await expect(page.locator('#fuel-meter')).toBeVisible({ timeout: ciTimeout(5000) });
    await offer(page, 'can');
    await expect.poll(() => fuelCue(page)).toMatchObject({ refilling: 'pickup', shown: true, text: '+10', inView: true, clearOfLabel: true });
    expect((await fuelCue(page)).moves).toBe(reducedMotion !== 'reduce');
    await test.info().attach(`pickup-fuel-cue-${name}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    await expect.poll(() => fuelCue(page), { timeout: ciTimeout(6000) }).toMatchObject({ shown: false });
    expect((await fuelCue(page)).refilling).not.toBe('pickup'); // settled: the cue cleared in the poll above
    await offer(page, 'can', 100);
    await expect.poll(async () => (await takenBy(page))?.fuel).toBe(0);
    expect(await fuelCue(page)).toMatchObject({ shown: false }); // settled: a take that added no fuel shows no "+0"
  });
});
