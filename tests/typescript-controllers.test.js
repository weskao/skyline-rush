import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('event-driven Guide and Controls controllers use typed modules without duplicate JS copies', () => {
  for (const name of ['guide-ui', 'controls-panels-ui']) {
    const typed = new URL('../src/' + name + '.ts', import.meta.url);
    const old = new URL('../src/' + name + '.js', import.meta.url);
    assert.ok(existsSync(typed), name + ' must be a TypeScript controller');
    assert.equal(existsSync(old), false, name + ' must not keep a separate JS controller');
    assert.match(readFileSync(typed, 'utf8'), /export function setup/);
  }
});
