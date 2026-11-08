import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('../.githooks/pre-push', import.meta.url));

test('pre-push blocks a module-size failure even when the layout gate is skipped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skyline-pre-push-'));
  try {
    const fakeNode = join(dir, 'node');
    const env = { ...process.env, PATH: `${dir}:${process.env.PATH}`, SKIP_LAYOUT_GATE: '1' };
    writeFileSync(fakeNode, '#!/bin/sh\necho "fake module size failure" >&2\nexit 12\n', { mode: 0o755 });
    const failed = spawnSync('sh', [hook], { env, input: '', encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /tests\/module-size\.test\.js/);
    assert.match(failed.stderr, /\.claude\/rules\/module-size\.md/);
    assert.match(failed.stderr, /BLOCKED/);

    writeFileSync(fakeNode, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    const passed = spawnSync('sh', [hook], { env, input: '', encoding: 'utf8' });
    assert.equal(passed.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
