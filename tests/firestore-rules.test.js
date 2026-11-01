import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { normalizeRaceConfig } from '../src/race-config.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { circuitLapKey } from '../src/circuit-records.ts';
import { recordTrackId } from '../src/record-layout.ts';
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
  // Re-laid tracks keep their old best and add a `<track>@<layout>` best (src/record-layout.ts).
  await assertSucceeds(setDoc(save, { ...progress, bests: { coast: 60, 'coast@2': 70, 'neon@2': 50, 'canyon@2': 80, 'spiral@2': 75 } }));
  await assertSucceeds(setDoc(save, { ...progress,
    history: [{ date: '2026-11-01T00:00:00.000Z', track: 'coast', position: 1, time: 70, layout: 2 }],
    modeHistory: [{ date: '2026-11-01T00:00:00.000Z', mode: 'circuit', track: CIRCUIT_ID, rules: '{}', time: 100, layout: 2 }] }));
  await assertFails(setDoc(save, { ...progress, bests: { 'coast@2': -1 } }));
  await assertFails(setDoc(save, { ...progress, bests: { 'aurora@2': 60 } }));
  await assertFails(setDoc(save, { ...progress, stars: { 'coast@2': 3 } }));
  await assertFails(setDoc(save, { ...progress, medals: { 'first-win': 'not-a-date' } }));
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
  // Layout 2 tracks keep mode bests under '<track>@2' ids: Circuit total and lap best, Coast Time Trial (src/record-layout.ts).
  const circuit = normalizeRaceConfig({ mode: 'circuit', laps: 3 }), trial = normalizeRaceConfig({ mode: 'time' });
  const versioned = mergeModeBests({ bests: { [JSON.stringify([recordTrackId(CIRCUIT_ID, circuit), circuit])]: 100, [circuitLapKey(circuit)]: 30,
    [JSON.stringify([recordTrackId('coast', trial), trial])]: 70, [JSON.stringify(['coast', trial])]: 40 } });
  assert.equal(Object.keys(versioned.bests).length, 4, 'the client keeps every versioned and old mode key');
  await assertSucceeds(setDoc(doc(owner, path), versioned));
  await assertFails(deleteDoc(doc(other, path)));
  await assertSucceeds(deleteDoc(doc(owner, path)));
});
