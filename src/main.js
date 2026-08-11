// App entry point. Initialises storage, seeds default users, wires the
// auth bridge, boots the router, and hides the loading screen.
//
// Port of lib/main.dart (Flutter).

// Self-hosted JetBrains Mono, used as the whole-app UI font (see
// --font-sans in styles/main.css). Bundled from node_modules — same
// origin at runtime, no CDN request, ever. The receipt/mono elements
// use a separate system-monospace stack (--font-mono), untouched here.
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';

import './styles/main.css';

import { SeedService } from './core/services/seed.js';
import { StorageService } from './core/services/storage.js';
import { wireAuthToStorageService } from './core/store.js';
import { AuthProvider } from './core/providers/auth.js';
import { registerRoutes } from './routes.js';
import { bootRouter } from './core/router.js';

async function main() {
  // If a new service worker takes control while this page is open,
  // reload once so the POS immediately uses the new application build.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
  // Wire the auth bridge to StorageService.
  wireAuthToStorageService(StorageService);

  // Seed default users / business profile on first run.
  await SeedService.ensureSeeded();

  // Restore a previous admin/cashier session. Only admin + cashier
  // sessions are restored — waiters are transient (they sign in via
  // the Complete Sale signature flow and auto-logout after print).
  // See AuthProvider.restore() for the filtering logic.
  AuthProvider.restore();

  // Register all routes.
  registerRoutes();

  // Boot the router — this renders the first screen.
  bootRouter();

  // Hide the loading screen once the first screen has mounted.
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 500);
  }
}

main().catch((e) => {
  console.error('[boot] fatal:', e);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <h1 style="color:#C0392B">Failed to start</h1>
      <p style="max-width: 320px; text-align: center;">${String(e?.message || e).replace(/</g, '&lt;')}</p>
      <p style="font-size:12px; color:#6B6357;">Open the browser console for details.</p>
    `;
  }
});
