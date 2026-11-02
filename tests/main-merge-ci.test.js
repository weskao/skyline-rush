import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/check-main-merges.sh');
const zero = '0'.repeat(40);

// A repo whose main has a release root, plus develop/hotfix/feature branches mirrored to origin/* refs.
function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'main-merge-ci-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' }).stdout.trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'core.hooksPath', '/dev/null');
  git('commit', '-q', '--allow-empty', '-m', 'root');
  const commit = (branch, file) => {
    git('checkout', '-q', branch);
    writeFileSync(join(dir, file), file);
    git('add', file);
    git('commit', '-q', '-m', file);
    git('update-ref', `refs/remotes/origin/${branch}`, 'HEAD');
    git('checkout', '-q', 'main');
  };
  const check = (before, after = git('rev-parse', 'HEAD')) =>
    spawnSync(script, [before, after], { cwd: dir, encoding: 'utf8' });
  return { git, commit, check };
}

test('merges of develop and hotfix/* tips into main pass', (t) => {
  const { git, commit, check } = repo(t);
  const before = git('rev-parse', 'HEAD');
  git('branch', 'develop');
  git('branch', 'hotfix/crash');
  commit('develop', 'd.txt');
  commit('hotfix/crash', 'h.txt');
  git('merge', '-q', '--no-ff', '-m', 'merge develop', 'develop');
  git('merge', '-q', '--no-ff', '-m', 'merge hotfix', 'hotfix/crash');
  assert.equal(check(before).status, 0);
  assert.equal(check(zero).status, 0, 'a push that creates main has nothing to compare');
});

test('a feature branch merged into main fails, even one already in develop', (t) => {
  const { git, commit, check } = repo(t);
  const before = git('rev-parse', 'HEAD');
  git('branch', 'develop');
  git('branch', 'feature/x');
  commit('feature/x', 'f.txt');
  git('checkout', '-q', 'develop');
  git('merge', '-q', '--no-ff', '-m', 'feature into develop', 'feature/x');
  git('update-ref', 'refs/remotes/origin/develop', 'HEAD');
  git('checkout', '-q', 'main');
  git('merge', '-q', '--no-ff', '-m', 'feature into main', 'feature/x');
  const result = check(before);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /::error::merge .* feature into main brings in/);
});

test('git pull merging main into its own diverged history passes', (t) => {
  const { git, commit, check } = repo(t);
  git('branch', 'old');
  commit('main', 'remote.txt'); // what origin/main had: the push's `before`
  const before = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'old');
  writeFileSync(join(git('rev-parse', '--show-toplevel'), 'local.txt'), 'x');
  git('add', 'local.txt');
  git('commit', '-q', '-m', 'local');
  git('merge', '-q', '--no-ff', '-m', 'pull', 'main');
  assert.equal(check(before).status, 0);
});

test('CI runs the check on every push to main with full history', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const start = workflow.indexOf('\n  main-merge-source:\n');
  const job = workflow.slice(start, workflow.indexOf('\n  quality-gate:\n', start));
  assert.ok(start >= 0, 'main-merge-source job exists');
  assert.match(job, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /fetch-depth: 0/);
  assert.match(job, /scripts\/check-main-merges\.sh "\$\{\{ github\.event\.before \}\}" "\$\{\{ github\.sha \}\}"/);
  assert.match(workflow, /notify-telegram:\n    needs: \[[^\]]*main-merge-source/);
});
