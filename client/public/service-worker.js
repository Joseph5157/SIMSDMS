// Versioned cache names for service worker updates
// Increment version number to bust cache on deployment
const CACHE_VERSION = 'v2';
const CACHE_NAME = `sims-dms-${CACHE_VERSION}`;
const API_CACHE_NAME = `sims-dms-api-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event: cache initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Failed to cache initial assets:', err);
        // Don't fail installation if some assets can't be cached
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event: clean old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Control all clients immediately
});

// Fetch event: implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // DO NOT cache EventSource/SSE connections (real-time streaming)
  if (url.pathname.includes('/stream')) {
    return; // Let browser handle streaming natively
  }

  // API calls: NetworkFirst strategy (try network, fall back to cache)
  // WARNING: Authenticated API responses are being cached — ensure this doesn't expose sensitive data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }

  // HTML pages: NetworkFirst with timeout (try network with 3s timeout, then cache)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithTimeoutStrategy(request, CACHE_NAME, 3000));
    return;
  }

  // Assets (JS, CSS, images, fonts): CacheFirst strategy (cache, fall back to network)
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.eot')
  ) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  // Default: NetworkFirst
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

/**
 * NetworkFirst: Try network first, fall back to cache
 */
function networkFirstStrategy(request, cacheName) {
  return fetch(request)
    .then((response) => {
      // Only cache successful responses
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }

      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache);
      });

      return response;
    })
    .catch(() => {
      return caches.match(request).then((response) => {
        return response || new Response('Offline - no cached version available', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    });
}

/**
 * NetworkFirst with timeout: Try network with timeout, fall back to cache
 */
function networkFirstWithTimeoutStrategy(request, cacheName, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timeoutId = setTimeout(() => {
      timeoutId = null;
      caches.match(request).then((response) => {
        resolve(response || new Response('Offline - no cached version', { status: 503 }));
      });
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (!response || response.status !== 200 || response.type === 'error') {
          resolve(response);
          return;
        }

        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });

        resolve(response);
      })
      .catch((err) => {
        if (timeoutId) clearTimeout(timeoutId);

        caches.match(request).then((response) => {
          resolve(response || new Response('Offline', { status: 503 }));
        });
      });
  });
}

/**
 * CacheFirst: Try cache first, fall back to network
 */
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }

    return fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        return new Response('Offline - asset not cached', { status: 503 });
      });
  });
}
