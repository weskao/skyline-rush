import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Exercise the real built game using the trial artifact from pretest:browser.
const demoKey = 'skyline-rush-wave3-demo:v1:guest';
const modeHistoryKey = 'skyline-rush-mode-history-v1';
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

test('real 5 km Time Attack -> demo result -> claim -> redeem -> equip -> persistence -> reset', async ({ page }) => {
  // Drive the real simulation; never alter window.gameplay, timers, or settlement state.
  test.setTimeout(ciTimeout(240000));
  await page.goto('/');
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('button[data-race-mode="time"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(20000) });
  await page.keyboard.down('w');
  try {
    await expect(page.locator('#race-status')).toHaveText('FINISHED', { timeout: ciTimeout(200000) });
  } finally { await page.keyboard.up('w'); }
  await expect(page.locator('#result-stats')).toBeVisible();
  await expect(page.locator('.wave3-demo-results__points')).toContainText(/20 Demo points/);
  await expect(page.locator('.wave3-demo-results__mark img')).toHaveAttribute('src', /demo-points@3x\.webp$/);
  const banner = page.locator('.wave3-demo-results__banner img');
  await expect(banner).toHaveAttribute('src', /demo-results-banner@3x\.webp$/);
  await expect(banner).toHaveJSProperty('naturalWidth', 432);
  await expect(banner).toHaveJSProperty('naturalHeight', 156);
  const first = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), demoKey);
  expect(first?.snapshot?.demoPoints).toBe(40);
  expect(first.checkpoint.settledCompletions).toHaveLength(1);
  expect(first.snapshot.missions['mission-time:daily'].progress).toBe(1);
  const history = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), modeHistoryKey);
  expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ mode: 'time', track: 'coast' })]));
  await test.info().attach('wave3-real-race-result.png', {
    body: await page.screenshot(), contentType: 'image/png',
  });

  await page.reload();
  const homeWallet = page.locator('#intro [data-wave3-wallet]');
  const homePoints = homeWallet.locator('[data-currency="demo-points"] strong');
  await expect(homeWallet).toBeVisible();
  await expect(homePoints).toHaveText('40');
  await expect(homeWallet.locator('[data-currency="coins"] strong')).toHaveText('0');
  await expect(homeWallet.locator('[data-currency="diamonds"] strong')).toHaveText('0');
  await page.locator('#garage-button').click();
  const board = page.locator('.garage-mission-board');
  await expect(board).toHaveAttribute('data-rewards-authority', 'local-demo');
  await expect(page.locator('#garage-screen [data-wave3-wallet]')).toHaveCount(0);
  const timeMission = board.locator('[data-mission-id="mission-time:daily"]');
  await expect(timeMission).toHaveAttribute('data-mission-state', 'claimable');
  const claimArt = timeMission.locator('[data-wave3-demo-art="demo-claim"] img');
  await expect(claimArt).toHaveJSProperty('naturalWidth', 216);
  await timeMission.getByRole('button', { name: 'Claim demo reward' }).click();
  await expect(timeMission).toHaveAttribute('data-mission-state', 'claimed');
  await expect(board).toContainText('Demo progress');
  await page.locator('#garage-close').click();
  await expect(homeWallet).toBeVisible();
  await expect(homePoints).toHaveText('50');
  await page.locator('#garage-button').click();
  const store = await openStore(page);
  await expect(store.locator('.demo-wallet strong')).toHaveText('50');
  await store.locator('[data-demo-id="thruster-ion"]').click();
  await store.getByRole('button', { name: 'Demo redeem' }).click();
  await store.getByRole('button', { name: 'Confirm demo redeem' }).click();
  await expect(store.locator('.demo-wallet strong')).toHaveText('25');
  await store.getByRole('button', { name: 'Demo Collection' }).click();
  const collection = page.locator('[data-wave3-demo-collection]');
  await expect(collection).toBeVisible();
  await collection.locator('[data-demo-id="thruster-ion"]').click();
  await collection.getByRole('button', { name: 'Equip demo preview' }).click();
  await expect(collection.locator('[data-demo-id="thruster-ion"]')).toContainText('Demo equipped');
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-ion');
  await test.info().attach('wave3-collection-equipped.png', {
    body: await page.screenshot(), contentType: 'image/png',
  });
  await collection.getByRole('button', { name: 'Return to racing' }).click();
  await expect(homeWallet).toBeVisible();
  await expect(homePoints).toHaveText('25');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);

  await page.reload();
  await page.locator('#garage-button').click();
  await page.locator('[data-wave3-open-store]').click();
  await expect(page.locator('[data-wave3-demo-store] .demo-wallet strong')).toHaveText('25');
  await expect(page.locator('[data-wave3-demo-store] [data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'demo-unlocked');
  const beforeResetHistory = await page.evaluate(key => localStorage.getItem(key), modeHistoryKey);
  expect(JSON.parse(beforeResetHistory)).toEqual(history);
  await page.getByRole('button', { name: 'Back to demo menu' }).click();
  await page.locator('[data-wave3-reset]').click();
  await page.locator('[data-wave3-open-store]').click();
  await expect(page.locator('[data-wave3-demo-store] .demo-wallet strong')).toHaveText('20');
  await expect(page.locator('[data-wave3-demo-store] [data-demo-id="thruster-ion"]')).not.toHaveAttribute('data-demo-status', 'demo-unlocked');
  expect(await page.evaluate(key => localStorage.getItem(key), modeHistoryKey)).toBe(beforeResetHistory);
  expect(await page.evaluate(key => localStorage.getItem(key), demoKey)).toBeNull();
  await page.locator('#garage-close').click();
  await expect(homeWallet).toBeVisible();
  await expect(homePoints).toHaveText('20');
});

test('real Garage cannot grant paid entitlements or stale demo claims through repeated visits', async ({ page }) => {
  await openGarage(page);
  await expect(page.locator('.garage-mission-board')).toHaveAttribute('data-rewards-authority', 'local-demo');
  await expect(page.locator('.garage-mission-board [data-mission-id="mission-race:daily"]'))
    .toHaveAttribute('data-mission-state', 'not-started');
  await expect(page.locator('.garage-mission-board').getByRole('button', { name: /Claim demo reward/ })).toHaveCount(0);
  await expect(page.locator('[data-store-purchase-disabled]')).toBeDisabled();
  await expect(page.locator('[data-garage-store-entry]')).toContainText(/Coming Soon/);
  const store = await openStore(page);
  await expect(store).toHaveAttribute('data-authority', 'local-demo');
  await store.locator('[data-demo-id="thruster-ion"]').click();
  await store.getByRole('button', { name: 'Demo redeem' }).click();
  await expect(store.locator('.demo-wallet strong')).toHaveText('20');
  const before = await page.evaluate(() => Object.keys(localStorage));
  await page.reload();
  await page.locator('#garage-button').click();
  await expect(page.locator('.garage-mission-board [data-mission-id="mission-race:daily"]'))
    .toHaveAttribute('data-mission-state', 'not-started');
  const after = await page.evaluate(() => Object.keys(localStorage));
  expect(after.filter(x => /paid|real-wallet|entitlement/i.test(x))).toEqual(before.filter(x => /paid|real-wallet|entitlement/i.test(x)));
});

test('portrait phone exposes keyboard-accessible real mission progress and demo navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGarage(page);
  const board = page.locator('.garage-mission-board');
  await expect(board).toHaveAttribute('data-mission-state', 'local-demo');
  await expect(board.locator('progress')).toHaveCount(12);
  await expect(board.locator('[data-mission-id="mission-race:daily"] progress')).toHaveAttribute('aria-label', /0 \/ 1/);
  await page.locator('[data-wave3-open-store]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-wave3-demo-store]')).toBeVisible();
  await test.info().attach('wave3-portrait-390x844.png', {
    body: await page.screenshot(), contentType: 'image/png',
  });
});
