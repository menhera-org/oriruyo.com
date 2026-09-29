const CACHE_NAME = 'oriruyo-v2';
const CACHE_PREFIX = 'oriruyo-';
const APP_ROOT = self.registration.scope;
const APP_SHELL = [
    '',
    'main.js',
    'main.css',
    'manifest.webmanifest',
    'icon.png',
    'icon-192.png',
    'icon-512.png',
].map((path) => new URL(path, APP_ROOT).href);

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        // Keep the previous worker and its complete cache if an update starts offline.
        if (navigator.onLine === false) throw new Error('Offline during installation');
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_SHELL);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

async function offlineResponse(cache, request) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
        const app = await cache.match(APP_ROOT);
        if (app) return app;
    }
    return new Response('Unavailable offline', { status: 503, statusText: 'Offline' });
}

async function updateCache(cache, request) {
    if (navigator.onLine === false) return null;
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok || response.type === 'opaque') {
            try {
                await cache.put(request, response.clone());
            } catch (_) {
                // A full or disabled cache must not discard a usable response.
            }
        }
        return response;
    } catch (_) {
        return null;
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        event.respondWith(navigator.onLine === false
            ? Promise.resolve(new Response('Unavailable offline', { status: 503, statusText: 'Offline' }))
            : fetch(request));
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);

        // In particular, do not start a background refresh while offline.
        if (navigator.onLine === false) {
            return cached || offlineResponse(cache, request);
        }

        if (cached) {
            event.waitUntil(updateCache(cache, request));
            return cached;
        }

        const response = await updateCache(cache, request);
        return response || offlineResponse(cache, request);
    })());
});
