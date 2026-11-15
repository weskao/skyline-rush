import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { pausedRace, place } from './helpers/traffic-browser.js';

// Traffic draws as instanced meshes (src/traffic-fleet.ts): its draw calls are fixed, whatever the car count. Each
// traffic car used to be a makeCar() group of its own: 15 visible meshes per car, 129 to 430 calls in a Neon race.
// Three styles x seven materials; the wet-road mirror pass draws only the two unlit lamp materials per style.
const TRAFFIC_CALLS = 21, MIRROR_CALLS = 6, POOL = 108; // 108: Neon with the double-traffic daily modifier

test('Neon traffic costs a fixed number of draw calls at any car count', async ({ gameplayPage: page, gameplayURL }) => {
  await pausedRace(page, gameplayURL, 'neon');
  const none = await place(page, 0, POOL);
  const calls = [];
  for (const shown of [3, 12, 54, POOL]) calls.push(await place(page, shown, POOL) - none);
  expect(calls, 'traffic draw calls with 3, 12, 54 and 108 cars in view').toEqual([TRAFFIC_CALLS, TRAFFIC_CALLS, TRAFFIC_CALLS, TRAFFIC_CALLS]);
  expect(await place(page, 0, POOL), 'no car in view draws nothing').toBe(none);
});

test.describe('?look=3d wet road', () => {
  test('the mirror pass draws traffic lamps instanced too', async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(120000));
    await pausedRace(page, gameplayURL, 'coast', '?look=3d');
    await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(60000) }).not.toBe('procedural');
    await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; });
    await page.waitForTimeout(ciTimeout(1500)); // the wet look fades in
    const none = await place(page, 0, 72);
    for (const shown of [6, 72]) expect(await place(page, shown, 72) - none, `${shown} cars in view`).toBe(TRAFFIC_CALLS + MIRROR_CALLS);
  });
});
