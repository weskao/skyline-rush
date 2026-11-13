import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';
import { CARS } from '../src/car-catalog.ts';

const fixturePath = 'tests/fixtures/wave3-economy.html';
const demoKey = 'skyline-rush-wave3-demo:v1:guest';
const modes = { time: 'time', classic: 'classic' };
const wallet = page => page.locator('#intro [data-wave3-wallet]');
const store = page => page.locator('[data-wave3-demo-store]');
const collection = page => page.locator('[data-wave3-demo-collection]');
const buttons = { claim: /Claim demo reward/, redeem: 'Demo redeem', confirm: 'Confirm demo redeem' };
const names = ['points', 'coins', 'diamonds'];
const checkpoint = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), demoKey);
const values = snapshot => [snapshot.demoPoints, snapshot.demoEconomy.coins, snapshot.demoEconomy.diamonds];
const checkHome = async (page, amounts) => {
  for (const [index, name] of ['demo-points', 'coins', 'diamonds'].entries()) {
    await expect(wallet(page).locator(`[data-currency="${name}"] strong`)).toHaveText(String(amounts[index]));
  }
};
const checkStore = async (page, amounts) => {
  for (const [index, name] of names.entries()) {
    await expect(store(page).locator(`[data-demo-balance="${name}"] strong`)).toHaveText(String(amounts[index]));
  }
};
const openGarage = page => page.locator('#garage-button').click();
const closeGarage = page => page.locator('#garage-close').click();
const openStore = page => page.locator('[data-wave3-open-store]').click();
const choose = (page, id) => store(page).locator(`[data-demo-id="${id}"]`).click();
const request = page => store(page).getByRole('button', { name: buttons.redeem, exact: true }).click();
const confirm = page => store(page).getByRole('button', { name: buttons.confirm, exact: true }).click();
const claim = (page, cadence) => page.locator(`[data-mission-id="mission-race:${cadence}"]`)
  .getByRole('button', { name: buttons.claim }).click();

async function seedProfileRace(page, id, mode = modes.classic) {
  return page.evaluate(async ({ id, mode }) => {
    // Fixed simulation outcomes use the real gameplay-to-experience bridge; the build's full-drive test uses no hook.
    const { createWave3RaceEventBridge, wave3DemoExperience } = await import('/src/wave3-race-events.ts');
    const bridge = createWave3RaceEventBridge(wave3DemoExperience, () => id, () => Date.now());
    return bridge.finish({ phase: 'finished', trackId: 'coast', mode, elapsed: 70, length: 5000,
      config: { difficulty: 'normal' }, rivals: mode === 'time' ? [] : Array(7).fill({}),
      player: { driftPayout: null, longestCombo: 0 }, result: { success: true, time: 70, position: 1 } }, false);
  }, { id, mode });
}

test('14-step browser ledger follows real controls, profile reloads and an offline purchase', async ({ page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const weekOne = new Date('2026-11-15T13:00:00Z');
  await page.clock.setFixedTime(weekOne);
  await page.goto(gameplayURL + fixturePath);
  const rows = [];
  const expectedDeltas = [[20, 70, 0], [0, 0, 0], [20, 40, 0], [140, 280, 0], [10, 40, 0],
    [10, 0, 5], [-25, 0, 0], [0, -150, 0], [0, 0, 0], [300, 560, 10], [0, 0, -15],
    [0, 0, 0], [-475, -840, 0]];
  const check = async (step, amounts, receipt, delta) => {
    if (receipt) expect([receipt.deltaDemoPoints, receipt.deltaDemoCoins, receipt.deltaDemoDiamonds]).toEqual(delta);
    if (step !== 1) await expect.poll(async () => values((await checkpoint(page)).snapshot)).toEqual(amounts);
    if ([8, 9, 10, 11, 12].includes(step)) await checkStore(page, amounts);
    else if (![6, 7].includes(step)) await checkHome(page, amounts);
    const previous = rows.at(-1)?.amounts;
    const actualDelta = previous && amounts.map((amount, index) => amount - previous[index]);
    if (actualDelta) expect(actualDelta).toEqual(expectedDeltas[step - 2]);
    rows.push({ step, amounts, ...(actualDelta && { delta: actualDelta }) });
  };
  await check(1, [20, 0, 0]);
  await check(2, [40, 70, 0], await seedProfileRace(page, 'wave3-ledger-first', modes.time), [20, 70, 0]);
  const first = (await checkpoint(page)).snapshot;
  expect(first.missions['mission-time:daily'].progress).toBe(1);
  expect(first.missions['mission-race:daily'].progress).toBe(0);
  await page.reload();
  await check(3, [40, 70, 0], await seedProfileRace(page, 'wave3-ledger-first', modes.time), [0, 0, 0]);
  await check(4, [60, 110, 0], await seedProfileRace(page, 'wave3-ledger-second', modes.time), [20, 40, 0]);
  const five = async label => {
    for (let i = 0; i < 5; i++) {
      const result = await seedProfileRace(page, label + i);
      expect([result.deltaDemoPoints, result.deltaDemoCoins, result.deltaDemoDiamonds]).toEqual([28, 56, 0]);
    }
  };
  await five('ledger-week-one-');
  await check(5, [200, 390, 0]);
  await openGarage(page);
  await claim(page, 'daily');
  await expect(page.locator('[data-mission-id="mission-race:daily"]')).toHaveAttribute('data-mission-state', 'claimed');
  await check(6, [210, 430, 0]);
  await claim(page, 'weekly');
  await expect(page.locator('[data-mission-id="mission-race:weekly"]')).toHaveAttribute('data-mission-state', 'claimed');
  await check(7, [220, 430, 5]);
  await openStore(page);
  await choose(page, 'thruster-ion');
  await request(page);
  await expect(store(page).locator('.demo-confirm')).toContainText('Remaining 195 Demo points');
  await confirm(page);
  await check(8, [195, 430, 5]);
  await choose(page, 'nitro-trail-cyan');
  await request(page);
  await confirm(page);
  await check(9, [195, 280, 5]);
  await choose(page, 'thruster-void');
  await request(page);
  await expect(store(page).locator('.demo-message')).toContainText('Not enough demo diamonds');
  await choose(page, 'thruster-plasma');
  await request(page);
  await store(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  const duplicate = await page.evaluate(async () => (await import('/src/wave3-race-events.ts')).wave3DemoExperience.redeemPreview('thruster-ion'));
  expect(duplicate.status).toBe('duplicate');
  await check(10, [195, 280, 5], duplicate, [0, 0, 0]);
  await page.getByRole('button', { name: 'Back to demo menu' }).click();
  for (const [date, label] of [['2026-11-18', 'ledger-week-two-'], ['2026-11-23', 'ledger-week-three-']]) {
    await page.clock.setFixedTime(new Date(date + 'T13:00:00Z'));
    await five(label);
    await expect(page.locator('[data-mission-id="mission-race:weekly"]')).toHaveAttribute('data-mission-state', 'claimable');
    await claim(page, 'weekly');
    await expect(page.locator('[data-mission-id="mission-race:weekly"]')).toHaveAttribute('data-mission-state', 'claimed');
  }
  await openStore(page);
  await check(11, [495, 840, 15]);
  await choose(page, 'thruster-void');
  await request(page);
  await page.context().setOffline(true);
  await confirm(page);
  await check(12, [495, 840, 0]);
  await store(page).getByRole('button', { name: 'Demo Collection' }).click();
  for (const id of ['thruster-ion', 'nitro-trail-cyan', 'thruster-void']) {
    await expect(collection(page).locator(`[data-demo-id="${id}"]`)).toContainText('Demo unlocked');
  }
  await collection(page).locator('[data-demo-id="thruster-void"]').click();
  await collection(page).getByRole('button', { name: 'Equip demo preview' }).click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-void');
  await collection(page).getByRole('button', { name: 'Return to racing' }).click();
  await checkHome(page, [495, 840, 0]);
  await page.context().setOffline(false);
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(wallet(page)).toHaveAttribute('aria-label', '玩家資源');
  await page.reload();
  await check(13, [495, 840, 0]);
  await openGarage(page);
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-void');
  await page.locator('[data-wave3-reset]').click();
  await expect.poll(async () => (await checkpoint(page)).snapshot.equippedPreview).toBeNull();
  await closeGarage(page);
  await check(14, [20, 0, 0]);
  expect(errors).toEqual([]);
  await test.info().attach('wave3-wallet-14-steps.json', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
});

test('two real browser tabs serialize competing confirmations and refresh together', async ({ page: first, context, gameplayURL }) => {
  await first.goto(gameplayURL + fixturePath);
  await seedProfileRace(first, 'wave3-tab-first', modes.time);
  const second = await context.newPage();
  await second.goto(gameplayURL + fixturePath);
  await checkHome(second, [40, 70, 0]);
  for (const page of [first, second]) {
    await openGarage(page);
    await openStore(page);
    await choose(page, 'thruster-ion');
    await request(page);
  }
  await Promise.all([confirm(first), confirm(second)]);
  for (const page of [first, second]) {
    await checkStore(page, [15, 70, 0]);
    await expect(store(page).locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'demo-unlocked');
  }
  await expect.poll(async () => (await checkpoint(second)).snapshot.demoInventory).toEqual(['thruster-ion']);
  await first.reload();
  await checkHome(first, [15, 70, 0]);
});

test('a blocked wallet save warns the player while the current session can still redeem', async ({ page, gameplayURL }) => {
  await page.goto(gameplayURL + fixturePath);
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Demo quota', 'QuotaExceededError');
      return write.call(this, name, value);
    };
  }, demoKey);
  await seedProfileRace(page, 'wave3-blocked-write', modes.time);
  await checkHome(page, [40, 70, 0]);
  await expect(wallet(page).getByRole('status', { name: /could not save/ })).toBeVisible();
  await openGarage(page);
  await openStore(page);
  await choose(page, 'thruster-ion');
  await request(page);
  await confirm(page);
  await checkStore(page, [15, 70, 0]);
  await expect(store(page).getByText(/could not save this session/)).toBeVisible();
  await page.reload();
  await checkHome(page, [20, 0, 0]);
});


for (const carId of Object.keys(CARS)) {
  test(`confirmed Void Pulse renders on the next ${carId} race`, async ({ gameplayPage: page }) => {
    // Three ordinary weekly claims are covered in the ledger. Seed its earned balance for the WebGL check.
    const available = await page.evaluate(async () => {
      const { createWave3DemoStorage } = await import('/src/wave3-demo-storage.ts');
      const { createWave3LocalDemo } = await import('/src/wave3-local-demo.ts');
      const checkpoint = createWave3LocalDemo().getCheckpoint();
      return createWave3DemoStorage().saveCheckpoint({ ...checkpoint, snapshot: {
        ...checkpoint.snapshot, demoEconomy: { coins: 0, diamonds: 15, firstFinishes: [] },
      } });
    });
    expect(available).toBe(true);
    await page.reload();
    await openGarage(page);
    await page.locator(`#garage-screen [data-car="${carId}"]`).click();
    await openStore(page);
    await choose(page, 'thruster-void');
    await request(page);
    await confirm(page);
    await checkStore(page, [20, 0, 0]);
    await store(page).getByRole('button', { name: 'Demo Collection' }).click();
    await collection(page).locator('[data-demo-id="thruster-void"]').click();
    await collection(page).getByRole('button', { name: 'Equip demo preview' }).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-void');
    await collection(page).getByRole('button', { name: 'Return to racing' }).click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(20_000) });
    await page.evaluate(() => {
      const { player } = window.gameplay.race;
      player.nitroTime = 4;
      player.speed = 90;
    });
    await expect.poll(() => page.evaluate(() => {
      const nozzle = window.gameScene.player.getObjectByName('Cold gas nozzle 1');
      const beams = window.gameScene.player.getObjectByName('Void pulse beams');
      return { pattern: nozzle?.material.uniforms.skinPattern.value, visible: beams?.visible };
    }), { timeout: ciTimeout(6_000) }).toEqual({ pattern: 3, visible: true });
    await test.info().attach(`wave3-void-pulse-${carId}.png`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}
