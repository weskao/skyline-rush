import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WAVE3_PREVIEW_CATALOG } from '../src/garage-wave3-preview-catalog.ts';

const board = readFileSync(new URL('../src/GarageMissionBoard.vue', import.meta.url), 'utf8');

// Wave 3 integration once left the Mission center and the concept gallery with two copies of the same
// eight ids and names; one shared catalog keeps their artwork and wording from drifting apart.
test('Mission center reads its missions and trophies from the shared Wave 3 catalog', () => {
  assert.match(board, /WAVE3_PREVIEW_CATALOG/);
  for (const item of WAVE3_PREVIEW_CATALOG['garage-rewards-and-missions'].items) {
    assert.ok(!board.includes(`'${item.name.en}'`), `${item.id}: English name hardcoded in the board`);
    assert.ok(!board.includes(`'${item.name['zh-TW']}'`), `${item.id}: Chinese name hardcoded in the board`);
  }
});
