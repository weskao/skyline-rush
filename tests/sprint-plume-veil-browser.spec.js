import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { installPlumeProbes } from './helpers/plume-probe.js';

// Trap (2026-11-14, .claude/rules/sprint-plume.md): the fat jet carried the hot core's HDR gain over its whole width.
// Paused, the frame read well; racing, the NITRO bloom boost spread it into a lavender wash over the car's rear on a
// landscape phone, and the four jets merged into one blob. The same live frame is drawn without and with the exhaust;
// the car's rear face above the nozzles must stay close to its bare colour on every selectable car.
const VEIL = 0; // placeholder: measured below
test.use({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

for (const car of ['roadster', 'crimson-gt']) test(`NITRO on High leaves the ${car}'s rear readable on a landscape phone`, async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(car => {
    localStorage.setItem('skyline-rush-car', JSON.stringify(car));
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'high', enabled: true, comfortable: false }));
  }, car);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  if (car === 'crimson-gt') await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
  await installPlumeProbes(page);
  await page.keyboard.down('w');
  const contrast = await page.evaluate(async () => {
    const race = window.gameplay.race, player = race.player, until = race.elapsed + 1.5;
    while (race.elapsed < until) { Object.assign(player, { x: 0, speed: 118, nitroTime: 30 }); player.effects.ghost = 5; await new Promise(requestAnimationFrame); }
    return window.plumeContrast();
  });
  const parts = {};
  for (const only of ['Cold gas nozzle', 'Sprint plume core', 'Sprint nozzle flare', 'Sprint road glow', 'NITRO trail', 'Void', 'Thruster glow', 'Nozzle heat']) parts[only] = await page.evaluate(async only => {
    const rear = window.gameScene.player.getObjectByName('Rear ports');
    for (const part of rear.children) if (part.material) part.material.visible = part.name.startsWith(only);
    const r = await window.plumeContrast();
    for (const part of rear.children) if (part.material) part.material.visible = true;
    return r.veil;
  }, only);
  parts.oldThin = await page.evaluate(async () => {
    const rear = window.gameScene.player.getObjectByName('Rear ports'), jets = rear.children.filter(p => p.name.startsWith('Cold gas'));
    for (const part of rear.children) if (part.material) part.material.visible = part.name.startsWith('Cold gas');
    const update = window.gameScene.composer.render; window.gameScene.composer.render = function (...a) { for (const j of jets) j.material.uniforms.thick.value = 0; return update.apply(this, a); };
    await new Promise(requestAnimationFrame);
    const r = await window.plumeContrast();
    window.gameScene.composer.render = update;
    for (const part of rear.children) if (part.material) part.material.visible = true;
    return r.veil;
  });
  console.log('PARTS', car, JSON.stringify(parts), await page.evaluate(() => window.gameScene.player.getObjectByName('Rear ports').children.map(c => c.name).join('|')));
  await page.keyboard.up('w');
  test.info().annotations.push({ type: 'plume', description: JSON.stringify(contrast) });
  expect(contrast.vsRoad, 'the plume still stands off the road').toBeGreaterThanOrEqual(40);
  expect(contrast.veil, `the exhaust moves the rear face from ${contrast.rearBare} to ${contrast.rear}`).toBeLessThanOrEqual(VEIL);
  expect(errors).toEqual([]);
});
