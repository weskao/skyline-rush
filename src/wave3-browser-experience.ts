import { createWave3LocalDemo } from './wave3-local-demo.ts';
import type { Wave3DemoCheckpoint } from './wave3-local-demo.ts';
import { createWave3DemoStorage, encodeWave3DemoCheckpoint, readWave3DemoCheckpoint, WAVE3_DEMO_STORAGE_PREFIX } from './wave3-demo-storage.ts';
import type { Wave3PreviewTransact } from './wave3-preview-firestore.ts';
import type { ExperienceResult, ExperienceSnapshot, Wave3ExperiencePort } from './wave3-experience-contract.ts';
import { DEMO_RETENTION_MS, sameDemoScope } from './wave3-experience-contract.ts';
import { equipWave3DemoSkin, onWave3DemoSkinOverride, resetWave3DemoSkin } from '#garage-skin-runtime';

declare const __WAVE3_FIRESTORE_PREVIEW__: boolean;

type DemoState = ReturnType<typeof createWave3LocalDemo>;
type ProfileLock = Pick<LockManager, 'request'>;
type Options = {
  now?: () => number;
  cache?: ReturnType<typeof createWave3DemoStorage>;
  locks?: ProfileLock | null;
  firestore?: Wave3PreviewTransact;
  applyEquipment?: (itemId: string, accountId: string) => boolean;
  clearEquipment?: () => void;
};

/** Guest tabs use a shared browser lock. Authenticated preview writes are serialized by Firestore. */
export function createWave3BrowserExperience(options: Options = {}) {
  const cache = options.cache ?? createWave3DemoStorage({ now: options.now });
  const locks = options.locks === undefined ? globalThis.navigator?.locks : options.locks;
  const state = createWave3LocalDemo({ now: options.now, applyEquipment: options.applyEquipment });
  const listeners = new Set<(value: ExperienceSnapshot) => void>();
  // An IO failure leaves this profile in this tab's memory for the session.
  const volatile = new Map<string, Wave3DemoCheckpoint>();
  let diskRaw: string | null | undefined;
  let diskValid = false;
  let savedAt: number | null = null;
  const now = options.now ?? Date.now;
  let equipped: string | null = null;
  const { firestore } = options;
  let pendingFirestore: Promise<unknown> = Promise.resolve();
  let restoring: Promise<void> | null = null;
  // Accounts whose cloud data was deleted in this tab: queued and later writes become no-ops.
  const forgotten = new Set<string>();
  const usesFirestore = (accountId: string) => !!firestore && accountId !== 'guest';
  const getSnapshot = (): ExperienceSnapshot => {
    const snapshot = state.getSnapshot();
    if (usesFirestore(snapshot.accountId)) return { ...snapshot, persistence: 'firestore' };
    const maySaveOnDevice = snapshot.accountId === 'guest' && locks && !volatile.has(snapshot.accountId);
    return maySaveOnDevice ? snapshot : { ...snapshot, persistence: 'memory-only' };
  };
  const syncEquipment = () => {
    const { equippedPreview, accountId } = state.getSnapshot();
    if (equipped === equippedPreview) return;
    // Mark before applying: Garage's own change notification may re-enter this adapter.
    equipped = equippedPreview;
    if (equippedPreview) {
      if (options.applyEquipment && !options.applyEquipment(equippedPreview, accountId)) equipped = null;
    } else options.clearEquipment?.();
  };
  const publish = () => {
    syncEquipment();
    const snapshot = getSnapshot();
    for (const listener of listeners) listener(snapshot);
    return snapshot;
  };
  const syncDisk = (accountId: string, initial = false) => {
    if (volatile.has(accountId)) return false;
    const disk = cache.readDiskCheckpoint(accountId);
    if (!disk) {
      volatile.set(accountId, state.getCheckpoint());
      return false;
    }
    if (disk.clockRollback) {
      volatile.set(accountId, state.getCheckpoint());
      return true;
    }
    const valid = disk.checkpoint !== null;
    savedAt = disk.savedAt;
    if (!initial && disk.raw === diskRaw && valid === diskValid) return false;
    diskRaw = disk.raw;
    diskValid = valid;
    if (disk.checkpoint && state.restoreCheckpoint(disk.checkpoint)) return true;
    if (disk.expiredGeneration) {
      state.expireCheckpoint(disk.expiredGeneration);
      return true;
    }
    if (initial) return false;
    // A removed or invalid checkpoint replaces the old tab state without writing back.
    state.resetDemo();
    return true;
  };
  const save = (accountId: string, writable: boolean) => {
    const checkpoint = state.getCheckpoint();
    if (!writable || volatile.has(accountId) || !cache.saveCheckpoint(checkpoint, accountId)) {
      volatile.set(accountId, checkpoint);
    } else {
      const disk = cache.readDiskCheckpoint(accountId);
      diskRaw = disk?.raw;
      savedAt = disk?.savedAt ?? null;
      diskValid = true;
    }
  };
  const currentScope = () => {
    const scope = state.getOperationScope();
    if (!usesFirestore(scope.accountId) && savedAt !== null && now() - savedAt > DEMO_RETENTION_MS &&
      syncDisk(scope.accountId)) publish();
    return state.getOperationScope();
  };
  const transact = async <T>(
    action: (accountId: string, writable: boolean, changed: boolean) => T, stale: () => T, sync = true,
  ): Promise<T> => {
    const scope = currentScope();
    const run = (writable: boolean): T => {
      const before = state.getOperationScope();
      // Tab switches invalidate queued work even when the user switches away and back.
      if (forgotten.has(scope.accountId) || !sameDemoScope(scope, before)) return stale();
      const changed = writable && sync && syncDisk(scope.accountId);
      if (!sameDemoScope(scope, state.getOperationScope())) {
        if (changed) publish();
        return stale();
      }
      return action(scope.accountId, writable && !volatile.has(scope.accountId), changed);
    };
    if (scope.accountId !== 'guest' || !locks || volatile.has(scope.accountId)) return run(false);
    let acquired = false;
    try {
      return await locks.request(WAVE3_DEMO_STORAGE_PREFIX + scope.accountId, () => {
        acquired = true;
        return run(true);
      });
    } catch (error) {
      if (acquired) throw error;
      if (!sameDemoScope(scope, state.getOperationScope())) return stale();
      // Denied Web Locks must not turn into a racy shared write.
      volatile.set(scope.accountId, state.getCheckpoint());
      return run(false);
    }
  };
  // Firestore may rerun the callback after a concurrent commit. The staged state has no display or equipment side effects.
  // `overwrite` (reset) replaces the stored document without reading it, so a corrupted one cannot block it.
  const transactFirestore = <T>(action?: (draft: DemoState) => { value: T; save: boolean }, overwrite = false) => {
    const scope = state.getOperationScope();
    const stillCurrent = () => !forgotten.has(scope.accountId) && sameDemoScope(scope, state.getOperationScope());
    const operation = pendingFirestore.then(async () => {
      if (!firestore || !stillCurrent()) return null;
      const result = await firestore(scope.accountId, raw => {
        if (!stillCurrent()) return { result: null };
        const time = now();
        const draft = createWave3LocalDemo({ now, initialScope: { ...scope, generation: 'legacy' } });
        const saved = overwrite ? null : readWave3DemoCheckpoint(raw, scope.accountId, time);
        if (saved?.expiredGeneration) draft.expireCheckpoint(saved.expiredGeneration);
        else if (saved && raw !== null && (!saved.checkpoint || !draft.restoreCheckpoint(saved.checkpoint))) {
          throw new Error('Invalid Wave 3 preview checkpoint');
        }
        const update = overwrite || sameDemoScope(scope, draft.getOperationScope()) ? action?.(draft) : undefined;
        const checkpoint = draft.getCheckpoint();
        return {
          result: { value: update?.value, checkpoint, savedAt: update?.save ? time : saved?.savedAt ?? null },
          ...(update?.save ? { write: encodeWave3DemoCheckpoint(checkpoint, time) } : {}),
        };
      });
      if (!result || !stillCurrent()) return null;
      savedAt = result.savedAt;
      state.restoreCheckpoint(result.checkpoint);
      return { value: result.value, snapshot: publish() };
    });
    pendingFirestore = operation.catch(() => {});
    return operation;
  };
  const restore = () => {
    savedAt = null; // a failed refresh must not retry on every race start
    const pending: Promise<void> = transactFirestore().then(() => {}, () => {})
      .then(() => { if (restoring === pending) restoring = null; });
    return restoring = pending;
  };
  const failed = (status: 'expired' | 'unavailable'): ExperienceResult => ({
    status, snapshot: getSnapshot(), deltaDemoPoints: 0, deltaDemoCoins: 0, deltaDemoDiamonds: 0,
  });
  const expired = () => failed('expired');
  const mutateLocal = (action: (target: DemoState) => ExperienceResult) => transact((accountId, writable, changed) => {
    const result = action(state);
    if (result.status === 'completed') {
      save(accountId, writable);
      return { ...result, snapshot: publish() };
    }
    return { ...result, snapshot: changed ? publish() : getSnapshot() };
  }, expired);
  const mutate = async (action: (target: DemoState) => ExperienceResult): Promise<ExperienceResult> => {
    if (!usesFirestore(state.getOperationScope().accountId)) return mutateLocal(action);
    try {
      const result = await transactFirestore(draft => {
        const value = action(draft);
        return { value, save: value.status === 'completed' };
      });
      return result?.value ? { ...result.value, snapshot: result.snapshot } : expired();
    } catch {
      return failed('unavailable');
    }
  };

  syncDisk('guest', true);
  syncEquipment();
  const port = {
    getSnapshot,
    getOperationScope: currentScope,
    subscribe(listener: (value: ExperienceSnapshot) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setAccount(account: string | null) {
      const previous = state.getOperationScope().accountId;
      const { accountId } = state.setAccount(account);
      if (previous === accountId) return getSnapshot();
      equipped = null;
      options.clearEquipment?.();
      diskRaw = undefined;
      savedAt = null;
      if (usesFirestore(accountId)) void restore();
      else {
        const checkpoint = volatile.get(accountId);
        if (checkpoint) state.restoreCheckpoint(checkpoint);
        else if (accountId === 'guest') syncDisk(accountId, true);
      }
      return publish();
    },
    async resetDemo() {
      const { accountId } = state.getOperationScope();
      if (usesFirestore(accountId)) {
        const result = await transactFirestore(draft => ({ value: draft.resetDemo(), save: true }), true);
        if (!result?.value) throw new Error('Wave 3 preview reset expired');
        return result.snapshot;
      }
      // Reset overwrites the stored save unread, so a corrupted or future-dated one cannot pin the tab to memory.
      volatile.delete(accountId);
      return transact((accountId, writable) => {
        state.resetDemo();
        // Persist the new generation atomically, including when the wallet is empty.
        save(accountId, writable);
        return publish();
      }, getSnapshot, false);
    },
    /** Race start waits for this: the signed-in wallet restore and the 7-day expiry. Null when nothing is pending. */
    ready(): Promise<void> | null {
      const { accountId } = currentScope(); // applies the guest expiry synchronously
      if (usesFirestore(accountId) && !restoring && savedAt !== null && now() - savedAt > DEMO_RETENTION_MS) restore();
      return restoring;
    },
    /** Cloud deletion: queued and later trial writes for the account become no-ops in this tab. */
    forgetAccount(accountId: string) {
      forgotten.add(accountId);
      volatile.delete(accountId);
      if (state.getOperationScope().accountId !== accountId) return;
      state.resetDemo();
      publish();
    },
    recordGameEvent: (...args: Parameters<Wave3ExperiencePort['recordGameEvent']>) =>
      mutate(target => target.recordGameEvent(...args)),
    settleCompletion: (...args: Parameters<Wave3ExperiencePort['settleCompletion']>) =>
      mutate(target => target.settleCompletion(...args)),
    claimMission: (...args: Parameters<Wave3ExperiencePort['claimMission']>) =>
      mutate(target => target.claimMission(...args)),
    redeemPreview: (...args: Parameters<Wave3ExperiencePort['redeemPreview']>) =>
      mutate(target => target.redeemPreview(...args)),
    equipPreview: (itemId: string, scope?: ReturnType<typeof state.getOperationScope>) => mutate(target => {
      const result = target.equipPreview(itemId, scope);
      if (target === state && (result.status === 'completed' || result.status === 'duplicate')) equipped = itemId;
      return result;
    }),
    clearEquippedPreview: (itemId: string, accountId: string) => mutate(target => {
      if (target.getOperationScope().accountId !== accountId) return expired();
      return target.clearEquippedPreview(itemId);
    }),
    refresh(accountId: string) {
      if (state.getOperationScope().accountId !== accountId) return;
      if (usesFirestore(accountId)) return transactFirestore().then(() => {}, () => {});
      if (accountId === 'guest' && syncDisk(accountId)) publish();
    },
  } satisfies Wave3ExperiencePort & Record<string, unknown>;
  return port;
}

export const wave3DemoExperience = createWave3BrowserExperience({
  firestore: typeof __WAVE3_FIRESTORE_PREVIEW__ !== 'undefined' && __WAVE3_FIRESTORE_PREVIEW__
    ? async (uid, update) => {
      const { transactWave3Preview } = await import('./cloud-save.ts');
      if (!transactWave3Preview) throw new Error('Wave 3 Firestore preview is unavailable');
      return transactWave3Preview(uid, update);
    } : undefined,
  applyEquipment: typeof window === 'undefined' ? undefined : equipWave3DemoSkin,
  clearEquipment: typeof window === 'undefined' ? undefined : resetWave3DemoSkin,
});

if (typeof window !== 'undefined') {
  onWave3DemoSkinOverride((itemId, accountId) => {
    void wave3DemoExperience.clearEquippedPreview(itemId, accountId);
  });
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === WAVE3_DEMO_STORAGE_PREFIX + 'guest') wave3DemoExperience.refresh('guest');
  });
  window.addEventListener('online', () => {
    void wave3DemoExperience.refresh(wave3DemoExperience.getOperationScope().accountId);
  });
}
