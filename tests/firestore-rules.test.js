import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { normalizeRaceConfig } from '../src/race-config.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { circuitLapKey } from '../src/circuit-records.ts';
import { recordTrackId, recordTrackIds } from '../src/record-layout.ts';
import { RACE_TRACKS, COURSE_TRACKS } from '../src/race-tracks.ts';
import { mergeModeBests } from '../src/cloud-mode-bests.ts';

test('cloud saves are private and accept only valid map progress', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-skyline-rush',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  t.after(() => env.cleanup());
  const owner = env.authenticatedContext('owner').firestore();
  const other = env.authenticatedContext('other').firestore();
  const guest = env.unauthenticatedContext().firestore();
  const save = doc(owner, 'saves/owner');
  const progress = { version: 2, unlocked: ['coast', 'neon'], stars: { coast: 2 }, bests: { coast: 60 },
    medals: {}, history: [], modeHistory: [], daily: [] };
  await assertSucceeds(setDoc(save, progress));
  await assertSucceeds(getDoc(save));
  await assertFails(getDoc(doc(other, 'saves/owner')));
  await assertFails(getDoc(doc(guest, 'saves/owner')));
  await assertFails(getDocs(collection(owner, 'saves')));
  await assertFails(setDoc(doc(other, 'saves/owner'), progress));
  await assertFails(setDoc(save, { ...progress, unlocked: ['coast', 'unknown'] }));
  await assertFails(setDoc(save, { ...progress, stars: { unknown: 3 } }));
  await assertFails(setDoc(save, { ...progress, stars: { coast: 7 } }));
  await assertFails(setDoc(save, { ...progress, stars: { coast: '3' } }));
  await assertFails(setDoc(save, { ...progress, bests: { coast: -2 } }));
  await assertFails(setDoc(save, { ...progress, bests: { coast: '60' } }));
  // Re-laid tracks keep every older best and add a `<track>@<layout>` best (recordTrackIds in src/record-layout.ts):
  // stage 1 ids (@2) and stage 2 ids (@3, and @2 for Aurora and the World Tour) stay valid next to the scaled-layout
  // ids (@4, and @3 for Aurora and the World Tour).
  const everyBest = Object.fromEntries(Object.keys(RACE_TRACKS).flatMap(recordTrackIds).map((id, i) => [id, 60 + i]));
  await assertSucceeds(setDoc(save, { ...progress, bests: everyBest }));
  // The fullest save a player can hold stays under the rules' 1000-expression evaluation limit (a 10-star,
  // 14-best save was rejected before stage 2 rewrote the per-id checks).
  const tracks = Object.keys(RACE_TRACKS), stamp = '2026-11-01T00:00:00.000Z';
  await assertSucceeds(setDoc(save, { ...progress, unlocked: tracks, stars: Object.fromEntries(tracks.map(id => [id, 3])), bests: everyBest,
    medals: { 'first-win': stamp, 'clean-run': stamp, 'perfect-five': stamp, 'nitro-chain': stamp } }));
  // ... and with every CourseGraph sprint best (topology-keyed) on top of it.
  const courseBests = Object.fromEntries(Object.keys(COURSE_TRACKS).map((id, i) => [recordTrackId(id), 120 + i]));
  assert.ok(Object.keys(courseBests).length >= 3, 'Frostbite, Dune and Skyfall');
  await assertSucceeds(setDoc(save, { ...progress, unlocked: tracks, stars: Object.fromEntries(tracks.map(id => [id, 3])),
    bests: { ...everyBest, ...courseBests }, car: 'crimson-gt',
    medals: { 'first-win': stamp, 'clean-run': stamp, 'perfect-five': stamp, 'nitro-chain': stamp } }), 'fullest save with course bests');
  for (const id of Object.keys(courseBests)) await assertFails(setDoc(save, { ...progress, bests: { [id]: 0 } }), `${id} best 0`);
  for (const bad of [0, 604800, 604801, -1, '60', true]) await assertFails(setDoc(save, { ...progress, bests: { [recordTrackId('coast')]: bad } }), `best ${bad}`);
  for (const bad of [0, 4, 2.5, '3']) await assertFails(setDoc(save, { ...progress, stars: { coast: bad } }), `star ${bad}`);
  await assertSucceeds(setDoc(save, { ...progress,
    history: [{ date: '2026-11-01T00:00:00.000Z', track: 'coast', position: 1, time: 70, layout: 3 }],
    modeHistory: [{ date: '2026-11-01T00:00:00.000Z', mode: 'circuit', track: CIRCUIT_ID, rules: '{}', time: 100, layout: 3 }] }));
  await assertFails(setDoc(save, { ...progress, bests: { [recordTrackId('coast')]: -1 } }));
  await assertFails(setDoc(save, { ...progress, bests: { 'aurora@4': 60 } }), 'a layout no build wrote');
  await assertFails(setDoc(save, { ...progress, stars: { [recordTrackId('coast')]: 3 } }));
  await assertFails(setDoc(save, { ...progress, medals: { 'first-win': 'not-a-date' } }));
  // Optional equipped car (Task 7): the catalog's ids only; a save without it stays valid for older clients.
  for (const car of ['roadster', 'crimson-gt']) await assertSucceeds(setDoc(save, { ...progress, car }), `car ${car}`);
  for (const bad of ['hovercraft', '', 7, null, ['crimson-gt']]) await assertFails(setDoc(save, { ...progress, car: bad }), `car ${JSON.stringify(bad)}`);
  await assertFails(deleteDoc(doc(other, 'saves/owner')));
  await assertFails(deleteDoc(doc(guest, 'saves/owner')));
  await assertSucceeds(deleteDoc(save));
  assert.equal((await getDoc(save)).exists(), false);
});

test('Google account documents are private, limited to name/email, and cannot be listed', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-skyline-rush',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  t.after(() => env.cleanup());
  const owner = env.authenticatedContext('profile-owner').firestore();
  const other = env.authenticatedContext('other').firestore();
  const guest = env.unauthenticatedContext().firestore();
  const account = doc(owner, 'accounts/profile-owner');
  await assertSucceeds(setDoc(account, { displayName: 'Player', email: 'player@gmail.com' }));
  await assertSucceeds(getDoc(account));
  await assertSucceeds(setDoc(account, { displayName: 'New name', email: 'player@gmail.com' }));
  await assertFails(getDoc(doc(other, 'accounts/profile-owner')));
  await assertFails(getDoc(doc(guest, 'accounts/profile-owner')));
  await assertFails(getDocs(collection(owner, 'accounts')));
  await assertFails(setDoc(doc(other, 'accounts/profile-owner'), { email: 'other@gmail.com' }));
  await assertFails(setDoc(account, { displayName: 'Player', email: 'player@gmail.com', password: 'secret' }));
  await assertFails(setDoc(account, { displayName: 'x'.repeat(201), email: 'player@gmail.com' }));
  await assertFails(setDoc(account, { displayName: 'Player', email: 'not-an-email' }));
  await assertFails(deleteDoc(doc(other, 'accounts/profile-owner')));
  await assertSucceeds(deleteDoc(account));
});

test('permanent mode records are private and bounded on Spark Firestore', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-skyline-rush',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  t.after(() => env.cleanup());
  const owner = env.authenticatedContext('owner').firestore();
  const other = env.authenticatedContext('other').firestore();
  const path = 'modeBests/owner';
  const records = { version: 1, bests: {}, stunts: {} };
  await assertSucceeds(setDoc(doc(owner, path), records));
  await assertSucceeds(getDoc(doc(owner, path)));
  await assertFails(getDoc(doc(other, path)));
  await assertFails(getDocs(collection(owner, 'modeBests')));
  await assertFails(setDoc(doc(other, path), records));
  await assertFails(setDoc(doc(owner, path), { ...records, version: 2 }));
  await assertFails(setDoc(doc(owner, path), { ...records, secret: true }));
  // Re-laid tracks keep mode bests under '<track>@<layout>' ids: Circuit total and lap best, Coast Time Trial (src/record-layout.ts).
  const circuit = normalizeRaceConfig({ mode: 'circuit', laps: 3 }), trial = normalizeRaceConfig({ mode: 'time' });
  const versioned = mergeModeBests({ bests: { [JSON.stringify([recordTrackId(CIRCUIT_ID, circuit), circuit])]: 100, [circuitLapKey(circuit)]: 30,
    [JSON.stringify([recordTrackId('coast', trial), trial])]: 70, [JSON.stringify(['coast', trial])]: 40 } });
  assert.equal(Object.keys(versioned.bests).length, 4, 'the client keeps every versioned and old mode key');
  await assertSucceeds(setDoc(doc(owner, path), versioned));
  await assertFails(deleteDoc(doc(other, path)));
  await assertSucceeds(deleteDoc(doc(owner, path)));
});
