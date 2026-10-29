import { test, expect } from './helpers/test.js';
import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { RACE_TRACKS } from '../src/game.js';

const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['portrait', { width: 390, height: 844 }, true],
  ['narrow', { width: 320, height: 740 }, true],
  ['landscape', { width: 844, height: 390 }, true],
]) test.describe(`presentation ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('track previews, countdown, pause and restart have interruptible motion', async ({ page }) => {
    await open(page);
    await expect(page.locator('.track-preview')).toHaveCount(Object.keys(RACE_TRACKS).length);
    await expect(page.locator('.track-preview').first()).toHaveCSS('animation-play-state', 'running');
    await page.evaluate(() => {
      window.uiMotion = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        window.uiMotion.push(this.id || this.className);
        return animate.apply(this, args);
      };
    });
    await page.locator('#start-button').click();
    await expect(page.locator('#countdown')).toBeVisible();
    if (hasTouch && viewport.width <= 400) {
      // fe54c24's right-thumb block is 2x2, [NITRO][GAS] over [BOOST][FLY], at the lower right below the centred car,
      // held --thumb-edge (24px) off the edge: the thumb pivots on the side edge, so the very corner is the hardest reach.
      const [nitro, gas, boost] = await Promise.all(['nitro', 'throttle', 'boost'].map(action => page.locator(`[data-control="${action}"]`).boundingBox()));
      expect(nitro.x, 'NITRO stays in the right thumb half, clear of the centred car').toBeGreaterThanOrEqual(viewport.width / 2);
      expect(Math.abs(nitro.x - boost.x), 'NITRO sits above BOOST').toBeLessThanOrEqual(1);
      expect(Math.abs(nitro.y - gas.y), 'NITRO sits beside GAS').toBeLessThanOrEqual(1);
      const edge = viewport.width - (gas.x + gas.width);
      expect(edge, 'the block sits off the corner').toBeGreaterThanOrEqual(23.5);
      expect(edge, 'the block stays at the right edge').toBeLessThanOrEqual(24.5);
    }
    await page.waitForTimeout(300);
    const overlaps = await page.evaluate(() => {
      const countdown = document.querySelector('#countdown').getBoundingClientRect();
      return ['.race-progress', '.mode-indicator', '.fuel-stat', '.speedometer'].filter(selector => {
        const element = document.querySelector(selector), style = getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        const panel = element.getBoundingClientRect();
        return panel.width && panel.height && countdown.left < panel.right && panel.left < countdown.right && countdown.top < panel.bottom && panel.top < countdown.bottom;
      });
    });
    expect(overlaps, 'Countdown must remain clear of visible instruments').toEqual([]);
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.locator('#countdown')).toBeHidden();
    const hudOverlap = await page.evaluate(() => {
      const a = document.querySelector('#leaderboard').getBoundingClientRect();
      const b = document.querySelector('.flight-telemetry').getBoundingClientRect();
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    });
    expect(hudOverlap, 'Rival rankings must not cover charge and altitude instruments').toBe(false);
    expect(await page.evaluate(() => window.uiMotion)).toEqual(expect.arrayContaining(['intro', 'countdown']));
    await page.locator('#pause-button').click();
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('.overlay-content')).toBeInViewport();
    await page.locator('#restart-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    expect(await page.evaluate(() => window.uiMotion)).toContain('race-wipe');
    await expect(page.locator('#race-wipe')).toBeHidden();
    await expect(page.locator('#race-overlay')).toBeHidden();
    await expect(page.locator('.track-preview').first()).toHaveCSS('animation-play-state', 'paused');
  });
});

test('reduced-motion and comfort suppress presentation movement and looping previews', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('.track-preview').first()).toHaveCSS('animation-name', 'none');
  await page.locator('.history-button').click();
  expect(await page.locator('#history-screen').evaluate(el => el.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="comfortable"]').check();
  await expect(page.locator('.track-preview').first()).toHaveCSS('animation-name', 'none');
});

test('enabling reduced motion interrupts an intro exit already in progress', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.documentElement.style.setProperty('--dur-base', '4000ms'));
  await page.locator('#start-button').click();
  expect(await page.locator('#intro').evaluate(el => el.getAnimations().length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Leave room for a software-rendered frame, but fail before the 4 s animation expires naturally (fixed budget: never scaled).
  await expect.poll(() => page.locator('#intro').evaluate(el => el.getAnimations().length), { timeout: 2000 }).toBe(0);
  await expect(page.locator('#intro')).toBeHidden();
});

for (const [name, viewport, hasTouch, reducedMotion] of [
  ['desktop', { width: 1440, height: 900 }, false, 'no-preference'],
  ['phone reduced motion', { width: 390, height: 844 }, true, 'reduce'],
]) gameplayTest.describe(`finish ${name}`, () => {
  gameplayTest.use({ viewport, hasTouch, reducedMotion });
  gameplayTest('crossing the finish reveals accurate results once, keeps its official time and returns to menu', async ({ gameplayPage: page }) => {
    await page.evaluate(() => {
      window.finishEvidence = {};
      const overlay = document.querySelector('#race-overlay');
      const observer = new MutationObserver(() => {
        const data = window.finishEvidence;
        if (document.body.dataset.phase === 'finished' && !data.finishedAt) {
          data.finishedAt = performance.now(); data.initiallyHidden = overlay.hidden;
          data.time = document.querySelector('#timer').textContent;
        }
        if (data.finishedAt && !overlay.hidden && !data.revealedAt) data.revealedAt = performance.now();
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-phase'] });
      observer.observe(overlay, { attributes: true, attributeFilter: ['hidden'] });
    });
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    // The full 5 km production-bundle run lives in browser.spec.js; this test owns the finish transition.
    await page.evaluate(() => {
      const race = window.gameplay.race;
      race.elapsed = 80;
      Object.assign(race.player, { distance: race.length - 10, speed: 60 });
    });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#again-button')).toBeFocused();
    await expect(page.locator('#new-best')).toBeVisible();
    await expect.poll(() => page.locator('#result-stats > div:nth-child(2) strong').textContent()).toBe(await page.locator('#timer').textContent());
    const evidence = await page.evaluate(() => window.finishEvidence);
    if (reducedMotion === 'reduce') expect(evidence.revealedAt - evidence.finishedAt).toBeLessThan(200);
    else { expect(evidence.initiallyHidden).toBe(true); expect(evidence.revealedAt - evidence.finishedAt).toBeGreaterThan(450); }
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-history')));
    expect(records).toHaveLength(1);
    await page.waitForTimeout(300);
    await expect(page.locator('#timer')).toHaveText(evidence.time);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-history')).length)).toBe(1);
    await page.locator('#choose-track').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('#intro')).toBeVisible();
  });
});
