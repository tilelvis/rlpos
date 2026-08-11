// Raicilabs POS service worker.
//
// The POS is completely self-contained. All application assets are
// precached so the application continues working without internet.

import { precacheAndRoute } from 'workbox-precaching';

// vite-plugin-pwa replaces self.__WB_MANIFEST with the generated
// list of application assets during production build.
precacheAndRoute(self.__WB_MANIFEST || []);

// Activate a newly installed service worker immediately.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Take control of existing POS pages immediately.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Allow the application to explicitly request immediate activation.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
