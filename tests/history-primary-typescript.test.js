import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('Classic and Mode history expose only the strict TypeScript primary surface', async () => {
  assert.equal(existsSync(new URL('../src/history.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/history.js', import.meta.url)), false);
  const { loadHistory, recordRace, loadModeHistory, recordModeRace,
    loadUnlocks, HISTORY_LIMIT, MODE_HISTORY_KEY } = await import('../src/history.ts');
  assert.equal(HISTORY_LIMIT, 50);
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
  const classic = recordRace({ trackId: 'coast', length: 5000,
    result: { position: 1, time: 60, rings: 2 } }, storage, new Date('2026-10-26T00:00:00Z'));
  assert.deepEqual(loadHistory(storage), [classic]);
  assert.ok(loadUnlocks(storage).includes('neon'));
  const result = recordModeRace({ mode: 'time', trackId: 'coast', config: { mode: 'time' },
    result: { time: 70, position: 1, score: 200 }, length: 5000 }, storage, new Date('2026-10-26T00:00:00Z'));
  assert.deepEqual(result, {best: 70, record: true});
  assert.equal(loadModeHistory(storage).length, 1);
  assert.equal(typeof data.get(MODE_HISTORY_KEY), 'string');
});
