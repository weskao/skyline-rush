import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = args => spawnSync(process.execPath,['scripts/check-track-lifecycle.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});

test('--stage identifies the next acceptance gates', () => {
  const result=run(['--stage','frostbite-canyon']);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/frostbite-canyon: playable; next gates: R1/);
});

test('--release refuses a preview without user approval and does not stamp it', () => {
  const result=run(['--release','dune-tempest']);
  assert.equal(result.status,1,result.stderr);
  assert.match(result.stdout,/FAIL dune-tempest RELEASE/);
});
