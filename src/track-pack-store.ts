/** Browser-persistent, content-addressed visual assets; HTTP cache alone does not prove a pack is installed. */
export const ASSET_CACHE = 'skyline-rush:track-assets:v1';
export const INDEX_CACHE = 'skyline-rush:track-asset-index:v1';
export const PACK_CACHE = 'skyline-rush:track-pack-receipts:v1';

export interface TrackPackAsset { url: string; sha256: string; bytes: number; revision?: string }
export interface TrackAssetPack {
  trackId: string; version: string; tier: 'low' | 'medium' | 'high' | 'ultra'; preset: string;
  signature: string; assets: readonly TrackPackAsset[];
}
export type PackStatus = 'missing' | 'update' | 'ready' | 'unavailable';
export interface PackProgress { done: number; total: number; downloaded: number; reused: number }

/** The runtime requests a canonical path; the service worker resolves it through INDEX_CACHE. */
export function assetCacheKey(baseUrl: string, asset: TrackPackAsset, version: string): string {
  const url = new URL(asset.url, baseUrl);
  url.searchParams.set('__srpack', asset.sha256 || asset.revision || version);
  return url.href;
}

export function createTrackPackStore({
  storage = globalThis.caches, baseUrl = new URL(import.meta.env?.BASE_URL ?? '/', globalThis.location?.href ?? 'http://localhost/').href,
  fetchAsset = globalThis.fetch,
}: { storage?: Pick<CacheStorage, 'open'>; baseUrl?: string; fetchAsset?: typeof fetch } = {}) {
  const working = new Map<string, Promise<PackProgress>>();
  let cleanup = Promise.resolve();
  const receiptKey = (pack: TrackAssetPack): string => new URL(
    `.skyline-packs/${encodeURIComponent(pack.trackId)}/${pack.tier}/${encodeURIComponent(pack.preset)}`, baseUrl,
  ).href;
  const sourceKey = (asset: TrackPackAsset): string => new URL(asset.url, baseUrl).href;
  const key = (pack: TrackAssetPack, asset: TrackPackAsset): string => assetCacheKey(baseUrl, asset, pack.version);

  async function status(pack: TrackAssetPack): Promise<PackStatus> {
    if (!storage) return 'unavailable';
    try {
      const receipts = await storage.open(PACK_CACHE);
      const stored = await receipts.match(receiptKey(pack));
      if (!stored) return 'missing';
      const receipt = await stored.json() as { signature?: string };
      if (receipt.signature !== pack.signature) return 'update';
      const assets = await storage.open(ASSET_CACHE), index = await storage.open(INDEX_CACHE);
      for (const asset of pack.assets) {
        const assetKey = key(pack, asset);
        if (!await assets.match(assetKey)) return 'missing';
        const mapped = await index.match(sourceKey(asset));
        if (!mapped || await mapped.text() !== assetKey) return 'update';
      }
      return 'ready';
    } catch { return 'unavailable'; }
  }

  /** An existing installation must be updated before this track can enter a race.
   * An uninstalled track remains playable online without a forced initial download. */
  async function updateRequired(pack: TrackAssetPack): Promise<boolean> {
    if (!storage) return false;
    try {
      const receipts = await storage.open(PACK_CACHE);
      for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
        const saved = await receipts.match(receiptKey({ ...pack, tier }));
        if (!saved) continue;
        const record = await saved.json() as { version?: string; signature?: string };
        if (record.version !== pack.version || tier === pack.tier && record.signature !== pack.signature) return true;
      }
    } catch { /* Browsers can disable persistent storage; never block first-time online play. */ }
    return false;
  }

  async function install(pack: TrackAssetPack, onProgress?: (state: PackProgress) => void, signal?: AbortSignal): Promise<PackProgress> {
    if (!storage) throw new Error('Track asset storage is unavailable');
    const assets = await storage.open(ASSET_CACHE), index = await storage.open(INDEX_CACHE);
    const progress: PackProgress = { done: 0, total: pack.assets.length, downloaded: 0, reused: 0 };
    for (const asset of pack.assets) {
      signal?.throwIfAborted();
      const assetKey = key(pack, asset);
      if (await assets.match(assetKey)) {
        progress.reused++;
      } else {
        const url = new URL(asset.url, baseUrl);
        url.searchParams.set('__srpack_download', asset.sha256 || asset.revision || pack.version);
        const response = await fetchAsset(url.href, { cache: 'reload', signal });
        if (response.status !== 200 || response.type === 'opaque') throw new Error(`Track asset download failed: ${asset.url} (${response.status})`);
        const bytes = await response.arrayBuffer();
        if (asset.sha256) {
          const digest = await crypto.subtle.digest('SHA-256', bytes);
          const actual = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
          if (actual !== asset.sha256) throw new Error(`Track asset checksum mismatch: ${asset.url}`);
        }
        await assets.put(assetKey, new Response(bytes, { status: 200,
          headers: { 'content-type': response.headers.get('content-type') ?? 'application/octet-stream' } }));
        progress.downloaded++;
      }
      progress.done++;
      onProgress?.({ ...progress });
    }
    // Publish each canonical path only after its verified body exists; commit the receipt last.
    for (const asset of pack.assets) await index.put(sourceKey(asset), new Response(key(pack, asset)));
    const receipts = await storage.open(PACK_CACHE);
    await receipts.put(receiptKey(pack), new Response(JSON.stringify({ signature: pack.signature, version: pack.version,
      keys: pack.assets.map(asset => key(pack, asset)) })));
    // A successful update supersedes older releases at other quality tiers too.
    for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
      if (tier === pack.tier) continue;
      const at = receiptKey({ ...pack, tier });
      const previous = await receipts.match(at);
      if (previous && (await previous.json() as { version?: string }).version !== pack.version) await receipts.delete(at);
    }
    return progress;
  }

  /** Reclaim only unreferenced bytes. Each installed pack retains shared content used by another map. */
  async function pruneUnused(): Promise<void> {
    if (!storage) return;
    const receipts = await storage.open(PACK_CACHE), assets = await storage.open(ASSET_CACHE);
    const referenced = new Set<string>();
    for (const request of await receipts.keys()) {
      const saved = await (await receipts.match(request))?.json() as { keys?: string[] } | undefined;
      for (const key of saved?.keys ?? []) referenced.add(key);
    }
    for (const request of await assets.keys()) if (!referenced.has(request.url)) await assets.delete(request);
    const index = await storage.open(INDEX_CACHE);
    for (const request of await index.keys()) {
      const mapped = await (await index.match(request))?.text();
      if (!mapped || !referenced.has(mapped)) await index.delete(request);
    }
  }

  return {
    status, updateRequired,
    download(pack: TrackAssetPack, onProgress?: (state: PackProgress) => void, signal?: AbortSignal): Promise<PackProgress> {
      const existing = working.get(pack.signature);
      if (existing) return existing;
      // New installs must not publish bytes while cleanup uses an older receipt snapshot.
      const task = cleanup.then(() => install(pack, onProgress, signal)).finally(async () => {
        if (working.get(pack.signature) === task) working.delete(pack.signature);
        if (!working.size) {
          cleanup = pruneUnused().catch(error => console.warn('Track cache cleanup skipped:', error));
          await cleanup;
        }
      });
      working.set(pack.signature, task);
      return task;
    },
  };
}
