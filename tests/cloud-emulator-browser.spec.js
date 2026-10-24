import { test, expect } from './helpers/test.js';
import { readFile } from 'node:fs/promises';

const liveApis = /^https?:\/\/(?:(?:identitytoolkit|firestore)\.googleapis\.com|accounts\.google\.com)/;

const disableWebGL = () => {
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    return kind.startsWith('webgl') ? null : getContext.call(this, kind, ...args);
  };
};

async function mockGoogleSignIn(page, { existing = false, email = 'racer@example.test' } = {}) {
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#cloud-login').click({ noWaitAfter: true });
  const popup = await popupPromise;
  await popup.waitForLoadState('load');
  if (existing) await popup.locator('.js-reuse-account').filter({ hasText: email }).click();
  else {
    await popup.locator('.js-new-account').click();
    await popup.locator('#email-input').fill(email);
    await popup.locator('#sign-in').click();
  }
}

test('Google sign-in stores unlocked maps and restores them after site data is cleared', async ({ browser, context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon'])));
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page);
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await expect(page.locator('#cloud-identity')).toContainText('racer@example.test');
  await expect(page.locator('#cloud-last-sync')).toContainText('Last synced');

  const fresh = await browser.newPage({ locale: 'en-US' });
  await fresh.context().route(liveApis, route => route.abort());
  await fresh.addInitScript(disableWebGL);
  await fresh.goto('/?firebase-emulator=1');
  expect(await fresh.evaluate(() => localStorage.getItem('skyline-rush-unlocked'))).toBeNull();
  await fresh.locator('#cloud-open').click();
  await mockGoogleSignIn(fresh, { existing: true });
  await expect(fresh.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await expect.poll(() => fresh.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
  await fresh.close();
});

test('switching Google accounts isolates local maps and retains the first player’s cloud save', async ({ browser, context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded-progress')) {
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
      sessionStorage.setItem('seeded-progress', 'yes');
    }
  });
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'first@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await page.locator('#cloud-logout').click();
  await expect(page.locator('#cloud-login')).toBeVisible();
  await mockGoogleSignIn(page, { email: 'second@example.test' });
  await expect(page.locator('#cloud-status')).toContainText('another Google account');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cloud-switch').click();
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toEqual(['coast']);

  const firstAccount = await browser.newPage({ locale: 'en-US' });
  await firstAccount.context().route(liveApis, route => route.abort());
  await firstAccount.addInitScript(disableWebGL);
  await firstAccount.goto('/?firebase-emulator=1');
  await firstAccount.locator('#cloud-open').click();
  await mockGoogleSignIn(firstAccount, { existing: true, email: 'first@example.test' });
  await expect(firstAccount.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await firstAccount.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
  await firstAccount.close();
});

test('export includes maps, then delete clears cloud and local progress without later reupload', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded-progress')) {
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
      sessionStorage.setItem('seeded-progress', 'yes');
    }
  });
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'delete@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#cloud-export').click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.unlocked).toContain('neon');
  expect(await page.evaluate(async () => {
    const { deleteCloudProgress } = await import('/src/cloud-save.js');
    try { await deleteCloudProgress('another-user'); return false; }
    catch { return true; }
  })).toBe(true);

  page.once('dialog', dialog => dialog.accept());
  const reloaded = page.waitForEvent('load');
  await page.locator('#cloud-delete').click();
  await reloaded;
  await page.locator('#cloud-open').click();
  await expect(page.locator('#cloud-login')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toBeNull();
  await mockGoogleSignIn(page, { existing: true, email: 'delete@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toEqual(['coast']);
});

test('offline map progress stays pending then syncs when the browser comes online', async ({ browser, context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(() => Object.defineProperty(navigator, 'onLine', {
    configurable: true, get: () => sessionStorage.getItem('cloud-offline') !== 'yes',
  }));
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'offline@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await page.evaluate(() => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
    sessionStorage.setItem('cloud-offline', 'yes');
  });
  await page.reload();
  await page.locator('#cloud-open').click();
  await expect(page.locator('#cloud-status')).toContainText('Cloud sync is pending');
  await page.evaluate(() => {
    sessionStorage.removeItem('cloud-offline');
    dispatchEvent(new Event('online'));
  });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');

  const restored = await browser.newPage({ locale: 'en-US' });
  await restored.context().route(liveApis, route => route.abort());
  await restored.addInitScript(disableWebGL);
  await restored.goto('/?firebase-emulator=1');
  await restored.locator('#cloud-open').click();
  await mockGoogleSignIn(restored, { existing: true, email: 'offline@example.test' });
  await expect(restored.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await restored.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
  await restored.close();
});

test('blocked device storage is not described as a saved offline copy', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'blocked-storage@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'skyline-rush-unlocked') throw new DOMException('Storage blocked', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  });
  await page.reload();
  await page.locator('#cloud-open').click();
  await expect(page.locator('#cloud-status')).toContainText('Could not save on this device');
});

test('two devices merge different results and repeated sign-in does not duplicate races', async ({ browser }) => {
  const raceA = { date: '2026-10-20T01:00:00.000Z', track: 'coast', position: 1, time: 60 };
  const raceB = { date: '2026-10-20T02:00:00.000Z', track: 'neon', position: 2, time: 70 };
  const openDevice = async (unlocked, run) => {
    const device = await browser.newPage({ locale: 'en-US' });
    await device.context().route(liveApis, route => route.abort());
    await device.addInitScript(disableWebGL);
    if (run) await device.addInitScript(({ unlocked, run }) => {
      if (sessionStorage.getItem('seeded-progress')) return;
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(unlocked));
      localStorage.setItem('skyline-rush-history', JSON.stringify([run]));
      sessionStorage.setItem('seeded-progress', 'yes');
    }, { unlocked, run });
    await device.goto('/?firebase-emulator=1');
    await device.locator('#cloud-open').click();
    return device;
  };
  const first = await openDevice(['coast', 'neon'], raceA);
  await mockGoogleSignIn(first, { email: 'devices@example.test' });
  await expect(first.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  const second = await openDevice(['coast', 'canyon'], raceB);
  await mockGoogleSignIn(second, { existing: true, email: 'devices@example.test' });
  await expect(second.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await first.evaluate(() => {
    const history = JSON.parse(localStorage.getItem('skyline-rush-history'));
    history.push({ date: '2026-10-20T03:00:00.000Z', track: 'coast', position: 1, time: 58 });
    localStorage.setItem('skyline-rush-history', JSON.stringify(history));
    localStorage.setItem('skyline-rush-stars', JSON.stringify({ coast: 2 }));
  });
  await second.evaluate(() => {
    const history = JSON.parse(localStorage.getItem('skyline-rush-history'));
    history.push({ date: '2026-10-20T04:00:00.000Z', track: 'neon', position: 1, time: 68 });
    localStorage.setItem('skyline-rush-history', JSON.stringify(history));
    localStorage.setItem('skyline-rush-stars', JSON.stringify({ neon: 3 }));
  });
  await Promise.all([first.reload(), second.reload()]);
  await Promise.all([
    expect(first.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.'),
    expect(second.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.'),
  ]);
  expect(await first.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-history')).length)).toBeGreaterThanOrEqual(3);
  expect(await second.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-history')).length)).toBeGreaterThanOrEqual(3);
  const fresh = await openDevice();
  await mockGoogleSignIn(fresh, { existing: true, email: 'devices@example.test' });
  await expect(fresh.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  const results = () => fresh.evaluate(() => ({
    unlocked: JSON.parse(localStorage.getItem('skyline-rush-unlocked')),
    history: JSON.parse(localStorage.getItem('skyline-rush-history')),
    stars: JSON.parse(localStorage.getItem('skyline-rush-stars')),
  }));
  expect((await results()).unlocked).toEqual(['coast', 'neon', 'canyon']);
  expect((await results()).history).toHaveLength(4);
  expect((await results()).stars).toEqual({ coast: 2, neon: 3 });
  await fresh.reload();
  await expect(fresh.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect((await results()).history).toHaveLength(4);
  await Promise.all([first.close(), second.close(), fresh.close()]);
});

test('Cloud save shows Google identity, avatar fallback and manual sync controls', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await expect(page.locator('#cloud-sync-now')).toBeDisabled();
  await mockGoogleSignIn(page, { email: 'visible@example.test' });
  await expect(page.locator('#cloud-identity')).toContainText('visible@example.test');
  await expect(page.locator('#cloud-name')).not.toBeEmpty();
  await expect(page.locator('#cloud-sync-now')).toBeEnabled();
  await page.locator('#cloud-sync-now').click();
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
});

test('cloud account data is stored in a private Firestore document after Google sign-in', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'identity@example.test' });
  await expect.poll(() => page.evaluate(async () => {
    const { getSignedInAccountDetails } = await import('/src/cloud-save.js');
    return (await getSignedInAccountDetails())?.email ?? null;
  })).toBe('identity@example.test');
});

test('permanent rule-scoped Mode best restores to a second browser independent of 50-run history', async ({ browser, context, page }) => {
  const key = JSON.stringify(['coast', { mode: 'time', duration: 180 }]);
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(key => {
    localStorage.setItem('skyline-rush-mode-bests-v1', JSON.stringify({ [key]: 43.5 }));
  }, key);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'permanent@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');

  const fresh = await browser.newPage({ locale: 'en-US' });
  await fresh.context().route(liveApis, route => route.abort());
  await fresh.addInitScript(disableWebGL);
  await fresh.goto('/?firebase-emulator=1');
  await fresh.locator('#cloud-open').click();
  await mockGoogleSignIn(fresh, { existing: true, email: 'permanent@example.test' });
  await expect(fresh.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await expect.poll(() => fresh.evaluate(key =>
    JSON.parse(localStorage.getItem('skyline-rush-mode-bests-v1') || '{}')[key], key)).toBe(43.5);
  await fresh.close();
});

test('permanent Stunt score, combo and air time restore to a clean device', async ({ browser, context, page }) => {
  const key = JSON.stringify(['tokyo', { mode: 'stunt', duration: 90 }]);
  const peak = { score: 9500, maxCombo: 12, airTime: 18.5, medal: 'gold' };
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(({ key, peak }) => {
    localStorage.setItem('skyline-rush-mode-bests-v1', JSON.stringify({ [key]: peak.score }));
    localStorage.setItem('skyline-rush-stunt-bests-v1', JSON.stringify({ [key]: peak }));
  }, { key, peak });
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'stunt-best@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');

  const fresh = await browser.newPage({ locale: 'en-US' });
  await fresh.context().route(liveApis, route => route.abort());
  await fresh.addInitScript(disableWebGL);
  await fresh.goto('/?firebase-emulator=1');
  await fresh.locator('#cloud-open').click();
  await mockGoogleSignIn(fresh, { existing: true, email: 'stunt-best@example.test' });
  await expect(fresh.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await expect.poll(() => fresh.evaluate(key => {
    const data = JSON.parse(localStorage.getItem('skyline-rush-stunt-bests-v1') || '{}');
    return data[key] ?? null;
  }, key)).toEqual(peak);
  await fresh.close();
});

test('cloud save JSON import merges restored records and rejects malformed files', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cloud-import-file').setInputFiles({
    name: 'skyline-rush-progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 2, unlocked: ['coast', 'neon'], stars: { neon: 2 }, bests: {},
      medals: {}, history: [], modeHistory: [], daily: [] })),
  });
  await expect(page.locator('#cloud-status')).toContainText('Backup imported on this device.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cloud-import-file').setInputFiles({
    name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not-json'),
  });
  await expect(page.locator('#cloud-status')).toContainText('Could not import this backup.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
});

test('an unsynced permanent record survives A to B to A account switching', async ({ context, page }) => {
  const key = JSON.stringify(['coast', { mode: 'time' }]);
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'switch-A@example.test' });
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await page.evaluate(key => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    localStorage.setItem('skyline-rush-mode-bests-v1', JSON.stringify({ [key]: 47 }));
  }, key);
  await page.locator('#cloud-sync-now').click();
  await expect(page.locator('#cloud-status')).toContainText('Cloud sync is pending');
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }));
  await page.locator('#cloud-logout').click();
  await expect(page.locator('#cloud-login')).toBeVisible();
  await mockGoogleSignIn(page, { email: 'switch-B@example.test' });
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cloud-switch').click();
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem('skyline-rush-mode-bests-v1') || '{}')[key], key)).toBeUndefined();

  await page.locator('#cloud-logout').click();
  await mockGoogleSignIn(page, { existing: true, email: 'switch-A@example.test' });
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cloud-switch').click();
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem('skyline-rush-mode-bests-v1') || '{}')[key], key)).toBe(47);
});

test('cloud dialog explains sign-out separately from deleting Google identity', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'logout-copy@example.test' });
  await expect(page.locator('#cloud-logout-note')).toContainText('Signing out does not delete');
  await expect(page.locator('#cloud-delete')).toBeVisible();
  const warning = page.waitForEvent('dialog');
  await page.locator('#cloud-delete').click({ noWaitAfter: true });
  const confirmation = await warning;
  expect(confirmation.message()).toContain('does not delete your Google sign-in account');
  await confirmation.dismiss();
  await page.locator('#cloud-logout').click();
  await expect(page.locator('#cloud-logout-note')).toBeHidden();
});
