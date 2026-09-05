// First-run seeding (port of lib/core/services/seed_service.dart).
//
// Only the business profile is seeded with defaults so the Settings page
// has something to display. Login accounts are NOT seeded here — a fresh
// install (or a post-reset device) has zero users on purpose, and main.js
// routes straight to the first-run admin setup screen until one exists.
// See src/features/auth/first-run-setup.js.

import { StorageService } from './storage.js';

let _seeded = false;

export const SeedService = {
  async ensureSeeded({ force = false } = {}) {
    if (_seeded && !force) return;
    _seeded = true;

    // Persist default business profile if missing.
    const current = StorageService.business;
    await StorageService.saveBusiness(current);
  },
};
