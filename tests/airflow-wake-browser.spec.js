import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { RACE_TRACKS } from '../src/game.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ciTimeout } from './helpers/ci.js';

test('airflow renders on every track with bounded resources and no shader errors', async ({ gameplayPage: page }, info) => {
  // Ten CPU-rendered tracks, screenshots and 30 live frames per track can
  // exceed three wall-clock minutes on CI. Keep every visual/resource assertion.
  test.setTimeout(ciTimeout(120_000));
  const errors = [], records = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.locator('#performance-notice-dismiss').click();
  for (const track of Object.keys(RACE_TRACKS)) {
    await page.locator(`[data-track="${track}"]`).click();
    await expect.poll(() => page.evaluate(() => window.gameplay.race.trackId)).toBe(track);
    await page.locator('#airflow-toggle').click();
    await page.waitForTimeout(500);
    const record = await page.evaluate(async () => {
      const { renderer, scene } = window.gameScene;
      const frames = [], calls = [], triangles = [];
      let previous = performance.now();
      for (let i = 0; i < 30; i++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(); frames.push(now - previous); previous = now;
        calls.push(renderer.info.render.calls); triangles.push(renderer.info.render.triangles);
      }
      frames.sort((a, b) => a - b);
      const group = scene.getObjectByName('Airflow showcase');
      return { p50: frames[15], p95: frames[28], fps: 30000 / frames.reduce((a, b) => a + b, 0),
        calls: Math.max(...calls), triangles: Math.max(...triangles),
        geometries: renderer.info.memory.geometries, programs: renderer.info.programs.length,
        flowDraws: group.children.filter(child => child.geometry?.getAttribute('flowType')).length };
    });
    expect(record.flowDraws).toBe(1);
    records.push({ track, ...record });
    if (track === 'coast') await page.screenshot({ path: info.outputPath('coast-airflow-desktop.png') });
    await page.locator('#airflow-toggle').click();
  }
  await page.locator('[data-track="coast"]').click();
  await page.locator('#airflow-toggle').click();
  const counts = [];
  for (const quality of ['low', 'medium', 'high']) {
    await page.locator('#vfx-panel > summary').click();
    await page.getByRole('combobox', { name: 'Quality', exact: true }).click();
    await page.getByRole('option', { name: quality[0].toUpperCase() + quality.slice(1), exact: true }).click();
    await page.locator('#vfx-panel > summary').click();
    await page.waitForTimeout(300);
    counts.push(await page.evaluate(() => window.gameScene.scene.getObjectByName('Airflow showcase')
      .children.find(child => child.geometry?.getAttribute('flowType')).geometry.drawRange.count));
    await page.screenshot({ path: info.outputPath(`coast-airflow-${quality}.png`) });
  }
  expect(counts[0]).toBe(counts[1]);
  expect(counts[1]).toBe(counts[2]); // The showroom is not performing a barrel roll.
  for (const [width, height] of [[390, 844], [320, 740], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await page.screenshot({ path: info.outputPath(`airflow-${width}x${height}.png`) });
  }
  expect(errors).toEqual([]);
  mkdirSync('artifacts/airflow-wake', { recursive: true });
  writeFileSync(`artifacts/airflow-wake/${process.env.AIRFLOW_EVIDENCE_PHASE || 'after'}.json`, JSON.stringify(records, null, 2));
});

for (const mobile of [false, true]) test.describe(mobile ? 'touch barrel roll' : 'keyboard barrel roll', () => {
test.use({ hasTouch: mobile, isMobile: mobile });
test('flight flick triggers the roll wake without AIRFLOW preview', async ({ gameplayPage: page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#performance-notice-dismiss').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(() => window.gameplay.race.phase === 'racing');
  const baseline = await page.evaluate(() => {
    const ribbon = window.gameScene.scene.getObjectByName('Continuous dash ribbon').geometry;
    // Live roll streak vertices: roll-flagged ribbon corners that are still visible.
    window.rollLive = () => { const kind = ribbon.attributes.rollWake.array, alpha = ribbon.attributes.alpha.array; let n = 0; for (let i = 0; i < alpha.length; i++) if (kind[i] > .5 && alpha[i] > 0) n++; return n; };
    const info = window.rollEvidence = { count: window.rollLive(), max: 0, frames: 0, programs: window.gameScene.renderer.info.programs.length };
    // Observe the rendered ribbon while real controls trigger the gameplay state.
    const sample = () => { info.max = Math.max(info.max, window.rollLive()); info.frames++; requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
    return info.count;
  });
  await page.waitForTimeout(1800);
  let release;
  if (mobile) {
    const session = await page.context().newCDPSession(page);
    const point = async selector => { const b = await page.locator(selector).boundingBox(); return { id: 1, x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const fly = await point('[data-control="fly"]');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [fly] });
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(1);
    // The default slide pad accepts a fast left-right swipe while FLY stays held.
    const pad = await page.locator('.touch-pad').boundingBox();
    const center = { id: 2, x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [fly, center] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [fly, { ...center, x: center.x - 45 }] });
    await page.waitForTimeout(80);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [fly, { ...center, x: center.x + 45 }] });
    release = () => session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.down('Space');
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(1);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(80); await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    release = async () => { await page.keyboard.up('ArrowRight'); await page.keyboard.up('Space'); };
  }
  await expect.poll(() => page.evaluate(() => window.rollEvidence.max)).toBeGreaterThan(baseline);
  await page.screenshot({ path: info.outputPath('actual-barrel-roll.png') });
  await release();
  // The ribbon fades in simulation time (max 0.6s), not wall-clock time.
  // Poll actual WebGL vertex alphas instead of assuming 1.8s is enough
  // on CPU-only runners. This still requires every live roll vertex to clear.
  await expect.poll(() => page.evaluate(() => window.rollLive()), { timeout: ciTimeout(12_000) }).toBe(baseline);
  const result = await page.evaluate(() => {
    return { count: window.rollLive(), boost: window.gameplay.race.player.boosting, programs: window.gameScene.renderer.info.programs.length, beforePrograms: window.rollEvidence.programs };
  });
  expect(result.count).toBe(baseline);
  expect(result.boost).toBe(false);
  expect(result.programs).toBe(result.beforePrograms);
  expect(errors).toEqual([]);
});
});
