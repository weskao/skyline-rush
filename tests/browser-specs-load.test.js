// A spec that fails to load (a merge left a duplicate import) breaks CI's shard planner, so every browser
// shard goes red; `npm test` runs on pre-push, the browser suite does not (.claude/rules/browser-test-stability.md).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('every browser spec loads in the Playwright test list', () => {
  const { status, stdout, stderr } = spawnSync(
    'npx', ['playwright', 'test', '--config=playwright.config.js', '--list'],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  );
  assert.equal(status, 0, `playwright --list failed:\n${stderr || stdout.slice(-4000)}`);
});
