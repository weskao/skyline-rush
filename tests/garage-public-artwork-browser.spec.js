import { test, expect, openGarage } from './helpers/test.js';
import { openGarageSection } from './helpers/garage-browser.js';
import { PAINTS } from '../src/appearance.ts';

const paintCount = Object.keys(PAINTS).length;

// pnpm run test:browser builds trial by default. For a locked dist, set the mode explicitly.
const trial = [undefined, 'trial'].includes(process.env.GARAGE_VFX_RELEASE_MODE);
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

async function openArtworkGarage(page) {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true, comfortable: false }));
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await openGarage(page);
}

async function expectDecoded(images, count, width, height, baseURL) {
  const base = new URL('feature-assets/', baseURL).pathname;
  await expect.poll(() => images.evaluateAll(imgs => imgs.map(img => {
    img.loading = 'eager';
    const path = img.currentSrc ? new URL(img.currentSrc).pathname : '';
    return [path, img.naturalWidth, img.naturalHeight];
  }))).toEqual(Array.from({ length: count }, () => [
    expect.stringMatching('^' + base + '.+@3x\\.webp$'), width, height,
  ]));
}

for (const viewport of viewports) {
  test.describe(`public Garage artwork at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: viewport.width < 1000, isMobile: viewport.width < 1000 });

    test('dist artwork decodes and the demo store follows the build mode', async ({ page, baseURL }) => {
      await openArtworkGarage(page);
      const board = page.locator('.garage-mission-board');
      await expect(board).toHaveAttribute('data-rewards-authority', trial ? 'local-demo' : 'not-connected');
      const demoStore = page.locator('[data-wave3-open-store]');
      if (trial) await expect(demoStore).toBeEnabled();
      else await expect(demoStore).toHaveCount(0);

      await expectDecoded(page.locator('.garage-car-options [data-car] .garage-car-art img'), 2, 432, 198, baseURL);
      await openGarageSection(page, 'paints');
      await expectDecoded(page.locator('.paint-options [data-paint] .garage-paint-preview img'), paintCount, 960, 510, baseURL);
      await openGarageSection(page, 'missions');
      await Promise.all([
        expectDecoded(board.locator('.garage-mission-card img'), 4, 288, 288, baseURL),
        expectDecoded(board.locator('.garage-trophy-card img'), 4, 288, 288, baseURL),
      ]);
    });
  });
}

test('a failed paint WebP leaves a colored swatch with the paint name', async ({ page }) => {
  await page.route('**/paint-cards/crimson@3x.webp', route => route.abort());
  await openArtworkGarage(page);
  await openGarageSection(page, 'paints');
  const paint = page.locator('.paint-options [data-paint="crimson"]');
  await expect(paint.locator('.garage-paint-name')).toHaveText('Deep Crimson');
  await expect(paint.locator('.garage-paint-preview img')).toHaveCount(0);
  const swatch = paint.locator('.garage-paint-preview');
  await expect(swatch).toBeVisible();
  await expect(swatch).toHaveCSS('background-color', 'rgb(154, 20, 36)');
});
