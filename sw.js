
const CACHE_NAME = 'flameup-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/assets/logo-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                    return caches.delete(cacheName);
                }
                })
            );
        }),
        self.clients.claim() // Take control of all clients immediately
    ])
  );
});