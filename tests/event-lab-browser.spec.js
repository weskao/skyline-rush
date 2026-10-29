import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';
import { mkdir } from 'node:fs/promises';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) for (const locale of ['en', 'zh-TW']) test.describe(`Event Lab ${name} ${locale}`, () => {
  test.use({ viewport, hasTouch });
  test('edit import export launch and retry retain the real authored stage', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await selectLocale(page, locale);
    await page.locator('[data-race-mode="eventlab"]').click();
    const dialog = page.locator('#event-lab-dialog');
    await expect(dialog).toBeVisible();
    await page.locator('.lab-share > summary').click();
    await page.locator('#lab-json').fill('{broken');
    await page.locator('#lab-import').click();
    await expect(page.locator('#lab-error')).not.toBeEmpty();
    await page.locator('#lab-export').click();
    const document = JSON.parse(await page.locator('#lab-json').inputValue());
    expect(document.version).toBe(1);
    const lane = page.locator('[data-lab-lane]').first();
    const before = await lane.inputValue();
    await lane.fill(before === '0' ? '1' : '0');
    await lane.press('Tab');
    await page.locator('#lab-undo').click();
    await expect(lane).toHaveValue(before);
    await page.locator('#lab-redo').click();
    await expect(lane).not.toHaveValue(before);
    await page.locator('#lab-reset').click();
    await page.locator('#lab-export').click();
    const authored = JSON.parse(await page.locator('#lab-json').inputValue());
    await mkdir('artifacts/event-lab', { recursive: true });
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-editor.png` });
    await page.locator('#lab-use').click();
    await expect(dialog).toBeHidden();
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText(locale === 'en' ? 'RACING' : '比賽中');
    const identity = await page.evaluate(() => window.gameplay.race.config.course);
    expect(JSON.parse(identity)).toEqual(authored);
    await page.evaluate(() => {
      const race = window.gameplay.race, object = race.hazards[0];
      Object.assign(race.player, { distance: object.distance - 50, speed: 0, x: object.x });
    });
    await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('gauntlet-barriers').count)).toBeGreaterThan(0);
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-play.png` });
    await page.evaluate(() => {
      const race = window.gameplay.race;
      race.elapsed = 90;
      Object.assign(race.player, { distance: race.length - 3, speed: 60 });
    });
    await expect(page.locator('#race-overlay')).toBeVisible();
    const bestText = await page.evaluate(async () => {
      const { timeString } = await import('/src/time-format.ts');
      return timeString(window.gameplay.race.result.time);
    });
    await expect(page.locator('#result-stats > div').nth(2).locator('strong')).toHaveText(bestText);
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-result.png`, animations: 'disabled' });
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => window.gameplay.race.config.course)).toBe(identity);
    expect(await page.evaluate(() => window.gameplay.race.hazards.every(h => !h.hit && !h.passed))).toBe(true);
    await page.locator('#camera-button').click();
    await page.locator('#pause-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    await selectLocale(page, locale === 'en' ? 'zh-TW' : 'en');
    expect(errors).toEqual([]);
  });

  test('designer map snaps to lanes, previews collisions and races authored checkpoints', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await selectLocale(page, locale);
    await page.locator('[data-race-mode="eventlab"]').click();
    await page.locator('#lab-template-checkpoints').click();
    const map = page.locator('.lab-map'), box = await map.boundingBox();
    const press = position => hasTouch ? map.tap({ position }) : map.click({ position });
    // Lane 3 near the end: an empty grid cell far from template objects.
    await press({ x: box.width * .9, y: box.height * .97 });
    await expect(page.locator('#lab-lane')).toHaveValue('3');
    const ghost = await page.locator('#lab-ghost').boundingBox();
    expect(ghost.x + ghost.width / 2).toBeGreaterThan(box.x + box.width * .75);
    // Aim at the first template object: the preview must flag it before anything is added.
    await page.locator('#lab-distance').fill(await page.locator('.lab-objects input[type=number]').first().inputValue());
    await expect(page.locator('#lab-ghost')).toHaveClass(/blocked/);
    await expect(page.locator('#lab-preview')).toHaveClass(/lab-error/);
    const count = await page.locator('.lab-marker').count();
    await page.locator('#lab-add').click();
    await expect(page.locator('.lab-marker')).toHaveCount(count);
    // Aim a ramp by tapping the map until the preview says it fits, then add it.
    await page.locator('#lab-kind').selectOption('ramp');
    let fits = false;
    for (const down of [.35, .5, .65, .8]) for (const across of [.125, .375, .625, .875]) {
      if (fits) break;
      await press({ x: box.width * across, y: box.height * down });
      fits = !(await page.locator('#lab-preview').getAttribute('class')).includes('lab-error');
    }
    expect(fits).toBe(true);
    await page.locator('#lab-add').click();
    await expect(page.locator('.lab-marker')).toHaveCount(count + 1);
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-designer.png` });
    await page.locator('#lab-use').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => window.gameplay.race.checkpoint.gates.length)).toBeGreaterThan(0);
    await page.evaluate(() => {
      const race = window.gameplay.race, gate = race.checkpoint.gates[0];
      Object.assign(race.player, { distance: gate.distance - 40, speed: 0, x: gate.x });
    });
    await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('checkpoint-gates').count)).toBeGreaterThan(0);
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-checkpoints.png` });
    await page.evaluate(() => {
      const race = window.gameplay.race, ramp = race.ramps[0];
      Object.assign(race.player, { distance: ramp.distance - 40, speed: 0, x: ramp.x });
    });
    await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('launch-ramps').count)).toBeGreaterThan(0);
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-ramp.png` });
    expect(errors).toEqual([]);
  });
});
