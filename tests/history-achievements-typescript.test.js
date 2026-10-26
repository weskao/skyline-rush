import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Classic achievements, medals, stars and paint have one typed storage implementation', async () => {
  const path = new URL('../src/history-achievements.ts', import.meta.url);
  assert.equal(existsSync(path), true);
  const old = readFileSync(new URL('../src/history.js', import.meta.url), 'utf8');
  assert.match(old, /export\s*\{[^}]*loadBests[^}]*recordStars[^}]*\}\s*from\s*['"]\.\/history-achievements\.ts['"]/);
  assert.doesNotMatch(old, /export function loadBests\(|export function recordBest\(|export const medalsFor\s*=|export function loadStars\(/);
  const { loadBests, recordBest, medalsFor, recordMedals, loadMedals, recordStars, loadStars, savePaint, loadPaint } = await import(path);
  const raw = new Map([['skyline-rush-best', '61']]);
  const storage = { getItem: k => raw.get(k) ?? null, setItem: (k,v) => raw.set(k,v) };
  assert.equal(loadBests(storage).coast, 61);
  assert.deepEqual(recordBest('coast', 68, storage), { best: 61, record: false });
  assert.deepEqual(recordBest('coast', 60, storage), { best: 60, record: true });
  const result = { position: 1, collisions: 0, perfectLines: 5, nitroChain: 3 };
  assert.equal(medalsFor(result).length, 4);
  const awarded = recordMedals(result, storage, new Date('2026-10-24T00:00:00Z'));
  assert.equal(awarded.length, 4);
  assert.equal(recordMedals(result, storage).length, 0);
  assert.equal(Object.keys(loadMedals(storage)).length, 4);
  recordStars('coast', 3, storage);
  recordStars('coast', 1, storage);
  assert.equal(loadStars(storage).coast, 3);
  savePaint('chrome', storage);
  assert.equal(loadPaint(['pearl','chrome'], storage), 'chrome');
  assert.equal(loadPaint(['pearl'], storage), 'pearl');
});
