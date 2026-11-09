import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// Dev-unlocked only: production keeps these cards preview-only, so the live eight-car map is not a release path.
test.use({ unlockedAccess: true });
const courses = ['dune-tempest', 'monsoon-ruins', 'skyfall-archipelago', 'volcanic-crown', 'stormline-megacity', 'frostbite-canyon'];

for (const id of courses) {
  test(`${id} race map draws the course and moves all eight racers`, async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(40_000));
    await page.locator(`[data-upcoming-track="${id}"]`).click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(16_000) });
    const before = await page.evaluate(() => {
      const line = document.querySelector('#race-route-map .route-overview-line');
      return {
        edges: document.querySelectorAll('#race-route-map [data-edge]').length,
        stroke: line ? getComputedStyle(line).stroke : '',
        markers: [...document.querySelectorAll('#race-route-map [data-racer]')].map(node => `${node.getAttribute('data-racer')}:${node.getAttribute('cx')},${node.getAttribute('cy')}`),
      };
    });
    expect(before.edges).toBeGreaterThan(1);
    expect(before.markers).toHaveLength(8);
    expect(before.stroke).not.toBe('none');
    expect(before.stroke).not.toBe('');
    await page.evaluate(async () => {
      const { stepRace } = await import('/src/game.js');
      const race = window.gameplay.race;
      for (let i = 0; i < 180 && race.phase === 'racing'; i++) stepRace(race, { throttle: true }, 1 / 60);
    });
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('#race-route-map [data-racer]')].map(node => `${node.getAttribute('data-racer')}:${node.getAttribute('cx')},${node.getAttribute('cy')}`))).not.toEqual(before.markers);
    const after = await page.evaluate(() => [...document.querySelectorAll('#race-route-map [data-racer]')].map(node => `${node.getAttribute('data-racer')}:${node.getAttribute('cx')},${node.getAttribute('cy')}`));
    expect(after.filter((spot, index) => spot !== before.markers[index])).toHaveLength(8);
  });
}
