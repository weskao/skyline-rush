import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// One module, one reason to change: see .claude/rules/module-size.md.
const MAX_LINES = 400;
// Ratchet for files that predate the limit: never grow, and lower the number whenever one shrinks.
// A data catalog (translations) may stay large; everything else here is debt to split further.
const LEGACY_CEILINGS = {
  'src/main.js': 677,
  'src/world.js': 1123,
  'src/game.js': 583,
  'src/world-tour-scene.js': 453,
  'src/CollectiblesGuide.vue': 477,
  'src/locales/ui.ts': 1145, // ratchet down after extracting tutorial strings; never raise this limit
};
const SLACK = 25;

const root = new URL('..', import.meta.url).pathname;
const sources = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? sources(path) : /\.(js|ts|vue)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
});
const lineCounts = Object.fromEntries(sources(join(root, 'src')).map(path =>
  [relative(root, path), readFileSync(path, 'utf8').split('\n').length - 1]));

const formatOversized = (path, lines, limit) =>
  `  File: ${path}\n  Current lines: ${lines}\n  Allowed lines: ${limit}\n  Exceeded by: ${lines - limit}`;

test('module-size errors name the source file, actual line count and allowed limit', () => {
  const message = formatOversized('src/world-tour-scene.js', 455, 453);
  assert.match(message, /File: src\/world-tour-scene\.js/);
  assert.match(message, /Current lines: 455/);
  assert.match(message, /Allowed lines: 453/);
  assert.match(message, /Exceeded by: 2/);
});

test(`source modules stay at or below ${MAX_LINES} lines unless listed as legacy debt`, () => {
  const oversized = Object.entries(lineCounts)
    .filter(([path, lines]) => lines > (LEGACY_CEILINGS[path] ?? MAX_LINES))
    .map(([path, lines]) => formatOversized(path, lines, LEGACY_CEILINGS[path] ?? MAX_LINES));
  assert.equal(oversized.length, 0, [
    'Module size limit exceeded:',
    ...oversized,
    'Failed test: tests/module-size.test.js',
    'Policy: .claude/rules/module-size.md',
    'Fix: split by responsibility; do not squeeze statements or raise a ceiling merely to pass CI.',
    'Recheck: node --test tests/module-size.test.js',
  ].join('\n'));
});

test('legacy ceilings ratchet down as files shrink and drop out once under the limit', () => {
  for (const [path, ceiling] of Object.entries(LEGACY_CEILINGS)) {
    assert.ok(path in lineCounts, `${path} no longer exists; remove its ceiling`);
    assert.ok(ceiling > MAX_LINES, `${path} fits the ${MAX_LINES}-line limit; remove its ceiling`);
    assert.ok(ceiling - lineCounts[path] <= SLACK,
      `File: ${path}; current: ${lineCounts[path]} lines; legacy ceiling: ${ceiling}. ` +
      `Lower its entry in tests/module-size.test.js; see .claude/rules/module-size.md`);
  }
});
