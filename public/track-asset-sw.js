/* One scoped worker for downloaded track visuals. Normal gameplay always falls back to the network. */
const ASSET_CACHE = 'skyline-rush:track-assets:v1';
const INDEX_CACHE = 'skyline-rush:track-asset-index:v1';
const scope = new URL(self.registration.scope);
const allowed = /^(models|materials|environments|track-teasers)\//;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('range') || url.origin !== scope.origin ||
      !url.pathname.startsWith(scope.pathname) || url.search || !allowed.test(url.pathname.slice(scope.pathname.length))) return;
  event.respondWith((async () => {
    try {
      const index = await caches.open(INDEX_CACHE);
      const receipt = await index.match(request.url);
      if (receipt) {
        const key = await receipt.text();
        const cached = await (await caches.open(ASSET_CACHE)).match(key);
        if (cached) return cached;
      }
    } catch { /* Browser may evict caches. Online load must still work. */ }
    return fetch(request);
  })());
});
