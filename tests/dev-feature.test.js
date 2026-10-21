import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureSlug } from '../scripts/dev-feature.mjs';

test('feature slug accepts a branch suffix and a feature/ prefix', () => {
  assert.equal(featureSlug('world-tour-landmark-boost-polish'), 'world-tour-landmark-boost-polish');
  assert.equal(featureSlug(' feature/world-tour-landmark-boost-polish '), 'world-tour-landmark-boost-polish');
});

test('feature slug rejects empty names and path escapes', () => {
  for (const bad of ['', '   ', '.', '..', '../etc', 'feature/../etc', 'a/b', 'name with space']) {
    assert.throws(() => featureSlug(bad), /Usage: make dev-feature/);
  }
});
