import { test, expect, markStartupSeen } from './helpers/test.js';
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
  await markStartupSeen(fresh);
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
  await page.locator('#cloud-switch').click();
  await page.locator('#confirm-accept').click();
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toEqual(['coast']);

  const firstAccount = await browser.newPage({ locale: 'en-US' });
  await markStartupSeen(firstAccount);
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

  await page.evaluate(() => localStorage.setItem('skyline-rush-cup-progress-v1', JSON.stringify({
    version: 1, cup: { tracks: ['coast', 'neon', 'canyon'], results: [] },
  })));
  const reloaded = page.waitForEvent('load');
  await page.locator('#cloud-delete').click();
  await page.locator('#confirm-accept').click();
  await reloaded;
  await page.locator('#cloud-open').click();
  await expect(page.locator('#cloud-login')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('skyline-rush-cup-progress-v1'))).toBeNull();
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
  await markStartupSeen(restored);
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
    await markStartupSeen(device);
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
  await markStartupSeen(fresh);
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
  await markStartupSeen(fresh);
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
  await page.locator('#cloud-import-file').setInputFiles({
    name: 'skyline-rush-progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 2, unlocked: ['coast', 'neon'], stars: { neon: 2 }, bests: {},
      medals: {}, history: [], modeHistory: [], daily: [] })),
  });
  await page.locator('#confirm-accept').click();
  await expect(page.locator('#cloud-status')).toContainText('Backup imported on this device.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
  await page.locator('#cloud-import-file').setInputFiles({
    name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not-json'),
  });
  await page.locator('#confirm-accept').click();
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
  await page.locator('#cloud-switch').click();
  await page.locator('#confirm-accept').click();
  await page.locator('#cloud-open').click(); // Account switch reloads the page and closes this dialog.
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem('skyline-rush-mode-bests-v1') || '{}')[key], key)).toBeUndefined();

  await page.locator('#cloud-logout').click();
  await mockGoogleSignIn(page, { existing: true, email: 'switch-A@example.test' });
  await page.locator('#cloud-switch').click();
  await page.locator('#confirm-accept').click();
  await page.locator('#cloud-open').click(); // The second switch also performs a reload.
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
  await page.locator('#cloud-delete').click();
  await expect(page.locator('#confirm-body')).toContainText('does not delete your Google sign-in account');
  await page.locator('#confirm-cancel').click();
  await expect(page.locator('#confirm-dialog')).not.toBeVisible();
  await page.locator('#cloud-logout').click();
  await expect(page.locator('#cloud-logout-note')).toBeHidden();
});

test('Cloud save announces typed sync states, with a recoverable offline state', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await expect(page.locator('#cloud-status')).toHaveAttribute('data-cloud-state', 'signed-out');
  await mockGoogleSignIn(page, { email: 'status@example.test' });
  await expect(page.locator('#cloud-status')).toHaveAttribute('data-cloud-state', 'synced');
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  await page.locator('#cloud-sync-now').click();
  await expect(page.locator('#cloud-status')).toHaveAttribute('data-cloud-state', 'offline');
  await expect(page.locator('#cloud-status')).toHaveAttribute('role', 'status');
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }));
  await page.locator('#cloud-sync-now').click();
  await expect(page.locator('#cloud-status')).toHaveAttribute('data-cloud-state', 'synced');
});

test('Cloud save profile provides an avatar fallback and accessible account identity', async ({ context, page }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email: 'avatar@example.test' });
  await expect(page.locator('#cloud-identity')).toContainText('avatar@example.test');
  await expect(page.locator('#cloud-name')).not.toBeEmpty();
  await expect(page.locator('#cloud-avatar-fallback')).toBeVisible();
  // The post-sign-in sync re-renders the profile from the account (no photo here), which would wipe an avatar
  // injected before it lands; on a slow runner it lands mid-assertion. Inject only after it settles.
  await expect(page.locator('#cloud-status')).toHaveAttribute('data-cloud-state', 'synced');
  // Give the Vue view a real, loaded avatar rather than overriding Vue-owned
  // hidden attributes, then exercise the browser's failed-image event.
  await page.evaluate(async () => {
    // Import the exact URL the app loaded (Vite may append ?t=/?v= after a dep reload on cold CI),
    // otherwise this is a second module instance and the Vue view never updates.
    const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/src\/cloud-view-state\.ts/.test(n)) || '/src/cloud-view-state.ts';
    const { updateCloudView } = await import(/* @vite-ignore */ url);
    updateCloudView({ avatarUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', avatarFailed: false });
  });
  await expect(page.locator('#cloud-avatar')).toBeVisible();
  await expect(page.locator('#cloud-avatar-fallback')).toBeHidden();
  await page.locator('#cloud-avatar').dispatchEvent('error');
  await expect(page.locator('#cloud-avatar-fallback')).toBeVisible();
  await expect(page.locator('#cloud-avatar')).toBeHidden();
});

test('the equipped car is restored on a clean device, and a device that picked its own car keeps it', async ({ browser, context, page }) => {
  const email = 'car@example.test';
  const savedMessage = 'Race progress is saved to your Google account.';
  const storedCar = target => target.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-car')));
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(disableWebGL);
  const trial = Date.now() - 60_000;
  await page.addInitScript(trial => {
    localStorage.setItem('skyline-rush-gt-trial-started-at', JSON.stringify(trial));
    localStorage.setItem('skyline-rush-car', JSON.stringify('crimson-gt'));
  }, trial);
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  await mockGoogleSignIn(page, { email });
  await expect(page.locator('#cloud-status')).toHaveText(savedMessage);

  const fresh = await browser.newPage({ locale: 'en-US' });
  await markStartupSeen(fresh);
  await fresh.context().route(liveApis, route => route.abort());
  await fresh.addInitScript(disableWebGL);
  await fresh.goto('/?firebase-emulator=1');
  expect(await storedCar(fresh)).toBeNull();
  await fresh.locator('#cloud-open').click();
  await mockGoogleSignIn(fresh, { existing: true, email });
  await expect(fresh.locator('#cloud-status')).toHaveText(savedMessage);
  await expect.poll(() => storedCar(fresh)).toBe('crimson-gt');
  await expect(fresh.locator('#garage-screen [data-car="crimson-gt"]')).toHaveAttribute('aria-pressed', 'true'); // worn without a reload
  expect(await fresh.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-gt-trial-started-at')))).toBe(trial);
  await fresh.close();

  const own = await browser.newPage({ locale: 'en-US' });
  await markStartupSeen(own);
  await own.context().route(liveApis, route => route.abort());
  await own.addInitScript(disableWebGL);
  await own.addInitScript(() => localStorage.setItem('skyline-rush-car', JSON.stringify('roadster')));
  await own.goto('/?firebase-emulator=1');
  await own.locator('#cloud-open').click();
  await mockGoogleSignIn(own, { existing: true, email });
  await expect(own.locator('#cloud-status')).toHaveText(savedMessage);
  // settled: the status line above is written after the merged save reached storage
  expect(await storedCar(own)).toBe('roadster');
  await expect(own.locator('#garage-screen [data-car="roadster"]')).toHaveAttribute('aria-pressed', 'true');
  await own.close();
});

test('released Wave 3 keeps guest saves on the device and restores signed-in progress from Firestore', async ({ browser, page }) => {
  await page.removeLocatorHandler(page.locator('#acquisition-reveal[open]'));
  const load = async tab => {
    await tab.context().route(liveApis, route => route.abort());
    await tab.addInitScript(disableWebGL);
    await tab.goto('/?firebase-emulator=1');
  };
  const signIn = async (tab, existing = false, email = 'wave3-preview@example.test') => {
    const uid = await tab.evaluate(async ({ email, existing }) => {
      const { signInWave3EmulatorUser } = await import('/tests/fixtures/wave3-firestore-auth.ts');
      return signInWave3EmulatorUser(email, existing);
    }, { email, existing });
    await expect.poll(() => tab.evaluate(async () => {
      const { wave3DemoExperience } = await import('/src/wave3-race-events.ts');
      return wave3DemoExperience.getSnapshot().accountId;
    })).toBe(uid);
    return uid;
  };
  const deviceCheckpoint = (tab, uid) => tab.evaluate(id =>
    localStorage.getItem('skyline-rush-wave3-demo:v1:' + id), uid);
  const balances = async (tab, expected) => {
    for (const [index, currency] of ['demo-points', 'coins', 'diamonds'].entries()) {
      await expect(tab.locator(`.home-resource-strip [data-currency="${currency}"] strong`)).toHaveText(String(expected[index]));
    }
  };
  const settle = (tab, id) => tab.evaluate(async id => {
    const { createWave3RaceEventBridge, wave3DemoExperience } = await import('/src/wave3-race-events.ts');
    const bridge = createWave3RaceEventBridge(wave3DemoExperience, () => id);
    return (await bridge.finish({
      phase: 'finished', trackId: 'coast', mode: 'classic', elapsed: 70, length: 5000,
      config: { difficulty: 'normal' }, rivals: Array(7).fill({}),
      player: { driftPayout: null, longestCombo: 0 }, result: { success: true, time: 70, position: 1 },
    }, false)).status;
  }, id);
  const redeem = (tab, id) => tab.evaluate(async id => {
    const { wave3DemoExperience } = await import('/src/wave3-race-events.ts');
    return (await wave3DemoExperience.redeemPreview(id)).status;
  }, id);

  await load(page);
  expect(await settle(page, 'guest-before-google')).toBe('completed');
  await balances(page, [48, 86, 0]);
  const pointsButton = page.locator('.home-resource-strip [data-currency="demo-points"]');
  await expect(pointsButton).toHaveAttribute('aria-label', /Local demo/i);
  const guestSave = await deviceCheckpoint(page, 'guest');
  expect(guestSave).not.toBeNull();
  const uid = await signIn(page);
  await balances(page, [20, 0, 0]);
  for (let race = 1; race <= 5; race += 1) expect(await settle(page, 'cloud-preview-race-' + race)).toBe('completed');
  const statuses = await page.evaluate(async () => {
    const { wave3DemoExperience: wallet } = await import('/src/wave3-race-events.ts');
    return [
      (await wallet.claimMission('mission-race:daily')).status,
      (await wallet.claimMission('mission-race:weekly')).status,
    ];
  });
  expect(statuses).toEqual(['completed', 'completed']);
  // Recreate Garage's parent dialog history without booting the WebGL showroom in the emulator suite.
  await page.locator('#garage-screen').evaluate(dialog => {
    dialog.showModal();
    history.pushState({ ...history.state, __skylineGaragePage: 'home' }, '');
  });
  await page.locator('[data-garage-section="store"]').click();
  const store = page.locator('[data-wave3-demo-store]');
  const ion = store.locator('[data-demo-offer="thruster-ion"]');
  await ion.getByRole('button', { name: 'Redeem Ion thruster' }).click();
  const quote = store.getByRole('group', { name: 'Confirm demo redemption' });
  await expect(quote).toContainText('Remaining 155 Demo points');
  await quote.getByRole('button', { name: 'Confirm demo redeem' }).click();
  const reveal = page.locator('#acquisition-reveal');
  await expect(reveal.getByRole('heading', { name: 'Ion thruster' })).toBeVisible();
  await reveal.getByRole('button', { name: 'Continue' }).click();
  await ion.getByRole('button', { name: 'View in collection' }).click();
  await expect(page.locator('[data-wave3-demo-collection] [data-demo-id="thruster-ion"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#garage-close').click();
  await balances(page, [155, 350, 5]);
  await expect(pointsButton).toHaveAttribute('aria-label', /Cloud demo/i);
  expect(await deviceCheckpoint(page, uid)).toBeNull();
  expect(await deviceCheckpoint(page, 'guest')).toBe(guestSave);
  const visual = await page.evaluate(async () => {
    const { wave3DemoExperience: wallet } = await import('/src/wave3-race-events.ts');
    const { currentGarageSkins, equipGarageSkin, garageSkinEntry } = await import('/src/garage-skin-runtime.ts');
    const equipped = await wallet.equipPreview('thruster-ion');
    return {
      status: equipped.status, vfx: currentGarageSkins().thruster,
      owned: garageSkinEntry('thruster-ion')?.owned, catalogCanEquip: equipGarageSkin('thruster-ion'),
    };
  });
  expect(visual).toEqual({ status: 'completed', vfx: 'thruster-ion', owned: false, catalogCanEquip: false });

  const fresh = await browser.newPage();
  try {
    await load(fresh);
    expect(await signIn(fresh, true)).toBe(uid);
    await balances(fresh, [155, 350, 5]);
    expect(await settle(fresh, 'cloud-preview-race-5')).toBe('duplicate');
    const paired = await Promise.all([settle(page, 'cloud-preview-shared-race'), settle(fresh, 'cloud-preview-shared-race')]);
    expect(paired.sort()).toEqual(['completed', 'duplicate']);
    await balances(fresh, [183, 406, 5]);
    const sameOffer = await Promise.all([redeem(page, 'nitro-trail-cyan'), redeem(fresh, 'nitro-trail-cyan')]);
    expect(sameOffer.sort()).toEqual(['completed', 'duplicate']);
    await balances(fresh, [183, 256, 5]);
    const sameBalance = await Promise.all([redeem(page, 'launch-flare-magenta'), redeem(fresh, 'drift-trail-rainbow')]);
    expect(sameBalance.sort()).toEqual(['completed', 'insufficient-demo-diamonds']);
    await balances(fresh, [183, 256, 0]);
    await fresh.context().setOffline(true);
    expect(await redeem(page, 'launch-flare-ring')).toBe('completed');
    await balances(fresh, [183, 256, 0]);
    await fresh.context().setOffline(false);
    await balances(fresh, [183, 36, 0]);
    expect(await redeem(fresh, 'launch-flare-ring')).toBe('duplicate');
    // Account B has no access to account A's preview save.
    const other = await browser.newPage();
    try {
      await load(other);
      await signIn(other, false, 'wave3-other@example.test');
      await balances(other, [20, 0, 0]);
    } finally {
      await other.close();
    }
  } finally {
    await fresh.close();
  }
  await page.evaluate(async () => (await import('/src/cloud-save.ts')).signOutOfCloud());
  await balances(page, [48, 86, 0]);
  const afterLogout = await page.evaluate(async () =>
    (await import('/src/garage-skin-runtime.ts')).currentGarageSkins().thruster);
  expect(afterLogout).toBe('thruster-basic');
});
