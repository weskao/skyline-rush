import { test, expect } from './helpers/test.js';
import { PAINTS } from '../src/appearance.ts';

const paintCount = Object.keys(PAINTS).length;

// npm run test:browser builds trial by default. For a locked dist, set the mode explicitly.
const trial = [undefined, 'trial'].includes(process.env.GARAGE_VFX_RELEASE_MODE);
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

async function openGarage(page) {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true, comfortable: false }));
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.locator('#garage-button').click();
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
      await openGarage(page);
      const board = page.locator('.garage-mission-board');
      await expect(board).toHaveAttribute('data-rewards-authority', trial ? 'local-demo' : 'not-connected');
      const demoStore = page.locator('[data-wave3-open-store]');
      if (trial) await expect(demoStore).toBeEnabled();
      else await expect(demoStore).toHaveCount(0);

      await Promise.all([
        expectDecoded(page.locator('.garage-car-options [data-car] img'), 2, 432, 198, baseURL),
        expectDecoded(page.locator('.paint-options [data-paint] img'), paintCount, 960, 510, baseURL),
        expectDecoded(board.locator('.garage-mission-card img'), 4, 288, 288, baseURL),
        expectDecoded(board.locator('.garage-trophy-card img'), 4, 288, 288, baseURL),
      ]);
    });
  });
}

test('a failed paint WebP leaves a colored swatch with the paint name', async ({ page }) => {
  await page.route('**/paint-cards/crimson@3x.webp', route => route.abort());
  await openGarage(page);
  const paint = page.locator('.paint-options [data-paint="crimson"]');
  await expect(paint.locator('.garage-paint-name')).toHaveText('Deep Crimson');
  await expect(paint.locator('img')).toHaveCount(0);
  const swatch = paint.locator('.garage-paint-preview');
  await expect(swatch).toBeVisible();
  await expect(swatch).toHaveCSS('background-color', 'rgb(154, 20, 36)');
});
