// DCC v3 Service Worker - forces fresh fetch on every load, kills iOS PWA cache
// Generation is bumped by each DCC scheduled task push, invalidating old caches.

const VERSION = self.location.search.match(/v=([^&]+)/)?.[1] || 'unknown';
const CACHE_NAME = `dcc-v3-${VERSION}`;

self.addEventListener('install', (e) => {
  // Skip waiting so the new SW takes over immediately on next page load
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Take control of all clients right away
  e.waitUntil(
    (async () => {
      // Delete ALL old caches
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first for HTML to ensure freshness. Cache only as fallback.
  const url = new URL(e.request.url);
  const isHTML = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(resp => {
          // Cache the latest copy for offline fallback
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, respClone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  }
  // Other assets (icon, manifest): cache-first, fall back to network
});
