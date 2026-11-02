import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listedTests, parseLog, partition } from '../scripts/ci-shards.mjs';

test('partition puts every test in exactly one shard and balances by duration', () => {
  // Contiguous slicing would put both 100s tests in shard 1; packing splits them.
  const durations = { a: 100, b: 100, c: 10, d: 10, e: 10, f: 10 };
  const tests = ['a', 'b', 'c', 'd', 'e', 'f', 'new', 'a'];
  const bins = partition(tests, durations, 2);
  assert.deepEqual(bins.flatMap((b) => b.tests).sort(), ['a', 'b', 'c', 'd', 'e', 'f', 'new']);
  assert.deepEqual(bins.map((b) => b.seconds), [130, 120], 'an unknown test costs the median (10s)');
  assert.deepEqual(partition(tests, durations, 2), bins, 'every shard computes the same plan');
});

test('listedTests yields the testDir-relative "file › describe › title" form --test-list matches', () => {
  const report = { suites: [{ title: 'x.spec.js', specs: [{ file: 'x.spec.js', title: 'top' }],
    suites: [{ title: 'group', specs: [{ file: 'x.spec.js', title: 'inner' }] }] }] };
  assert.deepEqual(listedTests(report), ['x.spec.js › top', 'x.spec.js › group › inner']);
  assert.throws(() => listedTests({ errors: [{ message: 'boom' }], suites: [] }), /boom/);
});

test('parseLog reads list-reporter durations from a CI log', () => {
  const log = [
    'browser-tests (1)\tRun\t2026-10-30T21:50:53.8Z   ✓   1 tests/a-browser.spec.js:20:3 › grp › one (23.5s)',
    'browser-tests (1)\tRun\t2026-10-30T21:50:54.8Z   ✘   2 tests/a-browser.spec.js:30:3 › two (1.5m)',
    'browser-tests (1)\tRun\t2026-10-30T21:50:55.8Z   ✓   3 tests/a-browser.spec.js:40:3 › three (250ms)',
  ].join('\n');
  assert.deepEqual(parseLog(log), { 'a-browser.spec.js › grp › one': 23.5, 'a-browser.spec.js › two': 90, 'a-browser.spec.js › three': 0.3 });
});

test('both Playwright CI suites shard by measured duration, not contiguous slices', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(workflow, /--shard=/);
  for (const config of ['playwright.config.js', 'playwright.world-tour.config.js']) {
    assert.match(workflow, new RegExp(`ci-shards\\.mjs plan ${config.replace(/\./g, '\\.')} \\$\\{\\{ matrix\\.shard \\}\\} \\$\\{\\{ strategy\\.job-total \\}\\}`));
  }
  const durations = JSON.parse(readFileSync(new URL('./ci-durations.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(durations).length > 500, 'durations table must be populated from a real CI run');
});
