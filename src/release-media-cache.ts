// Release clips live under public/whats-new/<version>/ and never change once shipped, so each one is
// downloaded once, kept in Cache Storage across visits and replayed from an in-memory object URL.
// Only clips of releases still shown are kept; any failure falls back to the plain network address.
export const RELEASE_MEDIA_CACHE = 'skyline-rush-whats-new-media-v1';

interface ReleaseMediaCacheDeps {
  caches?: Pick<CacheStorage, 'open'> | undefined; // missing outside secure contexts (plain-http LAN dev server)
  fetch: (url: string) => Promise<Response>;
  createObjectURL: (blob: Blob) => string;
}

export function createReleaseMediaCache(keep: ReadonlySet<string>, { caches, fetch, createObjectURL }: ReleaseMediaCacheDeps) {
  // Object URLs live for the page lifetime: at most one per clip actually viewed (< 1 MB each).
  const urls = new Map<string, string>();
  const pending = new Map<string, Promise<string>>();
  let store: Promise<Cache | null> | null = null;
  // Opened (and pruned) lazily on the first clip, never on page load.
  const open = () => store ??= (async () => {
    if (!caches) return null;
    const cache = await caches.open(RELEASE_MEDIA_CACHE);
    for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request);
    return cache;
  })().catch(() => null);

  async function download(src: string): Promise<string> {
    try {
      const cache = await open();
      let response = await cache?.match(src);
      if (!response) {
        response = await fetch(src);
        if (!response.ok) throw new Error(`clip ${response.status}`);
        await cache?.put(src, response.clone()).catch(() => { /* quota: still play it this visit */ });
      }
      const url = createObjectURL(await response.blob());
      urls.set(src, url);
      return url;
    } catch {
      pending.delete(src); // retried on the next open
      return src;
    }
  }

  return {
    peek: (src: string): string | null => urls.get(src) ?? null,
    load(src: string): Promise<string> {
      let job = pending.get(src);
      if (!job) pending.set(src, job = download(src));
      return job;
    },
  };
}
