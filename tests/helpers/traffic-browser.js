import { expect } from '@playwright/test';
import { ciTimeout } from './ci.js';

export const CLASSIC_IDS = ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];

/** Start a High-tier race on `trackId` (a classic id or a course id) and pause it. Needs the gameplay fixture. */
export async function pausedRace(page, gameplayURL, trackId, search = '') {
  await page.evaluate(ids => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'high', preset: 'cinematic', enabled: true }));
  }, CLASSIC_IDS);
  await page.goto(`${gameplayURL}${search}`);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator(`[data-track="${trackId}"], [data-upcoming-track="${trackId}"]`).click();
  await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(30000) });
  await page.locator('#pause-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
  // The chase camera eases on for a few frames after the pause, and a rival's wheel on the frustum edge then joins
  // the frame: one more draw call that a before/after difference would count as traffic. Wait for a steady frame.
  await page.evaluate(() => new Promise(resolve => {
    let last = -1, same = 0, frames = 0;
    const step = () => {
      const { calls } = window.gameScene.renderer.info.render;
      same = calls === last ? same + 1 : 0; last = calls;
      if (same >= 20 || ++frames > 300) resolve(); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
}

// The paused race still renders every frame, so the cars stay where this puts them: `shown` of them spread over the
// drawn window ahead of the player (-55 to 900 m), the rest beyond it. Graph courses seat traffic on their own edges:
// those keep the cars where the race put them.
export const place = (page, shown, count) => page.evaluate(([shown, count]) => {
  const { player, traffic, course } = window.gameplay.race;
  while (traffic.length < count) traffic.push({ ...traffic[traffic.length % 5] });
  if (!course) traffic.forEach((car, i) => { car.distance = player.distance + (i < shown ? 30 + i * 840 / traffic.length : 5000); });
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.gameScene.renderer.info.render.calls))));
}, [shown, count]);
