import { test, expect } from '@playwright/test';

// Earning a charge needs a full PERFECT LINE (see handoff-browser.spec.js); this spec only pins the
// FLY + NITRO label, so the served bundle starts the player with 3 charges instead.
const chargedStart = async page => {
  let patched = false;
  await page.route('**/assets/*.js', async route => {
    const response = await route.fetch();
    const body = await response.text();
    const charged = body.replace('nitro:0,nitroTime:0,nitroHeld:!1', 'nitro:3,nitroTime:0,nitroHeld:!1');
    patched ||= charged !== body;
    await route.fulfill({ response, body: charged });
  });
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  expect(patched, 'player init text changed in the bundle; update chargedStart').toBe(true);
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect(page.locator('#nitro-status')).toHaveText('NITRO MAX');
};

test('desktop: FLY + NITRO shows AIR DASH · NITRO and keeps flying', async ({ page }) => {
  await chargedStart(page);
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(70);
  // Held, not pressed: a down/up pair can fall between two simulation frames.
  await page.keyboard.down('e');
  await page.keyboard.down('Space');
  await expect(page.locator('#flight-state')).toHaveText('AIR DASH · NITRO');
  await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeGreaterThan(1);
  await page.keyboard.up('Space');
  await page.keyboard.up('e');
  await page.keyboard.up('w');
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });
  test('NITRO + FLY held together show AIR DASH · NITRO', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    const touch = (type, ...touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
    const centre = async action => {
      const box = await page.locator(`[data-control="${action}"]`).boundingBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    await chargedStart(page);
    await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(70);
    const nitro = { id: 1, ...await centre('nitro') };
    await touch('touchStart', nitro);
    await touch('touchStart', nitro, { id: 2, ...await centre('fly') });
    await expect(page.locator('#flight-state')).toHaveText('AIR DASH · NITRO');
    await touch('touchEnd');
  });
});
