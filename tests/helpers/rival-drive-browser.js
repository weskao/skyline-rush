import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { RIVAL_CUE_RANGE } from '../../src/rival-cues.ts';

// Shared by tests/rival-drive-vfx-browser.spec.js (gate) and tests/rival-drive-vfx-evidence-browser.spec.js.
export const onTier = (page, quality) => page.addInitScript(quality => // after pausedRace's High seed: init scripts run on its goto
  localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality, preset: 'cinematic', enabled: true })), quality);

// BEFORE=<git ref>: the old module's body under the current module's Vite-resolved imports (the old file imports a subset of them).
export const serveBefore = async page => {
  if (!process.env.BEFORE) return;
  const old = ts.transpileModule(execFileSync('git', ['show', `${process.env.BEFORE}:src/rival-drive-vfx.ts`], { encoding: 'utf8' }),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  await page.route(url => url.pathname === '/src/rival-drive-vfx.ts', async route => {
    const response = await route.fetch(), imports = (await response.text()).split('\n').filter(line => line.startsWith('import '));
    await route.fulfill({ response, body: [...imports, ...old.split('\n').filter(line => !line.startsWith('import '))].join('\n') });
  });
};

// Rival 0 on BOOST and rival 1 on NITRO just ahead of the paused player, rival 2 on BOOST beyond the cue range,
// the rest out of view; resolves with each rival's flame after two drawn frames.
export const stage = (page, allBoost = false) => page.evaluate(async ([range, allBoost]) => {
  const { player, rivals } = window.gameplay.race;
  rivals.forEach((rival, i) => {
    const near = allBoost || i < 2;
    rival.distance = player.distance + (near ? 16 + i * 6 : i === 2 ? range + 40 : 5000);
    rival.x = allBoost ? (i % 3 - 1) * 3 : i === 0 ? -2.6 : 2.6;
    rival.boosting = allBoost || i !== 1; rival.nitroTime = !allBoost && i === 1 ? 5 : 0;
  });
  for (let f = 0; f < 3; f++) await new Promise(requestAnimationFrame);
  // Race order, not scene order: the fleet deals each race's rivals a shuffled chassis (src/rival-fleet.js).
  return window.gameScene.rivals.slice(0, rivals.length).map(o => {
    const { flame, trail } = o.userData.driveCue;
    return { flame: flame.visible, scale: flame.scale.x, opacity: flame.material.opacity, trail: trail.visible };
  });
}, [RIVAL_CUE_RANGE, allBoost]);
