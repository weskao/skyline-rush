import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { selectLocale } from './helpers/locale-browser.js';

async function choosePreset(page, name) {
  const picker = page.locator('#race-visual-preset + .custom-select');
  await picker.getByRole('combobox').click();
  await picker.getByRole('option', { name, exact: true }).click();
}

test('Custom offers cosmetic presets without changing official controls or layout', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await expect(page.locator('#race-visual-preset + .custom-select')).toBeVisible();
  await expect(page.locator('#race-presentation-summary')).toContainText('Track');
  await expect(page.locator('#race-setup-summary')).toContainText('3 AI');
  const rivals = page.locator('[data-race-rule="rivals"] + .custom-select');
  await rivals.getByRole('combobox').click();
  await rivals.getByRole('option', { name: '0', exact: true }).click();
  await expect(page.locator('#race-setup-summary')).toContainText('0 AI');
});

test('Custom lists snowfall and aurora skies only on tracks that suit them', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  const options = page.locator('#race-visual-preset option');
  await expect(options).toHaveText(['Track atmosphere', 'Daylight', 'Dusk', 'Night', 'Rain', 'Fog']);
  await choosePreset(page, 'Fog');
  await expect(page.locator('#race-presentation-summary')).toContainText('Fog');
});

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(name, () => {
  test.use({ viewport, hasTouch });
  test('Custom shows its compatible Ghost and theme, preserving rules through retry and clearing on track/Classic selection', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-race-mode="custom"]').click();
    await page.evaluate(() => {
      const config = window.gameplay.race.config;
      const samples = Array.from({ length: 801 }, (_, i) => [i * 6.25, 0, 0]);
      localStorage.setItem('skyline-rush-mode-ghosts-v1', JSON.stringify({
        ['coast:' + JSON.stringify(config)]: { time: 80, samples },
      }));
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
    });
    await page.reload();
    await page.locator('[data-race-mode="custom"]').click();
    await page.locator('#race-mode-rules > summary').click();
    await choosePreset(page, 'Night');
    await expect(page.locator('#ghost-status')).toContainText('01:20.00');
    const rules = await page.evaluate(() => JSON.stringify(window.gameplay.race.config));
    await page.locator('#controls-button').click();
    await page.locator('#ghost-enabled').check();
    await page.locator('#controls-button').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const scene = await page.evaluate(() => ({
      fog: window.gameScene.scene.fog.density,
      exposure: window.gameScene.renderer.toneMappingExposure,
      ghosts: window.gameScene.scene.children.filter(object => object.isGroup && object.visible &&
        object.children.some(child => child.material?.transparent && child.material?.opacity === .3)).length,
      config: JSON.stringify(window.gameplay.race.config),
    }));
    expect(scene).toEqual({ fog: .0016, exposure: .72, ghosts: 1, config: rules });
    await page.screenshot({ path: `artifacts/custom-presentation/${name}-night-ghost.png` });
    await page.locator('#restart-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    expect(await page.evaluate(() => window.gameplay.race.session.presentation.visualPreset)).toBe('night');
    await page.locator('.brand').click();
    await page.locator('#leave-end').click();
    await page.locator('[data-track="neon"]').click();
    await expect(page.locator('#race-visual-preset')).toHaveValue('track');
    await page.locator('[data-race-mode="classic"]').click();
    expect(await page.evaluate(() => window.gameplay.race.session.presentation.visualPreset)).toBe('track');
    expect(errors).toEqual([]);
  });
});

test('Free Drive presets translate live and Photo Studio restores the active race atmosphere', async ({ gameplayPage: page }) => {
  await page.locator('[data-race-mode="free"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await selectLocale(page, 'zh-TW');
  await choosePreset(page, '霧景');
  await expect(page.locator('#race-presentation-summary')).toContainText('操控手感不變');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.locator('#pause-button').click();
  await page.locator('#photo-open').click();
  await page.locator('#photo-sky').evaluate(select => {
    select.value = 'night'; select.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => window.gameScene.scene.fog.density)).toBe(.0016);
  await page.locator('#photo-close').click();
  await expect.poll(() => page.evaluate(() => window.gameScene.scene.fog.density)).toBe(.004);
  await page.screenshot({ path: 'artifacts/custom-presentation/zh-TW-free-fog.png' });
});

test('rain stays centered on the rendered car on a banked 3D road', async ({ gameplayPage: page }) => {
  await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral'])));
  await page.reload();
  await page.locator('[data-race-mode="free"]').click();
  await page.locator('[data-track="spiral"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await choosePreset(page, 'Rain');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await expect(page.locator('#intro')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.gameplay.race.elapsed)).toBeGreaterThan(1);
  const offset = await page.evaluate(() => {
    const { scene, player } = window.gameScene;
    const rain = scene.children.find(object => object.isPoints && object.geometry.attributes.position.count === 180);
    return { position: rain.position.clone().sub(player.position).toArray(), visible: rain.visible,
      fog: scene.fog.density, particles: rain.geometry.drawRange.count };
  });
  expect(offset.position[0]).toBeCloseTo(0, 3);
  expect(offset.position[1]).toBeCloseTo(25, 3);
  expect(offset.position[2]).toBeCloseTo(15, 3);
  expect(offset.visible).toBe(true);
  expect(offset.fog).toBe(.0024);
  expect(offset.particles).toBeGreaterThan(0);
  expect(offset.particles).toBeLessThanOrEqual(180);
  await page.screenshot({ path: 'artifacts/custom-presentation/spiral-rain.png' });
});

test('canceling a real track swipe preserves the selected atmosphere and current race', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await choosePreset(page, 'Night');
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  await page.mouse.move(1120, 600, { steps: 4 });
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(2);
  await page.waitForTimeout(160); // A held short drag must cancel, rather than count as a flick.
  await page.mouse.up();
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(0);
  await expect(page.locator('[data-track="coast"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#race-visual-preset')).toHaveValue('night');
});
