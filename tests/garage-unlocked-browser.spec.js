import { expect } from '@playwright/test';
import { test, captureHooks, dressedAs } from './helpers/gameplay-browser.js';
import { openGarageSection } from './helpers/garage-browser.js';
import { CARS } from '../src/car-catalog.ts';
import { PAINTS } from '../src/appearance.ts';
import { GARAGE_SKINS, SKIN_CATEGORIES } from '../src/garage-skin-catalog.ts';
import { ciTimeout } from './helpers/ci.js';

test.use({ unlockedAccess: true, reducedMotion: 'reduce', hasTouch: true });

const garagePreferences = page => page.evaluate(() => Object.fromEntries(
  Object.entries(localStorage).filter(([key]) => /^skyline-rush-(?:car(?:-paints)?$|paint$|gt-trial|stars$|garage-skin-picks|wave3-demo)/.test(key)),
));

async function enterGarage(page, url, viewport) {
  await page.setViewportSize(viewport);
  await captureHooks(page);
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-tutorial-completed', '1');
    localStorage.setItem('skyline-rush-music', 'off');
  });
  await page.goto(url);
  await expect(page.locator('#start-button')).toBeEnabled({ timeout: ciTimeout(20_000) });
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toBeVisible();
}

test('unlocked phone garage equips all cars at zero stars and starts a race in the selected model', async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  await enterGarage(page, gameplayURL, { width: 390, height: 844 });
  const before = await garagePreferences(page);
  await openGarageSection(page, 'cars');
  for (const id of Object.keys(CARS)) {
    const car = page.locator(`[data-car="${id}"]`);
    await car.click();
    await expect(car).toHaveAttribute('aria-pressed', 'true');
    await expect(car).toHaveAttribute('data-car-preview', 'false');
  }
  await expect(page.locator('[data-gt-trial]')).toHaveCount(0);
  expect(await garagePreferences(page)).toEqual(before);
  const selected = Object.values(CARS).at(-1).model;
  await page.locator('#garage-close').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText(/^(COUNTDOWN|RACING)$/);
  await expect.poll(() => dressedAs(page), { timeout: ciTimeout(20_000) }).toBe(selected);
});

test('unlocked garage exposes all paints and effects and equips every category', async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  await enterGarage(page, gameplayURL, { width: 1000, height: 740 });
  const before = await garagePreferences(page);
  await openGarageSection(page, 'paints');
  for (const id of Object.keys(PAINTS)) {
    const paint = page.locator(`[data-paint="${id}"]`);
    await paint.click();
    if (await paint.getAttribute('data-state') !== 'equipped') await page.locator('#garage-equip').click();
    await expect(paint).toHaveAttribute('data-state', 'equipped');
  }

  await openGarageSection(page, 'effects');
  await expect(page.locator('#garage-vfx-catalog [data-skin]')).toHaveCount(GARAGE_SKINS.length);
  for (const category of SKIN_CATEGORIES) {
    const { id } = GARAGE_SKINS.find(skin => skin.category === category && !skin.default);
    await page.locator(`[data-skin="${id}"] .garage-skin-action`).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute(`data-skin-equipped-${category}`, id);
  }
  expect(await garagePreferences(page)).toEqual(before);
});

test('unlocked Store equips each type of cosmetic directly without a balance or inventory change', async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  await enterGarage(page, gameplayURL, { width: 844, height: 390 });
  await openGarageSection(page, 'store');
  const store = page.locator('[data-wave3-demo-store]');
  const balances = () => store.locator('[data-demo-balance] strong').allTextContents();
  const before = await garagePreferences(page);
  const originalBalances = await balances();
  await expect(store.locator('[data-demo-id]')).toHaveCount(GARAGE_SKINS.filter(skin => !skin.default).length);
  for (const category of SKIN_CATEGORIES) {
    const { id } = GARAGE_SKINS.findLast(skin => skin.category === category && !skin.default);
    await store.locator(`[data-demo-id="${id}"]`).click();
    await store.getByRole('button', { name: 'Equip for testing' }).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute(`data-skin-equipped-${category}`, id);
  }
  expect(await balances()).toEqual(originalBalances);
  expect(await garagePreferences(page)).toEqual(before);
});
