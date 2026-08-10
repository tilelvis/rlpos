// App entry point. Initialises storage, seeds default users, wires the
// auth bridge, boots the router, and hides the loading screen.
//
// Port of lib/main.dart (Flutter).

import './styles/main.css';

import { SeedService } from './core/services/seed.js';
import { StorageService } from './core/services/storage.js';
import { wireAuthToStorageService } from './core/store.js';
import { AuthProvider } from './core/providers/auth.js';
import { registerRoutes } from './routes.js';
import { bootRouter } from './core/router.js';

async function main() {
  // Wire the auth bridge to StorageService.
  wireAuthToStorageService(StorageService);

  // Seed default users / business profile on first run.
  await SeedService.ensureSeeded();

  // Try restoring a previous session.
  AuthProvider.restore();

  // Register all routes (login, dashboard, orders, etc.).
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
