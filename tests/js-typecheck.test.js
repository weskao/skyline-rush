import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Test the real compiler, not an inferred source-code regex. These are both
// security rails for incremental checkJs migration.
const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));

function tsc(project) {
  return spawnSync(process.execPath, [compiler, '--noEmit', '--project', project], { encoding: 'utf8' });
}

test('checked JavaScript boundary compiles with no diagnostics', () => {
  const result = tsc('jsconfig.json');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('shared race/track/player JSDoc types reject invalid fixtures', () => {
  const result = tsc('tests/type-fixtures/tsconfig.json');
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stdout, /TS2322/);
  assert.match(result.stdout, /invalid\.js/);
});
