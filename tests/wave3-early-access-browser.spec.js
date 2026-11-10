import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

/**
 * Pre-Prompt-A acceptance slice against the REAL built game (not the isolated
 * Store fixture). The trial artifact comes from pretest:browser.
 *
 * Final race->mission->claim E2E is deliberately marked fixme until Prompt A
 * supplies a working mission board. Do not treat skipped tests as acceptance.
 */
const demoKey = 'skyline-rush-wave3-demo:v1:guest';
const openGarage = async page => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toBeVisible();
};
const openStore = async page => {
  await page.locator('[data-wave3-open-store]').click();
  const store = page.locator('[data-wave3-demo-store]');
  await expect(store).toBeVisible();
  return store;
};

test('fresh guest can open the real Garage, missions and demo entry without signing in', async ({ page }) => {
  await page.route(/https:\/\/(?:identitytoolkit|securetoken|firestore)\.googleapis\.com\//,
    route => route.abort('failed'));
  await openGarage(page);
  await expect(page.locator('.garage-mission-board')).toBeVisible();
  await expect(page.locator('[data-mission-id="mission-race"]')).toBeVisible();
  await expect(page.locator('[data-wave3-demo-entry]')).toBeVisible();
  await expect(page.locator('[data-wave3-open-store]')).toBeEnabled();
  await expect(page.locator('[data-garage-store-entry]')).toContainText(/coming soon/i);
  await expect(page.locator('#garage-screen')).not.toContainText(/purchase confirmed|server verified/i);
});

test('real Garage rejects unaffordable demo redemption and keeps collection empty offline', async ({ page }) => {
  await openGarage(page);
  const store = await openStore(page);
  await expect(store.locator('.demo-wallet strong')).toHaveText('20');
  await store.locator('[data-demo-id="thruster-ion"]').click();
  await store.getByRole('button', { name: 'Demo redeem' }).click();
  await expect(store.locator('.demo-message')).toContainText('Not enough demo points');
  await expect(store.locator('.demo-wallet strong')).toHaveText('20');

  await page.context().setOffline(true);
  try {
    await store.getByRole('button', { name: 'Demo Collection' }).click();
    const collection = page.locator('[data-wave3-demo-collection]');
    await expect(collection).toBeVisible();
    await expect(collection.locator('.collection-empty').first()).toContainText(/empty/i);
    await expect(collection.locator('.collection-count strong')).toHaveText('0');
    await collection.locator('[data-demo-id="thruster-ion"]').click();
    await expect(collection.getByRole('button', { name: 'Equip demo preview' })).toBeDisabled();
    expect(await page.evaluate(() => {
      const entry = JSON.parse(localStorage.getItem('skyline-rush-wave3-demo:v1:guest') || 'null');
      return entry?.snapshot?.demoInventory ?? [];
    })).toEqual([]);
  } finally {
    await page.context().setOffline(false);
  }
});

test('corrupt or unsupported demo cache cannot restore forged points or inventory', async ({ page }) => {
  await page.goto('/');
  for (const invalid of ['{broken-json', JSON.stringify({
    version: 999, accountId: 'guest', savedAt: Date.now(),
    snapshot: { mode: 'local-demo', accountId: 'guest', demoPoints: 999999,
      demoInventory: ['thruster-ion'], equippedPreview: 'thruster-ion' },
  })]) {
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [demoKey, invalid]);
    await page.reload();
    await page.locator('#garage-button').click();
    const store = await openStore(page);
    await expect(store.locator('.demo-wallet strong')).toHaveText('20');
    await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', /locked|trial/);
    await page.locator('#garage-close').click();
  }
});

test('real Garage demo uses localized keyboard navigation and tolerates missing artwork in phone landscape', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp',
    route => route.abort('failed'));
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const store = await openStore(page);
  await expect(store).toContainText('試玩商城');
  const ion = store.locator('[data-demo-id="thruster-ion"]');
  await ion.scrollIntoViewIfNeeded();
  await ion.focus();
  await page.keyboard.press('Enter');
  await expect(ion).toHaveAttribute('aria-pressed', 'true');
  await expect(store).toContainText('試玩點數');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await test.info().attach('wave3-pre-a-844x390-zh-TW.png',
    { body: await page.screenshot(), contentType: 'image/png' });
});

test('starting actual Free Drive cannot immediately credit a demo race reward', async ({ page }) => {
  await page.goto('/');
  await page.locator('button[data-race-mode="free"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await expect.poll(() => page.evaluate(key => {
    const entry = JSON.parse(localStorage.getItem(key) || 'null');
    return entry?.snapshot?.demoPoints ?? 20;
  }, demoKey), { timeout: ciTimeout(8000) }).toBe(20);
});

test.fixme('FINAL GATE: actual completed race -> live mission -> claim -> Store -> Collection -> equip -> reload -> reset', async ({ page }) => {
  // Prompt A must first replace the static "Not tracking" board with real
  // progress and claim controls. This scenario must use real race simulation:
  // never call port.settleCompletion() or mutate window.gameplay as a shortcut.
  await openGarage(page);
  await expect(page.locator('[data-mission-id="mission-race"]')).not.toHaveAttribute('data-mission-state', 'unavailable');
  await page.locator('#garage-close').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  // Drive to a genuine finish and assert the result receipt exactly once.
  // On activation, finish this script with mission claim, wallet delta,
  // offline redemption, collection equip, persistent reload and scoped reset.
});

test.fixme('FINAL GATE: guest/account isolation, duplicate claim/settlement, existing PAINTS and Cloud Save preservation', async ({ page }) => {
  // Account-switch and real progress assertions require the live mission
  // implementation, a completed race, and a verified way back to Garage.
  await openGarage(page);
  await expect(page.locator('.garage-mission-board')).not.toHaveAttribute('data-rewards-authority', 'not-connected');
});
