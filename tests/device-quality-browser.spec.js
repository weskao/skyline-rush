import { selectLocale } from './helpers/locale-browser.js';
import { test,expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

const constrained=page=>page.addInitScript(()=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>2});
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>2});
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
test('saved manual High takes precedence and suppresses automatic downgrade notice',async({page})=>{
  await constrained(page);
  await page.addInitScript(()=>localStorage.setItem('skyline-rush-vfx',
    JSON.stringify({quality:'high',preset:'extreme',enabled:true})));
  await page.goto('/');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('high');
  await expect(page.locator('#performance-notice')).toBeHidden();
});
test('high-capability fresh visitor keeps full graphics and sees no performance notice',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>12});
    Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>16});
  });
  await page.goto('/');
  await expect(page.locator('[data-vfx="quality"]')).toHaveValue('high');
  await expect(page.locator('#performance-notice')).toBeHidden();
});
// The notice floats over the toolbar's panels (it once blocked every click in them on 4-core CI runners), so opening
// any panel puts it away: the reader is already in the settings it points to.
const panels = {
  audio: { open: page => page.getByRole('button', { name: 'Audio and HUD settings' }).click(), control: page => page.getByRole('switch', { name: 'Sound effects' }) },
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
