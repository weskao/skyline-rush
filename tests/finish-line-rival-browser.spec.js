import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';
import { test } from './helpers/gameplay-browser.js';
import { openLobbyModes } from './helpers/home-lobby.js';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['portrait', { width: 390, height: 844 }, true],
  ['landscape', { width: 844, height: 390 }, true],
]) test.describe(`Finish-line rival on ${name}`, () => {
  test.use({ viewport, hasTouch });

  test('the same car stays visible and rolls forward after a rear impact', async ({ gameplayPage: page }, info) => {
    test.setTimeout(ciTimeout(60000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await openLobbyModes(page);
    await page.locator('button[data-race-mode="circuit"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.evaluate(() => {
      const { race } = window.gameplay, [rival] = race.rivals;
      const x = race.player.x;
      Object.assign(race, { elapsed: 30, traffic: [], rivals: [rival], rings: [], pickups: [] });
      Object.assign(race.player, { distance: race.length - 9, speed: 0 });
      Object.assign(rival, { x, homeX: x, altitude: 0, speed: 0, pace: 0, distance: race.length, finishTime: 28 });
      Object.assign(race.circuit.rivals[rival.name], { completed: race.circuit.laps, finishTime: 28 });
    });
    const view = () => page.evaluate(() => {
      const { player, rivals: [rival] } = window.gameplay.race;
      const { rivals: meshes, player: meshPlayer } = window.gameScene;
      const mesh = meshes.find(item => item.userData.rivalDriverId === rival.id);
      return { visible: mesh?.visible, distance: mesh?.position.distanceTo(meshPlayer.position),
        roadDistance: mesh?.userData.roadDistance, playerDistance: player.distance, finishTime: rival.finishTime };
    });
    const finish = await page.evaluate(() => window.gameplay.race.length);
    await expect.poll(async () => {
      const car = await view();
      return car.visible && Math.abs(car.roadDistance - finish) < 0.05;
    }).toBe(true);
    const before = await view();
    await page.locator('#world').screenshot({ path: info.outputPath('parked-rival.png') });

    await page.evaluate(async () => {
      const { stepRace } = await import('/src/game.js');
      const { race } = window.gameplay;
      race.player.speed = 55;
      for (let i = 0; i < 7; i++) stepRace(race, { throttle: true }, 1 / 60);
      race.player.speed = 0;
    });
    await expect.poll(async () => (await view()).roadDistance).toBeGreaterThan(before.roadDistance + 2);
    const after = await view();
    expect(after.visible).toBe(true);
    expect(after.distance).toBeGreaterThan(4);
    expect(after.playerDistance).toBeGreaterThan(before.playerDistance);
    expect(after.finishTime).toBe(28);
    expect(errors).toEqual([]);
    await page.locator('#world').screenshot({ path: info.outputPath('pushed-rival.png') });
  });
});
