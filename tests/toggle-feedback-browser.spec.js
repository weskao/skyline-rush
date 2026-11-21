import { test, expect, gotoHome } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { openSettingsSection } from './helpers/settings-browser.js';
import { bootAirflowRace, readHudBoxes } from './helpers/responsive-hud.js';

// Shared setting toast (src/GameToast.vue) and the Visual effects switch-off confirm, asked every time (src/vfx-ui.ts).
const toast = page => page.locator('#game-toast .game-toast-pill');
const STATE_WORDS = { en: { on: 'ON', off: 'OFF' }, 'zh-TW': { on: '開啟', off: '關閉' } };
// The setting name, then its new state as a separate badge that the colour and the fill both mark. The pill unmounts
// TOAST_MS (1.8 s) after it shows; on CI three locator reads outlived it and the next read found no toast. Find, check
// and measure it in one page tick, then assert on the returned snapshot.
const expectToast = async (page, label, state, lang = 'en') => (await page.waitForFunction(want => {
  const pills = document.querySelectorAll('#game-toast .game-toast-pill');
  const pill = pills[pills.length - 1], badge = pill?.querySelector('.game-toast-state');
  if (pill?.dataset.state !== want.state || pill.querySelector('.game-toast-label')?.textContent.trim() !== want.label
    || badge?.textContent.trim() !== want.text) return null;
  pill.getAnimations({ subtree: true }).forEach(a => a.finish());
  const { x, y, width, height } = pill.getBoundingClientRect(), s = getComputedStyle(badge);
  return { count: pills.length, box: { x, y, width, height }, color: s.color, bg: s.backgroundColor,
    pillBg: getComputedStyle(pill).backgroundColor, font: Number.parseFloat(s.fontSize) };
}, { label, state, text: STATE_WORDS[lang][state] }, { timeout: ciTimeout(10000) })).jsonValue();
const vfx = page => page.locator('[data-vfx="enabled"]');
const dialog = page => page.locator('#confirm-dialog');
const home = async page => {
  await gotoHome(page);
  await page.waitForTimeout(ciTimeout(700));
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

const VFX_OFF_COPY = {
  en: { title: 'Turn off visual effects?', points: ['Airflow and other visual effects are hidden.', 'Driving, speed and scores stay the same.', 'Turn them back on any time in Game settings › Display & HUD.'], keep: 'Keep effects on', confirm: 'Turn effects off' },
  'zh-TW': { title: '要關閉視覺特效嗎？', points: ['氣流與其他視覺特效會隱藏。', '駕駛、速度與成績不受影響。', '隨時可在「遊戲設定 › 畫面與 HUD」重新開啟。'], keep: '保持開啟', confirm: '關閉特效' },
};
const expectVfxOffDialog = async (page, lang = 'en') => {
  const copy = VFX_OFF_COPY[lang];
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('#confirm-title')).toHaveText(copy.title);
  await expect(page.locator('#confirm-body li')).toHaveText(copy.points);
  await expect(page.locator('#confirm-cancel')).toHaveText(copy.keep);
  await expect(page.locator('#confirm-accept')).toHaveText(copy.confirm);
  await expect(page.locator('#confirm-cancel')).toBeFocused();
};

test('every Visual effects switch-off asks in game; Cancel, Esc and the backdrop change nothing', async ({ page }) => {
  await home(page);
  await openSettingsSection(page, 'display');
  for (const dismiss of [() => page.locator('#confirm-cancel').click(), () => page.keyboard.press('Escape'), () => page.mouse.click(4, 4)]) {
    await vfx(page).click();
    await expectVfxOffDialog(page);
    await dismiss();
    await expect(dialog(page)).toBeHidden();
    await expect(vfx(page)).toBeChecked();
    await expect(page.locator('#airflow-toggle')).toBeEnabled();
    await expect(page.locator('#settings-panel')).toBeVisible();
  }
  await expect(toast(page)).toHaveCount(0);

  await vfx(page).click();
  await page.locator('#confirm-accept').click();
  await expect(vfx(page)).not.toBeChecked();
  await expect(page.locator('#airflow-toggle')).toBeDisabled();
  await expectToast(page, 'Visual effects', 'off');
  // The toast is raised into the top layer above the open Settings dialog.
  expect(await page.locator('#game-toast').evaluate(el => el.matches(':popover-open'))).toBe(true);

  // Turning effects on never asks; the next switch-off asks again, and so does one after a reload.
  await vfx(page).click();
  await expect(vfx(page)).toBeChecked();
  await expect(dialog(page)).toBeHidden();
  await expectToast(page, 'Visual effects', 'on');
  await vfx(page).click();
  await expectVfxOffDialog(page);
  await page.locator('#confirm-accept').click();
  await expect(vfx(page)).not.toBeChecked();
  await vfx(page).click();
  await expect(vfx(page)).toBeChecked();
  await page.reload();
  await openSettingsSection(page, 'display');
  await vfx(page).click();
  await expectVfxOffDialog(page);
  await page.locator('#confirm-cancel').click();
  await expect(vfx(page)).toBeChecked();
});

for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['phone portrait', 390, 844, true], ['phone landscape', 844, 390, true], ['iPhone Chrome landscape', 743, 340, true]]) for (const lang of ['en', 'zh-TW']) {
  test.describe(`switch-off dialog ${name} ${lang}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch, locale: lang });
    test('reads in its language and keeps both choices on screen and tappable', async ({ page }) => {
      await home(page);
      await openSettingsSection(page, 'display');
      await vfx(page).click();
      await expectVfxOffDialog(page, lang);
      const boxes = await dialog(page).evaluate(el => {
        el.getAnimations({ subtree: true }).forEach(a => a.finish());
        return ['#confirm-dialog', '#confirm-cancel', '#confirm-accept'].map(id => {
          const { x, y, width, height } = document.querySelector(id).getBoundingClientRect();
          return { id, x, y, width, height };
        });
      });
      for (const box of boxes) {
        expect(box.x, box.id).toBeGreaterThanOrEqual(0);
        expect(box.y, box.id).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, box.id).toBeLessThanOrEqual(width);
        expect(box.y + box.height, box.id).toBeLessThanOrEqual(height);
      }
      for (const button of boxes.slice(1)) expect(button.height, button.id).toBeGreaterThanOrEqual(44);
      // The dialog itself scrolls (max-height under .history-screen): a button inside the viewport can still be cut by it.
      expect(await dialog(page).evaluate(el => [el.scrollWidth <= el.clientWidth, el.scrollHeight <= el.clientHeight])).toEqual([true, true]);
      await (touch ? page.locator('#confirm-cancel').tap() : page.locator('#confirm-cancel').click());
      await expect(dialog(page)).toBeHidden();
      await expect(vfx(page)).toBeChecked();
    });
  });
}

test('M, V and F2 each show one toast that replaces the last and hides itself', async ({ page }) => {
  await home(page);
  await page.keyboard.press('m');
  await expectToast(page, 'Sound', 'off');
  await expect(page.locator('#game-toast')).toHaveAttribute('role', 'status');
  await page.keyboard.press('m');
  await expectToast(page, 'Sound', 'on');
  await page.keyboard.press('v');
  expect((await expectToast(page, 'Airflow', 'on')).count).toBe(1);
  await page.keyboard.press('F2');
  await expectToast(page, 'Auto accelerate', 'off');
  expect(await page.locator('#game-toast').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(toast(page)).toHaveCount(0, { timeout: ciTimeout(3000) });
  // The button path, inside the open Settings dialog: the toast still shows above it.
  await page.locator('#settings-button').click();
  await page.locator('#mute-all').click();
  await expectToast(page, 'Sound', 'off');
  await openSettingsSection(page, 'display');
  await page.locator('#airflow-toggle').click();
  await expectToast(page, 'Airflow', 'off');
});

// WCAG contrast ratio of two computed rgb() colours (alpha ignored).
const contrast = (a, b) => {
  const lum = c => {
    const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map(v => { const x = v / 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
    return .2126 * r + .7152 * g + .0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
};

test('the ON and OFF badges differ in colour and fill, and both stay readable', async ({ page }) => {
  await home(page);
  await page.keyboard.press('m');
  const off = await expectToast(page, 'Sound', 'off');
  await page.keyboard.press('m');
  const on = await expectToast(page, 'Sound', 'on');
  expect(on.color).not.toBe(off.color);
  expect(off.bg, 'OFF is an outlined badge, ON a filled one: the state never rests on hue alone').toBe('rgba(0, 0, 0, 0)');
  expect(on.bg).not.toBe(off.bg);
  expect(contrast(on.color, on.bg), `ON ${on.color} on ${on.bg}`).toBeGreaterThanOrEqual(4.5);
  expect(contrast(off.color, off.pillBg), `OFF ${off.color} on ${off.pillBg}`).toBeGreaterThanOrEqual(4.5);
  expect(on.font).toBeGreaterThanOrEqual(13);
});

for (const [name, width, height, touch] of [['desktop', 1440, 900, false], ['phone portrait', 390, 844, true], ['phone landscape', 844, 390, true]]) for (const lang of ['en', 'zh-TW']) {
  test.describe(`race toast ${name} ${lang}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch, locale: lang });
    test('stays clear of the HUD readouts, driving message and event callout', async ({ page, context }) => {
      test.setTimeout(ciTimeout(75000));
      await bootAirflowRace(page, context, lang);
      // Auto accelerate is the longest setting name, so this measures the widest toast.
      await page.keyboard.press('F2');
      const { box: pill } = await expectToast(page, lang === 'en' ? 'Auto accelerate' : '自動加速', 'off', lang);
      await page.evaluate(() => {
        // Show both race messages with their longest everyday copy so their real boxes are measured.
        const callout = document.querySelector('#event-callout');
        callout.hidden = false;
        callout.firstElementChild ? callout.firstElementChild.textContent = 'PERFECT BOOST' : callout.textContent = 'PERFECT BOOST';
        document.querySelector('#driving-message').textContent = 'HOLD THROTTLE TO KEEP SPEED';
      });
      const boxes = [...await readHudBoxes(page), ...await page.evaluate(() => ['#event-callout', '#driving-message'].map(id => {
        const { x, y, width, height } = document.querySelector(id).getBoundingClientRect();
        return [id, { x, y, width, height }];
      }))];
      const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      const hit = boxes.filter(([, box]) => box.width && !apart(pill, box));
      expect(hit.map(([id]) => id), `${width}x${height} toast ${JSON.stringify(pill)} over ${JSON.stringify(hit)}`).toEqual([]);
      expect(pill.y).toBeGreaterThanOrEqual(0);
      expect(pill.x + pill.width).toBeLessThanOrEqual(width);
    });
  });
}
