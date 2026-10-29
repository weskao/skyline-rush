import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('single canonical game-to-Vue structural type contract has no duplicated JSDoc shadow', () => {
  assert.ok(existsSync(new URL('../src/game-types.ts', import.meta.url)));
  assert.ok(!existsSync(new URL('../src/game-types.js', import.meta.url)),
    'game-types.js duplicates the canonical game-types.ts and is not a runtime module');
  const types = readFileSync(new URL('../src/game-types.ts', import.meta.url), 'utf8');
  for (const name of ['TrackSection', 'TrackConfig', 'PlayerSnapshot', 'RivalSnapshot', 'RaceSnapshot'])
    assert.match(types, new RegExp('export interface ' + name + '\\b'));
});
