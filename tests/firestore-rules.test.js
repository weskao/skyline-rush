import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';

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
  await assertFails(deleteDoc(doc(other, 'saves/owner')));
  await assertFails(deleteDoc(doc(guest, 'saves/owner')));
  await assertSucceeds(deleteDoc(save));
  assert.equal((await getDoc(save)).exists(), false);
});
