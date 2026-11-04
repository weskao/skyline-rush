import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import productionConfig from '../vite.config.js';
import unlockedConfig from '../vite.unlocked.config.js';
import { availableTracks as devTracks, availablePaints as devPaints } from '../src/access/dev-unlocked.ts';
import { availableTracks as prodTracks, availablePaints as prodPaints } from '../src/access/production.ts';
import { RACE_TRACKS } from '../src/game.js';
import { PAINTS } from '../src/appearance.ts';

test('local-only build exposes every track and paint without writing storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('storage inaccessible'); } });
  try {
    assert.deepEqual(devTracks(), Object.keys(RACE_TRACKS));
    assert.deepEqual(devPaints(), Object.keys(PAINTS));
    assert.deepEqual(prodTracks(), ['coast']);
    assert.deepEqual(prodPaints(0), ['pearl']);
    assert.deepEqual(prodPaints(24), Object.keys(PAINTS));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('normal Vite config resolves the production access module, unlocked config only serves', () => {
  const standardConfig = productionConfig({ command: 'build', mode: 'production' });
  assert.match(standardConfig.resolve.alias['@progression-access'], /access\/production\.ts$/);
  assert.match(standardConfig.resolve.alias['#garage-skin-runtime'], /garage-skin-runtime-locked\.ts$/);
  assert.throws(() => unlockedConfig({ command: 'build', mode: 'production' }), /development-server only/);
  const cfg = unlockedConfig({ command: 'serve', mode: 'development' });
  assert.match(cfg.resolve.alias['@progression-access'], /access\/dev-unlocked\.ts$/);
});

test('distribution entry never directly imports the development unlock module', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes("from '@progression-access'"));
  assert.ok(!main.includes('dev-unlocked'));
  const standardConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.ok(!standardConfig.includes('src/access/dev-unlocked.js'));
});

test('all unlocked Make entrypoints use the same dev-only Vite access policy', () => {
  const make = readFileSync(new URL('../Makefile', import.meta.url), 'utf8');
  const recipe = name => {
    const lines = make.split('\n'), index = lines.findIndex(line => line.startsWith(name + ':'));
    assert.ok(index >= 0, 'missing Make target ' + name);
    const body = [lines[index]];
    for (let i = index + 1; i < lines.length && lines[i].startsWith('\t'); i++) body.push(lines[i]);
    return body.join('\n');
  };
  assert.match(recipe('dev-unlocked'), /--config vite\.unlocked\.config\.js/);
  assert.match(recipe('test-unlocked'), /^test-unlocked:\s*dev-unlocked\b/);
  assert.match(recipe('phone-unlocked'), /--config vite\.unlocked\.config\.js/);
  assert.match(recipe('dev-feature'), /scripts\/dev-feature\.mjs/);
  const cfg = unlockedConfig({ command: 'serve', mode: 'development' });
  assert.match(cfg.resolve.alias['@progression-access'], /access\/dev-unlocked\.ts$/);
  assert.throws(() => unlockedConfig({ command: 'build', mode: 'production' }), /development-server only/);
});
