import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const hooks = resolve('.githooks');

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'main-merge-guard-'));
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ALLOW_MAIN_MERGE: '' } });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'core.hooksPath', hooks);
  git('commit', '-q', '--allow-empty', '-m', 'root');
  const branch = (name, file) => {
    git('checkout', '-q', '-b', name, 'main');
    writeFileSync(join(dir, file), name);
    git('add', file);
    git('commit', '-q', '-m', name);
    git('checkout', '-q', 'main');
  };
  return { dir, git, branch };
}

test('main accepts --no-ff merges from develop and hotfix/*', (t) => {
  const { dir, git, branch } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  branch('develop', 'a.txt');
  branch('hotfix/crash', 'b.txt');
  assert.equal(git('merge', '--no-ff', '-q', 'develop').status, 0);
  assert.equal(git('merge', '--no-ff', '-q', 'hotfix/crash').status, 0);
});

test('main rejects merges from other branches, clean or conflicted', (t) => {
  const { dir, git, branch } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  branch('feature/x', 'a.txt');
  const clean = git('merge', '--no-ff', '-q', 'feature/x');
  assert.notEqual(clean.status, 0);
  assert.match(clean.stderr, /only develop or hotfix/);
  git('merge', '--abort');

  writeFileSync(join(dir, 'a.txt'), 'main');
  git('add', 'a.txt');
  git('commit', '-q', '-m', 'main edit');
  assert.notEqual(git('merge', '-q', 'feature/x').status, 0); // conflict
  writeFileSync(join(dir, 'a.txt'), 'resolved');
  git('add', 'a.txt');
  assert.notEqual(git('commit', '-q', '--no-edit').status, 0);
});

test('merges into other branches are not restricted', (t) => {
  const { dir, git, branch } = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  branch('feature/x', 'a.txt');
  git('checkout', '-q', '-b', 'develop');
  assert.equal(git('merge', '--no-ff', '-q', 'feature/x').status, 0);
});
