import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { openLobbyModes, clickLobbyOption } from './helpers/home-lobby.js';
import { ciTimeout } from './helpers/ci.js';

// Render on demand (src/render-lifecycle.ts): a paused race stops drawing once settled and redraws on input; every animated
// screen keeps drawing; an opaque full-screen dialog stops drawing, a translucent one never freezes the scene; photo export
// still resolves while paused. Counts composer.render (the real draw) and the main loop's pending rAF callbacks.
const drawsDuring = (page, ms) => page.evaluate(async ms => {
  const before = window.renderCount;
  await new Promise(resolve => setTimeout(resolve, ms));
  return window.renderCount - before;
}, ms);
const settlesToZero = page => expect.poll(() => drawsDuring(page, 500), { timeout: ciTimeout(20_000) }).toBe(0);
const keepsDrawing = async page => expect.poll(() => drawsDuring(page, 500), { timeout: ciTimeout(10_000) }).toBeGreaterThan(0);

test('paused races, covers and translucent dialogs draw only when the picture can change', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
  await page.goto(gameplayURL);
  await expect(page.locator('#world')).not.toHaveAttribute('data-frame-loading', /.*/);
  await page.evaluate(() => {
    const { composer } = window.gameScene, render = composer.render.bind(composer);
    window.renderCount = 0;
    composer.render = (...args) => { window.renderCount++; return render(...args); };
    // A duplicated loop shows up as one callback pending twice.
    const pending = new Map(), raf = window.requestAnimationFrame.bind(window);
    window.maxPendingPerCallback = 0;
    window.requestAnimationFrame = callback => {
      pending.set(callback, (pending.get(callback) ?? 0) + 1);
      window.maxPendingPerCallback = Math.max(window.maxPendingPerCallback, pending.get(callback));
      return raf(time => { pending.set(callback, pending.get(callback) - 1); callback(time); });
    };
  });

  await test.step('Home showcase keeps animating, also under a translucent History dialog', async () => {
    await keepsDrawing(page);
    await page.evaluate(() => document.querySelector('#history-screen').showModal());
    await page.waitForTimeout(600);
    await keepsDrawing(page);
    await page.evaluate(() => document.querySelector('#history-screen').close());
  });

  await test.step('an opaque full-screen dialog stops drawing; closing it resumes', async () => {
    await page.evaluate(() => {
      const cover = document.createElement('dialog');
      cover.id = 'test-opaque-cover';
      cover.style.cssText = 'inset:0;margin:0;padding:0;border:0;width:100vw;height:100vh;max-width:none;max-height:none;background:rgb(0,0,0)';
      document.body.append(cover);
      cover.showModal();
    });
    await settlesToZero(page);
    await page.evaluate(() => document.querySelector('#test-opaque-cover').close());
    await keepsDrawing(page);
  });

  await test.step('racing draws every paced frame; pausing settles to zero draws; input redraws', async () => {
    await clickLobbyOption(page, '[data-track="coast"]');
    await openLobbyModes(page);
    await clickLobbyOption(page, 'button[data-race-mode="free"]');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await keepsDrawing(page);
    await page.locator('#pause-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    const frozen = await page.evaluate(() => window.gameplay.race.elapsed);
    await settlesToZero(page);
    await page.mouse.move(200, 200);
    await page.mouse.move(260, 240);
    expect(await drawsDuring(page, 300)).toBeGreaterThan(0);
    await settlesToZero(page);
    expect(await page.evaluate(() => window.gameplay.race.elapsed), 'the race clock stays frozen').toBe(frozen);
  });

  await test.step('Photo Mode: orbit input redraws, and export resolves after the scene settled', async () => {
    await page.locator('#photo-open').click();
    await expect(page.locator('#photo-screen')).toBeVisible();
    await settlesToZero(page);
    await page.locator('#photo-orbit').fill('90');
    expect(await drawsDuring(page, 300)).toBeGreaterThan(0);
    await settlesToZero(page);
    const download = page.waitForEvent('download');
    await page.locator('#photo-save').evaluate(button => button.click()); // a synthetic click: no pointer event first
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
    await page.locator('#photo-close').click();
    await expect(page.locator('#photo-screen')).toBeHidden();
  });

  await test.step('resume draws immediately; one main loop throughout', async () => {
    await page.locator('#resume-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    await keepsDrawing(page);
    expect(await page.evaluate(() => window.maxPendingPerCallback)).toBe(1);
  });
  expect(errors).toEqual([]);
});
