// Service worker for Raicilabs POS.
//
// Uses Workbox via vite-plugin-pwa's injectManifest strategy. The
// pre-cache manifest is injected at build time; runtime caching handles
// Google Fonts (Inter, Material Symbols) so the app stays usable
// offline.

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// __WB_MANIFEST is replaced by vite-plugin-pwa at build time with the
// list of build assets (JS/CSS/HTML/icons) to pre-cache. In dev mode
// (vite dev server), the placeholder is an empty array — that's fine;
// the SW just won't pre-cache anything and the app serves from the
// dev server directly.
//
// IMPORTANT: vite-plugin-pwa scans for a literal `self.__WB_MANIFEST`
// token in the source to know where to inject. Don't reformat this.
self.addEventListener('install', (event) => {
  try {
    precacheAndRoute(self.__WB_MANIFEST || []);
  } catch (e) {
    console.warn('[sw] precache failed:', e);
  }
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Runtime: cache Google Fonts stylesheets (StaleWhileRevalidate).
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'raicilabs-fonts-stylesheets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// Runtime: cache Google Fonts font files (CacheFirst — they're immutable
// versioned URLs).
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'raicilabs-fonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// Let the page take over immediately on a new SW version.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
