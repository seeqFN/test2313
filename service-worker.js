const CACHE_NAME = 'larpzwallet-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service-worker.js',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const network = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      if (event.request.url.startsWith(self.location.origin)) {
        cache.put(event.request, network.clone());
      }
      return network;
    } catch (error) {
      const fallback = await caches.match('/index.html');
      return fallback || Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Wallet Update', body: event.data ? event.data.text() : 'You have a new notification.' };
  }

  const title = payload.title || 'Wallet Update';
  const options = {
    body: payload.body || 'You have a new notification.',
    icon: payload.icon,
    badge: payload.badge,
    data: payload.data || {},
    tag: payload.tag || 'wallet-push',
    renotify: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
      return null;
    })
  );
});
