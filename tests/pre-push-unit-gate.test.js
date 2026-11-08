import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 2026-11-09: a commit of another session's RED tests (tracks never registered) was pushed and CI went red with 15
// failures. The pre-push hook now runs `npm test` whenever a pushed range touches code or tests.
const hook = new URL('../.githooks/pre-push', import.meta.url).pathname;

function push(changedFile, npmExit) {
  const repo = mkdtempSync(join(tmpdir(), 'pre-push-')), bin = join(repo, '.bin'), log = join(repo, 'npm.log');
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(repo, 'README.md'), 'base\n');
  git('add', '.');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD');
  mkdirSync(join(repo, changedFile, '..'), { recursive: true });
  writeFileSync(join(repo, changedFile), 'change\n');
  git('add', '.');
  git('commit', '-qm', 'change');
  const head = git('rev-parse', 'HEAD');
  mkdirSync(bin);
  // node stands in for the module-size check; npm records what it was asked to run.
  writeFileSync(join(bin, 'node'), '#!/bin/sh\nexit 0\n');
  writeFileSync(join(bin, 'npm'), `#!/bin/sh\necho "$*" >> "${log}"\nexit ${npmExit}\n`);
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'npm'), 0o755);
  copyFileSync(hook, join(repo, 'pre-push'));
  const run = spawnSync('sh', ['pre-push', 'origin', 'url'], {
    cwd: repo, encoding: 'utf8', input: `refs/heads/f ${head} refs/heads/f ${base}\n`,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, SKIP_LAYOUT_GATE: '' },
  });
  let calls = '';
  try { calls = readFileSync(log, 'utf8'); } catch { /* npm never ran */ }
  return { status: run.status, calls };
}

test('pre-push blocks a push whose code change fails the unit tests', () => {
  const { status, calls } = push('src/feature.ts', 1);
  assert.match(calls, /^test$/m);
  assert.notEqual(status, 0);
});

test('pre-push lets a push through when the unit tests pass', () => {
  for (const file of ['src/feature.ts', 'tests/feature.test.js', 'package.json']) {
    const { status, calls } = push(file, 0);
    assert.match(calls, /^test$/m, file);
    assert.equal(status, 0, file);
  }
});

test('pre-push skips the unit tests for a docs-only push', () => {
  const { status, calls } = push('docs/note.md', 1);
  assert.doesNotMatch(calls, /^test$/m);
  assert.equal(status, 0);
});
