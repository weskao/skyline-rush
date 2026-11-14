// THROWAWAY diagnosis (never committed): which plume part whites out the car's rear.
//   PLUME_DIAG=1 VIEWPORT=landscape [QUALITY=low] npx playwright test tests/zz-plume-diag-browser.spec.js
import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

const VIEW = process.env.VIEWPORT ?? 'landscape', QUALITY = process.env.QUALITY ?? 'high', MODE = process.env.MODE ?? 'nitro';
const VIEWPORTS = {
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
test.skip(!process.env.PLUME_DIAG, 'run with PLUME_DIAG=1');
test.use({ ...VIEWPORTS[VIEW] });

test(`diag ${VIEW} ${QUALITY} ${MODE}`, async ({ gameplayPage: page }) => {
  test.setTimeout(180000);
  const OUT = `docs/designs/3d-pipeline/audits/sprint-plume/diag-${process.env.LABEL ?? 'x'}-${VIEW}-${QUALITY}-${MODE}${process.env.HERO_CAR ? `-${process.env.HERO_CAR}` : ''}`;
  fs.mkdirSync(OUT, { recursive: true });
  await page.evaluate(([quality]) => {
    for (const [key, value] of [['guide-seen', '1'], ['whats-new-seen-v1', '999.0.0'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality, enabled: true, comfortable: false }));
  }, [QUALITY]);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: 20000 });
  const fields = MODE === 'nitro' ? { speed: 118, nitroTime: 30 } : { speed: 88, miniBoost: 3 };
  const hold = seconds => page.evaluate(async ([fields, seconds]) => {
    const race = window.gameplay.race, player = race.player, until = race.elapsed + seconds;
    while (race.elapsed < until) { Object.assign(player, { x: 0 }, fields); player.effects.ghost = 5; await new Promise(requestAnimationFrame); }
  }, [fields, seconds]);
  await page.keyboard.down('w');
  await hold(2);
  // Pause so every variant shows the same frame.
  await page.addStyleTag({ content: '*{visibility:hidden!important;backdrop-filter:none!important}canvas{visibility:visible!important}' });
  const parts = { jets: n => n.startsWith('Cold gas nozzle'), core: n => n === 'Sprint plume core', flare: n => n === 'Sprint nozzle flare', glow: n => n === 'Sprint road glow' };
  const show = only => page.evaluate(([only]) => {
    const rear = window.gameScene.player.getObjectByName('Rear ports');
    for (const part of rear.children) if (part.material) part.material.visible = only === 'all' || only === 'none' ? only === 'all' : part.name.startsWith(only) || part.name === only;
    return rear.children.map(p => `${p.name}:${p.visible}`);
  }, [only, Object.keys(parts)]);
  const state = {};
  for (const [variant, name] of [['all', 'all'], ['none', 'none'], ['jets', 'Cold gas nozzle'], ['core', 'Sprint plume core'], ['flare', 'Sprint nozzle flare'], ['glow', 'Sprint road glow']]) {
    state[variant] = await show(name);
    await hold(0.6);
    await page.screenshot({ path: `${OUT}/${variant}.png` });
  }
  state.uniforms = await page.evaluate(() => {
    const rear = window.gameScene.player.getObjectByName('Rear ports'), out = {};
    for (const part of rear.children) if (part.material?.uniforms) out[part.name] = Object.fromEntries(Object.entries(part.material.uniforms).filter(([, u]) => typeof u.value === 'number').map(([k, u]) => [k, +u.value.toFixed(3)]));
    return out;
  });
  fs.writeFileSync(`${OUT}/state.json`, JSON.stringify(state, null, 2));
});
