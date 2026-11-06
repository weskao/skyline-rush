import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Exercise the visible custom combobox, not its deliberately hidden backing <select>.
const chooseFps = async (page, value) => {
  const picker = page.locator('#target-fps + .custom-select');
  await picker.getByRole('combobox').click();
  await picker.getByRole('option', { name: `${value} FPS`, exact: true }).click();
  await expect(page.locator('#target-fps')).toHaveValue(value);
  await expect(picker.getByRole('combobox')).toHaveText(`${value} FPS`);
};

// An invalid saved value falling back to Auto is tests/frame-pacing.test.js ("preferences are sanitized").
test('FPS selector remembers manual 30/60/90/120 independently of graphics quality across reload and localizes', async ({page}) => {
  test.setTimeout(ciTimeout(120_000)); // five reloads and four picker rounds in one page: past the 45 s default
  await page.goto('/');
  await page.locator('#vfx-panel > summary').click();
  await expect(page.locator('#target-fps')).toHaveValue('auto');
  await chooseFps(page, '30');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue(/^(low|medium|high)$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('skyline-rush-target-fps-v1'))).toBe('30');
  await page.reload();
  await expect(page.locator('#target-fps')).toHaveValue('30');
  for (const value of ['60', '90']) {
    await page.locator('#vfx-panel > summary').click();
    await chooseFps(page, value);
    await page.reload();
    await expect(page.locator('#target-fps')).toHaveValue(value);
  }
  await page.locator('#vfx-panel > summary').click();
  await chooseFps(page, '120');
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('[data-i18n="vfx.fps"]')).toHaveText('目標幀率');
  await expect(page.locator('[data-i18n="vfx.fps.note"]')).toContainText('90／120 FPS');
  await expect(page.locator('#target-fps')).toHaveValue('120');
  await page.reload();
  await expect(page.locator('#target-fps')).toHaveValue('120');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue(/^(low|medium|high)$/);
});
