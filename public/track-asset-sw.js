/* A cache hit is handled by this worker; a cold request keeps the native fetch path and routing hooks. */
const ASSET_CACHE = 'skyline-rush:track-assets:v1';
const INDEX_CACHE = 'skyline-rush:track-asset-index:v1';
const scope = new URL(self.registration.scope);
const allowed = /^(models|materials|environments|track-teasers)\//;
const indexed = new Set();
const hydrate = async () => {
  try { for (const request of await (await caches.open(INDEX_CACHE)).keys()) indexed.add(request.url); }
  catch { /* No persistent storage; pass all traffic to the normal fetch path. */ }
};
void hydrate(); // The worker may be restarted without a new activate event.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(hydrate().then(() => self.clients.claim())));
self.addEventListener('message', event => {
  if (event.data?.type !== 'track-pack-index-updated' || !Array.isArray(event.data.urls)) return;
  for (const raw of event.data.urls) {
    const url = new URL(raw, scope);
    if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname) &&
        allowed.test(url.pathname.slice(scope.pathname.length))) indexed.add(url.href);
  }
  event.ports?.[0]?.postMessage({ ok: true });
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('range') || url.origin !== scope.origin ||
      !url.pathname.startsWith(scope.pathname) || url.search ||
      !allowed.test(url.pathname.slice(scope.pathname.length)) || !indexed.has(request.url)) return;
  event.respondWith((async () => {
    try {
      const receipt = await (await caches.open(INDEX_CACHE)).match(request.url);
      if (receipt) {
        const cached = await (await caches.open(ASSET_CACHE)).match(await receipt.text());
        if (cached) return cached;
      }
    } catch { /* Cache eviction or unavailable storage. */ }
    indexed.delete(request.url);
    return fetch(request);
  })());
});
