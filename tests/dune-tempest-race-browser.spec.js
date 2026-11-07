import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

test.use({ unlockedAccess: true });
const captureDir = process.env.DUNE_CAPTURE_DIR;
async function capture(page, name) {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: join(captureDir, name + '.png') });
}
async function driveUntil(page, checkpoint, flight = false) {
  return page.evaluate(async ({ checkpoint, flight }) => {
    const { stepRace } = await import('/src/game.js');
    const { chooseBranchByLateral } = await import('/src/course-race.ts');
    const race = window.gameplay.race, graph = race.course.spec.graph;
    const car = race.course.cars.get('YOU'), visited = new Set();
    for (let i = 0; i < 60 * 400 && race.phase === 'racing' && car.travel.nextCheckpoint < checkpoint; i++) {
      const edge = car.travel.currentEdgeId, air = flight && edge === 'canyon-air-crossing';
      visited.add(edge);
      race.player.x = flight && edge === 'canyon-approach'
        ? [-5, 5].find(x => chooseBranchByLateral(graph, edge, x, 2.5) === 'canyon-air-crossing') : 0;
      const gapEnd = race.course.spec.noRoad['canyon-air-crossing'][0][1];
      const fly = air && car.travel.localS < gapEnd &&
        race.player.verticalSpeed < Math.min(7, 3 * (2.5 - race.player.altitude));
      stepRace(race, { throttle: true, boost: !(flight && (edge === 'canyon-approach' || air)), fly }, 1 / 60);
    }
    return { phase: race.phase, checkpoint: car.travel.nextCheckpoint,
      edge: car.travel.currentEdgeId, visited: [...visited], rejected: race.course.rejections };
  }, { checkpoint, flight });
}
for (const [device, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe('Dune CourseGraph ' + device, () => {
  test.use({ viewport, hasTouch });
  test('dev-only WebGL races every mandatory checkpoint, finishes and shows distinct edge markers', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(150_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-upcoming-track="dune-tempest"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(16_000) });
    for (const checkpoint of [1, 2, 3, 4]) {
      const progress = await driveUntil(page, checkpoint);
      expect(progress.checkpoint).toBeGreaterThanOrEqual(checkpoint);
      expect(progress.rejected).toBe(0);
      await page.waitForTimeout(150);
      const scene = await page.evaluate(() => {
        const root = window.gameScene.scene.getObjectByName('CourseGraph race scenery');
        return { visible: root.visible, chunks: root.children.length,
          position: window.gameScene.player.position.toArray(),
          branches: document.querySelectorAll('#race-route-map [data-edge]').length,
          markers: document.querySelectorAll('#race-route-map [data-racer]').length };
      });
      expect(scene.visible).toBe(true);
      expect(scene.chunks).toBeGreaterThan(0);
      expect(scene.branches).toBeGreaterThan(10);
      expect(scene.markers).toBe(8);
      expect(Math.hypot(scene.position[0], scene.position[2])).toBeLessThan(20);
      await capture(page, device + '-dune-cp' + checkpoint);
    }
    const finish = await page.evaluate(async () => {
      const { stepRace } = await import('/src/game.js');
      const race = window.gameplay.race;
      for (let i = 0; i < 60 * 60 && race.phase === 'racing'; i++) {
        race.player.x = 0;
        stepRace(race, { throttle: true, boost: true }, 1 / 60);
      }
      return { phase: race.phase, place: race.result?.position, rejected: race.course.rejections };
    });
    expect(finish.phase).toBe('finished');
    expect(finish.place).toBeGreaterThanOrEqual(1);
    expect(finish.rejected).toBe(0);
    await expect(page.locator('#race-overlay')).toBeVisible({ timeout: ciTimeout(15_000) });
    await capture(page, device + '-dune-finish');
    expect(errors).toEqual([]);
  });
});
test.describe('Dune real flight branch', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('FLY crosses the authored no-road gap without flattened geometry or missed checkpoint', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(150_000));
    await page.locator('[data-upcoming-track="dune-tempest"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(16_000) });
    const result = await driveUntil(page, 3, true);
    expect(result.visited).toContain('canyon-air-crossing');
    expect(result.checkpoint).toBeGreaterThanOrEqual(3);
    expect(result.rejected).toBe(0);
    await capture(page, 'desktop-dune-flight');
  });
});
