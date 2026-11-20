import { readdirSync } from 'node:fs';
import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { openGarage } from './helpers/test.js';

const artwork = new URL('../public/feature-assets/collectible-ui/', import.meta.url);
const files = readdirSync(artwork).filter(file => file.endsWith('.webp'));
test.use({ reducedMotion: 'reduce' });

test('collectible controls have complete transparent artwork at native three times size', async ({ page, gameplayURL }) => {
  await page.goto(gameplayURL + 'tests/fixtures/acquisition-reveal.html');
  const checked = await page.evaluate(async names => Promise.all(names.map(async name => {
    const icon = new Image();
    icon.src = '/feature-assets/collectible-ui/' + name;
    await icon.decode();
    const canvas = document.createElement('canvas');
    const size = icon.naturalWidth;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(icon, 0, 0);
    const { data } = ctx.getImageData(0, 0, size, size);
    let border = size, visible = 0;
    for (let pixel = 0; pixel < size * size; pixel++) {
      if (data[pixel * 4 + 3] <= 16) continue;
      const x = pixel % size, y = Math.floor(pixel / size);
      border = Math.min(border, x, y, size - 1 - x, size - 1 - y);
      visible++;
    }
    return { name, size, height: icon.naturalHeight, border, visible };
  })), files);
  expect(checked.length).toBeGreaterThan(35);
  for (const icon of checked) {
    const panelSize = { 'cart-panel@3x.webp': 156, 'mission-panel@3x.webp': 120 };
    const expected = panelSize[icon.name] ?? (icon.name.endsWith('-panel@3x.webp') ? 216 : 72);
    expect(icon.size, icon.name).toBe(expected);
    expect(icon.height, icon.name).toBe(expected);
    expect(icon.border, icon.name).toBeGreaterThanOrEqual(Math.floor(expected * .07));
    expect(icon.visible, icon.name).toBeGreaterThan(expected * expected * .12);
  }
});

test('Garage and Store icons fit their controls and change with the selected tab', async ({ gameplayPage: page }) => {
  await openGarage(page);
  const garage = page.locator('#garage-screen');
  const cars = garage.locator('[data-garage-section="cars"]');
  const store = garage.locator('[data-garage-section="store"]');
  await expect(cars).toHaveAttribute('aria-pressed', 'true');
  const before = await cars.locator('.collectible-icon').evaluate(icon => getComputedStyle(icon).filter);
  await store.click();
  await expect(cars).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => cars.locator('.collectible-icon').evaluate(icon => getComputedStyle(icon).filter)).not.toBe(before);
  const filter = garage.locator('.demo-filters button').first();
  await expect(filter.locator('img')).toHaveJSProperty('naturalWidth', 72);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect(store).toBeInViewport();
    await expect(filter.locator('img')).toBeInViewport();
    const controls = await garage.locator('.garage-section-nav button:visible, .demo-filters button:visible')
      .evaluateAll(buttons => buttons.map(button => {
        const rect = button.getBoundingClientRect();
        const icon = button.querySelector('.collectible-icon')?.getBoundingClientRect();
        return !!icon && icon.width === 24 && icon.height === 24 && rect.height >= 44
          && icon.left >= rect.left && icon.right <= rect.right && icon.top >= rect.top && icon.bottom <= rect.bottom;
      }));
    expect(controls).toContain(true);
    expect(controls.every(Boolean)).toBe(true);
  }
});
