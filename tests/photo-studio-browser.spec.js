import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { RACE_TRACKS } from '../src/game.js';
import { ciTimeout } from './helpers/ci.js';
import { resizeTo } from './helpers/viewport.js';

// Photo Studio opens from a paused Free Roam race: clean preview, car not covered by the panel, safe-area insets, frozen
// race clock, body.photo-studio flips with [open], Escape keeps the pause, resume drives on. The photo camera orbits the
// player with no track branch (world.js setPhotoView / photoView camera, race-visuals.ts photo), so the asserted layout
// facts are track-independent: desktop (Medium tier) renders every track, the touch layouts run Coast only, and each touch
// class (portrait zh-TW, landscape en-US) boots once and loops its sizes with resizeTo. Every track on phone still
// races under the hero GLB in hero-roadster-tracks-browser.spec.js (pageerror check).
const tracks = Object.keys(RACE_TRACKS);
// Observable racing UI, including the diagnostic strip mounted outside the Vue app.
const backgroundUI = [
  '.telemetry', '#driving-message', '.topbar', '.aero-tools', '#performance-notice',
  '#race-info', '#race-overlay', '#touch-controls', '.scene-shade', '.bottomline',
  '.speed-streaks', '.flight-director', '.altitude-ladder', '#airflow-hud',
  '#event-callout', '#impact-report', '#perf-overlay',
];
async function projectedCar(page) {
  return page.evaluate(() => {
    const { player, camera } = window.gameScene;
    player.updateMatrixWorld(true);
    const points = [];
    player.traverseVisible(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      const { min, max } = mesh.geometry.boundingBox;
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
        const point = player.position.clone().set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
        points.push({ x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 });
      }
    });
    return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
  });
}

// [name, viewport, hasTouch, locale, tracks, extra sizes (resizeTo in the same boot; insets are the app's --safe-* vars)]
const layouts = [
  ['desktop', { width: 1440, height: 900 }, false, 'en-US', tracks],
  ['phone', { width: 390, height: 844 }, true, 'zh-TW', ['coast'], [
    { width: 320, height: 740 }, { width: 390, height: 844, insets: { top: 59, right: 0, bottom: 34, left: 0 } }]],
  ['landscape', { width: 844, height: 390 }, true, 'en-US', ['coast'], [
    { width: 844, height: 390, insets: { top: 0, right: 47, bottom: 21, left: 47 } }]],
];

for (const [name, viewport, hasTouch, locale, trackIds, more = []] of layouts) {
  test.describe(`Photo Studio ${name}`, () => {
    // Config DPR: CI renders 0.25x, since DPR 1 on CPU WebGL left 1440x900 frames so slow ?perf never logged one.
    test.use({ viewport, hasTouch, locale });
    for (const trackId of trackIds) {
      test(`${trackId}: clean preview restores paused UI and driving`, async ({ gameplayPage: page, gameplayURL }) => {
        test.setTimeout(ciTimeout(more.length ? 80000 : 45000)); // folded sizes: estimated 113 s CI for phone, 76 s for landscape
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(ids => {
          localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
          localStorage.setItem('skyline-rush-music', 'off');
        }, tracks);
        await page.addLocatorHandler(page.locator('#music-prompt'), () => page.locator('#music-no').click());
        await page.goto(`${gameplayURL}?perf`);
        await page.locator(`[data-track="${trackId}"]`).click();
        await page.locator('button[data-race-mode="free"]').click();
        await page.locator('#start-button').click();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
        await page.keyboard.down('ArrowUp');
        await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(1);
        await page.keyboard.up('ArrowUp');
        await expect(page.locator('#perf-overlay')).toContainText('FRAME');
        await page.locator('#pause-button').click();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
        for (const [index, size] of [viewport, ...more].entries()) await test.step(`${size.width}x${size.height}${size.insets ? ' safe area' : ''}`, async () => {
          const insets = size.insets, label = `${size.width}x${size.height}${insets ? ' with insets' : ''}`;
          if (index) await resizeTo(page, size.width, size.height);
          await page.evaluate(values => {
            for (const side of ['top', 'right', 'bottom', 'left']) document.documentElement.style[values ? 'setProperty' : 'removeProperty'](`--safe-${side}`, ...(values ? [`${values[side]}px`] : []));
          }, insets ?? null);
          const paused = await page.evaluate(() => ({
            elapsed: window.gameplay.race.elapsed,
            distance: window.gameplay.race.player.distance,
          }));
          const visibility = await Promise.all(backgroundUI.map(selector => page.locator(selector).isVisible()));
          // body.photo-studio must follow [open] in the same microtask, not a task later on 'close'.
          await page.evaluate(() => {
            const dialog = document.querySelector('#photo-screen');
            window.photoFlips = [];
            window.photoObserver?.disconnect(); // one observer per size: an earlier size's would double every flip
            window.photoObserver = new MutationObserver(() => window.photoFlips.push({ open: dialog.open, studio: document.body.classList.contains('photo-studio') }));
            window.photoObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
          });
          await page.locator('#photo-open').click();
          await expect(page.locator('#photo-screen')).toBeVisible();
          await expect(page.locator('#world')).toBeVisible();
          // A fresh boot opens the panel unscrolled; the previous size's scrollIntoViewIfNeeded must not carry over.
          if (index) await page.evaluate(() => document.querySelectorAll('#photo-screen, #photo-screen *').forEach(element => { element.scrollTop = 0; }));
          await page.screenshot({ path: `test-results/race-mode-photo-${name}-${trackId}-${size.width}x${size.height}${insets ? '-insets' : ''}.png` });
          for (const selector of backgroundUI) await expect(page.locator(selector), `${label}: ${selector} must not overlay the photo`).toBeHidden();
          const car = await projectedCar(page), panel = await page.locator('#photo-screen').boundingBox();
          if (insets) {
            expect(panel.x, label).toBeGreaterThanOrEqual(insets.left);
            expect(panel.y, label).toBeGreaterThanOrEqual(insets.top);
            expect(panel.x + panel.width, label).toBeLessThanOrEqual(size.width - insets.right);
            expect(panel.y + panel.height, label).toBeLessThanOrEqual(size.height - insets.bottom);
          }
          const obscuresCar = panel.x < car.right && panel.x + panel.width > car.left && panel.y < car.bottom && panel.y + panel.height > car.top;
          expect(obscuresCar, `Photo controls must not cover the default car at ${size.width}x${size.height}: ${JSON.stringify({ car, panel })}`).toBe(false);
          expect(await page.evaluate(() => ({
            elapsed: window.gameplay.race.elapsed,
            distance: window.gameplay.race.player.distance,
          })), `${label}: the open photo screen keeps the race frozen`).toEqual(paused);
          expect(await page.evaluate(() => document.documentElement.scrollWidth), `${label}: no horizontal scroll`).toBeLessThanOrEqual(size.width);
          await page.locator('#photo-save').scrollIntoViewIfNeeded();
          await expect(page.locator('#photo-save'), `${label}: Save reachable`).toBeInViewport();
          await page.locator('#photo-close').click();
          await expect(page.locator('#photo-screen')).toBeHidden();
          await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
          expect(await Promise.all(backgroundUI.map(selector => page.locator(selector).isVisible())), `${label}: Close restores the paused UI`).toEqual(visibility);
          // Native Escape closes only the photo modal; it must not resume the race.
          await page.locator('#photo-open').click();
          await page.keyboard.press('Escape');
          await expect(page.locator('#photo-screen')).toBeHidden();
          await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
          const flips = await page.evaluate(() => window.photoFlips);
          expect(flips.map(flip => flip.open), `${label}: open, Close, open, Escape`).toEqual([true, false, true, false]);
          for (const flip of flips) expect(flip.studio, `${label}: body.photo-studio at the [open] flip ${JSON.stringify(flips)}`).toBe(flip.open);
          await page.locator('#resume-button').click();
          await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
          await page.keyboard.down('ArrowUp');
          await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(paused.distance + 1);
          await page.keyboard.up('ArrowUp');
          await page.locator('#pause-button').click();
          await expect(page.locator('#photo-open')).toBeVisible();
        });
        expect(errors).toEqual([]);
      });
    }
  });
}
