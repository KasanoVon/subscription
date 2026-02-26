const CACHE_NAME = 'subnote-v1';
const STATIC_ASSETS = [
  '/',
  '/app',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエストはキャッシュしない（常にネットワーク）
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // その他はキャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});
