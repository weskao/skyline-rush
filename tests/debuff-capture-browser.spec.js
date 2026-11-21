import { expect } from '@playwright/test';
import { clickLobbyOption } from './helpers/home-lobby.js';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { seedGtCareer } from './helpers/gt-progress.js';
import { ciTimeout } from './helpers/ci.js';

// Real WebGL captures of Freeze and EMP on the player and a rival just ahead (DEBUFF_CAPTURE=1 only).
// DEBUFF_CARS=roadster,crimson-gt  DEBUFF_VIEWS=desktop,portrait,landscape  DEBUFF_QUALITY=high  DEBUFF_VIDEO=1
const VIEWS = { desktop: [1440, 900, false], portrait: [390, 844, true], landscape: [844, 390, true] };
const cars = (process.env.DEBUFF_CARS ?? 'roadster').split(',');
const views = (process.env.DEBUFF_VIEWS ?? 'desktop').split(',');
const quality = process.env.DEBUFF_QUALITY ?? 'high';
const hits = (process.env.DEBUFF_HITS ?? 'freeze,emp,both').split(',');
const times = (process.env.DEBUFF_TIMES ?? '1.2').split(',').map(Number);

test.skip(!process.env.DEBUFF_CAPTURE, 'capture run only');
// DEBUFF_VIDEO=1 also records each run as a WebM (timeline review); Playwright scales it to the viewport.
test.use({ video: process.env.DEBUFF_VIDEO ? 'on' : 'off' });

for (const car of cars) for (const view of views) test.describe(`${car} ${view}`, () => {
  const [width, height, hasTouch] = VIEWS[view];
  test.use({ viewport: { width, height }, hasTouch, lowGraphics: false });

  test('captures', async ({ page, gameplayURL }, testInfo) => {
    test.setTimeout(ciTimeout(300_000));
    await page.addInitScript(([car, quality]) => {
      localStorage.setItem('skyline-rush-car', JSON.stringify(car));
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality, enabled: true }));
      localStorage.setItem('skyline-rush-locale', 'zh-TW');
    }, [car, quality]);
    if (car === 'crimson-gt') await seedGtCareer(page);
    await captureHooks(page);
    await page.goto(gameplayURL);
    await page.locator('#start-button').waitFor({ state: 'attached' });
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await clickLobbyOption(page, 'button[data-race-mode="custom"]');
    await page.locator('#start-button').click();
    await page.waitForFunction(() => window.gameplay?.race.phase === 'racing', null, { timeout: ciTimeout(120_000) });
    for (const hit of hits) for (const at of times) {
      await page.evaluate(([hit, at]) => new Promise(resolve => {
        const race = window.gameplay.race, [rival] = race.rivals;
        race.traffic = [];
        race.player.empUntil = 0; race.player.freezeUntil = 0;
        for (const r of race.rivals) { r.empUntil = 0; r.freezeUntil = 0; }
        const step = () => requestAnimationFrame(() => requestAnimationFrame(() => {
          Object.assign(rival, { distance: race.player.distance + 11, x: race.player.x - 2.6, homeX: race.player.x - 2.6, speed: race.player.speed });
          const start = race.elapsed;
          for (const car of [race.player, rival]) {
            if (hit !== 'emp') car.freezeUntil = start + 3;
            if (hit !== 'freeze') car.empUntil = start + 3;
          }
          const wait = () => {
            Object.assign(rival, { distance: race.player.distance + 11, x: race.player.x - 2.6 });
            if (race.elapsed - start < at) requestAnimationFrame(wait); else resolve();
          };
          wait();
        }));
        step();
      }), [hit, at]);
      await page.screenshot({ path: testInfo.outputPath(`${car}-${view}-${hit}-${at}.png`) });
    }
    expect(true).toBe(true);
  });
});
