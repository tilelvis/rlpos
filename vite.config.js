import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Vite + PWA build for Raicilabs POS.
//
// Output is a pure static bundle (HTML + JS + CSS + service worker) that
// can be deployed to Vercel, Netlify, GitHub Pages, or any static host.
// HTTPS is required for WebUSB — Vercel and Netlify give you that for free.
//
// TAURI_BUILD=true skips the PWA/service-worker plugin entirely. When
// this bundle is wrapped by Tauri (see src-tauri/), every file already
// ships inside the installed .exe — there's no "first load" to precache
// and no remote host to go offline from. Registering a service worker
// there adds no offline benefit and reintroduces the one real risk this
// project works hard to avoid: a webview left running an old cached
// build after a newer version is installed alongside it.
const isTauriBuild = process.env.TAURI_BUILD === 'true';

export default defineConfig({
  base: './',
  // IMPORTANT: explicitly set an empty PostCSS config object. Without
  // this, Vite walks UP the directory tree looking for a postcss.config
  // file — and if there's a stray postcss.config.{js,mjs,cjs} in any
  // parent folder (e.g. C:\Users\<you>\Downloads\postcss.config.mjs),
  // Vite will pick THAT up instead of using its built-in CSS handling.
  // That parent config might reference plugins this project doesn't
  // have, causing the build to crash with "Invalid PostCSS Plugin
  // found at: plugins[0]". Setting `css.postcss` to an empty object
  // here tells Vite "this project has no PostCSS plugins, don't
  // search any further."
  css: {
    postcss: {},
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  plugins: [
    ...(isTauriBuild ? [] : [VitePWA({
      // Use injectManifest strategy so we control the service worker file
      // directly (needed for POS-specific caching: app shell + indexedDB
      // backed localStorage fallback for offline use).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.png', 'logo.png', 'icons/Icon-192.png', 'icons/Icon-512.png'],
      manifest: {
        name: 'Raicilabs POS',
        short_name: 'Raicilabs POS',
        description: 'Point of Sale by Raicilabs — login to printed receipt in under 30 seconds.',
        start_url: '/#/dashboard',
        scope: '/',
        id: 'raicilabs-pos',
        display: 'standalone',
        background_color: '#F7F4EE',
        theme_color: '#C0392B',
        orientation: 'any',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'icons/Icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/Icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/Icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/Icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Maximum cache size for runtime caching
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })]),
  ],
  server: {
    port: 5173,
    host: true,
    // WebUSB requires HTTPS or localhost. Vite dev server on localhost is
    // considered a secure context, so WebUSB will work out of the box.
    https: false,
  },
});
