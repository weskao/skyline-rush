import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const invoke = args => spawnSync(process.execPath,['scripts/check-track-lifecycle.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});

test('the complete repository satisfies all declared lifecycle gates', () => {
  const run=invoke([]);
  assert.equal(run.status,0,run.stderr+'\n'+run.stdout);
  assert.doesNotMatch(run.stdout,/^FAIL\b/m);
});

test('--stage reports Frostbite as playable and lists missing R evidence', () => {
  const run=invoke(['--stage','frostbite-canyon']);
  assert.equal(run.status,0,run.stderr+'\n'+run.stdout);
  assert.match(run.stdout,/frostbite-canyon: playable/);
  assert.match(run.stdout,/R1/);
});

test('release check cannot stamp an unapproved preview', () => {
  const path=new URL('../docs/track-lifecycle/dune-tempest.md',import.meta.url);
  const before=readFileSync(path,'utf8');
  const run=invoke(['--release','dune-tempest']);
  assert.equal(run.status,1,run.stderr+'\n'+run.stdout);
  assert.match(run.stdout,/FAIL dune-tempest RELEASE/);
  assert.equal(readFileSync(path,'utf8'),before);
});
