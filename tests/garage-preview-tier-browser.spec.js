import { test, expect, gotoHome, openGarage } from './helpers/test.js';
import { openGarageSection } from './helpers/garage-browser.js';
import { SPRINT_TIERS } from '../src/sprint-tier.ts';

// The control lists the shared ladder: a tier added to sprint-tier.ts must show up here without a spec edit.
const TIERS = Object.keys(SPRINT_TIERS).filter(id => SPRINT_TIERS[id].level > 0)
  .sort((a, b) => SPRINT_TIERS[a].level - SPRINT_TIERS[b].level);
const COPY = {
  'en-US': { group: 'Sprint preview', thruster: 'Thruster', hint: /Inspect/ },
  'zh-TW': { group: '衝刺預覽', thruster: '推進器', hint: /檢視模式/ },
};

for (const { viewport, touch } of [
  { viewport: { width: 390, height: 844 }, touch: true },
  { viewport: { width: 844, height: 390 }, touch: true },
  { viewport: { width: 1440, height: 900 }, touch: false },
]) for (const locale of ['en-US', 'zh-TW']) {
  test.describe(`Garage sprint preview at ${viewport.width}×${viewport.height} ${locale}`, () => {
    test.use({ viewport, hasTouch: touch, locale, reducedMotion: 'reduce' });

    test('BOOST, NITRO and both are one keyboard and touch control, kept from Garage Home into Inspect', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await gotoHome(page);
      await openGarage(page);
      await openGarageSection(page, 'effects');
      const category = page.locator('[data-vfx-category="thruster"]');
      const control = category.getByRole('group', { name: COPY[locale].group });
      const buttons = control.locator('[data-sprint-tier]');
      const activate = locator => touch ? locator.tap() : locator.click();
      const pressed = () => buttons.evaluateAll(all => all.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.sprintTier));

      await control.scrollIntoViewIfNeeded();
      await expect(buttons).toHaveCount(TIERS.length);
      await expect.poll(() => buttons.evaluateAll(all => all.map(b => b.dataset.sprintTier))).toEqual(TIERS);
      // The game's own terms stay in both locales, as on the HUD.
      await expect(buttons).toHaveText(['BOOST', 'NITRO', 'NITRO + BOOST']);
      await expect.poll(pressed).toEqual([TIERS.at(-1)]);
      // Garage Home's car idles on the real home scene: the control says where the tier plays.
      await expect(category.locator('.garage-tier-hint')).toHaveText(COPY[locale].hint);

      const boxes = await buttons.evaluateAll(all => all.map(b => {
        const r = b.getBoundingClientRect();
        return { w: b.offsetWidth, h: b.offsetHeight, left: r.left, right: r.right, clipped: b.scrollWidth > b.clientWidth };
      }));
      for (const box of boxes) {
        expect(box.w).toBeGreaterThanOrEqual(44);
        expect(box.h).toBeGreaterThanOrEqual(44);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(viewport.width);
        expect(box.clipped).toBe(false);
      }

      await activate(buttons.nth(0));
      await expect.poll(pressed).toEqual([TIERS[0]]);
      await expect(control).toHaveAttribute('data-preview-tier', TIERS[0]);
      await buttons.nth(1).focus();
      await page.keyboard.press('Enter');
      await expect.poll(pressed).toEqual([TIERS[1]]);

      await activate(page.locator('#garage-studio-open'));
      await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
      await openGarageSection(page, 'effects');
      await expect(control).toBeVisible();
      await expect.poll(pressed).toEqual([TIERS[1]]);
      await expect(category.locator('.garage-tier-hint')).toBeHidden();
      await control.scrollIntoViewIfNeeded();
      await activate(buttons.nth(2));
      await expect.poll(pressed).toEqual([TIERS[2]]);
      await test.info().attach(`garage-sprint-preview-${viewport.width}-${locale}.png`, {
        body: await page.locator('#garage-screen').screenshot(), contentType: 'image/png',
      });
      expect(errors).toEqual([]);
    });

    test('each thruster card states its state once and four cards form a 2×2 block', async ({ page }) => {
      await gotoHome(page);
      await openGarage(page);
      await openGarageSection(page, 'effects');
      const cards = page.locator('[data-vfx-category="thruster"] .garage-skin-card');
      await expect(cards).toHaveCount(4);
      await cards.first().scrollIntoViewIfNeeded();
      const read = () => cards.evaluateAll(all => all.map(card => {
        const visible = el => !!el && getComputedStyle(el).display !== 'none';
        const pill = [...card.querySelectorAll('.garage-skin-status, .garage-skin-preview-label')].filter(visible).map(el => el.textContent.trim()).filter(Boolean);
        const r = card.getBoundingClientRect(), action = card.querySelector('.garage-skin-action');
        return { pill, action: action.textContent.trim(), top: Math.round(r.top), left: Math.round(r.left), actionHeight: action.offsetHeight };
      }));
      await expect.poll(async () => (await read()).every(card => card.pill.length <= 1 && !card.pill.includes(card.action))).toBe(true);
      const layout = await read(); // settled: the poll above read the same rendered cards
      expect(new Set(layout.map(card => card.top)).size).toBe(2);
      expect(new Set(layout.map(card => card.left)).size).toBe(2);
      for (const card of layout) expect(card.actionHeight).toBeGreaterThanOrEqual(44);
    });
  });
}
