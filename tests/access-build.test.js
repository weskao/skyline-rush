import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import productionConfig from '../vite.config.js';
import unlockedConfig from '../vite.unlocked.config.js';
import { availableTracks as devTracks, availablePaints as devPaints } from '../src/access/dev-unlocked.js';
import { availableTracks as prodTracks, availablePaints as prodPaints } from '../src/access/production.js';
import { RACE_TRACKS } from '../src/game.js';
import { PAINTS } from '../src/appearance.js';

test('local-only build exposes every track and paint without writing storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('storage inaccessible'); } });
  try {
    assert.deepEqual(devTracks(), Object.keys(RACE_TRACKS));
    assert.deepEqual(devPaints(), Object.keys(PAINTS));
    assert.deepEqual(prodTracks(), ['coast']);
    assert.deepEqual(prodPaints(0), ['pearl']);
    assert.deepEqual(prodPaints(9), Object.keys(PAINTS));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('normal Vite config resolves the production access module, unlocked config only serves', () => {
  assert.match(productionConfig.resolve.alias['@progression-access'], /access\/production\.js$/);
  assert.throws(() => unlockedConfig({ command: 'build', mode: 'production' }), /development-server only/);
  const cfg = unlockedConfig({ command: 'serve', mode: 'development' });
  assert.match(cfg.resolve.alias['@progression-access'], /access\/dev-unlocked\.js$/);
});

test('distribution entry never directly imports the development unlock module', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes("from '@progression-access'"));
  assert.ok(!main.includes('dev-unlocked'));
  const standardConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.ok(!standardConfig.includes('src/access/dev-unlocked.js'));
});
