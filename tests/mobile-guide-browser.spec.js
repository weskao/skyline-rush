import { test, expect } from './helpers/test.js';
import { CATALOGS } from '../src/i18n.js';

test.use({ guideSeen: false, hasTouch: true, isMobile: true });

test.describe('390x844 first tap', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('first Start tap opens touch practice with a reachable Skip into the race', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-button').tap();
    await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
    await expect(page.locator('#touch-controls [data-control="throttle"]')).toHaveClass(/tutorial-target/);
    const skip = page.locator('#tutorial-exit');
    await expect(skip).toHaveText('Skip');
    const bounds = await skip.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await skip.tap();
    await expect(page.locator('#race-status')).toHaveText('RACING');
  });
});

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  for (const locale of ['en-US', 'zh-TW']) {
    test.describe(`${viewport.width}x${viewport.height} ${locale}`, () => {
      test.use({ viewport, locale });
      test('mobile instructions are readable, static and fit the dialog', async ({ page }) => {
        await page.goto('/');
        const guide = page.locator('#guide-mobile');
        await page.locator('#controls-button').click();
        await page.locator('#guide-open').click();
        await expect(page.locator('#guide-screen')).toBeVisible();
        await expect(guide).toBeVisible();
        // The guide names each control by the label that locale's UI shows.
        const labels = CATALOGS[locale === 'zh-TW' ? 'zh-TW' : 'en'];
        for (const name of [labels['controls.mode.slide'], labels['controls.mode.buttons'], labels['assist.label'], 'FLY', 'BOOST', 'NITRO', labels['controls.button']]) {
          await expect(guide).toContainText(name);
        }
        await expect(guide).toContainText(locale === 'zh-TW' ? '下拉煞車' : 'drag down to brake');
        await expect(guide).toContainText(locale === 'zh-TW' ? '暫停' : 'Pause');
        await expect(guide.locator('button, input, [data-control]')).toHaveCount(0);
        expect(await guide.evaluate(el => {
          const bounds = el.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth && el.scrollWidth <= el.clientWidth;
        })).toBe(true);
        const close = page.locator('#guide-close');
        await close.scrollIntoViewIfNeeded();
        const bounds = await close.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        await close.click();
        await expect(page.locator('#guide-screen')).toBeHidden();
      });
    });
  }
}
