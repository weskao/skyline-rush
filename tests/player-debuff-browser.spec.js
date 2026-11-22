import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { settled } from './helpers/test.js';

async function expectArtwork(card, attack) {
  const image = card.locator('img');
  await expect(image).toHaveAttribute('src', new RegExp(`/${attack}@3x\\.webp$`));
  await expect(image).toHaveJSProperty('naturalWidth', 120);
  expect(await image.evaluate((img, effect) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const margin = 8;
    let visiblePixels = 0;
    let yellowPixels = 0;
    let clipped = false;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const offset = (y * canvas.width + x) * 4;
        if (data[offset + 3] <= 16) continue;
        visiblePixels++;
        const [r, g, b] = data.subarray(offset, offset + 3);
        if (r > 175 && g > 115 && r >= g && g > b + 42) yellowPixels++;
        if (x < margin || x >= canvas.width - margin || y < margin || y >= canvas.height - margin) clipped = true;
      }
    }
    const { width, height } = img.getBoundingClientRect();
    return { width, height, pixels: canvas.height, clipped, visible: visiblePixels >= 1000, palette: effect !== 'emp' || yellowPixels > visiblePixels / 3 };
  }, attack)).toEqual({ width: 40, height: 40, pixels: 120, clipped: false, visible: true, palette: true });
}


for (const [name, width, height, hasTouch, locale] of [
  ['desktop', 1440, 900, false, 'zh-TW'],
  ['portrait', 390, 844, true, 'zh-TW'],
  ['landscape', 844, 390, true, 'en'],
  ['foldable', 844, 390, true, 'zh-TW'],
]) test.describe(`incoming debuffs on ${name}`, () => {
  test.use({ viewport: { width, height }, hasTouch });

  test('labels incoming attacks in the race centre and clears them at expiry and pause', async ({ page, gameplayURL }) => {
    if (name === 'portrait') await page.emulateMedia({ reducedMotion: 'reduce' });
    if (name === 'foldable') await page.addInitScript(() => {
      Object.defineProperty(window, 'viewport', { value: { segments: [
        { left: 0, top: 0, width: 412, height: 390 },
        { left: 432, top: 0, width: 412, height: 390 },
      ] } });
    });
    await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=${locale}`);
    await page.waitForFunction(() => !!window.debuffHud);
    if (name === 'landscape') await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });

    const freeze = page.locator('#race-player-hit-center [data-debuff="freeze"]');
    const emp = page.locator('#race-player-hit-center [data-debuff="emp"]');
    await expect(freeze).toBeHidden();
    await expect(emp).toBeHidden();
    await page.evaluate(() => window.debuffHud.hit('freeze', 220));

    await expect(freeze).toContainText(locale === 'en' ? 'FROZEN!' : '冰凍！');
    await expect(freeze).toContainText(locale === 'en' ? 'HANDLING SLUGGISH' : '操控暫時變遲緩');
    await expect(freeze).toHaveAttribute('data-phase', 'impact');
    await settled(freeze); // player-hit-in translates the card: a mid-entry rect is off by a float32 ULP
    await expectArtwork(freeze, 'freeze');
    await expect(freeze.locator('time')).toHaveText(locale === 'en' ? '2.0s' : '2.0 秒');
    await expect(freeze).toHaveCSS('pointer-events', 'none');
    await expect(freeze).toHaveCSS('animation-name', ['desktop', 'foldable'].includes(name) ? /^player-hit-in/ : 'none');
    const centre = await freeze.evaluate(card => {
      const box = card.parentElement.getBoundingClientRect();
      return { x: box.left + box.width / 2, top: box.top, height: box.height };
    });
    const expectedX = name === 'foldable' ? 638 : width / 2;
    expect(Math.abs(centre.x - expectedX)).toBeLessThan(1);
    expect(Math.abs(centre.top - height * .2), 'debuff begins about 20% from scene top').toBeLessThan(3);
    expect(centre.height).toBeLessThan(height * .18);

    await page.evaluate(() => {
      const { race, hit } = window.debuffHud;
      hit('emp', race.length / 2 + 1);
    });
    await expect(emp).toContainText(locale === 'en' ? 'EMP SHOCK!' : 'EMP 電擊！');
    await expect(emp).toContainText(locale === 'en' ? 'HANDLING DISRUPTED' : '操控暫時受干擾');
    await expect(emp.locator('time')).toHaveText(locale === 'en' ? '1.5s' : '1.5 秒');
    // Both hits are live: each keeps its own screen layer, on its own timeline.
    for (const layer of ['freeze', 'emp']) await expect(page.locator(`#player-hit-screen [data-hit-layer="${layer}"]`)).toHaveAttribute('data-phase', 'impact');
    await settled(emp);
    await expectArtwork(emp, 'emp');
    await expect(freeze).toBeVisible();
    const separation = await (await page.waitForFunction(() => {
      const halfway = document.querySelector('#race-halfway-card');
      const hits = document.querySelector('#race-player-hit-center');
      return halfway && hits ? { gap: hits.getBoundingClientRect().top - halfway.getBoundingClientRect().bottom } : null;
    })).jsonValue();
    expect(separation.gap).toBeGreaterThanOrEqual(0);

    await page.evaluate(() => {
      const { race, update } = window.debuffHud;
      race.elapsed = race.player.empUntil;
      update();
    });
    await expect(emp).toBeHidden();
    await expect(page.locator('#player-hit-screen [data-hit-layer="emp"]')).toHaveCount(0);
    await expect(freeze.locator('time')).toHaveText(locale === 'en' ? '0.5s' : '0.5 秒');
    await expect(freeze).toHaveAttribute('data-phase', 'recovery');
    await page.evaluate(() => {
      window.debuffHud.race.phase = 'paused';
      window.debuffHud.update();
    });
    await expect(freeze).toBeHidden();
    await page.evaluate(() => {
      window.debuffHud.race.phase = 'racing';
      window.debuffHud.update();
    });
    await expect(freeze).toBeVisible();
    await page.evaluate(() => {
      const { race, update } = window.debuffHud;
      race.elapsed = race.player.freezeUntil;
      race.player.effects.freeze = 2;
      update();
    });
    await expect(freeze).toBeHidden();
  });
});

test('a failed debuff image restores the matching outline without losing the label', async ({ page, gameplayURL }) => {
  await page.route('**/freeze@3x.webp', route => route.abort());
  await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=en`);
  await page.waitForFunction(() => !!window.debuffHud);
  await page.evaluate(() => window.debuffHud.hit('freeze', 220));
  const freeze = page.locator('#race-player-hit-center [data-debuff="freeze"]');
  await expect(freeze.locator('img')).toHaveCount(0);
  await expect(freeze.locator('svg')).toBeVisible();
  await expect(freeze).toContainText('FROZEN');
});

test('speed feedback follows the active debuff and keeps a steady tint with reduced motion', async ({ page, gameplayURL }) => {
  await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=en`);
  await page.waitForFunction(() => !!window.debuffHud);
  const speedometer = page.locator('.speedometer');
  const speed = page.locator('#speed');
  const motion = () => page.locator('.speed-number').evaluate(node => {
    const name = getComputedStyle(node, '::after').animationName;
    return node.getAnimations({ subtree: true }).some(animation => animation.animationName === name) ? name : 'none';
  });
  const reading = await speed.textContent();
  const normal = await speed.evaluate(node => getComputedStyle(node).color);

  await page.evaluate(() => window.debuffHud.hit('freeze', 220));
  await expect(speedometer).toHaveAttribute('data-debuff', 'freeze');
  await expect(speedometer).toHaveAttribute('data-phase', 'impact');
  await expect(speed).toHaveCSS('color', 'rgb(153, 228, 255)');
  expect(await motion()).toMatch(/^speed-frost/);
  await page.evaluate(() => window.debuffHud.hit('emp', 230));
  await expect(speedometer).toHaveAttribute('data-debuff', 'emp');
  await expect(speed).toHaveCSS('color', 'rgb(255, 227, 122)');
  expect(await motion()).toMatch(/^speed-surge/);
  expect(await page.locator('#player-hit-screen').evaluate(node => getComputedStyle(node).backgroundImage)).toContain('252, 214, 80');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await motion()).toBe('none');
  await expect(speed).toHaveCSS('color', 'rgb(255, 227, 122)');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });
  expect(await motion()).toBe('none');
  await page.evaluate(() => {
    const { race, update } = window.debuffHud;
    race.elapsed = race.player.empUntil;
    update();
  });
  await expect(speedometer).toHaveAttribute('data-debuff', 'freeze');
  await page.evaluate(() => {
    const { race, update } = window.debuffHud;
    race.elapsed = race.player.freezeUntil;
    update();
  });
  await expect(speedometer).not.toHaveAttribute('data-debuff');
  await expect(speed).toHaveCSS('color', normal);
  await expect(speed).toHaveText(reading);
});

test('the notice stays narrow and translucent while the affected status remains legible', async ({ page, gameplayURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=zh-TW`);
  await page.waitForFunction(() => !!window.debuffHud);
  for (const [effect, color] of [['emp', 'rgb(255, 227, 122)'], ['freeze', 'rgb(153, 228, 255)']]) {
    await page.evaluate(kind => window.debuffHud.hit(kind, 220), effect);
    const card = page.locator(`#race-player-hit-center [data-debuff="${effect}"]`);
    await expect(card).toBeVisible();
    const appearance = await card.evaluate(node => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      stops: [...getComputedStyle(node).backgroundImage.matchAll(/rgba\([^)]+, ([\d.]+)\)/g)].map(match => Number(match[1])),
      title: getComputedStyle(node.querySelector('strong')).color,
      timer: getComputedStyle(node.querySelector('time')).color,
    }));
    expect(appearance.width).toBeLessThanOrEqual(190);
    expect(appearance.height).toBeLessThanOrEqual(48);
    expect(appearance.stops.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...appearance.stops)).toBeLessThanOrEqual(.78);
    expect(appearance.title).toBe(color);
    expect(appearance.timer).toBe(color);
  }
});
