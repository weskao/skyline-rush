import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

test.use({ unlockedAccess: true, hasTouch: true, isMobile: true });

for (const { track, viewport, asset, quality } of [
  { track: 'neon', viewport: { width: 390, height: 844 }, asset: 'neon-landmarks', quality: 'high' },
  { track: 'coast', viewport: { width: 844, height: 390 }, asset: 'coast-scenery', quality: 'medium' },
]) {
  test(`${track} on the unlocked phone server warms its selected scenery before GO`, async ({ page, gameplayURL }, info) => {
    test.setTimeout(ciTimeout(90000));
    await page.setViewportSize(viewport);
    await captureHooks(page);
    await page.addInitScript(quality => {
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality }));
      localStorage.setItem('skyline-rush-tutorial-completed', '1');
      localStorage.setItem('skyline-rush-music-asked', '1');
    }, quality);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let release;
    const held = new Promise(resolve => { release = resolve; });
    // Keep the intentionally held response inside the loader deadline on slow software renderers.
    // The existing loader and missing-asset tests cover timeout and fallback independently.
    await page.route(url => url.pathname === '/src/asset-model-loader.ts', async route => {
      const response = await route.fetch();
      const source = await response.text();
      const deadline = /\btimeoutMs\s*=\s*(?:15000|15e3)\b/;
      expect(deadline.test(source), 'the dev module contains the normal model download deadline').toBe(true);
      await route.fulfill({ response, body: source.replace(deadline, 'timeoutMs = 90000') });
    });
    await page.route(`**/models/${asset}/${asset}.glb`, async route => { await held; await route.continue(); });

    const world = page.locator('#world');
    try {
      await page.goto(`${gameplayURL}?raced=${track}`);
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', quality);
      await expect(world).toHaveAttribute(`data-${asset}`, 'loading');
      await page.locator('#start-button').click();
      await expect(page.locator('#countdown-label')).toHaveText('LOADING TRACK SCENERY');
      // Hold the model past the normal three-second countdown to reproduce a slow download.
      const phase = await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve(window.gameplay.race.phase), 4000)));
      expect(phase).toBe('countdown');
    } finally {
      release();
    }

    await expect(world).toHaveAttribute(`data-${asset}`, 'attached', { timeout: ciTimeout(40000) });
    await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(20000) });
    await expect.poll(() => page.evaluate(track => {
      const layer = window.gameScene.scene.getObjectByName(track === 'neon' ? 'Neon Downtown kit' : 'Coast scenic details');
      return layer.visible && layer.children.some(node => node.isInstancedMesh && node.visible && node.count > 0 &&
        (track === 'neon' || node.name.startsWith('cliff_')));
    }, track)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${track}-${quality}-phone-race.png`) });
    expect(errors).toEqual([]);
  });
}

test('Neon switches scenery when the phone graphics setting changes', async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  await page.setViewportSize({ width: 844, height: 390 });
  await captureHooks(page);
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
  });
  await page.goto(`${gameplayURL}?raced=neon`);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const kitVisible = () => page.evaluate(() => window.gameScene?.scene.getObjectByName('Neon Downtown kit')?.visible);
  await expect.poll(kitVisible).toBe(false);

  await page.locator('#vfx-panel > summary').click();
  const panel = page.getByRole('complementary', { name: 'Airflow and visual effects' });
  const quality = panel.getByRole('combobox', { name: 'Quality', exact: true });
  await quality.click();
  await panel.getByRole('option', { name: 'Medium', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', 'medium');
  await expect.poll(kitVisible, { timeout: ciTimeout(40000) }).toBe(true);
  await quality.click();
  await panel.getByRole('option', { name: 'Low', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', 'low');
  await expect.poll(kitVisible).toBe(false);
});
