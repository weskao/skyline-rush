import { expect } from '@playwright/test';
import { mkdirSync, appendFileSync, rmSync, writeFileSync } from 'node:fs';
import { test } from './helpers/gameplay-browser.js';
import { RACE_TRACKS } from '../src/game.js';
import { CATALOGS } from '../src/i18n.js';

// Both locales x desktop + phone through the real flow. Screenshots go to I18N_SHOT_DIR (default test-results/i18n-shots), never artifacts/.
const SHOT_DIR = process.env.I18N_SHOT_DIR ?? 'test-results/i18n-shots';
const LOCALES = [['en', 'en-US', 'en'], ['zh-TW', 'zh-TW', 'zh-TW']]; // [catalog, Playwright (system) locale, <html lang>]
const VIEWPORTS = [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]];
const MIN_CJK_PX = 10;
const CJK = /[㐀-鿿豈-﫿　-〿]/;
// Brand/game terms, units and key names the zh-TW UI keeps in English.
const ALLOWED = new Set(['SKYLINE', 'RUSH', 'NITRO', 'FLY', 'BOOST', 'NOVA', 'ORBIT', 'APEX', 'KM', 'ESC', 'SPACE', 'SHIFT', 'ENTER', 'CFD']); // CFD: the technical acronym in "NOT CFD"
const KEY_PREFIXES = [...new Set(Object.keys(CATALOGS.en).map(key => key.split('.')[0]))];
// A catalog key shown to the player: a whole-string dotted identifier, or a real catalog prefix glued to a dotted tail.
const RAW_KEY = new RegExp(`^[a-z][A-Za-z0-9]*(\\.[A-Za-z0-9-]+)+$|(^|[^\\w.])(${KEY_PREFIXES.join('|')})\\.[A-Za-z][\\w.]*`);
const isRawKey = text => (RAW_KEY.test(text) && !/^v\d/.test(text)) || text in CATALOGS.en;

// Every user-visible string: own text nodes, aria-label, title, <option> text (even when the native select is hidden).
const collectStrings = (page, all) => page.evaluate(all => {
  const where = el => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList[0] ? `.${el.classList[0]}` : ''}`;
  const out = [{ text: document.title, where: 'document.title', override: null, key: false }];
  const description = document.querySelector('meta[name="description"]')?.content;
  if (description) out.push({ text: description, where: 'meta[description]', override: null, key: false });
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'CANVAS'].includes(el.tagName)) continue;
    const isOption = el.tagName === 'OPTION';
    if (!all && !isOption && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const override = el.closest('[lang]:not(html)')?.getAttribute('lang') ?? null;
    const key = !!el.closest('kbd, .keymap-binding b, .keys');
    const px = parseFloat(getComputedStyle(el).fontSize);
    const push = (text, attr) => { if (text?.trim()) out.push({ text: text.trim(), where: `${where(el)}${attr ? `[${attr}]` : ''}`, override, key, px: attr ? null : px }); };
    for (const node of el.childNodes) if (node.nodeType === 3) push(node.textContent);
    push(el.getAttribute('aria-label'), 'aria-label');
    push(el.getAttribute('title'), 'title');
  }
  return out;
}, all);

// Text escaping its own control, an overflow:hidden ancestor, or the screen; overlapping HUD leaves.
const layoutProblems = (page, { blocks, leaves }) => page.evaluate(({ blocks, leaves }) => {
  const where = el => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList[0] ? `.${el.classList[0]}` : ''}`;
  const visible = el => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const sized = el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const problems = { overflow: [], clipped: [], overlap: [], offscreen: [] };
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) problems.overflow.push(`page ${doc.scrollWidth}>${doc.clientWidth}`);
  if (document.body.scrollWidth > doc.clientWidth) problems.overflow.push(`body ${document.body.scrollWidth}>${doc.clientWidth}`);
  for (const selector of blocks) for (const el of document.querySelectorAll(selector)) {
    // A deliberate horizontal scroller (the track carousel) is not an overflow defect.
    if (visible(el) && el.scrollWidth > el.clientWidth && !['auto', 'scroll'].includes(getComputedStyle(el).overflowX)) problems.overflow.push(`${selector} ${el.scrollWidth}>${el.clientWidth}`);
  }
  const range = document.createRange();
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'CANVAS', 'OPTION', 'SELECT', 'svg'].includes(el.tagName) || !visible(el) || !sized(el)) continue;
    const text = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!text) continue;
    const ancestors = []; for (let a = el; a && a !== document.body; a = a.parentElement) ancestors.push(a);
    // Visually-hidden helpers (1px clip boxes). A zero-height <main> that only holds positioned children must not hide its subtree.
    if (ancestors.some(a => !sized(a) && getComputedStyle(a).overflow !== 'visible')) continue;
    const rects = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).flatMap(n => { range.selectNodeContents(n); return [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0); });
    const tag = `${where(el)} "${text.slice(0, 40)}"`;
    const cs = getComputedStyle(el);
    if (el.clientWidth > 0 && cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1 && !['auto', 'scroll'].includes(cs.overflowX)) problems.clipped.push(`${tag} scrollWidth ${el.scrollWidth}>${el.clientWidth}`);
    const scrollsX = ancestors.some(a => ['auto', 'scroll'].includes(getComputedStyle(a).overflowX)); // reachable by scrolling, e.g. the track carousel
    for (const r of scrollsX ? [] : rects) {
      if (r.left < -1 || r.right > innerWidth + 1) { problems.offscreen.push(`${tag} x ${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}`); break; }
    }
    // An interactive control's label must stay inside its own box.
    if (el.matches('button, a, summary, kbd, label')) {
      const box = el.getBoundingClientRect();
      if (rects.some(r => r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)) problems.clipped.push(`${tag} text escapes its control box`);
    }
    // Content inside a scroller (auto/scroll) is reachable by scrolling, so clipping ancestors beyond it do not count on that axis.
    let scrollX = false, scrollY = false;
    for (const a of ancestors) {
      const s = getComputedStyle(a);
      const clipX = !scrollX && ['hidden', 'clip'].includes(s.overflowX), clipY = !scrollY && ['hidden', 'clip'].includes(s.overflowY);
      if (a !== el) { scrollX ||= ['auto', 'scroll'].includes(s.overflowX); scrollY ||= ['auto', 'scroll'].includes(s.overflowY); }
      if (!clipX && !clipY) continue;
      const box = a.getBoundingClientRect();
      if (rects.some(r => (clipX && (r.left < box.left - 1.5 || r.right > box.right + 1.5)) || (clipY && (r.top < box.top - 1.5 || r.bottom > box.bottom + 1.5)))) { problems.clipped.push(`${tag} cut by ${where(a)}`); break; }
    }
  }
  // Same method as responsive-browser.spec.js: boxes of HUD blocks must stay apart. Nested pairs are skipped (a leaf lives inside its block).
  const arrow = document.querySelector('#position-change');
  const [hidden, text] = [arrow.hidden, arrow.textContent];
  Object.assign(arrow, { hidden: false, textContent: '↓' });
  const els = [...new Set(leaves)].flatMap(selector => { const el = document.querySelector(selector); return el && visible(el) ? [[selector, el]] : []; });
  for (const [i, [name, a]] of els.entries()) for (const [other, b] of els.slice(i + 1)) {
    if (a.contains(b) || b.contains(a)) continue;
    // Live-region containers have a box even while empty; only a message that is showing text can collide.
    if ([a, b].some(el => el.matches('.driving-message, .event-callout') && !el.textContent.trim())) continue;
    const [x, y] = [a.getBoundingClientRect(), b.getBoundingClientRect()];
    const apart = x.right <= y.left + 0.5 || y.right <= x.left + 0.5 || x.bottom <= y.top + 0.5 || y.bottom <= x.top + 0.5;
    if (!apart) problems.overlap.push(`${name} x ${other}`);
  }
  Object.assign(arrow, { hidden, textContent: text });
  return problems;
}, { blocks, leaves });

const PANELS = ['#intro', '.overlay-content', '#race-overlay', '#controls-panel', '#settings-panel', '.vfx-settings', '#history-screen', '#garage-screen', '#leave-screen',
  '.topbar', '.telemetry', '.race-info', '.aero-tools', '#touch-controls', '.track-select', '.intro-actions', '.intro-controls', '.leaderboard', '.result-stats'];
// HUD blocks (same list as responsive-browser.spec.js) plus the airflow, gauge and flight-label elements this task is about.
const HUD = ['.position-stat', '.leaderboard', '.race-route-map', '.race-progress', '.mode-indicator', '.speedometer', '.flight-telemetry', '.aero-tools', '#controls-button', '#pause-button',
  '.airflow-hud', '.flight-director', '.altitude-ladder', ...['fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];
const HUD_LEAVES = [...HUD, '#flight-mode', '#flight-budget', '#flight-state', '#flight-instruction', '#speed-caption', '.speed-number', '.altitude-stat', '.fuel-stat', '#style-score', '#position-change',
  '.event-callout', '.driving-message', '#airflow-toggle', '#aero-start', '#vfx-panel > summary'];

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
  await page.waitForTimeout(150);
}

function makeContext(page, id, locale, htmlLang) {
  const dir = `${SHOT_DIR}/${id}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { page, id, dir, locale, htmlLang, errors, n: 0, seen: new Set() };
}

// One screen: screenshot, locale content checks, layout checks. Soft expects, so a whole flow reports every defect at once.
async function check(cx, step, { hud = false, all = false, live = false } = {}) {
  const { page, locale } = cx;
  if (!live) await settle(page); // live: a callout is gone once its animation ends, so capture it straight away
  const shot = `${cx.dir}/${String(++cx.n).padStart(2, '0')}-${step}.png`;
  await page.screenshot({ path: shot });
  const strings = await collectStrings(page, all);
  const bad = { rawKeys: [], cjkInEn: [], strayEnglish: [], tinyCjk: [] };
  const hiddenStray = []; // whole-DOM scan: markup placeholders that main.js rewrites before they are shown; logged, not asserted
  for (const { text, where, override, key, px } of strings) {
    if (isRawKey(text)) bad.rawKeys.push(`${where}: ${text}`);
    if (locale === 'en' && override !== 'zh-TW' && CJK.test(text)) bad.cjkInEn.push(`${where}: ${text}`);
    // Han strokes need more pixels than Latin: below MIN_CJK_PX the glyphs blur together.
    if (locale === 'zh-TW' && px && px < MIN_CJK_PX && CJK.test(text)) bad.tinyCjk.push(`${where}: "${text.slice(0, 30)}" ${px}px`);
    if (locale === 'zh-TW' && override !== 'en' && !key) {
      const stray = (text.match(/[A-Za-z][A-Za-z']*/g) ?? []).filter(word => word.length > 1 && !ALLOWED.has(word.toUpperCase()));
      if (stray.length) (all ? hiddenStray : bad.strayEnglish).push(`${where}: "${text}" -> ${stray.join(' ')}`);
    }
  }
  const layout = await layoutProblems(page, { blocks: PANELS, leaves: hud ? HUD_LEAVES : [] });
  if (hiddenStray.length) appendFileSync(`${cx.dir}/findings.txt`, `## ${step} [hidden-dom English placeholders, info only] ${shot}\n${hiddenStray.map(line => `  - ${line}`).join('\n')}\n`);
  const lang = await page.evaluate(() => document.documentElement.lang);
  const findings = { ...bad, ...layout, ...(lang === cx.htmlLang ? {} : { htmlLang: [`${lang} != ${cx.htmlLang}`] }) };
  for (const [category, lines] of Object.entries(findings)) {
    // A persistent defect is reported at the first screen that shows it, not on every later one.
    const list = lines.filter(line => !cx.seen.has(`${category}|${line}`));
    list.forEach(line => cx.seen.add(`${category}|${line}`));
    if (!list.length) continue;
    appendFileSync(`${cx.dir}/findings.txt`, `## ${step} [${category}] ${shot}\n${list.map(line => `  - ${line}`).join('\n')}\n`);
    expect.soft(list, `${cx.id} / ${step} / ${category} / ${shot}`).toEqual([]);
  }
}
// The callout must show text in the active language (it resolves through t() when queued).
const calloutText = async (cx, step) => {
  const text = (await cx.page.locator('#event-callout').innerText()).trim();
  expect.soft(text.length, `${cx.id} ${step} callout has text`).toBeGreaterThan(0);
  expect.soft(CJK.test(text), `${cx.id} ${step} callout "${text}" language`).toBe(cx.locale === 'zh-TW');
  appendFileSync(`${cx.dir}/callouts.txt`, `${step}: ${text.replace(/\n/g, ' | ')}\n`);
};
const noErrors = cx => expect.soft(cx.errors, `${cx.id} page errors`).toEqual([]);
const dismissMusic = async page => { if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click(); };

for (const [vpName, viewport, hasTouch] of VIEWPORTS) for (const [locale, system, htmlLang] of LOCALES) {
  test.describe(`i18n flow ${locale} ${vpName}`, () => {
    test.use({ viewport, hasTouch, isMobile: hasTouch, locale: system, actionTimeout: 15000 });

    test('walk start, tracks, panels, race HUD, callouts, pause, results, history and a live switch', async ({ gameplayPage: page }) => {
      test.setTimeout(420000);
      const cx = makeContext(page, `${locale}-${vpName}`, locale, htmlLang);
      const pressed = async code => expect.soft(await page.locator(`.route-locales [data-locale="${code}"]`).getAttribute('aria-pressed'), `${cx.id} switch ${code}`).toBe(String(code === cx.locale));

      // Start screen, fresh profile: locked tracks show their unlock hints.
      await check(cx, 'start');
      await pressed('en'); await pressed('zh-TW');

      // Audio, controls and VFX panels.
      await page.locator('#settings-button').click();
      await check(cx, 'audio-panel');
      // Volume sliders and Mute all: the visible label and each slider's accessible name come from the active catalog.
      const L = CATALOGS[cx.locale];
      expect.soft(await page.locator('#settings-panel .audio-head > span').textContent(), `${cx.id} audio heading`).toBe(L['audio.head']);
      expect.soft(await page.locator('#mute-all > span').textContent(), `${cx.id} mute all`).toBe(L['audio.muteAll']);
      for (const kind of ['music', 'sfx']) {
        expect.soft(await page.locator(`[data-audio="${kind}"] > span`).textContent(), `${cx.id} ${kind} label`).toBe(L[`audio.${kind}`]);
        expect.soft(await page.locator(`[data-audio="${kind}"] + input[type="range"]`).getAttribute('aria-label'), `${cx.id} ${kind} slider name`).toBe(L[`audio.${kind}Volume`]);
      }
      await page.locator('#mute-all').click();
      expect.soft(await page.locator('#mute-all > span').textContent(), `${cx.id} unmute all`).toBe(L['audio.unmuteAll']);
      expect.soft(await page.locator('[data-audio="music"] + input[type="range"]').getAttribute('aria-valuetext'), `${cx.id} muted slider value`).toBe(L['audio.muted']);
      expect.soft(await page.locator('[data-audio="music"] > b').textContent(), `${cx.id} muted badge`).toBe(L['audio.off']);
      await check(cx, 'audio-panel-muted');
      await page.locator('#mute-all').click();
      await page.locator('#settings-button').click();
      await page.locator('#controls-button').click();
      await check(cx, 'controls-panel');
      await page.locator('#controls-panel').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await check(cx, 'controls-panel-bottom');
      await page.locator('#controls-button').click();
      if (await page.locator('#vfx-panel > summary').isVisible()) {
        await page.locator('#vfx-panel > summary').click();
        await check(cx, 'vfx-panel');
        await page.locator('.vfx-settings .custom-select button').first().click();
        await check(cx, 'vfx-select-open');
        await page.keyboard.press('Escape');
        await page.locator('.vfx-tuning summary').click();
        await check(cx, 'vfx-fine-tuning');
        await page.locator('#vfx-panel > summary').click();
      } else test.info().annotations.push({ type: 'note', description: `${cx.id}: VFX panel hidden at this viewport` });

      // Unlock every track so all ten route maps render, then walk them.
      await page.evaluate(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), Object.keys(RACE_TRACKS));
      await page.reload();
      await dismissMusic(page);
      await check(cx, 'tracks-unlocked');
      for (const [id] of Object.entries(RACE_TRACKS)) {
        await page.locator(`[data-track="${id}"]`).click();
        if (['taipei', 'cosmic'].includes(id)) await check(cx, `track-${id}`);
        else {
          const strings = await collectStrings(page, false);
          const hits = strings.filter(({ text }) => isRawKey(text) || (cx.locale === 'en' && CJK.test(text) && !text.includes('繁體中文')));
          expect.soft(hits, `${cx.id} track ${id}`).toEqual([]);
        }
      }
      await page.locator('[data-track="coast"]').click();

      // Garage.
      await page.locator('#garage-button').click();
      await check(cx, 'garage');
      await page.locator('[data-paint]').nth(2).click();
      await check(cx, 'garage-paint');
      await page.locator('#garage-close').click();

      // History with no runs yet.
      await page.locator('[data-open-history]').first().click();
      await check(cx, 'history-empty');
      await page.locator('#history-screen .custom-select button').first().click();
      await check(cx, 'history-select-open');
      await page.keyboard.press('Escape');
      await page.locator('#history-close').click();

      // Race: countdown, HUD, airflow, flight, callouts.
      await page.locator('#start-button').click();
      await check(cx, 'countdown');
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      await expect(page.locator('#countdown')).toBeHidden();
      await check(cx, 'race-hud', { hud: true });
      // The live route map's player marker tooltip must read like the leaderboard row (identity key stays YOU).
      expect.soft(await page.locator('#race-route-map [data-racer="YOU"] title').textContent(), `${cx.id} route-map player marker tooltip`).toBe(CATALOGS[cx.locale]['hud.you']);
      if (await page.locator('#airflow-toggle').isVisible()) {
        await page.locator('#airflow-toggle').click();
        await check(cx, 'race-hud-airflow', { hud: true });
      }
      await page.evaluate(() => { Object.assign(window.gameplay.race.player, { speed: 90 }); });
      await page.keyboard.down('Space');
      await page.waitForTimeout(700);
      await check(cx, 'race-hud-flight', { hud: true });
      await page.keyboard.up('Space');
      await page.evaluate(() => { window.gameplay.race.player.perfectLines++; });
      await expect(page.locator('#event-callout')).toBeVisible();
      await calloutText(cx, 'callout-perfect');
      await check(cx, 'callout-perfect', { hud: true, live: true });
      await page.waitForTimeout(1400);
      await page.evaluate(() => { const car = window.gameplay.race.player; car.nearMisses++; car.nearMiss = { time: window.gameplay.race.elapsed, combo: 3, charge: 0.2 }; });
      await expect(page.locator('#event-callout')).toBeVisible();
      await calloutText(cx, 'callout-near');
      await check(cx, 'callout-near', { hud: true, live: true });
      await page.waitForTimeout(1400);
      await page.evaluate(() => { const car = window.gameplay.race.player; car.nearMisses++; car.nearMiss = { time: window.gameplay.race.elapsed, combo: 4, charge: 37 }; });
      await expect(page.locator('#event-callout')).toBeVisible();
      await calloutText(cx, 'callout-near-charge');
      await check(cx, 'callout-near-charge', { hud: true, live: true });

      // Pause, resume, leave prompt.
      await page.locator('#pause-button').click();
      await expect(page.locator('#resume-button')).toBeVisible();
      await check(cx, 'paused');
      await page.locator('#resume-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      await page.locator('.brand').click();
      await expect(page.locator('#leave-screen')).toBeVisible();
      await check(cx, 'leave-prompt');
      await page.locator('#leave-keep').click();

      // Results.
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 80;
        Object.assign(race.player, { distance: race.length - 10, speed: 60 });
      });
      await expect(page.locator('#race-overlay')).toBeVisible();
      await expect(page.locator('#result-stats')).toBeVisible(); // the overlay content arrives after the finish wipe
      await expect(page.locator('#again-button')).toBeVisible();
      await check(cx, 'results');
      await page.locator('#again-button').scrollIntoViewIfNeeded();
      await check(cx, 'results-actions');

      // Back to the intro: history and awards with a saved run, then switch language live and re-check every screen with stale text in mind.
      await page.reload();
      await dismissMusic(page);
      await page.locator('[data-open-history]').first().click();
      await check(cx, 'history-with-run');
      await page.locator('#achievement-list').scrollIntoViewIfNeeded();
      await check(cx, 'awards');
      await page.locator('#history-close').click();
      await check(cx, 'full-dom', { all: true });

      const other = cx.locale === 'en' ? 'zh-TW' : 'en';
      await page.locator(`.route-locales [data-locale="${other}"]`).click();
      Object.assign(cx, { locale: other, htmlLang: other });
      await check(cx, `after-switch-to-${other}`);
      await page.locator('[data-open-history]').first().click();
      await check(cx, 'after-switch-history');
      await page.locator('#history-close').click();
      await page.locator('#garage-button').click();
      await check(cx, 'after-switch-garage');
      await page.locator('#garage-close').click();
      await pressed(other);
      noErrors(cx);
    });
  });
}

test.describe('language detection and persistence', () => {
  for (const [tag, expected] of [['zh-TW', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-CN', 'zh-TW'], ['fr-FR', 'en'], ['en-US', 'en']]) {
    test.describe(`system language ${tag}`, () => {
      test.use({ locale: tag });
      test(`resolves to ${expected} and never persists the detected value`, async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', expected);
        await expect(page.locator(`[data-locale="${expected}"]`)).toHaveAttribute('aria-pressed', 'true');
        expect(await page.evaluate(() => localStorage.getItem('skyline-rush-locale'))).toBeNull();
        const start = await page.locator('#start-button').innerText();
        expect(CJK.test(start)).toBe(expected === 'zh-TW');
        expect(CJK.test(await page.title())).toBe(expected === 'zh-TW');
      });
    });
  }

  for (const [languages, expected] of [[['en-US', 'zh-TW'], 'en'], [['zh-TW', 'en-US'], 'zh-TW']]) {
    test(`system order ${languages.join(',')} follows the first supported language: ${expected}`, async ({ page }) => {
      await page.addInitScript(languages => Object.defineProperty(navigator, 'languages', { get: () => languages }), languages);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', expected);
    });
  }

  test.describe('saved choice beats the system language and survives reload', () => {
    for (const [system, pick, other] of [['en-US', 'zh-TW', 'en'], ['zh-TW', 'en', 'zh-TW']]) {
      test.describe(`system ${system}`, () => {
        test.use({ locale: system });
        test(`click ${pick}, reload, still ${pick}`, async ({ page }) => {
          await page.goto('/');
          await expect(page.locator('html')).toHaveAttribute('lang', other);
          await page.locator(`[data-locale="${pick}"]`).click();
          await expect(page.locator('html')).toHaveAttribute('lang', pick);
          expect(await page.evaluate(() => localStorage.getItem('skyline-rush-locale'))).toBe(pick);
          await page.reload();
          await expect(page.locator('html')).toHaveAttribute('lang', pick);
          await expect(page.locator(`[data-locale="${pick}"]`)).toHaveAttribute('aria-pressed', 'true');
          expect(CJK.test(await page.title())).toBe(pick === 'zh-TW');
        });
      });
    }
    test.describe('unknown saved value', () => {
      test.use({ locale: 'zh-TW' });
      test('is ignored in favour of the system language', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('skyline-rush-locale', 'xx'));
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
      });
    });
  });
});

// Reads the real 2D sign canvases (one 512x96 road sign per section type + the 1024x128 finish banner) the world paints, without any hook in the app.
// Every sign.* catalog key is one canvas, so a new section sign (e.g. boost-tunnel) is counted without editing this file.
const SIGN_COUNT = Object.keys(CATALOGS.en).filter(key => key.startsWith('sign.')).length;
const signStats = page => page.evaluate(() => window.__signCanvases.map(canvas => {
  const { width, height } = canvas;
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
  let bright = 0, edge = 0, hash = 2166136261;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 180) { bright++; const x = (i / 4) % width; if (x < 10 || x >= width - 10) edge++; }
    hash = Math.imul(hash ^ (data[i] + data[i + 1] * 3 + data[i + 2] * 5 + data[i + 3] * 7), 16777619);
  }
  return { width, height, bright, edge, hash };
}));

for (const [locale, system] of LOCALES) test.describe(`road signs ${locale}`, () => {
  test.use({ locale: system });
  test('every sign canvas draws text, keeps it inside the frame, and repaints on a language switch', async ({ page }) => {
    await page.addInitScript(() => {
      window.__signCanvases = [];
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === '2d' && ((this.width === 512 && this.height === 96) || (this.width === 1024 && this.height === 128)) && !window.__signCanvases.includes(this)) window.__signCanvases.push(this);
        return original.call(this, type, ...rest);
      };
    });
    await page.goto('/');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    const dump = async tag => {
      mkdirSync(`${SHOT_DIR}/signs`, { recursive: true });
      const urls = await page.evaluate(() => window.__signCanvases.map(canvas => canvas.toDataURL('image/png')));
      urls.forEach((url, i) => writeFileSync(`${SHOT_DIR}/signs/${tag}-${i}.png`, Buffer.from(url.split(',')[1], 'base64')));
    };
    const before = await signStats(page);
    await dump(locale);
    expect(before.length).toBe(SIGN_COUNT);
    for (const [i, sign] of before.entries()) {
      expect.soft(sign.bright, `${locale} sign ${i} has text pixels`).toBeGreaterThan(150);
      expect.soft(sign.edge, `${locale} sign ${i} text touches the frame`).toBe(0);
    }
    const other = locale === 'en' ? 'zh-TW' : 'en';
    await page.locator(`[data-locale="${other}"]`).click();
    const after = await signStats(page);
    await dump(`${locale}-then-${other}`);
    for (const [i, sign] of after.entries()) {
      expect.soft(sign.bright, `${other} sign ${i} has text pixels`).toBeGreaterThan(150);
      expect.soft(sign.edge, `${other} sign ${i} text touches the frame`).toBe(0);
      expect.soft(sign.hash, `sign ${i} repainted after switching to ${other}`).not.toBe(before[i].hash);
    }
  });
});
