import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('career metrics, daily board and stars share one typed implementation without shadow JS exports', async () => {
  assert.equal(existsSync(new URL('../src/history-stats.ts', import.meta.url)), true);
  const source = readFileSync(new URL('../src/history.js', import.meta.url), 'utf8');
  assert.match(source, /export\s*\{\s*validStars,\s*starTotal,\s*dailyBoard,\s*careerStats\s*\}\s*from\s*['"]\.\/history-stats\.ts['"]/);
  assert.doesNotMatch(source, /export function careerStats\(|export const dailyBoard\s*=|export const starTotal\s*=/);
  const { careerStats, dailyBoard, starTotal, validStars } = await import('../src/history-stats.ts');
  assert.deepEqual(careerStats(undefined), { races: 0, wins: 0, totalDistance: 0, longestCombo: 0, mostRings: 0 });
  assert.deepEqual(careerStats([
    { position: 1, distance: 5000, longestCombo: 3, rings: 6 },
    { position: 2, distance: 4000, longestCombo: 7, rings: 4 },
  ]), { races: 2, wins: 1, totalDistance: 9000, longestCombo: 7, mostRings: 6 });
  const attempts = [{ id: 'a', time: 50 }, { id: 'b', time: 20 }, { id: 'a', time: 40 }];
  assert.deepEqual(dailyBoard(attempts, 'a').map(r => r.time), [40, 50]);
  assert.equal(attempts[0].time, 50, 'sorting should leave input order unchanged');
  assert.equal(starTotal({ coast: 3, neon: 2 }), 5);
  assert.equal(validStars(3), true);
  assert.equal(validStars(0), false);
  assert.equal(validStars(2.5), false);
});
