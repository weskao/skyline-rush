import { clickLobbyOption } from './helpers/home-lobby.js';
import { ciTimeout } from './helpers/ci.js';
import { openSettingsSection } from './helpers/settings-browser.js';
import { expect, test, waitForHome } from './helpers/test.js';

test.use({ startupSeen: false });

function holdAsset(page, pattern) {
  let release, requested;
  const held = new Promise(resolve => { release = resolve; });
  const requestedAsset = new Promise(resolve => { requested = resolve; });
  const install = page.route(pattern, async route => {
    requested();
    await held;
    await route.continue();
  });
  return { install, requested: requestedAsset, release };
}

test('startup waits for the selected car before revealing the High lobby', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'high', enabled: false }));
  });
  const car = holdAsset(page, '**/models/roadster2/roadster2.glb');
  await car.install;
  const enter = page.locator('#startup-enter'), canvas = page.locator('#world');
  await page.goto('/');
  try {
    await car.requested;
    await expect(canvas).toHaveAttribute('data-garage-model', 'loading');
    await expect(canvas).toBeHidden({ timeout: ciTimeout(1000) });
    await expect(enter).toBeHidden();
    await expect(page.locator('#startup')).toHaveAttribute('data-motion', 'off');
  } finally {
    car.release();
  }
  await expect(enter).toBeVisible();
  await expect(canvas).toHaveAttribute('data-garage-model-instances', /"home":"/);
  await expect(canvas).toHaveAttribute('data-coast-road', 'high');
  await enter.click();
  await expect(canvas).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-vfx-enabled', 'false');
});

test('Sky Spiral waits for its High road and skips scene draws during the wait', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true }));
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral']));
  });
  const road = holdAsset(page, '**/materials/neon-asphalt/asphalt_basecolor_2k.ktx2');
  await road.install;
  const canvas = page.locator('#world');
  const still = page.locator('#race-frame-still');
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await expect(canvas).toBeVisible();
  try {
    await clickLobbyOption(page, '[data-track="spiral"]');
    await openSettingsSection(page, 'display');
    await page.locator('select[data-vfx="quality"]').selectOption('high', { force: true });
    await page.locator('#settings-close').click();
    await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', 'high');
    await page.locator('#start-button').click();
    await road.requested;
    await expect(canvas).toHaveAttribute('data-spiral-landmarks', 'attached');
    await expect(canvas).toBeHidden();
    await expect(still).toBeVisible();
    await expect(still).toHaveAttribute('src', /track-teasers\/spiral\.jpg/);
    await expect(page.locator('#countdown')).toHaveAttribute('data-step', 'loading');
    const draws = await canvas.evaluate(async element => {
      const gl = element.getContext('webgl2');
      const methods = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'];
      let submits = 0;
      for (const method of methods) {
        const native = gl[method];
        gl[method] = (...args) => { submits++; return native.apply(gl, args); };
      }
      try {
        for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame);
        return submits;
      } finally {
        for (const method of methods) delete gl[method];
      }
    });
    expect(draws).toBe(0);
  } finally {
    road.release();
  }
  await expect(canvas).toBeVisible();
  await expect(still).toBeHidden();
  await expect(canvas).toHaveAttribute('data-spiral-road', 'high');
  await expect(page.locator('#race-status')).toHaveText('RACING');
});
