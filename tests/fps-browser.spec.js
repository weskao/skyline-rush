import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

// Exercise the visible custom combobox, not its deliberately hidden backing <select>.
const chooseFps = async (page, value) => {
  const picker = page.locator('#target-fps + .custom-select');
  await picker.getByRole('combobox').click();
  await picker.getByRole('option', { name: `${value} FPS`, exact: true }).click();
  await expect(page.locator('#target-fps')).toHaveValue(value);
  await expect(picker.getByRole('combobox')).toHaveText(`${value} FPS`);
};

test('FPS selector remembers manual 30 independently of graphics quality across reload', async ({page}) => {
  await page.goto('/');
  await page.locator('#vfx-panel > summary').click();
  await expect(page.locator('#target-fps')).toHaveValue('auto');
  await chooseFps(page, '30');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue(/^(low|medium|high)$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('skyline-rush-target-fps-v1'))).toBe('30');
  await page.reload();
  await expect(page.locator('#target-fps')).toHaveValue('30');
  await page.locator('#vfx-panel > summary').click();
  await chooseFps(page, '60');
  await page.reload();
  await expect(page.locator('#target-fps')).toHaveValue('60');
});

test('FPS choice translates to Traditional Chinese and survives the language switch', async ({page}) => {
  await page.goto('/');
  await page.locator('#vfx-panel > summary').click();
  await chooseFps(page, '30');
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('[data-i18n="vfx.fps"]')).toHaveText('目標幀率');
  await expect(page.locator('#target-fps')).toHaveValue('30');
});

test('invalid saved FPS preference falls back to Auto without breaking Start', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-target-fps-v1', '120'));
  await page.goto('/');
  await expect(page.locator('#target-fps')).toHaveValue('auto');
  await page.locator('#start-button').click();
  await expect(page.locator('#countdown')).toBeVisible();
});
