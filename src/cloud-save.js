import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, connectAuthEmulator } from 'firebase/auth';
import { doc, getFirestore, runTransaction, writeBatch, getDoc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { mergeProgress, mergeModeBests, readLocalModeBests, saveLocalModeBests } from './cloud-progress.js';
import { googleAccountFields } from './cloud-account.ts';

const app = initializeApp({
  apiKey: 'AIzaSyChOFZ1EvyZ9iVlVZ_QQpijgObgALUyeEQ',
  authDomain: 'skyline-rush-weskao.firebaseapp.com',
  projectId: 'skyline-rush-weskao',
  appId: '1:255985591416:web:0859def3ac0da57f2b798d',
});
const auth = getAuth(app);
const db = getFirestore(app);
if (import.meta.env.DEV && location.hostname === '127.0.0.1'
  && (import.meta.env.VITE_FIREBASE_EMULATOR || new URLSearchParams(location.search).has('firebase-emulator'))) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const watchCloudUser = (onUser, onError) => onAuthStateChanged(auth, onUser, onError);
export const signInToCloud = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signOutOfCloud = () => signOut(auth);
export const deleteCloudProgress = expectedUid => {
  if (auth.currentUser?.uid !== expectedUid) throw new Error('Cloud account changed');
  const batch = writeBatch(db);
  for (const collection of ['saves', 'modeBests', 'accounts'])
    batch.delete(doc(db, collection, expectedUid));
  return batch.commit();
};

export async function syncCloudProgress(localProgress) {
  const user = auth.currentUser;
  if (!user) return null;
  const save = doc(db, 'saves', user.uid);
  const bestDocument = doc(db, 'modeBests', user.uid);
  const result = await runTransaction(db, async transaction => {
    // Read both documents before writing. Transaction retries preserve concurrent devices.
    const snapshot = await transaction.get(save);
    const bestSnapshot = await transaction.get(bestDocument);
    const cloud = snapshot.data();
    const progress = mergeProgress(localProgress(), cloud);
    const permanent = mergeModeBests(readLocalModeBests(), bestSnapshot.data());
    if (!cloud || cloud.version !== 2 || JSON.stringify(mergeProgress({}, cloud)) !== JSON.stringify(progress))
      transaction.set(save, progress);
    if ((bestSnapshot.exists() || Object.keys(permanent.bests).length || Object.keys(permanent.stunts).length)
      && JSON.stringify(bestSnapshot.data() ?? null) !== JSON.stringify(permanent))
      transaction.set(bestDocument, permanent);
    return { progress, permanent };
  });
  if (!saveLocalModeBests(result.permanent)) throw new Error('Failed to restore permanent mode records locally');
  return result.progress;
}

// Owner-only account lookup used by the game's private profile checks.
export async function getSignedInAccountDetails() {
  const uid = auth.currentUser?.uid;
  return uid ? (await getDoc(doc(db, 'accounts', uid))).data() ?? null : null;
}

// Cache only explicitly requested Google profile fields in the Spark Firestore database.
export async function syncGoogleAccountDetails(expectedUid) {
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid) return false;
  const fields = googleAccountFields(user);
  if (!Object.keys(fields).length) return false;
  const account = doc(db, 'accounts', expectedUid);
  const current = (await getDoc(account)).data() ?? {};
  if (Object.entries(fields).every(([key, value]) => current[key] === value)) return true;
  if (auth.currentUser?.uid !== expectedUid) throw new Error('Cloud account changed');
  await setDoc(account, fields, { merge: true });
  return true;
}

