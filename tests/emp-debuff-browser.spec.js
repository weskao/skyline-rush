import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// The EMP HUD (user 2026-11-21, reference sheet): golden edge lightning around a clear centre, an angular
// technical-glass card whose title holds one line, a gold sweep along the speed dial. Nothing strobes; reduced
// motion and disabled VFX hold everything still.

const open = async (page, gameplayURL, locale = 'zh-TW') => {
  await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=${locale}`);
  await page.waitForFunction(() => !!window.debuffHud);
};
const hitEmp = page => page.evaluate(() => window.debuffHud.hit('emp', 230));
const advance = (page, seconds) => page.evaluate(s => {
  const { race, update } = window.debuffHud;
  race.elapsed += s;
  update();
}, seconds);
const running = (page, selector) => page.evaluate(sel => [...document.querySelectorAll(sel)]
  .flatMap(node => node.getAnimations({ subtree: true })).filter(a => a.playState === 'running' && a.animationName).map(a => a.animationName), selector);

for (const [name, width, height, locale] of [['desktop', 1440, 900, 'zh-TW'], ['portrait', 390, 844, 'zh-TW'], ['landscape', 844, 390, 'en']]) {
  test(`the EMP card title holds one line beside its countdown on ${name}`, async ({ page, gameplayURL }) => {
    await page.setViewportSize({ width, height });
    await open(page, gameplayURL, locale);
    await hitEmp(page);
    const card = page.locator('#race-player-hit-center [data-debuff="emp"]');
    await expect(card).toBeVisible();
    const box = await card.evaluate(node => {
      const title = node.querySelector('strong'), time = node.querySelector('time').getBoundingClientRect();
      const lines = new Set([...(() => { const r = document.createRange(); r.selectNodeContents(title); return r.getClientRects(); })()].map(r => Math.round(r.top)));
      const rect = title.getBoundingClientRect(), card = node.getBoundingClientRect();
      return { lines: lines.size, clear: rect.right <= time.left + 0.5, width: card.width, height: card.height };
    });
    expect(box.lines).toBe(1);
    expect(box.clear).toBe(true);
    if (name === 'portrait') expect(box.width <= 190 && box.height <= 48).toBe(true);
  });
}

test('EMP edge lightning draws in, keeps the centre clear, glitches only on impact and fades in recovery', async ({ page, gameplayURL }) => {
  await open(page, gameplayURL);
  await hitEmp(page);
  const layer = page.locator('#player-hit-screen [data-hit-layer="emp"]');
  await expect(layer).toHaveAttribute('data-phase', 'impact');
  expect(await layer.locator('.emp-screen path').count()).toBeGreaterThan(20);
  expect(await running(page, '#player-hit-screen [data-hit-layer="emp"]')).toEqual(expect.arrayContaining([expect.stringMatching(/^emp-glitch-hit/)]));
  // Edge only: nothing lit in the middle of the view.
  expect(await page.evaluate(() => [...document.querySelectorAll('#player-hit-screen [data-hit-layer="emp"] path')].every(path => {
    const r = path.getBoundingClientRect(), cx = innerWidth / 2, cy = innerHeight / 2;
    return r.right < cx - innerWidth * .2 || r.left > cx + innerWidth * .2 || r.bottom < cy - innerHeight * .3 || r.top > cy + innerHeight * .3;
  }))).toBe(true);
  // The yellow wash is gone: the shared edge gradient is thin and faint.
  const wash = await page.locator('#player-hit-screen').evaluate(node => getComputedStyle(node).backgroundImage);
  expect(wash).toContain('252, 214, 80');
  expect(wash).not.toContain('radial-gradient');

  const mark = await layer.locator('.emp-screen').evaluate(node => { node.dataset.mark = '1'; return node.dataset.mark; });
  expect(mark).toBe('1');
  await advance(page, .5);
  await expect(layer).toHaveAttribute('data-phase', 'active');
  expect(await running(page, '#player-hit-screen [data-hit-layer="emp"]')).not.toEqual(expect.arrayContaining([expect.stringMatching(/^emp-glitch-hit/)]));
  await hitEmp(page); // hit again: the impact replays from the start
  await expect(layer).toHaveAttribute('data-phase', 'impact');
  await expect(layer.locator('.emp-screen')).not.toHaveAttribute('data-mark', '1');

  await page.evaluate(() => { const { race, update } = window.debuffHud; race.elapsed = race.player.empUntil - .2; update(); });
  await expect(layer).toHaveAttribute('data-phase', 'recovery');
  await expect.poll(() => layer.locator('.emp-screen').evaluate(node => Number(getComputedStyle(node).opacity))).toBeLessThan(.2);
  await expect(page.locator('.speedometer .speed-hit-arc')).toHaveCSS('opacity', '0');
});

test('the EMP card traces its border and the speed dial sweeps gold; reduced motion and disabled VFX hold still', async ({ page, gameplayURL }) => {
  await open(page, gameplayURL);
  await hitEmp(page);
  await advance(page, .5);
  const arc = page.locator('.speedometer[data-debuff="emp"] .speed-hit-arc');
  await expect(arc).toHaveCSS('opacity', '1');
  expect(await running(page, '.speedometer')).toEqual(expect.arrayContaining([expect.stringMatching(/^emp-speed-sweep/)]));
  expect(await running(page, '#race-player-hit-center [data-debuff="emp"]')).toEqual(expect.arrayContaining([expect.stringMatching(/^emp-trace/)]));
  expect(await page.locator('#race-player-hit-center [data-debuff="emp"] .emp-panel-decor').evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
  const scope = '#player-hit-screen, #race-player-hit-center, .speedometer';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect((await running(page, scope)).filter(name => name.startsWith('emp-'))).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect((await running(page, scope)).filter(name => name.startsWith('emp-')).length).toBeGreaterThan(0);
  await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });
  expect((await running(page, scope)).filter(name => name.startsWith('emp-'))).toEqual([]);
  await expect(arc).toHaveCSS('opacity', '1'); // still lit, just still
});
