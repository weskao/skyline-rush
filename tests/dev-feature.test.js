import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureSlug } from '../scripts/dev-feature.mjs';

const USAGE = /Usage: make dev-feature <name>\nExample: make dev-feature world-tour-landmark-boost-polish/;
const root = path.resolve(import.meta.dirname, '..');
const script = path.join(root, 'scripts/dev-feature.mjs');

test('feature slug accepts a branch suffix and a feature/ prefix', () => {
  assert.equal(featureSlug('world-tour-landmark-boost-polish'), 'world-tour-landmark-boost-polish');
  assert.equal(featureSlug(' feature/world-tour-landmark-boost-polish '), 'world-tour-landmark-boost-polish');
});

test('feature slug rejects empty names and path escapes', () => {
  for (const bad of ['', '   ', '.', '..', '../etc', 'feature/../etc', 'a/b', 'name with space']) {
    assert.throws(() => featureSlug(bad), USAGE);
  }
});

test('cli takes one positional name and does not read FEATURE', () => {
  const cases = [[], ['../etc', 'extra'], ['../etc']];
  for (const args of cases) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, FEATURE: 'world-tour-landmark-boost-polish' },
      timeout: 3000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, USAGE);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /FETCH_HEAD|Reusing /);
  }
});
