import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Capture a REAL running Three.js canvas and a 10-20 second Playwright video,
// never the design-only SVG storyboard. Hardware comparisons still require physical devices.
test.use({ video: 'on' });

test('Wave 2 real WebGL: NITRO violet, BOOST cyan, simultaneous bounded and recovery', async ({ gameplayPage: page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const read = () => page.evaluate(() => {
    const { player, renderer, camera } = window.gameScene;
    const uniforms = player.getObjectByName('Airflow showcase').children[0].material.uniforms;
    return {
      nitroMix: uniforms.nitroMix.value,
      speedLinePower: uniforms.power.value,
      fov: camera.fov,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      textureCount: renderer.info.memory.textures,
      geometryCount: renderer.info.memory.geometries,
      programs: renderer.info.programs.length,
    };
  });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { speed: 80, miniBoost: 3 }));
  await page.waitForTimeout(350);
  const boost = await read();
  expect(boost.nitroMix).toBe(0);
  expect(boost.speedLinePower).toBeGreaterThan(0);
  expect(boost.fov).toBeGreaterThan(40);
  await page.screenshot({ path: info.outputPath('high-speed-vfx-boost.png') });
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { nitroTime: 4, speed: 85 }));
  await page.waitForTimeout(350);
  const combined = await read();
  expect(combined.nitroMix).toBeGreaterThan(boost.nitroMix);
  expect(combined.nitroMix).toBeLessThanOrEqual(1);
  expect(combined.programs).toBe(boost.programs);
  await page.screenshot({ path: info.outputPath('high-speed-vfx-nitro.png') });
  // Sustained captured animation; no extra 3D scene meshes are created by the sprint.
  await page.waitForTimeout(10_000);
  const recovered = await read();
  expect(recovered.nitroMix).toBe(0);
  expect(recovered.programs).toBe(combined.programs);
  expect(recovered.textureCount).toBeLessThanOrEqual(combined.textureCount + 1);
  expect(recovered.geometryCount).toBeLessThanOrEqual(combined.geometryCount + 1);
  expect([boost, combined, recovered].every(sample =>
    Object.values(sample).every(Number.isFinite))).toBe(true);
  await page.screenshot({ path: info.outputPath('high-speed-vfx-recovery.png') });
  await writeFile(info.outputPath('high-speed-vfx-render-performance.json'),
    JSON.stringify({ browser: 'CI Chrome SwiftShader', viewport: '1440x900', boost, combined, recovered,
      note: 'Exact-frame Three.js counters, NOT physical GPU/frame-time before/after comparison.' }, null, 2));
  expect(errors).toEqual([]);
  await page.keyboard.up('w');
  const video = page.video();
  await page.close();
  if (video) await video.saveAs(info.outputPath('high-speed-vfx-12s.webm'));
});
