import { createWave3LocalDemo } from './wave3-local-demo.ts';
import type { Wave3DemoCheckpoint } from './wave3-local-demo.ts';
import { createWave3DemoStorage, WAVE3_DEMO_STORAGE_PREFIX } from './wave3-demo-storage.ts';
import type { ExperienceResult, ExperienceSnapshot, Wave3ExperiencePort } from './wave3-experience-contract.ts';
import { sameDemoScope } from './wave3-experience-contract.ts';
import { equipWave3DemoSkin, resetWave3DemoSkin } from '#garage-skin-runtime';

type ProfileLock = Pick<LockManager, 'request'>;
type Options = {
  now?: () => number;
  cache?: ReturnType<typeof createWave3DemoStorage>;
  locks?: ProfileLock | null;
  applyEquipment?: (itemId: string, accountId: string) => boolean;
  clearEquipment?: () => void;
};

/** All writable tabs use the same profile lock and re-read disk before mutation. */
export function createWave3BrowserExperience(options: Options = {}) {
  const cache = options.cache ?? createWave3DemoStorage({ now: options.now });
  const locks = options.locks === undefined ? globalThis.navigator?.locks : options.locks;
  const state = createWave3LocalDemo({ now: options.now, applyEquipment: options.applyEquipment });
  const listeners = new Set<(value: ExperienceSnapshot) => void>();
  // An IO failure leaves this profile in this tab's memory for the session.
  const volatile = new Map<string, Wave3DemoCheckpoint>();
  let diskRaw: string | null | undefined;
  let diskValid = false;
  let equipped: string | null = null;
  const getSnapshot = (): ExperienceSnapshot => {
    const snapshot = state.getSnapshot();
    return !locks || volatile.has(snapshot.accountId) ? { ...snapshot, persistence: 'memory-only' } : snapshot;
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
    const valid = disk.checkpoint !== null;
    if (!initial && disk.raw === diskRaw && valid === diskValid) return false;
    diskRaw = disk.raw;
    diskValid = valid;
    if (disk.checkpoint && state.restoreCheckpoint(disk.checkpoint)) return true;
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
      diskRaw = cache.readDiskCheckpoint(accountId)?.raw;
      diskValid = true;
    }
  };
  const transact = async <T>(action: (accountId: string, writable: boolean, changed: boolean) => T, stale: () => T): Promise<T> => {
    const scope = state.getOperationScope();
    const run = (writable: boolean): T => {
      const before = state.getOperationScope();
      // Tab switches invalidate queued work even when the user switches away and back.
      if (!sameDemoScope(scope, before)) return stale();
      const changed = writable && syncDisk(scope.accountId);
      if (!sameDemoScope(scope, state.getOperationScope())) {
        if (changed) publish();
        return stale();
      }
      return action(scope.accountId, writable && !volatile.has(scope.accountId), changed);
    };
    if (!locks || volatile.has(scope.accountId)) return run(false);
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
  const expired = (): ExperienceResult => ({
    status: 'expired', snapshot: getSnapshot(), deltaDemoPoints: 0, deltaDemoCoins: 0, deltaDemoDiamonds: 0,
  });
  const mutate = (action: () => ExperienceResult) => transact((accountId, writable, changed) => {
    const result = action();
    if (result.status === 'completed') {
      save(accountId, writable);
      return { ...result, snapshot: publish() };
    }
    return { ...result, snapshot: changed ? publish() : getSnapshot() };
  }, expired);

  syncDisk('guest', true);
  syncEquipment();
  const port = {
    getSnapshot,
    getOperationScope: state.getOperationScope,
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
      const checkpoint = volatile.get(accountId);
      if (checkpoint) state.restoreCheckpoint(checkpoint);
      else syncDisk(accountId, true);
      return publish();
    },
    resetDemo: () => transact((accountId, writable) => {
      state.resetDemo();
      // Persist the new generation atomically, including when the wallet is empty.
      save(accountId, writable);
      return publish();
    }, getSnapshot),
    recordGameEvent: (...args: Parameters<Wave3ExperiencePort['recordGameEvent']>) =>
      mutate(() => state.recordGameEvent(...args)),
    settleCompletion: (...args: Parameters<Wave3ExperiencePort['settleCompletion']>) =>
      mutate(() => state.settleCompletion(...args)),
    claimMission: (...args: Parameters<Wave3ExperiencePort['claimMission']>) =>
      mutate(() => state.claimMission(...args)),
    redeemPreview: (...args: Parameters<Wave3ExperiencePort['redeemPreview']>) =>
      mutate(() => state.redeemPreview(...args)),
    equipPreview: (itemId: string, scope?: ReturnType<typeof state.getOperationScope>) => mutate(() => {
      const result = state.equipPreview(itemId, scope);
      if (result.status === 'completed' || result.status === 'duplicate') equipped = itemId;
      return result;
    }),
    refresh(accountId: string) {
      if (accountId === state.getOperationScope().accountId && syncDisk(accountId)) publish();
    },
  } satisfies Wave3ExperiencePort & Record<string, unknown>;
  return port;
}

export const wave3DemoExperience = createWave3BrowserExperience({
  applyEquipment: typeof window === 'undefined' ? undefined : equipWave3DemoSkin,
  clearEquipment: typeof window === 'undefined' ? undefined : resetWave3DemoSkin,
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === null) wave3DemoExperience.refresh(wave3DemoExperience.getOperationScope().accountId);
    else if (event.key.startsWith(WAVE3_DEMO_STORAGE_PREFIX)) {
      wave3DemoExperience.refresh(event.key.slice(WAVE3_DEMO_STORAGE_PREFIX.length));
    }
  });
}
