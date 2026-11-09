import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { selectLocale } from './helpers/locale-browser.js';

// The results panel's cloud line: syncing → saved / not synced while signed in; explanation + sign-in while signed
// out, then the sign-in outcome inline. Firebase is replaced by a scripted module, so nothing reaches production.
const SHOTS = process.env.RESULT_CLOUD_SHOTS;

// Served in place of src/cloud-save.ts by the Vite dev server; window.cloudMock (init script) scripts each call.
const MOCK_MODULE = `
import { mergeProgress } from '/src/cloud-progress.ts';
const mock = window.cloudMock;
export const watchCloudUser = onUser => { mock.onUser = onUser; setTimeout(() => onUser(mock.user)); };
export async function signInToCloud() {
  await new Promise(resolve => setTimeout(resolve, 50));
  if (mock.signIn !== 'ok') throw Object.assign(new Error(mock.signIn), { code: mock.signIn === 'cancel' ? 'auth/popup-closed-by-user' : 'auth/internal-error' });
  mock.user = { uid: 'player_test_001', email: 'player@example.com', displayName: 'Test Racer' };
  mock.onUser(mock.user);
  return {};
}
export const signOutOfCloud = async () => { mock.user = null; mock.onUser(null); };
export async function syncCloudProgress(local) {
  mock.calls++;
  if (mock.sync === 'fail') throw Object.assign(new Error('denied'), { code: 'permission-denied' });
  if (mock.sync === 'hold') await new Promise(resolve => mock.held.push(resolve));
  return mergeProgress(local(), undefined);
}
export const deleteCloudProgress = async () => {};
export const syncGoogleAccountDetails = async () => true;
export const getSignedInAccountDetails = async () => null;
`;

async function cloudPage(page, { user = null } = {}) {
  await page.addInitScript(user => { window.cloudMock = { user, sync: 'ok', signIn: 'ok', held: [], calls: 0 }; }, user);
  await page.route(/\/src\/cloud-save\.ts(\?.*)?$/, route => route.fulfill({ contentType: 'text/javascript', body: MOCK_MODULE }));
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  return page;
}
const setMock = (page, values) => page.evaluate(values => Object.assign(window.cloudMock, values), values);
const release = page => page.evaluate(() => { for (const resolve of window.cloudMock.held.splice(0)) resolve(); });

async function finishRace(page, start = '#start-button') {
  await page.locator(start).click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
  await page.evaluate(() => { const race = window.gameplay.race; race.elapsed = 80; Object.assign(race.player, { distance: race.length - 10, speed: 60 }); });
  await expect(page.locator('#again-button')).toBeVisible();
}
const status = page => page.locator('#result-cloud-status');
const login = page => page.locator('#result-cloud-login');
// Both the line and the button must be on screen and reachable by a real hit test. Portrait results already scroll
// (Choose track / History sit below the fold), so scroll there like a player would; landscape must fit as is
// (tests/overlay-landscape-fit-browser.spec.js asserts no scrolling).
const onScreen = async locator => (await locator.page().viewportSize()).width < 500 ? locator.scrollIntoViewIfNeeded().then(() => visibleHit(locator)) : visibleHit(locator);
const visibleHit = locator => locator.evaluate(element => {
  const r = element.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && element.contains(hit);
});
const shot = async (page, name, tag) => {
  if (!SHOTS) return;
  await page.waitForTimeout(ciTimeout(900)); // screenshots only: let the slide-in and count-up settle
  await page.screenshot({ path: `${SHOTS}/${name}-${tag}.png` });
};

for (const [tag, viewport, hasTouch] of [
  ['desktop-1440x900', { width: 1440, height: 900 }, false],
  ['portrait-390x844', { width: 390, height: 844 }, true],
  ['landscape-844x390', { width: 844, height: 390 }, true],
  ['landscape-667x375', { width: 667, height: 375 }, true],
]) test.describe(`results cloud line ${tag}`, () => {
  test.use({ viewport, hasTouch });

  test('signed in: syncing, saved once Firestore answers, not synced when the write fails; hidden on pause', async ({ gameplayPage }) => {
    const page = await cloudPage(gameplayPage, { user: { uid: 'player_test_001', email: 'player@example.com', displayName: 'Test Racer' } });
    await expect.poll(() => page.evaluate(() => window.cloudMock.calls)).toBe(1); // the sign-in sync at boot
    await setMock(page, { sync: 'hold' });
    await finishRace(page);
    await expect(status(page)).toHaveText('Saving this race to the cloud…');
    await expect(page.locator('#result-cloud')).toHaveAttribute('data-state', 'syncing');
    await expect(login(page)).toBeHidden();
    await shot(page, 'signed-in-syncing', tag);
    await release(page);
    await expect(status(page)).toHaveText('Race saved to the cloud.');
    await expect(page.locator('#result-cloud')).toHaveAttribute('data-state', 'synced');
    await expect.poll(() => onScreen(status(page))).toBe(true);
    await shot(page, 'signed-in-saved', tag);

    await setMock(page, { sync: 'fail' });
    await finishRace(page, '#again-button');
    await expect(status(page)).toHaveText('Not synced yet — saved on this device, will retry.');
    await expect(page.locator('#result-cloud')).toHaveAttribute('data-state', 'failed');
    await shot(page, 'signed-in-failed', tag);

    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
    await page.locator('#pause-button').click();
    await expect(page.locator('#resume-button')).toBeVisible();
    await expect(page.locator('#result-cloud')).toBeHidden(); // the pause screen shares the overlay
  });

  test('signed out: explanation and sign-in; cancelled, failed, then signed in and synced inline', async ({ gameplayPage }) => {
    const page = await cloudPage(gameplayPage);
    await finishRace(page);
    await expect(status(page)).toHaveText('Sign in to back up your records to the cloud.');
    await expect(login(page)).toBeVisible();
    await expect(login(page)).toHaveAccessibleName('Sign in with Google');
    await expect.poll(() => onScreen(login(page))).toBe(true);
    await shot(page, 'signed-out', tag);

    await setMock(page, { signIn: 'cancel' });
    await login(page).click();
    await expect(status(page)).toHaveText('Sign-in cancelled.');
    await expect(login(page)).toBeEnabled();
    await setMock(page, { signIn: 'fail' });
    await login(page).click();
    await expect(status(page)).toHaveText('Sign-in failed. Your race is saved on this device.');
    await expect(page.locator('#result-cloud')).toHaveAttribute('data-state', 'failed');
    await shot(page, 'sign-in-failed', tag);

    await setMock(page, { signIn: 'ok', sync: 'hold' });
    await login(page).click();
    await expect(status(page)).toHaveText('Saving this race to the cloud…');
    await expect(login(page)).toBeHidden();
    await release(page);
    await expect(status(page)).toHaveText('Signed in · race saved to the cloud.');
    await expect.poll(() => onScreen(status(page))).toBe(true);
    await shot(page, 'signed-in-after-sign-in', tag);
    await expect(page.locator('#again-button')).toBeEnabled(); // results stay usable after the popup flow

    // Sign-in succeeds but the first write fails.
    await page.evaluate(() => window.cloudMock.onUser((window.cloudMock.user = null)));
    await setMock(page, { sync: 'fail' });
    await finishRace(page, '#again-button');
    await expect(status(page)).toHaveText('Sign in to back up your records to the cloud.');
    await login(page).click();
    await expect(status(page)).toHaveText('Signed in · not synced yet, saved on this device.');
    await shot(page, 'sync-failed-after-sign-in', tag);
  });
});

test('results cloud line follows the language switch', async ({ gameplayPage }) => {
  const page = await cloudPage(gameplayPage);
  await finishRace(page);
  await expect(status(page)).toHaveText('Sign in to back up your records to the cloud.');
  await selectLocale(page, 'zh-TW');
  await expect(status(page)).toHaveText('登入即可將紀錄備份到雲端。');
  await expect(login(page)).toHaveAccessibleName('使用 Google 登入');
});
