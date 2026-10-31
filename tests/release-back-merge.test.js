import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// After `/release` tags main, the `docs: release …` commit must reach develop (git flow back-merge).
const script = new URL('../scripts/release-back-merge.sh', import.meta.url).pathname;

function fixture(t, { develop = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'back-merge-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const git = (...args) => execFileSync('git', args, { cwd: work, encoding: 'utf8' }).trim();
  const commit = (file, text, message) => { writeFileSync(join(work, file), text); git('add', file); git('commit', '-qm', message); };
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  execFileSync('git', ['clone', '-q', origin, work], { stdio: 'ignore' });
  git('config', 'user.email', 'dev@example.com');
  git('config', 'user.name', 'Test Dev');
  commit('notes.txt', 'base\n', 'base');
  git('push', '-q', 'origin', 'main');
  if (develop) {
    git('switch', '-qc', 'develop');
    commit('feature.txt', 'feature\n', 'feature');
    git('push', '-q', 'origin', 'develop');
    git('switch', '-q', 'main');
  }
  commit('notes.txt', 'release 1.0.0\n', 'docs: release 1.0.0');
  git('push', '-q', 'origin', 'main');
  const run = () => spawnSync('bash', [script], { cwd: work, encoding: 'utf8' });
  return { git, commit, run };
}

test('back-merge pushes a merge of main into develop without switching the checkout', (t) => {
  const { git, run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  git('fetch', '-q', 'origin');
  assert.equal(git('rev-parse', '--abbrev-ref', 'HEAD'), 'main');
  git('merge-base', '--is-ancestor', 'origin/main', 'origin/develop');
  assert.equal(git('show', 'origin/develop:notes.txt'), 'release 1.0.0');
  assert.equal(git('show', 'origin/develop:feature.txt'), 'feature');
  assert.equal(git('log', '-1', '--format=%s', 'origin/develop'), "Merge branch 'main' into develop");
});

test('back-merge is a no-op when develop already contains main or does not exist', (t) => {
  const synced = fixture(t);
  assert.equal(synced.run().status, 0);
  const before = synced.git('rev-parse', 'origin/develop');
  assert.equal(synced.run().status, 0);
  synced.git('fetch', '-q', 'origin');
  assert.equal(synced.git('rev-parse', 'origin/develop'), before);

  const { run } = fixture(t, { develop: false });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no develop branch/);
});

test('a conflicting back-merge leaves develop untouched and prints the manual commands', (t) => {
  const { git, commit, run } = fixture(t);
  git('switch', '-q', 'develop');
  commit('notes.txt', 'develop edit\n', 'conflicting edit');
  git('push', '-q', 'origin', 'develop');
  const before = git('rev-parse', 'origin/develop');
  git('switch', '-q', 'main');
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /git merge --no-ff origin\/main/);
  git('fetch', '-q', 'origin');
  assert.equal(git('rev-parse', 'origin/develop'), before);
});
