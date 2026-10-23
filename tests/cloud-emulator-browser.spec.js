import { test, expect } from './helpers/test.js';

const liveApis = /(?:identitytoolkit|firestore)\.googleapis\.com|accounts\.google\.com/;

test('Google sign-in stores unlocked maps and restores them after site data is cleared', async ({ browser, context, page, request }) => {
  await context.route(liveApis, route => route.abort());
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.startsWith('webgl') ? null : getContext.call(this, kind, ...args);
    };
  });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon'])));
  await page.goto('/?firebase-emulator=1');
  await page.locator('#cloud-open').click();
  const popupPromise = page.waitForEvent('popup', { timeout: 15000 });
  await page.locator('#cloud-login').click({ noWaitAfter: true });
  const popup = await popupPromise;
  await popup.getByText('Add new account').click();
  await popup.locator('#email-input').fill('racer@example.test');
  await popup.locator('#display-name-input').fill('Racer');
  console.log('form buttons', await popup.locator('button').allTextContents());
  await popup.getByRole('button', { name: /sign in/i }).click();
  await expect(page.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');

  const saved = await request.get('http://127.0.0.1:8080/v1/projects/skyline-rush-weskao/databases/(default)/documents/saves');
  expect(saved.ok()).toBe(true);
  const documents = (await saved.json()).documents;
  expect(documents).toHaveLength(1);
  expect(documents[0].fields.unlocked.arrayValue.values.map(value => value.stringValue)).toContain('neon');

  const fresh = await browser.newPage({ locale: 'en-US' });
  await fresh.context().route(liveApis, route => route.abort());
  await fresh.goto('/?firebase-emulator=1');
  await fresh.locator('#cloud-open').click();
  const secondPopupPromise = fresh.waitForEvent('popup');
  await fresh.locator('#cloud-login').click();
  const secondPopup = await secondPopupPromise;
  await secondPopup.locator('input[type="email"]').fill('racer@example.test');
  await secondPopup.getByRole('button', { name: /sign in/i }).click();
  await expect(fresh.locator('#cloud-status')).toHaveText('Race progress is saved to your Google account.');
  await expect.poll(() => fresh.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-unlocked')))).toContain('neon');
  await fresh.close();
});
