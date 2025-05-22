const CACHE_NAME = 'todo-pwa-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icon-512x512.png',
    '/form.html',
    '/api-data.html',
    '/js/form.js',
    '/js/api.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Błąd podczas dodawania zasobów do pamięci podręcznej:', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();

                        if (event.request.method === 'GET' && urlsToCache.includes(new URL(event.request.url).pathname)) {
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('[Service Worker] Błąd pobierania z sieci:', error, event.request.url);
                    return new Response(JSON.stringify({ error: "Brak połączenia z siecią lub błąd pobierania zasobu." }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503,
                        statusText: "Brak połączenia z siecią lub błąd pobierania zasobu."
                    });
                });
            })
    );
});
