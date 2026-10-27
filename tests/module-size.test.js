import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// One module, one reason to change: see .claude/rules/module-size.md.
const MAX_LINES = 400;
// Ratchet for files that predate the limit: never grow, and lower the number whenever one shrinks.
// A data catalog (translations) may stay large; everything else here is debt to split further.
const LEGACY_CEILINGS = {
  'src/main.js': 1318,
  'src/world.js': 1346,
  'src/game.js': 827,
  'src/world-tour-scene.js': 454,
  'src/CollectiblesGuide.vue': 477,
  'src/locales/ui.ts': 1227, // translation catalog: data, not logic
};
const SLACK = 25;

const root = new URL('..', import.meta.url).pathname;
const sources = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? sources(path) : /\.(js|ts|vue)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
});
const lineCounts = Object.fromEntries(sources(join(root, 'src')).map(path =>
  [relative(root, path), readFileSync(path, 'utf8').split('\n').length - 1]));

test(`source modules stay at or below ${MAX_LINES} lines unless listed as legacy debt`, () => {
  const oversized = Object.entries(lineCounts)
    .filter(([path, lines]) => lines > (LEGACY_CEILINGS[path] ?? MAX_LINES))
    .map(([path, lines]) => `${path}: ${lines} lines (limit ${LEGACY_CEILINGS[path] ?? MAX_LINES})`);
  assert.deepEqual(oversized, [], 'split by responsibility instead of raising a limit');
});

test('legacy ceilings ratchet down as files shrink and drop out once under the limit', () => {
  for (const [path, ceiling] of Object.entries(LEGACY_CEILINGS)) {
    assert.ok(path in lineCounts, `${path} no longer exists; remove its ceiling`);
    assert.ok(ceiling > MAX_LINES, `${path} fits the ${MAX_LINES}-line limit; remove its ceiling`);
    assert.ok(ceiling - lineCounts[path] <= SLACK, `${path} shrank to ${lineCounts[path]}; lower its ceiling from ${ceiling}`);
  }
});
