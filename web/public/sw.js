const CACHE = 'boards-v1';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;           // never cache favicons/CDNs
  const isAsset = url.pathname.startsWith('/assets/');
  e.respondWith(
    caches.match(request).then((hit) => {
      if (hit && isAsset) return hit;                      // hashed → immutable
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('/index.html')));
    })
  );
});
