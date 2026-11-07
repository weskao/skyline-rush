import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// The race car reflects its own softened map, and the Garage sun/moon toggle dims only the Garage/Studio preview.
const lightingState = page => page.evaluate(() => {
  const { player, composer } = window.gameScene;
  const lit = [];
  player.traverse(object => { for (const m of [].concat(object.material ?? [])) if (m.isMeshStandardMaterial) lit.push(m); });
  const gain = composer.passes.find(pass => pass.uniforms?.gain)?.uniforms.gain.value;
  return { gain, ownEnv: lit.every(m => m.envMap), intensities: [...new Set(lit.map(m => m.envMapIntensity))] };
});

for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Garage sun/moon lighting dims Home and Studio, never the race ${size.width}x${size.height}`, async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(size);
    await expect.poll(() => page.evaluate(() => !!window.gameScene)).toBe(true);
    const race = await lightingState(page);
    expect(race.ownEnv).toBe(true);
    expect(race.intensities).toHaveLength(1);
    expect(race.gain).toBe(1);

    await page.locator('#garage-button').click();
    const toggle = page.locator('#garage-lighting');
    await expect(toggle).toBeInViewport();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const box = await toggle.boundingBox();
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await lightingState(page)).gain).toBeLessThan(1);
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await lightingState(page)).gain).toBeLessThan(1);
    await toggle.click();
    await expect.poll(async () => (await lightingState(page)).gain).toBe(1);
    await toggle.click();
    await page.locator('#garage-close').click();
    await expect.poll(async () => (await lightingState(page)).gain).toBe(1);
    expect(errors).toEqual([]);
  });
}
