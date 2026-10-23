import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// One NaN or Inf texel in the HDR scene buffer is spread by the bloom blur into a screen-sized black rectangle
// (a nozzle shader hit 0*Inf on an MSAA-extrapolated sliver during nitro and the airflow showcase). Scan the
// composed scene buffer and the bloom high-pass output after every frame through the moments that first show
// each effect: the home showcase with airflow toggled, countdown, racing, nitro and its fade-out.
const watch = page => page.evaluate(() => {
  const { composer, renderer } = window.gameScene, render = composer.render.bind(composer), bloom = composer.passes[1];
  const buffers = new Map();
  const nonFinite = target => {
    const size = target.width * target.height * 4;
    if (buffers.get(target)?.length !== size) buffers.set(target, new Uint16Array(size));
    const half = buffers.get(target);
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, half);
    let count = 0;
    for (let i = 0; i < size; i++) if ((half[i] & 0x7c00) === 0x7c00) count++; // half-float NaN or Inf
    return count;
  };
  const stats = window.blackFrames = { frames: 0, scene: 0, bloom: 0 };
  composer.render = dt => {
    render(dt);
    stats.frames++;
    // After the lens pass swap the write buffer holds scene + bloom; the high pass is what the blur spreads.
    stats.scene += nonFinite(composer.writeBuffer);
    stats.bloom += nonFinite(bloom.renderTargetBright);
  };
});
const expectClean = async (page, phase) => {
  const stats = await page.evaluate(() => { const s = { ...window.blackFrames }; Object.assign(window.blackFrames, { frames: 0, scene: 0, bloom: 0 }); return s; });
  expect(stats.frames, `${phase} rendered`).toBeGreaterThan(5);
  expect(stats, phase).toEqual({ frames: stats.frames, scene: 0, bloom: 0 });
};

test('no NaN pixel reaches the bloom through the airflow showcase, nitro and its fade-out', async ({ gameplayPage: page }) => {
  await page.evaluate(() => document.fonts.ready);
  await watch(page);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('v'); await page.waitForTimeout(400); }
  await expectClean(page, 'home airflow toggles');
  await page.locator('#start-button').click();
  // Reading two HDR buffers back every frame slows the countdown far past the default expect timeout on SwiftShader.
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: 30_000 });
  await page.waitForTimeout(1000);
  await expectClean(page, 'countdown and first racing frames');
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(1500);
  await expectClean(page, 'nitro');
  await page.waitForTimeout(1500);
  await expectClean(page, 'nitro fade-out');
});
