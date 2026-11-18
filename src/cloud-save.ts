import { initializeApp } from 'firebase/app';
import type { User } from 'firebase/auth';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, connectAuthEmulator } from 'firebase/auth';
import { doc, getFirestore, runTransaction, writeBatch, getDoc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { mergeProgress, mergeModeBests, readLocalModeBests, saveLocalModeBests } from './cloud-progress.ts';
import { googleAccountFields } from './cloud-account.ts';
import { GARAGE_RELEASE_MODE } from '#garage-release-config';

const app = initializeApp({
  apiKey: 'AIzaSyChOFZ1EvyZ9iVlVZ_QQpijgObgALUyeEQ',
  authDomain: 'skyline-rush-weskao.firebaseapp.com',
  projectId: 'skyline-rush-weskao',
  appId: '1:255985591416:web:0859def3ac0da57f2b798d',
});
type Progress = ReturnType<typeof mergeProgress>;
type PermanentBests = ReturnType<typeof mergeModeBests>;
const mergeDeviceProgress = mergeProgress as unknown as (local: object, cloud: unknown) => Progress;
const mergeDeviceBests = mergeModeBests as unknown as (local: object, cloud: unknown) => PermanentBests;
const auth = getAuth(app);
const db = getFirestore(app);
const WAVE3_PREVIEW_COLLECTION = 'wave3PreviewEconomy';
const wave3PreviewEnabled = GARAGE_RELEASE_MODE === 'trial' && import.meta.env.VITE_WAVE3_FIRESTORE_PREVIEW === '1';
if (import.meta.env.DEV && location.hostname === '127.0.0.1'
  && (import.meta.env.VITE_FIREBASE_EMULATOR || new URLSearchParams(location.search).has('firebase-emulator'))) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const watchCloudUser = (onUser: (user: User | null) => void, onError?: (error: Error) => void) => onAuthStateChanged(auth, onUser, onError);
export const signInToCloud = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signOutOfCloud = () => signOut(auth);
export const deleteCloudProgress = (expectedUid: string) => {
  if (auth.currentUser?.uid !== expectedUid) throw new Error('Cloud account changed');
  const batch = writeBatch(db);
  const collections = ['saves', 'modeBests', 'accounts'];
  if (wave3PreviewEnabled) collections.push(WAVE3_PREVIEW_COLLECTION);
  for (const collection of collections) batch.delete(doc(db, collection, expectedUid));
  return batch.commit();
};

/** Persist disposable browser-calculated trial progress with UID scoping and Firestore retry semantics. */
export function transactWave3Preview<T>(uid: string, update: (raw: string | null) => { result: T; write?: string }): Promise<T> {
  const checkAccount = () => {
    if (!wave3PreviewEnabled || auth.currentUser?.uid !== uid) throw new Error('Wave 3 preview account unavailable');
  };
  checkAccount();
  const save = doc(db, WAVE3_PREVIEW_COLLECTION, uid);
  return runTransaction(db, async transaction => {
    const current = (await transaction.get(save)).data();
    checkAccount();
    if (current && (current.version !== 1 || typeof current.checkpoint !== 'string')) throw new Error('Invalid Wave 3 preview document');
    const { result, write } = update(current?.checkpoint ?? null);
    if (write !== undefined) transaction.set(save, { version: 1, checkpoint: write });
    return result;
  });
}

export async function syncCloudProgress(localProgress: () => object) {
  const user = auth.currentUser;
  if (!user) return null;
  const save = doc(db, 'saves', user.uid);
  const bestDocument = doc(db, 'modeBests', user.uid);
  const result = await runTransaction(db, async transaction => {
    // Read both documents before writing. Transaction retries preserve concurrent devices.
    const snapshot = await transaction.get(save);
    const bestSnapshot = await transaction.get(bestDocument);
    const cloud = snapshot.data();
    const progress = mergeDeviceProgress(localProgress(), cloud);
    const permanent = mergeDeviceBests(readLocalModeBests(), bestSnapshot.data());
    if (!cloud || cloud.version !== 2 || JSON.stringify(mergeDeviceProgress({}, cloud)) !== JSON.stringify(progress))
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
export async function syncGoogleAccountDetails(expectedUid: string) {
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

