import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureSlug, isWorktreeUnlockedAlias, assertUpcomingEntryGuard } from '../scripts/dev-feature.mjs';

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

test('feature server accepts only its own TypeScript dev-unlocked module', () => {
  const worktree = path.join(root, '.claude', 'worktrees', 'test-preview');
  assert.equal(isWorktreeUnlockedAlias(path.join(worktree, 'src', 'access', 'dev-unlocked.ts'), worktree), true);
  assert.equal(isWorktreeUnlockedAlias(path.join(worktree, 'src', 'access', 'dev-unlocked.js'), worktree), false);
  assert.equal(isWorktreeUnlockedAlias(path.join(root, 'src', 'access', 'dev-unlocked.ts'), worktree), false);
  assert.equal(isWorktreeUnlockedAlias('src/access/dev-unlocked.ts', worktree), false);
});

test('feature server rejects stale runtime-only entry but allows preview-only branches', () => {
  assert.throws(() => assertUpcomingEntryGuard('export const isUpcomingEnterable = id => raceTrack(id) != null;'),
    /lacks readiness approval/);
  assert.doesNotThrow(() => assertUpcomingEntryGuard('export const availableTracks = () => [];'));
  assert.doesNotThrow(() => assertUpcomingEntryGuard("import { upcomingReadiness } from '../upcoming-tracks.ts'; export const isUpcomingEnterable = id => upcomingReadiness(id) === 'playable';"));
});
