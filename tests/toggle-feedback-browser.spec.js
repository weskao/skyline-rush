import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { openSettingsSection } from './helpers/settings-browser.js';
import { bootAirflowRace, readHudBoxes } from './helpers/responsive-hud.js';

// Shared setting toast (src/GameToast.vue) and the first Visual effects switch-off confirm (src/vfx-ui.ts).
const toast = page => page.locator('#game-toast .game-toast-pill');
const vfx = page => page.locator('[data-vfx="enabled"]');
const dialog = page => page.locator('#confirm-dialog');
const home = async page => {
  await page.goto('/');
  await page.waitForTimeout(ciTimeout(700));
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

test('the first Visual effects switch-off asks in game; Cancel, Esc and the backdrop change nothing', async ({ page }) => {
  await home(page);
  await openSettingsSection(page, 'display');
  for (const dismiss of [() => page.locator('#confirm-cancel').click(), () => page.keyboard.press('Escape'), () => page.mouse.click(4, 4)]) {
    await vfx(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.locator('#confirm-title')).toHaveText('Turn off visual effects?');
    await expect(page.locator('#confirm-cancel')).toBeFocused();
    await dismiss();
    await expect(dialog(page)).toBeHidden();
    await expect(vfx(page)).toBeChecked();
    await expect(page.locator('#airflow-toggle')).toBeEnabled();
    await expect(page.locator('#settings-panel')).toBeVisible();
  }
  await expect(toast(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('skyline-vfx-off-confirmed'))).toBeNull(); // settled: every dismissal was awaited above

  await vfx(page).click();
  await page.locator('#confirm-accept').click();
  await expect(vfx(page)).not.toBeChecked();
  await expect(page.locator('#airflow-toggle')).toBeDisabled();
  await expect(toast(page)).toHaveText('Visual effects off');
  // The toast is raised into the top layer above the open Settings dialog.
  expect(await page.locator('#game-toast').evaluate(el => el.matches(':popover-open'))).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('skyline-vfx-off-confirmed'))).toBe('1');

  await vfx(page).click();
  await expect(vfx(page)).toBeChecked();
  await expect(dialog(page)).toBeHidden();
  await expect(toast(page)).toHaveText('Visual effects on');
  await vfx(page).click();
  await expect(vfx(page)).not.toBeChecked();
  await expect(dialog(page)).toBeHidden();
  await page.reload();
  await openSettingsSection(page, 'display');
  await vfx(page).click();
  await vfx(page).click();
  await expect(vfx(page)).not.toBeChecked();
  await expect(dialog(page)).toBeHidden();
});

test('M, V and F2 each show one toast that replaces the last and hides itself', async ({ page }) => {
  await home(page);
  await page.keyboard.press('m');
  await expect(toast(page)).toHaveText('Sound off');
  await expect(page.locator('#game-toast')).toHaveAttribute('role', 'status');
  await page.keyboard.press('m');
  await expect(toast(page)).toHaveText('Sound on');
  await page.keyboard.press('v');
  await expect(toast(page)).toHaveText('Airflow on');
  await expect(toast(page)).toHaveCount(1);
  await page.keyboard.press('F2');
  await expect(toast(page)).toHaveText('Auto accelerate off');
  expect(await page.locator('#game-toast').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(toast(page)).toHaveCount(0, { timeout: ciTimeout(3000) });
  // The button path, inside the open Settings dialog: the toast still shows above it.
  await page.locator('#settings-button').click();
  await page.locator('#mute-all').click();
  await expect(toast(page)).toHaveText('Sound off');
  await openSettingsSection(page, 'display');
  await page.locator('#airflow-toggle').click();
  await expect(toast(page)).toHaveText('Airflow off');
});

for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['phone portrait', 390, 844, true], ['phone landscape', 844, 390, true]]) {
  test.describe(`race toast ${name}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    test('stays clear of the HUD readouts, driving message and event callout', async ({ page, context }) => {
      test.setTimeout(ciTimeout(75000));
      await bootAirflowRace(page, context, 'en');
      await page.keyboard.press('m');
      await expect(toast(page)).toHaveText('Sound off');
      const pill = await toast(page).evaluate(el => {
        el.getAnimations().forEach(animation => animation.finish());
        const { x, y, width, height } = el.getBoundingClientRect();
        // Show both race messages with their longest everyday copy so their real boxes are measured.
        const callout = document.querySelector('#event-callout');
        callout.hidden = false;
        callout.firstElementChild ? callout.firstElementChild.textContent = 'PERFECT BOOST' : callout.textContent = 'PERFECT BOOST';
        document.querySelector('#driving-message').textContent = 'HOLD THROTTLE TO KEEP SPEED';
        return { x, y, width, height };
      });
      const boxes = [...await readHudBoxes(page), ...await page.evaluate(() => ['#event-callout', '#driving-message'].map(id => {
        const { x, y, width, height } = document.querySelector(id).getBoundingClientRect();
        return [id, { x, y, width, height }];
      }))];
      const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      expect(boxes.filter(([, box]) => box.width && !apart(pill, box)).map(([id]) => id), `${width}x${height} toast ${JSON.stringify(pill)}`).toEqual([]);
      expect(pill.y).toBeGreaterThanOrEqual(0);
      expect(pill.x + pill.width).toBeLessThanOrEqual(width);
    });
  });
}
