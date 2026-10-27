import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('Garage and Audio controllers are native TypeScript with no JS duplicates', () => {
  for (const name of ['garage-ui', 'audio-ui']) {
    assert.ok(existsSync(new URL('../src/' + name + '.ts', import.meta.url)), name + ' must have typed app interfaces');
    assert.equal(existsSync(new URL('../src/' + name + '.js', import.meta.url)), false);
  }
});
