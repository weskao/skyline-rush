import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

const lightState = page => page.evaluate(() => {
  const bar = window.gameScene.player.getObjectByName('Continuous rear LED');
  if (!bar) return null;
  const core = bar.getObjectByName('Rear LED core');
  const glow = bar.getObjectByName('Rear LED glow');
  const flow = bar.getObjectByName('Rear LED flow');
  return { width: core.parent.scale.x, intensity: core.material.emissiveIntensity,
    red: core.material.emissive.getHexString(), glow: glow.material.uniforms.power.value,
    flow: flow.visible, x: flow.position.x };
});

test('rear LED remains one thin red line and responds to driving, braking and nitro', async ({ gameplayPage: page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await expect.poll(() => lightState(page)).not.toBeNull();
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  const geometry = await page.evaluate(() => {
    const player = window.gameScene.player;
    const core = player.getObjectByName('Rear LED core');
    core.geometry.computeBoundingBox();
    const { min, max } = core.geometry.boundingBox;
    return { width: max.x - min.x, height: max.y - min.y, depth: max.z - min.z,
      panel: player.getObjectByName('Rear LED black panel').material.roughness };
  });
  expect(geometry.width).toBeGreaterThan(2);
  expect(geometry.height).toBeLessThan(0.04);
  expect(geometry.depth).toBeGreaterThan(0);
  expect(geometry.panel).toBeLessThan(0.2);
  const cruising = await lightState(page);
  expect(cruising.red).toBe('ff3030');
  const cleanView = await page.addStyleTag({ content: '#intro, #race-overlay, #music-prompt { visibility: hidden !important; }' });
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.phase = 'paused';
    race.player.braking = true;
  });
  await expect.poll(async () => (await lightState(page)).intensity).toBeGreaterThan(cruising.intensity * 2);
  expect((await lightState(page)).glow).toBeGreaterThan(cruising.glow * 2);
  await page.screenshot({ path: 'artifacts/rear-led-braking.jpeg', quality: 85 });
  await cleanView.evaluate(style => style.remove());
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.phase = 'racing'; race.player.braking = false;
    race.player.nitroTime = 5; race.player.speed = 100;
    race.traffic = [];
  });
  const intensities = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(70);
    intensities.push((await lightState(page)).intensity);
  }
  expect(Math.min(...intensities)).toBeGreaterThan(cruising.intensity);
  expect(Math.max(...intensities) - Math.min(...intensities)).toBeGreaterThan(0.15);
  await page.evaluate(() => { window.gameplay.race.phase = 'paused'; });
  const paused = await lightState(page);
  await page.waitForTimeout(250);
  expect(await lightState(page)).toEqual(paused);
  expect(errors).toEqual([]);
});

test('startup scans outward again on restart, high speed flows, and reduced motion stays steady', async ({ gameplayPage: page }) => {
  await expect.poll(() => lightState(page)).not.toBeNull();
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  await page.locator('#start-button').click();
  await expect.poll(async () => (await lightState(page)).width).toBeLessThan(1);
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.phase = 'paused'; race.player.speed = 90;
  });
  await expect.poll(async () => (await lightState(page)).flow).toBe(true);
  await page.evaluate(() => { window.gameplay.race.phase = 'racing'; window.gameplay.race.traffic = []; });
  const first = await lightState(page);
  await expect.poll(async () => (await lightState(page)).x).not.toBe(first.x);
  await page.locator('#restart-button').click();
  await expect.poll(async () => (await lightState(page)).width).toBeLessThan(1);
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { window.gameplay.race.player.nitroTime = 5; });
  await expect.poll(async () => (await lightState(page)).flow).toBe(false);
  const calm = await lightState(page);
  await page.waitForTimeout(250);
  expect(await lightState(page)).toEqual(calm);
  await page.locator('#restart-button').click();
  expect((await lightState(page)).width).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/rear-led-mobile.jpeg', quality: 85 });
});
