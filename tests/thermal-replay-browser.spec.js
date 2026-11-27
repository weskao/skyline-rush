import { expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, captureHooks } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { waitForHome } from './helpers/test.js';

// Dev-module hooks only. The production main.js and its render pacing are untouched.
// One fixed tick and one real draw per replay frame; wall time is NOT a production FPS result.
const mainEdits = [
  ['const dt = Math.max(0, Math.min(rawDelta, 0.05));',
    "const dt = window.thermalReplay?.active && race.phase === 'racing' ? SIM_STEP : Math.max(0, Math.min(rawDelta, 0.05));"],
  ['const due = drainSteps(accumulator, countingDown ? 0 : dt);',
    "const due = window.thermalReplay?.active && race.phase === 'racing' ? { steps: 1, accumulator: 0 } : drainSteps(accumulator, countingDown ? 0 : dt);"],
  ['captureRaceMotion(race, previousMotion); stepRace(race, input, SIM_STEP);',
    'captureRaceMotion(race, previousMotion); window.thermalReplay?.before(race, input); stepRace(race, input, SIM_STEP); window.thermalReplay?.after(race);'],
  ["const shouldRender = fps.shouldRender(now, dt, race.phase === 'racing', document.hidden);",
    "const shouldRender = fps.shouldRender(now, dt, race.phase === 'racing', document.hidden) || Boolean(window.thermalReplay?.active && !countingDown && race.phase === 'racing');"],
  ['world.deepPerf?.finish(drawn, fps.targetFps, fps.renderScale);',
    'world.deepPerf?.finish(drawn, fps.targetFps, fps.renderScale); window.thermalReplay?.present(race, drawn);'],
];

test('fixed inputs replay through the actual app simulation and chase camera twice', async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(180000));
  await captureHooks(page, mainEdits);
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-target-fps-v1', '60');
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
    const total = 180, camera = [], inputs = [];
    let tick = 0, stepping = false, draws = 0;
    window.thermalReplay = {
      active: true, result: null,
      before(race, input) {
        stepping = this.active && race.phase === 'racing' && tick < total;
        if (!stepping) return;
        const fixed = { throttle: true, boost: tick >= 60 && tick < 120,
          steer: tick >= 60 && tick < 90 ? -0.2 : tick >= 90 && tick < 120 ? 0.2 : 0,
          brake: false, fly: false, nitro: false, laneAssist: false, drift: false };
        Object.assign(input, fixed);
        inputs.push(fixed);
      },
      after() { if (stepping) { tick++; stepping = false; } },
      present(race, drawn) {
        if (!this.active || !tick) return;
        if (drawn) draws++;
        if (tick % 60 === 0) {
          const view = window.gameScene.camera;
          camera.push({ tick, position: view.position.toArray(), quaternion: view.quaternion.toArray(), fov: view.fov, drawn });
        }
        if (tick !== total) return;
        const car = ({ id, distance, x, altitude, speed, fuel }) => ({ id, distance, x, altitude, speed, fuel });
        this.result = { ticks: tick, draws, inputs, camera, simulation: {
          track: race.trackId, elapsed: race.elapsed, player: car(race.player), rivals: race.rivals.map(car),
          pickups: race.pickups.map(p => [p.distance, p.x, !!p.hit]),
          rings: race.rings.map(p => [p.distance, p.x, !!p.hit]),
        } };
        this.active = false;
      },
    };
  });
  const run = async () => {
    await page.goto(gameplayURL + '?perf=deep&seed=12345');
    await waitForHome(page);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('#start-button').click();
    await expect.poll(() => page.evaluate(() => window.thermalReplay.result?.ticks ?? 0),
      { timeout: ciTimeout(75000) }).toBe(180);
    const result = await page.evaluate(() => window.thermalReplay.result);
    expect(result.simulation.track).toBe('coast');
    expect(result.simulation.elapsed).toBeCloseTo(3, 8);
    expect(result.simulation.player.distance).toBeGreaterThan(0);
    expect(result.draws).toBeGreaterThanOrEqual(3);
    expect(result.camera.map(sample => sample.tick)).toEqual([60, 120, 180]);
    for (const sample of result.camera) {
      expect(sample.drawn).toBe(true);
      expect([...sample.position, ...sample.quaternion, sample.fov].every(Number.isFinite)).toBe(true);
    }
    return result;
  };
  const first = await run(), second = await run();
  expect(second.inputs).toEqual(first.inputs);
  expect(second.simulation).toEqual(first.simulation);
  // Camera smoothing and startup asset warmup may differ by a sub-metre amount; same fixed path, not a pixel hash.
  for (let i = 0; i < first.camera.length; i++) {
    const a = first.camera[i], b = second.camera[i];
    expect(Math.hypot(...a.position.map((v, j) => v - b.position[j]))).toBeLessThan(0.5);
    expect(Math.abs(a.fov - b.fov)).toBeLessThan(0.5);
    expect(Math.abs(a.quaternion.reduce((sum, v, j) => sum + v * b.quaternion[j], 0))).toBeGreaterThan(0.999);
  }
  if (process.env.CI) {
    const path = test.info().outputPath('render-performance-thermal-replay.json');
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ source: 'ci-software-webgl', sha: process.env.GITHUB_SHA ?? null,
      harness: 'actual-app-fixed-tick-replay', seed: 12345, first, second }, null, 2));
  }
});
