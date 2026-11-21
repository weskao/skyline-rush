import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';

// Guard: the Home hero and track-chooser maps are clones of a card's route map, so the map's own relabel() never
// reaches them. After a live switch every route map in the DOM, hidden ones included, must name its route in the new language.
const CJK = /[㐀-鿿豈-﫿　-〿]/;
const inLocale = { en: label => /^Full .+ main route/.test(label) && !CJK.test(label), 'zh-TW': label => label.includes('完整主要路線') };
const VIEWPORTS = [['desktop', { width: 1440, height: 900 }, false], ['phone portrait', { width: 390, height: 844 }, true],
  ['phone landscape', { width: 844, height: 390 }, true]];
const wrongLabels = async (page, locale) => (await page.locator('svg.route-overview').evaluateAll(maps =>
  maps.map(map => [map.parentElement?.id || map.parentElement?.className, map.getAttribute('aria-label') ?? ''])))
  .filter(([, label]) => !inLocale[locale](label)).map(([slot, label]) => `${slot}: ${label}`);

for (const [vpName, viewport, hasTouch] of VIEWPORTS) for (const [from, system, to] of [['en', 'en-US', 'zh-TW'], ['zh-TW', 'zh-TW', 'en']]) {
  test.describe(`route maps after a live ${from} → ${to} switch, ${vpName}`, () => {
    test.use({ viewport, hasTouch, isMobile: hasTouch, locale: system });

    test('every route map, the Home hero copy included, is relabelled', async ({ gameplayPage: page }) => {
      await expect(page.locator('#lobby-hero-map svg.route-overview')).toHaveCount(1);
      expect(await wrongLabels(page, from)).toEqual([]);
      await selectLocale(page, to);
      await expect(page.locator('html')).toHaveAttribute('lang', to);
      await expect.poll(() => wrongLabels(page, to)).toEqual([]);
    });
  });
}
