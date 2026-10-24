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
