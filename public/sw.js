const CACHE_NAME = 'subnote-v2';
// HTMLは毎回ネットワークから取得（Viteがハッシュ付きJSを生成するため古いHTMLをキャッシュしない）
const STATIC_ASSETS = [
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

  // HTMLはネットワーク優先（Viteのハッシュ付きJSと整合性を保つため）
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r ?? fetch(request)))
    );
    return;
  }

  // 静的アセット（JS/CSS/画像）はキャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});

// プッシュ通知受信
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SubNote', {
      body: data.body ?? '',
      icon: data.icon ?? '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/app' },
    })
  );
});

// 通知クリックでアプリを開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url ?? '/app');
      }
    })
  );
});
