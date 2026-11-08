import { selectLocale } from './helpers/locale-browser.js';
import { test,expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

const constrained=page=>page.addInitScript(()=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>2});
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>2});
});

test('landscape language controls remain clickable while the quality notice is visible', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await constrained(page);
  await page.goto('/');
  await expect(page.locator('#performance-notice')).toBeVisible();
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('#performance-notice-text')).toContainText('低');
  await page.locator('#performance-notice-dismiss').click();
  await expect(page.locator('#performance-notice')).toBeHidden();
});

test('first visit chooses Low for constrained device, explains it in either language, then never reopens',async({page})=>{
  await constrained(page);
  await page.goto('/');
  const banner=page.locator('#performance-notice');
  await expect(banner).toBeVisible();
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('low');
  await expect(page.locator('#performance-notice-text')).toContainText('Low');
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('#performance-notice-text')).toContainText('低');
  await page.reload();
  await expect(banner).toBeHidden();
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('low');
});
// The decisions (saved manual High wins; a high-capability visitor keeps High) are tests/device-quality.test.js.
// The notice floats over the toolbar's panels (it once blocked every click in them on 4-core CI runners), so opening
// any panel puts it away: the reader is already in the settings it points to.
const panels = {
  audio: { open: page => page.locator('#settings-button').click(), control: page => page.getByRole('switch', { name: 'Sound effects' }) },
  controls: { open: page => page.locator('#controls-button').click(), control: page => page.locator('#controls-panel button:visible').first() },
  vfx: { open: page => page.locator('#vfx-panel > summary').click(), control: page => page.locator('.vfx-settings .custom-select button').first() },
};
for (const [name, panel] of Object.entries(panels)) {
  test(`opening the ${name} panel puts the downgrade notice away so its controls stay clickable`, async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 }));
    await page.goto('/');
    await expect(page.locator('#performance-notice')).toBeVisible();
    await panel.open(page);
    await expect(page.locator('#performance-notice')).toBeHidden();
    await panel.control(page).click({ timeout: ciTimeout(5000) });
  });
}
test('starting a race puts the downgrade notice away so it never covers the race view', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 }));
  await page.goto('/');
  await expect(page.locator('#performance-notice')).toBeVisible();
  await page.locator('#start-button').click();
  await expect(page.locator('#countdown')).toBeVisible();
  await expect(page.locator('#performance-notice')).toBeHidden();
});

test('Ultra quality is selectable, saved across reloads, and switching back to High clears it', async ({ page }) => {
  await page.goto('/');
  const quality = page.locator('select[data-vfx="quality"]');
  await expect(quality.locator('option')).toHaveText(['Low', 'Medium', 'High', 'Ultra']);
  await quality.selectOption('ultra', { force: true });
  await expect(quality).toHaveValue('ultra');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-vfx')))).toMatchObject({ quality: 'high', ultra: true });
  await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', 'high');
  await page.reload();
  await expect(page.locator('select[data-vfx="quality"]')).toHaveValue('ultra');
  await page.locator('select[data-vfx="quality"]').selectOption('high', { force: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-vfx')).ultra)).toBe(false);
});
