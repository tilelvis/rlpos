// Service worker for Raicilabs POS.
//
// Uses Workbox via vite-plugin-pwa's injectManifest strategy. The
// pre-cache manifest is injected at build time and covers the ENTIRE
// app shell: JS, CSS, HTML, icons, and the self-hosted JetBrains Mono
// font files (see src/main.js -> @fontsource/jetbrains-mono). There is no runtime
// caching of any third-party origin, because the app makes zero
// requests to third-party origins — everything the app needs ships
// in the same build and is precached on install. This is intentional:
// a POS terminal must keep working the moment the network drops, even
// if it has never had a network connection at all.

import { precacheAndRoute } from 'workbox-precaching';

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

// Let the page take over immediately on a new SW version.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
