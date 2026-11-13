import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FROSTBITE_ID, FROSTBITE_TRACK } from '../src/courses/frostbite-race.ts';
import { recordTrackId, recordTrackIds, parseRecordTrackId } from '../src/record-layout.ts';
import { createRace } from '../src/game.js';
import { GHOST_RATE } from '../src/ghost.ts';
import { mergeProgress } from '../src/cloud-progress-merge.ts';
import { isUpcomingEnterable as released } from '../src/access/production.ts';

// Frostbite (a CourseGraph sprint) keys its results by topology and layout version: a re-authored graph must never
// compare against times from the old one. Release builds still cannot enter it (Coming Soon).
const KEY = 'frostbite-canyon@t1l1';
const memory = () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  return store;
};
const trace = time => Array.from({ length: Math.floor(time * GHOST_RATE) + 1 }, (_, i) => [Math.min(FROSTBITE_TRACK.length, i * 10), 0, 0]);
async function finish(time, store) {
  const { settleRace } = await import('../src/race-results.ts');
  const { loadSessionProgress } = await import('../src/session-progress.ts');
  const { createGhostStore } = await import('../src/ghost-store.ts');
  const race = Object.assign(createRace(FROSTBITE_ID), { phase: 'finished', elapsed: time,
    result: { position: 1, time, score: 900, stars: 3, collisions: 0, nearMisses: 0, perfectLines: 9, nitroChain: 3, success: true } });
  const progress = loadSessionProgress(['coast']), ghosts = createGhostStore();
  const settled = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress, ghosts, daily: null, trace: trace(time) });
  return { settled, progress, read: k => JSON.parse(store.get(k) ?? 'null') };
}

test('Frostbite records live under one topology-keyed id', () => {
  assert.equal(FROSTBITE_TRACK.topologyVersion, 1);
  assert.equal(recordTrackId(FROSTBITE_ID), KEY);
  assert.deepEqual(recordTrackIds(FROSTBITE_ID), [KEY]);
  assert.deepEqual(parseRecordTrackId(KEY), { trackId: FROSTBITE_ID, layout: 1 });
  for (const stale of ['frostbite-canyon@t2l1', 'frostbite-canyon@t1l2', 'frostbite-canyon@2']) assert.equal(parseRecordTrackId(stale), null, stale);
  assert.equal(recordTrackId('coast'), 'coast@6', 'Classic still uses a layout version without a topology prefix');
});

test('a finished Frostbite race saves history, a topology-keyed best and its Ghost; no campaign effects', async () => {
  const store = memory();
  try {
    const first = await finish(150, store);
    assert.equal(first.settled.record, true);
    assert.equal(first.settled.next, null, 'not in the campaign: no NEXT');
    assert.deepEqual(first.settled.medals, []);
    assert.equal(first.read('skyline-rush-best-tracks')[KEY], 150);
    assert.equal(first.read('skyline-rush-best-tracks')[FROSTBITE_ID], undefined);
    assert.deepEqual(first.read('skyline-rush-history').map(r => [r.track, r.time]), [[FROSTBITE_ID, 150]]);
    assert.equal(first.read('skyline-rush-ghosts')[KEY].time, 150);
    assert.deepEqual(first.read('skyline-rush-unlocked'), ['coast']);
    assert.equal(store.get('skyline-rush-stars'), undefined);
    assert.equal(store.get('skyline-rush-medals'), undefined);
    const { createGhostStore } = await import('../src/ghost-store.ts');
    assert.equal(createGhostStore().classic(FROSTBITE_ID)?.time, 150, 'Ghost loads back for the next race');

    const slower = await finish(170, store);
    assert.equal(slower.settled.record, false);
    assert.equal(slower.settled.best, 150);
    assert.equal(slower.read('skyline-rush-ghosts')[KEY].time, 150, 'a slower run keeps the best Ghost');
    assert.equal(slower.read('skyline-rush-history').length, 2);
  } finally { delete globalThis.localStorage; }
});

test('cloud merge keeps the topology-keyed best and Frostbite history; other topology ids are dropped', () => {
  const run = { date: '2026-11-04T00:00:00.000Z', track: FROSTBITE_ID, position: 2, time: 160, distance: FROSTBITE_TRACK.length };
  const merged = mergeProgress({ bests: { [KEY]: 150, 'frostbite-canyon@t2l1': 90, [FROSTBITE_ID]: 80 }, history: [run] },
    { version: 2, bests: { [KEY]: 155 }, history: [] });
  assert.equal(merged.bests[KEY], 150);
  assert.equal(merged.bests['frostbite-canyon@t2l1'], undefined);
  assert.equal(merged.bests[FROSTBITE_ID], undefined);
  assert.deepEqual(merged.history.map(r => [r.track, r.time]), [[FROSTBITE_ID, 160]]);
  assert.deepEqual(merged.unlocked, ['coast'], 'never unlocks a campaign track');
});

test('firestore.rules accepts the Frostbite topology-keyed best', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const listed = [...rules.match(/function bestIds\(\) \{[^}]*\}/)[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(listed.includes(KEY));
  assert.match(rules, new RegExp(`validBest\\(bests, '${KEY}'\\)`));
});

test('release builds keep Frostbite a Coming Soon card', () => {
  assert.equal(released(FROSTBITE_ID), false);
});
