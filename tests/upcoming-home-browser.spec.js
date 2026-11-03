import { test, expect } from './helpers/test.js';

const stage1 = ['dune-tempest', 'monsoon-ruins', 'skyfall-archipelago', 'volcanic-crown', 'stormline-megacity'];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast']));
    localStorage.setItem('skyline-rush-locale', 'en');
  });
  await page.goto('/');
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
});

test('only Stage 1 home concepts are selectable; no fake race can start even by keyboard', async ({ page }) => {
  await expect(page.locator('[data-upcoming-track]')).toHaveCount(5);
  await expect(page.locator('[data-upcoming-track="frostbite-canyon"]')).toHaveCount(0);
  for (const id of stage1) {
    await page.locator(`[data-upcoming-track="${id}"]`).click();
    await expect(page.locator(`[data-upcoming-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#start-button')).toBeDisabled();
    await expect(page.locator('#start-button span')).toHaveText('COMING SOON');
    await expect(page.locator('#upcoming-scene-image')).toHaveAttribute('src', new RegExp(id + '\\.jpg$'));
    await expect(page.locator('#track-length')).toContainText('PLANNED');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await page.locator('[data-track="coast"]').click();
  await expect(page.locator('#upcoming-scene')).toBeHidden();
  await expect(page.locator('#start-button')).toBeEnabled();
  await expect(page.locator('#start-button span')).toHaveText('Start race');
  await expect(page.locator('#start-button')).toHaveAccessibleName('Start race'); // Playable CTA keeps its established accessible name.
  await page.locator('[data-track="neon"]').click();
  await expect(page.locator('#start-button')).toBeDisabled();
  await expect(page.locator('#start-button span')).toHaveText('LOCKED');
});

test('CTA copy is translated without resizing its hit target', async ({ page }) => {
  await page.locator('[data-upcoming-track="dune-tempest"]').click();
  const button = page.locator('#start-button');
  const widthEn = await button.evaluate(e => e.getBoundingClientRect().width);
  await page.locator('#locale-select').selectOption('zh-TW');
  await expect(button.locator('span')).toHaveText('即將推出');
  await expect(page.locator('[data-upcoming-track="dune-tempest"] small')).toHaveText('即將推出');
  await expect(page.locator('[data-upcoming-track="dune-tempest"] strong')).toHaveText('沙暴裂谷');
  const widthZh = await button.evaluate(e => e.getBoundingClientRect().width);
  expect(Math.abs(widthEn - widthZh)).toBeLessThan(1);
  await page.locator('[data-track="coast"]').click();
  await expect(button.locator('span')).toHaveText('開始比賽');
});

test('selecting an Event Lab course clears a previously selected coming-soon preview', async ({ page }) => {
  await page.locator('[data-upcoming-track="dune-tempest"]').click();
  await expect(page.locator('#upcoming-scene')).toBeHidden(); // Live WebGL replaces the JPEG hero.
  await expect(page.locator('#world')).toBeVisible();
  await page.locator('button[data-race-mode="eventlab"]').click();
  await expect(page.locator('#event-lab-dialog')).toBeVisible();
  await page.locator('#lab-use').click();
  await expect(page.locator('#event-lab-dialog')).toBeHidden();
  await expect(page.locator('[data-upcoming-track="dune-tempest"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#upcoming-scene')).toBeHidden();
  await expect(page.locator('#start-button')).toBeEnabled();
  await expect(page.locator('#start-button span')).toHaveText('Start race');
});

test('keyboard arrows can focus the first future card after the last playable map', async ({ page }) => {
  await page.locator('[data-track="cosmic"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-upcoming-track="dune-tempest"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-upcoming-track="dune-tempest"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#start-button')).toBeDisabled();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});

test('Start and Coming Soon labels fit after locale switching on phones', async ({ page }) => {
  const start = page.locator('#start-button');
  const label = start.locator('span');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const upcoming of [false, true]) {
      await page.locator(upcoming ? '[data-upcoming-track="dune-tempest"]' : '[data-track="coast"]').click();
      for (const locale of ['zh-TW', 'en']) {
        await page.locator('#locale-select').selectOption(locale);
        await expect(label).toHaveText(upcoming
          ? (locale === 'en' ? 'COMING SOON' : '即將推出')
          : (locale === 'en' ? 'Start race' : '開始比賽'));
        const sizing = await start.evaluate(button => {
          const span = button.querySelector('span');
          return { button: button.getBoundingClientRect().width, text: span.scrollWidth, available: span.clientWidth };
        });
        expect(sizing.button).toBe(viewport.height < 500 ? 190 : 210);
        expect(sizing.text, `${locale} ${upcoming ? 'Coming Soon' : 'Start'} must not be clipped`)
          .toBeLessThanOrEqual(sizing.available + 1);
      }
    }
  }
});
