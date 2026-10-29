import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';

const choose = (page, rule, value) => page.locator(`[data-race-rule="${rule}"]`).evaluate((select, next) => {
  select.value = next;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) for (const locale of ['en', 'zh-TW']) test.describe(`Risk lines ${name} ${locale}`, () => {
  test.use({ viewport, hasTouch });
  test('practice can switch the risky lines off, and Hard keeps them on', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await selectLocale(page, locale);
    await page.locator('button[data-race-mode="custom"]').click();
    await page.locator('#race-mode-rules > summary').click();
    const select = page.locator('[data-race-rule="riskLines"]');
    await expect(select).toHaveValue('on');
    await expect(page.locator('label', { has: select })).toContainText(locale === 'en' ? 'close-pass bonus' : '貼身閃避加分');
    await choose(page, 'riskLines', 'off');
    await expect.poll(() => page.evaluate(() => window.gameplay.race.config.riskLines)).toBe('off');
    expect(await page.evaluate(() => window.gameplay.race.rings.some(ring => ring.type === 'risk'))).toBe(false);
    await page.screenshot({ path: `test-results/risk-lines-${name}-${locale}-off.png` });
    await choose(page, 'riskLines', 'on');
    await choose(page, 'difficulty', 'hard');
    await expect.poll(() => page.evaluate(() => window.gameplay.race.config.difficulty)).toBe('hard');
    expect(await page.evaluate(() => window.gameplay.race.config.riskLines)).toBeUndefined();
    expect(await page.evaluate(() => window.gameplay.race.rings.some(ring => ring.type === 'risk'))).toBe(true);
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(errors).toEqual([]);
  });
});
