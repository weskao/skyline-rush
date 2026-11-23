import type { TrackAssetPack, PackProgress, PackStatus } from './track-pack-store.ts';

export interface BatchProgress {
  completed: number; total: number; activeId: string | null;
  fileDone: number; fileTotal: number; failed: number;
  /** Sum of fractional completion for all actively downloading maps. */
  activeFraction: number;
}
type PackWorker = {
  status(pack: TrackAssetPack): Promise<PackStatus>;
  download(pack: TrackAssetPack, progress?: (value: PackProgress) => void, signal?: AbortSignal): Promise<PackProgress>;
};
/** Download All cannot start more than ten map installations simultaneously. */
export const MAX_CONCURRENT_TRACK_DOWNLOADS = 10;
export async function downloadTrackPackBatch(
  packs: readonly TrackAssetPack[], worker: PackWorker, progress: (state: BatchProgress) => void,
  settled: (pack: TrackAssetPack, ok: boolean) => void, signal?: AbortSignal, parallel = 1,
): Promise<{ completed: number; total: number; failed: number }> {
  let completed = 0, failed = 0, next = 0;
  const total = packs.length;
  const active = new Map<string, number>();
  const activeFraction = (): number => [...active.values()].reduce((sum, value) => sum + value, 0);
  const work = async (): Promise<void> => {
    while (next < total) {
      signal?.throwIfAborted();
      const pack = packs[next++]!;
      const emit = (fileDone: number, fileTotal = pack.assets.length) => {
        active.set(pack.trackId, Math.max(0, Math.min(1, fileDone / Math.max(1, fileTotal))));
        progress({ completed, total, activeId: pack.trackId, fileDone, fileTotal, failed, activeFraction: activeFraction() });
      };
      emit(0);
      try {
        if (await worker.status(pack) !== 'ready') {
          await worker.download(pack, value => emit(value.done, value.total), signal);
          if (await worker.status(pack) !== 'ready') throw new Error('Track pack incomplete: ' + pack.trackId);
        }
        signal?.throwIfAborted();
        settled(pack, true);
      } catch (error) {
        if (signal?.aborted) throw error;
        failed++;
        settled(pack, false);
      }
      completed++;
      active.delete(pack.trackId);
      progress({ completed, total, activeId: null, fileDone: 0, fileTotal: 0, failed, activeFraction: activeFraction() });
    }
  };
  await Promise.all(Array.from({ length: Math.min(total, MAX_CONCURRENT_TRACK_DOWNLOADS, Math.max(1, Math.trunc(parallel))) }, work));
  return { completed, total, failed };
}
