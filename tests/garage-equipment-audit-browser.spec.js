import { test, captureHooks, seedHeroCar } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAINTS } from '../src/appearance.ts';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';

// Task 4c owner audit (not a gate): every Garage paint and skin, procedural car vs `?model=roadster` GLB, in Garage Home
// at both lighting levels and all three poses, plus the race events with the heaviest loadout, desktop and phone.
// Writes one contact sheet per group to the git-ignored docs/designs/3d-pipeline/audits/garage-equipment/.
// Run: GARAGE_EQUIPMENT_AUDIT=1 npx playwright test tests/garage-equipment-audit-browser.spec.js --workers=1
test.skip(!process.env.GARAGE_EQUIPMENT_AUDIT, 'owner audit captures only: set GARAGE_EQUIPMENT_AUDIT=1');

const OUT = fileURLToPath(new URL(`../docs/designs/3d-pipeline/audits/garage-equipment${process.env.HERO_CAR ? `-${process.env.HERO_CAR}` : ''}/`, import.meta.url));
const CARS = { procedural: '', glb: '?model=roadster' };
const COMBOS = ['bright', 'dim'].flatMap(light => ['ground', 'flight', 'wing'].map(pose => ({ light, pose })));
const ITEMS = [
  ...Object.keys(PAINTS).map(id => ({ id, group: 'paint', select: `[data-paint="${id}"]` })),
  ...GARAGE_SKINS.map(({ id, category }) => ({ id, group: category, category, select: `[data-skin="${id}"] .garage-skin-preview-hitarea` })),
];
const HEAVIEST = ['thruster-void', 'airflow-prism', 'nitro-trail-purple', 'launch-flare-white'];

async function open(page, url, quality = 'high') {
  await page.addInitScript(q => {
    // A fresh context per car (browser.newPage): no skin picks carry over; What's New marked read like helpers/test.js does
    for (const [key, value] of [['guide-seen', '1'], ['whats-new-seen-v1', '999.0.0'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q, enabled: true, comfortable: false }));
  }, quality);
  await seedHeroCar(page);
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  if (url.includes('model=')) await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  await expect.poll(() => page.evaluate(() => !!window.gameScene)).toBe(true);
}
const flareShown = page => page.evaluate(() => { let on = false; window.gameScene.scene.traverse(o => { if (o.name === 'Launch flare body glow' && o.visible) on = true; }); return on; });
const png = async locator => `data:image/png;base64,${(await locator.screenshot()).toString('base64')}`;

async function setCombo(page, { light, pose }) {
  const lighting = page.locator('#garage-lighting');
  if ((await lighting.getAttribute('aria-pressed')) !== String(light === 'dim')) await lighting.click();
  await expect(lighting).toHaveAttribute('aria-pressed', String(light === 'dim'));
  await page.locator(`button[data-garage-mode="${pose === 'flight' ? 'flight' : 'ground'}"]`).click();
  const wing = page.locator('#garage-preview');
  if ((await wing.getAttribute('data-garage-wing')) !== String(pose === 'wing')) await page.locator('#garage-wing').click();
  await expect(wing).toHaveAttribute('data-garage-wing', String(pose === 'wing'));
  await page.waitForTimeout(ciTimeout(1500)); // pose and wing transitions settle
}

async function captureGarage(page) {
  const shots = {}; // `${item}|${combo}` → image
  const preview = page.locator('#garage-preview');
  for (const combo of COMBOS) {
    await setCombo(page, combo);
    for (const [i, item] of ITEMS.entries()) {
      await page.locator(item.select).click();
      if (item.id.startsWith('launch-flare-') && !item.id.endsWith('basic')) await expect.poll(() => flareShown(page), { timeout: ciTimeout(10000) }).toBe(true);
      else await page.waitForTimeout(ciTimeout(400));
      shots[`${item.id}|${combo.light}-${combo.pose}`] = await png(preview);
      const next = ITEMS[i + 1];
      if (next?.group !== item.group) await page.locator(item.group === 'paint' ? '[data-paint="pearl"]' : `[data-skin="${item.category}-basic"] .garage-skin-preview-hitarea`).click(); // isolate the next group
    }
  }
  return shots;
}

async function captureRace(page, quality = 'high') {
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  for (const id of HEAVIEST) {
    const card = page.locator(`#garage-vfx-catalog [data-skin="${id}"]`);
    await card.locator('.garage-skin-preview-hitarea').click();
    await card.locator('.garage-skin-action').click();
  }
  await page.locator('#garage-close').click();
  const shots = {};
  await page.locator('#start-button').click();
  if (quality !== 'low') await expect.poll(() => flareShown(page), { timeout: ciTimeout(15000) }).toBe(true); // Low drops the body glow by design
  else await expect(page.locator('#race-status')).toHaveText('COUNTDOWN', { timeout: ciTimeout(15000) });
  shots.launch = await png(page.locator('body'));
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
  await page.waitForTimeout(ciTimeout(800));
  shots.ground = await png(page.locator('body'));
  await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(ciTimeout(700));
  shots.boost = await png(page.locator('body'));
  await page.keyboard.up('ShiftLeft');
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(ciTimeout(700));
  shots.nitro = await png(page.locator('body'));
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.gameScene.player.userData.altitude), { timeout: ciTimeout(10000) }).toBeGreaterThan(1);
  shots.fly = await png(page.locator('body'));
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.gameScene.player.userData.altitude), { timeout: ciTimeout(15000) }).toBeLessThan(0.3);
  shots.landing = await png(page.locator('body'));
  return shots;
}

function sheet(title, rows, columns, cell) {
  const head = columns.map(c => `<th colspan="2">${c}</th>`).join('');
  const sub = columns.map(() => '<th>procedural</th><th>GLB</th>').join('');
  const body = rows.map(row => `<tr><th>${row}</th>${columns.map(c => `<td><img src="${cell(row, c, 'procedural')}"></td><td><img src="${cell(row, c, 'glb')}"></td>`).join('')}</tr>`).join('');
  return `<!doctype html><meta charset="utf-8"><style>body{background:#0b1724;color:#dfe9f2;font:12px system-ui;margin:8px}
    table{border-collapse:collapse}td,th{border:1px solid #294858;padding:2px}img{width:200px;display:block}th{white-space:nowrap}</style>
    <h1>${title}</h1><table><tr><th></th>${head}</tr><tr><th></th>${sub}</tr>${body}</table>`;
}

async function writeSheet(browser, name, html) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}${name}.html`, html);
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.setContent(html);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  await page.close();
}

test('audit: draw calls and triangles per quality tier, heaviest loadout, NITRO + FLY, procedural vs GLB', async ({ browser, gameplayURL }) => {
  test.setTimeout(ciTimeout(10 * 60 * 1000));
  const rows = [];
  for (const quality of ['low', 'medium', 'high']) for (const [car, query] of Object.entries(CARS)) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await captureHooks(page);
    await open(page, `${gameplayURL}${query}`, quality);
    await captureRace(page, quality); // equips the heaviest loadout and runs every event once; measured below with NITRO + FLY on
    await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
    await page.keyboard.down('Space');
    await expect.poll(() => page.evaluate(() => window.gameScene.player.userData.altitude), { timeout: ciTimeout(10000) }).toBeGreaterThan(1);
    const samples = [];
    for (let i = 0; i < 10; i++) { await page.waitForTimeout(ciTimeout(100)); samples.push(await page.evaluate(() => ({ ...window.gameScene.renderer.info.render }))); }
    await page.keyboard.up('Space');
    const median = key => samples.map(s => s[key]).sort((a, b) => a - b)[5];
    rows.push({ quality, car, drawCalls: median('calls'), triangles: median('triangles') });
    await page.close();
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}tier-cost.json`, JSON.stringify(rows, null, 2));
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }]) {
  test(`audit captures: every paint and skin, procedural vs GLB, ${viewport.name}`, async ({ browser, gameplayURL }) => {
    test.setTimeout(ciTimeout(30 * 60 * 1000));
    const garage = {}, race = {};
    for (const [car, query] of Object.entries(CARS)) {
      const page = await browser.newPage({ viewport, ...(viewport.name === 'phone' && { isMobile: true, hasTouch: true }) });
      await captureHooks(page);
      await open(page, `${gameplayURL}${query}`);
      await page.locator('#garage-button').click();
      garage[car] = await captureGarage(page);
      await page.locator('#garage-close').click();
      race[car] = await captureRace(page);
      await page.close();
    }
    const columns = COMBOS.map(c => `${c.light}-${c.pose}`);
    for (const group of [...new Set(ITEMS.map(i => i.group))]) {
      const rows = ITEMS.filter(i => i.group === group).map(i => i.id);
      await writeSheet(browser, `${viewport.name}-${group}`, sheet(`${group} · ${viewport.name}`, rows, columns, (row, column, car) => garage[car][`${row}|${column}`]));
    }
    await writeSheet(browser, `${viewport.name}-race`, sheet(`race, heaviest loadout (${HEAVIEST.join(', ')}) · ${viewport.name}`,
      Object.keys(race.glb), ['event'], (row, _c, car) => race[car][row]));
  });
}
