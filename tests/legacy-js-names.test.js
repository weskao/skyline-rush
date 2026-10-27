import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The plain-JS engine islands are not type-checked, so a refactor that removes a function but
// leaves a caller only fails at runtime (an audio slider once threw on every drag step).
// Compile them loosely and fail only on unresolved identifiers.
const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
const project = fileURLToPath(new URL('./type-fixtures/tsconfig.legacy-names.json', import.meta.url));

test('every identifier used in src/**/*.js resolves to a definition or import', () => {
  const { stdout, stderr } = spawnSync(process.execPath, [compiler, '--noEmit', '--project', project], { encoding: 'utf8' });
  const unresolved = (stdout + stderr).split('\n').filter(line => /error TS(2304|2552)/.test(line));
  assert.deepEqual(unresolved, []);
});
