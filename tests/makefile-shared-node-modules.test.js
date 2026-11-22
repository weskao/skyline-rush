import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, utimesSync, lstatSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const makefile = resolve('Makefile');

// A worktree whose node_modules links to the main checkout's tree, with a freshly checked-out lockfile.
function sharedWorktree(lock) {
  const root = mkdtempSync(join(tmpdir(), 'mk-shared-nm-'));
  const main = join(root, 'main');
  const wt = join(root, 'wt');
  mkdirSync(join(main, 'node_modules'), { recursive: true });
  mkdirSync(wt);
  writeFileSync(join(wt, 'package.json'), '{}');
  writeFileSync(join(wt, 'pnpm-workspace.yaml'), 'packages:\n  - .\n');
  writeFileSync(join(main, 'pnpm-lock.yaml'), '{"main":1}');
  writeFileSync(join(wt, 'pnpm-lock.yaml'), lock);
  symlinkSync(join(main, 'node_modules'), join(wt, 'node_modules'));
  const old = new Date(Date.now() - 3600_000);
  utimesSync(join(main, 'node_modules'), old, old); // checkout made the lockfile newer
  execFileSync('git', ['init', '-q'], { cwd: wt, env: { ...process.env, GIT_DIR: undefined } });
  return { root, wt };
}

function makeNodeModules(cwd) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  // PNPM=false: any pnpm install attempt fails the target.
  return spawnSync('make', ['-f', makefile, 'node_modules', 'PNPM=false'], { cwd, env, encoding: 'utf8' });
}

test('make node_modules keeps a shared node_modules link when the lockfile matches', () => {
  const { root, wt } = sharedWorktree('{"main":1}');
  try {
    const run = makeNodeModules(wt);
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.ok(lstatSync(join(wt, 'node_modules')).isSymbolicLink());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('make node_modules still installs when a linked worktree has a different lockfile', () => {
  const { root, wt } = sharedWorktree('{"wt":2}');
  try {
    assert.notEqual(makeNodeModules(wt).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
