import { test, expect } from './helpers/test.js';

// A label wider than the Start button used to grow the button past the intro panel, where the panel's overflow clipped
// the text and the arrow. Start keeps its size and the label wraps to at most two lines inside it.
const LONG_LABEL = { 'en-US': 'Start the race now', 'zh-TW': '立即開始比賽並選擇賽道' };

for (const locale of ['en-US', 'zh-TW']) for (const [width, height] of [[320, 640], [390, 844], [844, 390]]) {
  test.describe(`Start label ${locale} ${width}x${height}`, () => {
    test.use({ locale, viewport: { width, height } });

    for (const showcase of [false, true]) test(`long label stays inside a same-size button, in at most 2 lines${showcase ? ' (airflow showcase)' : ''}`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      if (showcase) await page.evaluate(() => document.body.classList.add('airflow-active'));
      const start = page.locator('#start-button');
      const before = await start.boundingBox();
      await start.locator('span').evaluate((span, text) => { span.textContent = text; }, LONG_LABEL[locale]);
      const after = await start.boundingBox();
      expect(after.height, 'button height unchanged').toBeCloseTo(before.height, 0);
      // Short landscape homes put Start in a fixed right rail outside the setup panel, including with AIRFLOW off.
      const limit = showcase || (width > height && height <= 500) ? width : await page.locator('#intro').evaluate(el => el.getBoundingClientRect().right);
      expect(after.x + after.width, 'button stays inside its container').toBeLessThanOrEqual(limit + 1);
      const label = await start.locator('span').evaluate(span => {
        const range = document.createRange();
        range.selectNodeContents(span);
        const lines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top)));
        return { lines: lines.size, clipped: span.scrollHeight > span.clientHeight + 1 || span.scrollWidth > span.clientWidth + 1 };
      });
      expect(label.lines, 'label lines').toBeLessThanOrEqual(2);
      expect(label.clipped, 'label is not cut off').toBe(false);
    });
  });
}
