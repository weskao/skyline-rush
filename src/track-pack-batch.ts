import type { TrackAssetPack, PackProgress, PackStatus } from './track-pack-store.ts';

export interface BatchProgress {
  completed: number; total: number; activeId: string | null;
  fileDone: number; fileTotal: number; failed: number;
}
type PackWorker = {
  status(pack: TrackAssetPack): Promise<PackStatus>;
  download(pack: TrackAssetPack, progress?: (value: PackProgress) => void, signal?: AbortSignal): Promise<PackProgress>;
};
/** Two independent downloads at a time keep the mobile memory and network bounded. */
export async function downloadTrackPackBatch(
  packs: readonly TrackAssetPack[], worker: PackWorker, progress: (state: BatchProgress) => void,
  settled: (pack: TrackAssetPack, ok: boolean) => void, signal?: AbortSignal, parallel = 1,
): Promise<{ completed: number; total: number; failed: number }> {
  let completed = 0, failed = 0, next = 0;
  const total = packs.length;
  const work = async (): Promise<void> => {
    while (next < total) {
      signal?.throwIfAborted();
      const pack = packs[next++]!;
      const emit = (fileDone: number, fileTotal = pack.assets.length) =>
        progress({ completed, total, activeId: pack.trackId, fileDone, fileTotal, failed });
      emit(0);
      try {
        if (await worker.status(pack) !== 'ready') {
          await worker.download(pack, value => emit(value.done, value.total), signal);
          if (await worker.status(pack) !== 'ready') throw new Error('Track pack incomplete: ' + pack.trackId);
        }
        settled(pack, true);
      } catch (error) {
        if (signal?.aborted) throw error;
        failed++;
        settled(pack, false);
      }
      completed++;
      progress({ completed, total, activeId: null, fileDone: 0, fileTotal: 0, failed });
    }
  };
  await Promise.all(Array.from({ length: Math.min(total, Math.max(1, Math.trunc(parallel))) }, work));
  return { completed, total, failed };
}
