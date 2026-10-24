import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, connectAuthEmulator } from 'firebase/auth';
import { doc, getFirestore, runTransaction, deleteDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { mergeProgress } from './cloud-progress.js';

const app = initializeApp({
  apiKey: 'AIzaSyChOFZ1EvyZ9iVlVZ_QQpijgObgALUyeEQ',
  authDomain: 'skyline-rush-weskao.firebaseapp.com',
  projectId: 'skyline-rush-weskao',
  appId: '1:255985591416:web:0859def3ac0da57f2b798d',
});
const auth = getAuth(app);
const db = getFirestore(app);
if (import.meta.env.DEV && location.hostname === '127.0.0.1' && new URLSearchParams(location.search).has('firebase-emulator')) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const watchCloudUser = (onUser, onError) => onAuthStateChanged(auth, onUser, onError);
export const signInToCloud = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signOutOfCloud = () => signOut(auth);
export const deleteCloudProgress = expectedUid => {
  if (auth.currentUser?.uid !== expectedUid) throw new Error('Cloud account changed');
  return deleteDoc(doc(db, 'saves', expectedUid));
};

export async function syncCloudProgress(localProgress) {
  const user = auth.currentUser;
  if (!user) return null;
  const save = doc(db, 'saves', user.uid);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(save);
    const cloud = snapshot.data();
    const progress = mergeProgress(localProgress(), cloud);
    if (!cloud || cloud.version !== 2 || JSON.stringify(mergeProgress({}, cloud)) !== JSON.stringify(progress))
      transaction.set(save, progress);
    return progress;
  });
}
