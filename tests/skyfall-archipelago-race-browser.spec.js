import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

const captureDir = process.env.SKYFALL_CAPTURE_DIR;
async function capture(page, name) {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: join(captureDir, name + '.png') });
}
async function driveToCheckpoint(page, checkpoint, branches) {
  return page.evaluate(async ({ checkpoint, branches }) => {
    const { stepRace } = await import('/src/game.js');
    const { chooseBranchByLateral } = await import('/src/course-race.ts');
    const race = window.gameplay.race;
    const you = race.course.cars.get('YOU'), graph = race.course.spec.graph;
    const incoming = ['approach', 'midway-one', 'midway-two'];
    const airIds = ['a-air', 'b-air', 'c-air'];
    const selected = Object.fromEntries(incoming.map((id, i) => [id, branches[i]]));
    const visited = new Set();
    for (let i = 0; i < 60 * 400 && race.phase === 'racing' &&
      you.travel.nextCheckpoint < checkpoint; i++) {
      const edge = you.travel.currentEdgeId, air = airIds.includes(edge);
      visited.add(edge);
      const next = selected[edge];
      if (next) race.player.x = [-5, 0, 5].find(x =>
        chooseBranchByLateral(graph, edge, x, 2.5) === next);
      else race.player.x = 0;
      const gap = air ? race.course.spec.noRoad[edge]?.[0] : null;
      const fly = air && gap && you.travel.localS < gap[1] &&
        race.player.verticalSpeed < Math.min(7, 3 * (2.5 - race.player.altitude));
      stepRace(race, {
        throttle: true, boost: !(air || (next && airIds.includes(next))), fly: Boolean(fly),
      }, 1 / 60);
    }
    return { phase: race.phase, checkpoint: you.travel.nextCheckpoint, edge: you.travel.currentEdgeId,
      visited: [...visited], rejections: race.course.rejections, falls: race.player.falls };
  }, { checkpoint, branches });
}
// A worker-scoped unlockedAccess fixture must be configured at file scope.
test.use({ unlockedAccess: true });

for (const [device, viewport, touch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) for (const [route, branches] of [
  ['ground', ['a-ground', 'b-ground', 'c-ground']],
  ['flight', ['a-air', 'b-air', 'c-air']],
]) test.describe(`Skyfall ${device} ${route} CourseGraph`, () => {
  test.use({ viewport, hasTouch: touch });
  test('dev-only START drives three split/merge stages and a real finish with streamed WebGL', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(180_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-upcoming-track="skyfall-archipelago"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(16_000) });
    const visited = new Set();
    for (const checkpoint of [1, 2, 3]) {
      const progress = await driveToCheckpoint(page, checkpoint, branches);
      progress.visited.forEach(edge => visited.add(edge));
      expect(progress.checkpoint).toBeGreaterThanOrEqual(checkpoint);
      expect(progress.rejections).toBe(0);
      expect(progress.falls).toBe(0);
      const rendered = await page.evaluate(() => {
        const root = window.gameScene.scene.getObjectByName('CourseGraph race scenery');
        return { visible: root?.visible, world: Boolean(root?.getObjectByName('Skyfall playable world')),
          edges: document.querySelectorAll('#race-route-map [data-edge]').length,
          cars: document.querySelectorAll('#race-route-map [data-racer]').length };
      });
      expect(rendered.visible).toBe(true);
      expect(rendered.world).toBe(true);
      expect(rendered.edges).toBeGreaterThan(6);
      expect(rendered.cars).toBe(8);
      await capture(page, `${device}-skyfall-${route}-checkpoint-${checkpoint}`);
    }
    for (const edge of branches) expect(visited.has(edge), `${route} must traverse ${edge}`).toBe(true);
    const finish = await page.evaluate(async () => {
      const { stepRace } = await import('/src/game.js');
      const race = window.gameplay.race;
      for (let i = 0; i < 60 * 60 && race.phase === 'racing'; i++) {
        race.player.x = 0;
        stepRace(race, { throttle: true, boost: true }, 1 / 60);
      }
      return { phase: race.phase, position: race.result?.position, rejections: race.course.rejections };
    });
    expect(finish.phase).toBe('finished');
    expect(finish.position).toBeGreaterThanOrEqual(1);
    expect(finish.rejections).toBe(0);
    await expect(page.locator('#race-overlay')).toBeVisible({ timeout: ciTimeout(15_000) });
    await capture(page, `${device}-skyfall-${route}-finish`);
    expect(errors).toEqual([]);
  });
});
