import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('ghost persistence and Daily history are single-owner strict TypeScript services', async () => {
  assert.ok(existsSync(new URL('../src/history-ghost.ts', import.meta.url)));
  assert.ok(existsSync(new URL('../src/history-daily.ts', import.meta.url)));
  const old = readFileSync(new URL('../src/history.ts', import.meta.url), 'utf8');
  assert.match(old, /export\s*\{[^}]*loadGhost[^}]*saveModeGhost[^}]*\}\s*from\s*['"]\.\/history-ghost\.ts['"]/);
  assert.match(old, /export\s*\{[^}]*loadDaily[^}]*recordDaily[^}]*\}\s*from\s*['"]\.\/history-daily\.ts['"]/);
  assert.doesNotMatch(old, /function boundedGhosts\(|export function loadModeGhost\(|export function recordDaily\(/);
  const { loadGhost, saveModeGhost } = await import('../src/history-ghost.ts');
  const { loadDaily, recordDaily, validDaily } = await import('../src/history-daily.ts');
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(loadGhost('coast', storage), null);
  assert.equal(saveModeGhost('coast', { mode: 'time' }, {time: 4, samples: []}, storage), false);
  const challenge = { id: '2026-10-26', track: 'coast', modifier: 'no-flight' };
  const now = new Date('2026-10-26T00:00:00Z');
  const entry = recordDaily(challenge, { result: { time: 61, score: 55, position: 2 } }, storage, now);
  assert.equal(validDaily(entry), true);
  assert.deepEqual(loadDaily(storage), [entry]);
  store.set('skyline-rush-daily', JSON.stringify([entry, { ...entry, track: 'invalid' }]));
  assert.deepEqual(loadDaily(storage), [entry], 'tampered entries cannot enter daily board');
});
