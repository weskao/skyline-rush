import { doc, runTransaction } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { WAVE3_PREVIEW_COLLECTION } from './cloud-delete.ts';

const VERSION = 1;

export type Wave3PreviewTransact = <T>(uid: string, update: (raw: string | null) =>
  { result: T; write?: string }) => Promise<T>;

export type Wave3PreviewStoreFactory = (db: Firestore, currentUid: () => string | undefined) => {
  transact: Wave3PreviewTransact;
};

/** One document per UID. A transaction retry always restages from the latest checkpoint. */
export const createWave3PreviewStore: Wave3PreviewStoreFactory | undefined = (db, currentUid) => {
  const ownDocument = (uid: string) => doc(db, WAVE3_PREVIEW_COLLECTION, uid);
  const checkAccount = (uid: string) => {
    if (currentUid() !== uid) throw new Error('Wave 3 preview account changed');
  };
  const transact: Wave3PreviewTransact = (uid, update) => {
    checkAccount(uid);
    const save = ownDocument(uid);
    return runTransaction(db, async transaction => {
      const current = (await transaction.get(save)).data();
      checkAccount(uid);
      if (current && (current.version !== VERSION || typeof current.checkpoint !== 'string')) {
        throw new Error('Invalid Wave 3 preview document');
      }
      const { result, write } = update(current?.checkpoint ?? null);
      if (write !== undefined) transaction.set(save, { version: VERSION, checkpoint: write });
      return result;
    });
  };
  return { transact };
};
