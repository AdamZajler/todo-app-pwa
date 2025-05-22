const CACHE_NAME = 'todo-pwa-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/form.html',
    '/api-data.html',
    '/js/form.js',
    '/js/api.js'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalacja');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Otwarto pamięć podręczną:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[Service Worker] Wszystkie zasoby zostały dodane do pamięci podręcznej.');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Błąd podczas dodawania zasobów do pamięci podręcznej:', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Aktywacja');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Usuwanie starej pamięci podręcznej:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Stare pamięci podręczne usunięte.');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    console.log('[Service Worker] Przechwycono żądanie:', event.request.url);

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    console.log('[Service Worker] Zasób znaleziony w pamięci podręcznej:', event.request.url);
                    return response;
                }

                console.log('[Service Worker] Zasób nie znaleziony w pamięci podręcznej, pobieranie z sieci:', event.request.url);
                return fetch(event.request).then(
                    (networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();

                        if (event.request.method === 'GET' && urlsToCache.includes(new URL(event.request.url).pathname)) {
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    console.log('[Service Worker] Dodawanie odpowiedzi sieciowej do pamięci podręcznej:', event.request.url);
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
