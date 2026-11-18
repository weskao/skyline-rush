import { doc, runTransaction } from 'firebase/firestore';
import type { Firestore, WriteBatch } from 'firebase/firestore';

const COLLECTION = 'wave3PreviewEconomy';
const VERSION = 1;

export type Wave3PreviewTransact = <T>(uid: string, update: (raw: string | null) =>
  { result: T; write?: string }) => Promise<T>;

export type Wave3PreviewStoreFactory = (db: Firestore, currentUid: () => string | undefined) => {
  transact: Wave3PreviewTransact;
  stageDeletion: (batch: WriteBatch, uid: string) => void;
};

/** One document per UID. A transaction retry always restages from the latest checkpoint. */
export const createWave3PreviewStore: Wave3PreviewStoreFactory | undefined = (db, currentUid) => {
  const ownDocument = (uid: string) => doc(db, COLLECTION, uid);
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
  return {
    transact,
    stageDeletion(batch, uid) {
      checkAccount(uid);
      batch.delete(ownDocument(uid));
    },
  };
};
