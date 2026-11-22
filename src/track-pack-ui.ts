import { getLocale } from './i18n.ts';
import { trackAssetPack } from './track-asset-packs.ts';
import { createTrackPackStore, type PackProgress, type PackStatus, type TrackAssetPack } from './track-pack-store.ts';

type Graphics = { quality: 'low' | 'medium' | 'high'; ultra: boolean };
type UiStatus = PackStatus | 'checking' | 'downloading' | 'error';

/** One accessible download action in the footer; cards only display noninteractive status badges. */
export function setupTrackPackUI(getGraphics: () => Graphics) {
  const cards = [...document.querySelectorAll<HTMLButtonElement>('#lobby-track-options [data-track]')];
  const button = document.querySelector<HTMLButtonElement>('#track-choose-download')!;
  const version = document.querySelector<HTMLElement>('#track-choose-pack-version')!;
  const store = createTrackPackStore();
  const cached = new Map<string, { signature: string; status: UiStatus }>();
  const busy = new Map<string, { signature: string; progress: PackProgress }>();
  let selectedId: string | null = null, supported = false, checking = true, generation = 0;
  const baseUrl = new URL(import.meta.env.BASE_URL, location.href).href;
  const isChinese = (): boolean => getLocale() === 'zh-TW';
  const packFor = (id: string | null): TrackAssetPack | null => {
    if (!id) return null;
    const { quality, ultra } = getGraphics();
    return trackAssetPack(id, quality, ultra);
  };
  const stateFor = (pack: TrackAssetPack): UiStatus => {
    const working = busy.get(pack.trackId);
    if (working?.signature === pack.signature) return 'downloading';
    const saved = cached.get(pack.trackId);
    return saved?.signature === pack.signature ? saved.status : checking ? 'checking' : supported ? 'missing' : 'unavailable';
  };
  function paintCard(id: string, pack: TrackAssetPack | null): void {
    const card = cards.find(card => card.dataset.track === id);
    if (!card || !pack) return;
    let badge = card.querySelector<HTMLElement>('.track-pack-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'track-pack-badge';
      badge.setAttribute('aria-hidden', 'true');
      card.insertBefore(badge, card.lastElementChild);
    }
    const state = stateFor(pack);
    card.dataset.packState = state;
    card.setAttribute('aria-description', `Visual assets ${state} · v${pack.version}`);
    badge.textContent = state === 'ready' ? '✓' : state === 'update' ? '↻' :
      state === 'downloading' || state === 'checking' ? '…' : state === 'unavailable' ? '' : '↓';
    badge.title = `v${pack.version} · ${pack.tier} · ${state}`;
  }
  function paintSelected(): void {
    const pack = packFor(selectedId);
    version.textContent = pack ? `v${pack.version} · ${pack.tier.toUpperCase()} · ${pack.assets.length} ${isChinese() ? '個素材' : 'assets'}` : '';
    if (!pack) { button.hidden = true; return; }
    const state = stateFor(pack);
    const progress = busy.get(pack.trackId)?.progress;
    button.hidden = state === 'ready' || state === 'unavailable' || state === 'checking';
    button.disabled = state === 'downloading';
    const word = state === 'downloading'
      ? `${isChinese() ? '下載中' : 'Downloading'} ${progress?.done ?? 0}/${progress?.total ?? pack.assets.length}`
      : state === 'update' ? isChinese() ? '更新素材' : 'Update assets'
        : state === 'error' ? isChinese() ? '重新下載' : 'Retry download'
          : isChinese() ? '下載素材' : 'Download assets';
    button.querySelector<HTMLElement>('.track-download-label')!.textContent = word;
    button.setAttribute('aria-label', `${word} · v${pack.version}`);
  }
  function paintAll(): void {
    for (const card of cards) paintCard(card.dataset.track!, packFor(card.dataset.track!));
    paintSelected();
  }
  async function refresh(): Promise<void> {
    const current = ++generation;
    if (!supported) { paintAll(); return; }
    const results = await Promise.all(cards.map(async card => {
      const pack = packFor(card.dataset.track!);
      return pack ? { pack, status: await store.status(pack) } : null;
    }));
    if (current !== generation) return;
    for (const entry of results) if (entry && !busy.has(entry.pack.trackId))
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
  } else { checking = false; }
  button.addEventListener('click', async () => {
    const pack = packFor(selectedId);
    if (!supported || !pack || busy.has(pack.trackId)) return;
    const progress: PackProgress = { done: 0, total: pack.assets.length, downloaded: 0, reused: 0 };
    busy.set(pack.trackId, { signature: pack.signature, progress });
    paintAll();
    try {
      await store.download(pack, next => {
        const job = busy.get(pack.trackId);
        if (job?.signature !== pack.signature) return;
        job.progress = next;
        paintSelected();
      });
      cached.set(pack.trackId, { signature: pack.signature, status: await store.status(pack) });
    } catch (error) {
      console.warn('Track asset download failed:', error);
      cached.set(pack.trackId, { signature: pack.signature, status: 'error' });
    } finally {
      busy.delete(pack.trackId);
      paintAll();
    }
  });
  paintAll();
  return {
    stage(id: string | null): void { selectedId = id; paintSelected(); void refresh(); },
    refresh,
  };
}
