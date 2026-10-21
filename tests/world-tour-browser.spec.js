import { test, expect } from '@playwright/test';
import { RACE_TRACKS } from '../src/game.js';
const ids = Object.keys(RACE_TRACKS);
const newIds = ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const seed = page => page.addInitScript(ids => {
  localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
  localStorage.setItem('skyline-rush-music', 'off');
}, ids);
// Mean RGB of the rendered canvas; a NaN-poisoned frame comes back near-black.
const brightness = async page => page.evaluate(async b64 => {
  const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
  const context = new OffscreenCanvas(image.width, image.height).getContext('2d');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, image.width, image.height).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
  return sum / (data.length / 4) / 3;
}, (await page.locator('#world').screenshot()).toString('base64'));

test('ten full-route previews and bilingual names are available without exposing shortcuts', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await expect(page.locator('.track-route-map svg')).toHaveCount(ids.length);
  await expect(page.locator('.track-route-map polyline')).toHaveCount(ids.length);
  for (const id of ids) await expect(page.locator(`.preview-${id}`), `${id} preview has its own sky`).not.toHaveCSS('background-image', 'none');
  await page.locator('[data-locale="zh-TW"]').click();
  await expect(page.locator('[data-track="taipei"] strong')).toHaveText('台北古都');
  await expect(page.locator('[data-track="cosmic"] strong')).toHaveText('星際軌道');
  await page.locator('[data-locale="en"]').click();
  await expect(page.locator('[data-track="taipei"] strong')).toHaveText('Taipei Heritage');
});
// Every course, not just the tour: the flat road in world.js needs WebGL, so only a real frame can check it.
for (const id of ids) test(`course ${id} renders a lit scene and exposes racer HUD markers`, async ({page}) => {
  await seed(page);
  const errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const button=page.locator(`[data-track="${id}"]`);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#track-note')).not.toBeEmpty();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-route-map [data-racer]')).toHaveCount(4);
  await expect(page.locator('#race-status')).toHaveText('RACING');
  expect(await brightness(page), `${id} frame is not black`).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});
test('live minimap does not duplicate secret corridors and moves marker positions', async ({ page }) => {
  await seed(page);await page.goto('/');
  await page.locator('#start-button').click();
  const map=page.locator('#race-route-map svg');
  await expect(map.locator('polyline')).toHaveCount(1);
  await expect(map.locator('[data-racer]')).toHaveCount(4);
  const marker=map.locator('[data-racer="YOU"]');
  const start=await marker.getAttribute('cy');
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect(marker).not.toHaveAttribute('cy',start);
});

// Real browser output for review, kept in test-results so committed artifacts stay untouched.
test('capture genuine world-tour scenes and race HUD', async ({ page }, testInfo) => {
  const shot = name => page.screenshot({ path: testInfo.outputPath(`world-tour-${name}.png`), animations: 'disabled' });
  await seed(page);
  await page.goto('/');
  for (const id of newIds) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForTimeout(400);
    await shot(`${id}-desktop`);
  }
  await page.locator('[data-track="taipei"]').click();
  await page.locator('#start-button').click();
  await page.waitForTimeout(4300);
  await shot('taipei-race-map');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await shot('taipei-mobile');
});
