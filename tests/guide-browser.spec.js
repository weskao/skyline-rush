import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test.use({ guideSeen: false });

const openGuide = async page => {
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await expect(page.locator('#guide-screen')).toBeVisible();
};

test('dismissal records the visit before navigation can interrupt the close event', async ({ page }) => {
  await page.goto('/');
  await openGuide(page);
  expect(await page.evaluate(() => {
    document.querySelector('#guide-close').click();
    return localStorage.getItem('skyline-rush-guide-seen');
  })).toBe('1');
});

test('first visit keeps the home screen clear; Controls opens the keyboard guide and closing it skips practice', async ({ page }) => {
  await page.goto('/');
  const guide = page.locator('#guide-screen');
  await expect(page.locator('#start-button')).toBeVisible();
  await expect(guide).toBeHidden();
  await openGuide(page);
  await expect(page.locator('#guide-desktop-panel')).toBeVisible();
  await expect(page.locator('#guide-mobile-panel')).toBeHidden();
  await expect(guide.locator('[data-keys="throttle"]')).toContainText('W');
  await expect(guide.locator('[data-keys="fly"]')).toContainText('Space');
  await expect(guide.locator('[data-i18n="guide.fly"]')).toHaveText('Hold to fly; release to land. Flight uses fuel.');
  await page.locator('[data-guide-device="mobile"]').click();
  await expect(page.locator('#guide-mobile-panel')).toBeVisible();
  await expect(page.locator('#guide-items-panel')).toBeHidden();
  await page.locator('[data-guide-device="items"]').click();
  await expect(page.locator('#guide-items-panel')).toBeVisible();
  await expect(page.locator('#guide-desktop-panel')).toBeHidden();
  await expect(page.locator('#guide-mobile-panel')).toBeHidden();
  await page.locator('[data-guide-device="desktop"]').click();
  await expect(page.locator('#guide-desktop-panel')).toBeVisible();
  await expect(page.locator('#guide-items-panel')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
  await expect(page.locator('#controls-button')).toBeFocused();
  await page.reload();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect(page.locator('#tutorial-coach')).toBeHidden();
});

test('first Start opens practice; Skip races the selected track and is remembered', async ({ page }) => {
  await page.goto('/');
  const track = await page.locator('[data-track][aria-pressed="true"]').getAttribute('data-track');
  await page.locator('#start-button').click();
  await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
  await expect(page.locator('#tutorial-exit')).toHaveText('Skip');
  await page.locator('#tutorial-pause').click();
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('#tutorial-exit')).toHaveText('跳過');
  await selectLocale(page, 'en');
  await page.locator('#tutorial-exit').click();
  await expect(page.locator('#tutorial-coach')).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  expect(await page.evaluate(() => sessionStorage.getItem('skyline-rush-last-track'))).toBe(track);
  await page.reload();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect(page.locator('#tutorial-coach')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#controls-button').click();
  await page.locator('#tutorial-open').click();
  await expect(page.locator('#tutorial-exit')).toHaveText('Exit');
});

test('guide follows custom key bindings and remains usable with blocked storage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-keymap', JSON.stringify({ throttle: ['KeyZ'], brake: ['KeyS'], left: ['KeyA'], right: ['KeyD'], fly: ['Space'], boost: ['ShiftLeft'], nitro: ['KeyE'] }));
  });
  await page.goto('/');
  await openGuide(page);
  await expect(page.locator('#guide-screen [data-keys="throttle"]')).toHaveText('Z');
  await page.locator('#guide-close').click();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.reload();
  await openGuide(page);
  await page.locator('#guide-close').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
});

test('opening guide from paused controls does not resume the race', async ({ page }) => {
  await page.goto('/');
  await page.locator('#start-button').click();
  await page.locator('#tutorial-exit').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.press('Escape');
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await openGuide(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#guide-screen')).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
});

test('rings and supplies guide explains all ring types, road pickups and mystery items in en and zh-TW', async ({ page }) => {
  await page.goto('/');
  await openGuide(page);
  await page.locator('[data-guide-device="items"]').click();
  const panel = page.locator('#guide-items-panel');
  await expect(panel).toBeVisible();

  // Rings
  await expect(panel.locator('[data-i18n="guide.items.ring.charge.title"]')).toHaveText('Charge Ring (Cyan)');
  await expect(panel.locator('[data-i18n="guide.items.ring.nitro.title"]')).toHaveText('Nitro Ring (Gold)');
  await expect(panel.locator('[data-i18n="guide.items.ring.slipstream.title"]')).toHaveText('Slipstream Ring (Purple)');
  await expect(panel.locator('[data-i18n="guide.items.ring.risk.title"]')).toHaveText('Risk Ring (Red)');
  await expect(panel.locator('[data-i18n="guide.items.ring.mystery.title"]')).toHaveText('Mystery Ring (Rainbow)');
  await expect(panel.locator('[data-i18n="guide.items.ring.perfect.title"]')).toHaveText('Perfect Line (Cluster Bonus)');

  // Pickups
  await expect(panel.locator('[data-i18n="guide.items.pickup.cell.title"]')).toHaveText('Energy Cell (Blue)');
  await expect(panel.locator('[data-i18n="guide.items.pickup.can.title"]')).toHaveText('Energy Canister (Orange)');
  await expect(panel.locator('[data-i18n="guide.items.pickup.tank.title"]')).toHaveText('High-Capacity Tank (Gold)');
  await expect(panel.locator('[data-i18n="guide.items.pickup.overcharge.title"]')).toHaveText('Overcharge Core (Rainbow)');

  // Mystery powers
  await expect(panel.locator('[data-i18n="guide.items.power.shield.title"]')).toHaveText('Energy Shield');
  await expect(panel.locator('[data-i18n="guide.items.power.magnet.title"]')).toHaveText('Magnetic Field');
  await expect(panel.locator('[data-i18n="guide.items.power.ghost.title"]')).toHaveText('Ghost Phase');
  await expect(panel.locator('[data-i18n="guide.items.power.freeze.title"]')).toHaveText('Nitro Freeze');

  // Switch to zh-TW
  await page.locator('#guide-close').click();
  await selectLocale(page, 'zh-TW');
  await openGuide(page);
  await page.locator('[data-guide-device="items"]').click();

  await expect(panel.locator('[data-i18n="guide.items.ring.charge.title"]')).toHaveText('充能光環（青藍）');
  await expect(panel.locator('[data-i18n="guide.items.ring.nitro.title"]')).toHaveText('NITRO 光環（金黃）');
  await expect(panel.locator('[data-i18n="guide.items.pickup.overcharge.title"]')).toHaveText('超能過載（彩虹）');
  await expect(panel.locator('[data-i18n="guide.items.power.shield.title"]')).toHaveText('防護能量護盾');
  await expect(panel.locator('[data-i18n="guide.items.power.magnet.title"]')).toHaveText('強力磁吸力場');
  await expect(panel.locator('[data-i18n="guide.items.power.ghost.title"]')).toHaveText('幽靈穿透狀態');
  await expect(panel.locator('[data-i18n="guide.items.power.freeze.title"]')).toHaveText('極速寒冰急凍');

  await page.locator('#guide-close').click();
  await expect(page.locator('#guide-screen')).toBeHidden();
});
