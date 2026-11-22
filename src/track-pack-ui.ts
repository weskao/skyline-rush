import { getLocale } from './i18n.ts';
import { trackAssetPack } from './track-asset-packs.ts';
import { createTrackPackStore, type PackProgress, type PackStatus, type TrackAssetPack } from './track-pack-store.ts';
import { downloadTrackPackBatch, type BatchProgress } from './track-pack-batch.ts';

type Graphics = { quality: 'low' | 'medium' | 'high'; ultra: boolean };
type UiStatus = PackStatus | 'checking' | 'downloading' | 'error';
const RING = 100;

export function setupTrackPackUI(getGraphics: () => Graphics) {
  const cards = [...document.querySelectorAll<HTMLButtonElement>('#lobby-track-options [data-track], #lobby-track-options [data-upcoming-track]')];
  const allButton = document.querySelector<HTMLButtonElement>('#track-choose-download-all')!;
  const summary = document.querySelector<HTMLElement>('#track-choose-pack-summary')!;
  const version = document.querySelector<HTMLElement>('#track-choose-pack-version')!;
  const store = createTrackPackStore();
  const cached = new Map<string, { signature: string; status: UiStatus }>();
  const busy = new Map<string, { signature: string; progress: PackProgress }>();
  let selectedId: string | null = null, supported = false, checking = true, generation = 0;
  let batch: AbortController | null = null, batchProgress: BatchProgress | null = null;
  const baseUrl = new URL(import.meta.env.BASE_URL, location.href).href;
  const chinese = (): boolean => getLocale() === 'zh-TW';
  const idOf = (card: HTMLButtonElement): string => card.dataset.track ?? card.dataset.upcomingTrack ?? '';
  const packFor = (id: string | null): TrackAssetPack | null => {
    if (!id) return null;
    const { quality, ultra } = getGraphics();
    return trackAssetPack(id, quality, ultra);
  };
  const labelOf = (card: HTMLButtonElement): string => card.querySelector('strong')?.textContent ?? idOf(card);
  const stateFor = (pack: TrackAssetPack): UiStatus => {
    if (busy.get(pack.trackId)?.signature === pack.signature) return 'downloading';
    const saved = cached.get(pack.trackId);
    return saved?.signature === pack.signature ? saved.status : checking ? 'checking' : supported ? 'missing' : 'unavailable';
  };
  function ring(node: HTMLElement, percent: number): void {
    const circle = node.querySelector<SVGCircleElement>('.track-pack-ring-fill');
    if (circle) circle.style.strokeDashoffset = String(RING * (1 - Math.max(0, Math.min(1, percent))));
  }
  function paintCard(card: HTMLButtonElement): void {
    const id = idOf(card), pack = packFor(id);
    const control = card.parentElement?.querySelector<HTMLButtonElement>('.track-pack-action');
    if (!control || !pack) return;
    const state = stateFor(pack), progress = busy.get(id)?.progress;
    const fraction = state === 'ready' ? 1 : state === 'downloading' ? (progress?.done ?? 0) / Math.max(1, progress?.total ?? 1) : 0;
    card.dataset.packState = state;
    control.dataset.packState = state;
    control.dataset.packProgress = String(Math.round(100 * fraction));
    control.hidden = state === 'checking' || state === 'unavailable';
    control.disabled = !!batch || state === 'ready' || state === 'downloading';
    ring(control, fraction);
    const stateLabel = state === 'ready' ? chinese() ? '已下載' : 'Downloaded'
      : state === 'update' ? chinese() ? '更新素材' : 'Update assets'
      : state === 'downloading' ? chinese() ? '下載中' : 'Downloading'
      : state === 'error' ? chinese() ? '重新下載' : 'Retry download'
      : chinese() ? '下載素材' : 'Download assets';
    const detail = state === 'downloading' ? ' ' + Math.round(fraction * 100) + '%' : '';
    control.setAttribute('aria-label', labelOf(card) + ' · ' + stateLabel + detail + ' · v' + pack.version);
    control.title = stateLabel + detail + ' · v' + pack.version;
    card.setAttribute('aria-description', stateLabel + ' · v' + pack.version);
  }
  function paintSummary(): void {
    const packs = cards.map(card => packFor(idOf(card))).filter((pack): pack is TrackAssetPack => !!pack);
    const ready = packs.filter(pack => stateFor(pack) === 'ready').length;
    const fraction = batchProgress && batchProgress.total
      ? (batchProgress.completed + batchProgress.fileDone / Math.max(1, batchProgress.fileTotal)) / batchProgress.total
      : packs.length ? ready / packs.length : 0;
    const active = !!batch;
    const label = active ? chinese() ? '取消下載' : 'Cancel downloads'
      : ready === packs.length ? chinese() ? '全部已下載' : 'All downloaded'
      : chinese() ? '下載全部' : 'Download all';
    allButton.hidden = !supported || checking || !packs.length;
    allButton.disabled = !active && ready === packs.length;
    allButton.dataset.packState = !active && ready === packs.length ? 'ready' : active ? 'downloading' : 'missing';
    allButton.querySelector<HTMLElement>('.track-download-label')!.textContent = label;
    allButton.setAttribute('aria-label', label + ' · ' + ready + '/' + packs.length);
    ring(allButton, fraction);
    summary.textContent = active && batchProgress
      ? (chinese() ? '下載進度 ' : 'Downloaded ') + batchProgress.completed + '/' + batchProgress.total +
        (batchProgress.failed ? ' · ' + batchProgress.failed + (chinese() ? ' 張失敗' : ' failed') : '')
      : ready + '/' + packs.length + (chinese() ? ' 張已下載' : ' downloaded');
  }
  function paintAll(): void {
    for (const card of cards) paintCard(card);
    const selected = packFor(selectedId);
    version.textContent = selected ? 'v' + selected.version + ' · ' + selected.tier.toUpperCase() + ' · ' +
      selected.assets.length + (chinese() ? ' 個素材' : ' assets') : '';
    paintSummary();
  }
  async function refresh(): Promise<void> {
    const current = ++generation;
    if (!supported) { paintAll(); return; }
    const result = await Promise.all(cards.map(async card => {
      const pack = packFor(idOf(card));
      return pack ? { pack, status: await store.status(pack) === 'missing' && await store.updateRequired(pack) ? 'update' as const : await store.status(pack) } : null;
    }));
    if (current !== generation) return;
    for (const entry of result) if (entry && !busy.has(entry.pack.trackId))
      cached.set(entry.pack.trackId, { signature: entry.pack.signature, status: entry.status });
    paintAll();
  }
  const usable = 'caches' in globalThis && 'serviceWorker' in navigator && globalThis.isSecureContext;
  if (usable) {
    void navigator.serviceWorker.register(new URL('track-asset-sw.js', baseUrl).href, { scope: baseUrl })
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
          const timeout = setTimeout(resolve, 3000);
          navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(timeout); resolve(); }, { once: true });
        });
        supported = !!navigator.serviceWorker.controller;
      })
      .catch(error => console.warn('Track asset downloads unavailable:', error))
      .finally(() => { checking = false; void refresh(); });
  } else checking = false;

  async function publishCached(pack: TrackAssetPack): Promise<void> {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return;
    await new Promise<void>(resolve => {
      const channel = new MessageChannel();
      let complete = false;
      const done = () => {
        if (complete) return;
        complete = true; clearTimeout(timeout); channel.port1.close(); resolve();
      };
      const timeout = setTimeout(done, 1000);
      channel.port1.onmessage = done;
      controller.postMessage({ type: 'track-pack-index-updated',
        urls: pack.assets.map(asset => new URL(asset.url, baseUrl).href) }, [channel.port2]);
    });
  }
  async function install(pack: TrackAssetPack, onProgress?: (progress: PackProgress) => void, signal?: AbortSignal): Promise<PackProgress> {
    const progress: PackProgress = { done: 0, total: pack.assets.length, downloaded: 0, reused: 0 };
    busy.set(pack.trackId, { signature: pack.signature, progress });
    paintAll();
    try {
      const result = await store.download(pack, next => {
        const current = busy.get(pack.trackId);
        if (current?.signature !== pack.signature) return;
        current.progress = next;
        onProgress?.(next);
        const card = cards.find(card => idOf(card) === pack.trackId);
        if (card) paintCard(card);
        if (!batch) paintSummary();
      }, signal);
      await publishCached(pack);
      cached.set(pack.trackId, { signature: pack.signature, status: await store.status(pack) });
      return result;
    } catch (error) {
      if (!signal?.aborted) cached.set(pack.trackId, { signature: pack.signature, status: 'error' });
      throw error;
    } finally {
      busy.delete(pack.trackId);
      paintAll();
    }
  }
  for (const card of cards) {
    const action = card.parentElement?.querySelector<HTMLButtonElement>('.track-pack-action');
    action?.addEventListener('click', () => {
      const pack = packFor(idOf(card));
      if (!supported || !pack || batch || busy.has(pack.trackId) || stateFor(pack) === 'ready') return;
      void install(pack).catch(error => console.warn('Track asset download failed:', error));
    });
  }
  allButton.addEventListener('click', async () => {
    if (batch) { batch.abort(); return; }
    if (!supported) return;
    await refresh();
    if (batch) return;
    const packs = cards.map(card => packFor(idOf(card))).filter((pack): pack is TrackAssetPack => !!pack);
    if (!packs.some(pack => stateFor(pack) !== 'ready')) return;
    const current = batch = new AbortController();
    batchProgress = { completed: 0, total: packs.length, activeId: null, fileDone: 0, fileTotal: 0, failed: 0 };
    paintAll();
    try {
      await downloadTrackPackBatch(packs, {
        status: pack => store.status(pack),
        download: (pack, progress, signal) => install(pack, progress, signal),
      }, progress => { batchProgress = progress; paintSummary(); },
      (pack, ok) => {
        cached.set(pack.trackId, { signature: pack.signature, status: ok ? 'ready' : 'error' });
        paintAll();
      }, current.signal);
    } catch (error) {
      if (!current.signal.aborted) console.warn('Track batch download failed:', error);
    } finally {
      if (batch === current) { batch = null; batchProgress = null; }
      void refresh();
    }
  });
  /** A native modal prevents START/restart when a previously installed track has a newer asset release. */
  let pendingGate: Promise<boolean> | null = null;
  function requireUpdated(id: string): Promise<boolean> {
    if (pendingGate) return pendingGate;
    const pack = packFor(id);
    if (!pack) return Promise.resolve(true);
    return store.updateRequired(pack).then(required => {
      if (!required) return true; // no previous installation: online START remains available
      if (pendingGate) return pendingGate;
      pendingGate = new Promise<boolean>(resolve => {
        let dialog = document.querySelector<HTMLDialogElement>('#track-required-update');
        if (!dialog) {
          dialog = document.createElement('dialog');
          dialog.id = 'track-required-update';
          dialog.setAttribute('aria-labelledby', 'track-update-title');
          dialog.innerHTML = '<h2 id="track-update-title"></h2><p id="track-update-message"></p>' +
            '<p id="track-update-progress" role="status" aria-live="polite"></p>' +
            '<div class="track-update-actions"><button id="track-update-cancel" type="button"></button>' +
            '<button id="track-update-now" type="button"></button></div>';
          document.body.append(dialog);
        }
        const title = dialog.querySelector<HTMLElement>('#track-update-title')!;
        const info = dialog.querySelector<HTMLElement>('#track-update-message')!;
        const progress = dialog.querySelector<HTMLElement>('#track-update-progress')!;
        const cancel = dialog.querySelector<HTMLButtonElement>('#track-update-cancel')!;
        const update = dialog.querySelector<HTMLButtonElement>('#track-update-now')!;
        const name = cards.find(card => idOf(card) === id);
        title.textContent = chinese() ? '必須更新賽道' : 'Track update required';
        info.textContent = (name ? labelOf(name) + ' · ' : '') + 'v' + pack.version + ' · ' +
          (chinese() ? '請先完成新版本素材更新，才能進入賽道。' : 'Update this map before racing.');
        progress.textContent = chinese() ? '準備更新…' : 'Ready to update';
        cancel.textContent = chinese() ? '稍後再說' : 'Not now';
        update.textContent = chinese() ? '立即更新' : 'Update now';
        const controller = new AbortController();
        let done = false;
        const finish = (allowed: boolean): void => {
          if (done) return;
          done = true;
          controller.abort();
          dialog.close();
          resolve(allowed);
        };
        cancel.onclick = () => finish(false);
        dialog.oncancel = event => { event.preventDefault(); finish(false); };
        update.onclick = async () => {
          update.disabled = true;
          try {
            await install(pack, state => {
              progress.textContent = (chinese() ? '正在更新 ' : 'Updating ') +
                state.done + '/' + state.total + ' (' + Math.round(100 * state.done / Math.max(1, state.total)) + '%)';
            }, controller.signal);
            if (await store.status(pack) !== 'ready' || await store.updateRequired(pack)) throw Error('Updated pack did not validate');
            finish(true);
          } catch (error) {
            if (controller.signal.aborted) return;
            progress.textContent = chinese() ? '更新失敗，請確認網路後重試。' : 'Update failed. Check your connection and retry.';
            console.warn('Track version update failed:', error);
            update.disabled = false;
          }
        };
        update.disabled = false;
        dialog.showModal();
        update.focus();
      }).finally(() => { pendingGate = null; });
      return pendingGate;
    });
  }
  paintAll();
  return {
    stage(id: string | null): void { selectedId = id; paintAll(); void refresh(); },
    refresh, requireUpdated,
  };
}
