// First-run seeding (port of lib/core/services/seed_service.dart).
//
// Only login accounts are seeded — the menu is intentionally empty so
// each venue builds their own catalog. Business profile is seeded with
// defaults so the Settings page has something to display.

import { DEMO } from '../constants.js';
import { User } from '../models/user.js';
import { StorageService } from './storage.js';

let _seeded = false;

export const SeedService = {
  async ensureSeeded({ force = false } = {}) {
    if (_seeded && !force) return;
    _seeded = true;

    // Users — only seed if empty.
    if (StorageService.users.length === 0) {
      const now = new Date().toISOString();
      await StorageService.upsertUser(
        new User({
          id: 'u-admin',
          username: DEMO.admin.username,
          password: DEMO.admin.password,
          displayName: DEMO.admin.displayName,
          role: DEMO.admin.role,
          createdAt: now,
        }),
      );
      await StorageService.upsertUser(
        new User({
          id: 'u-elvis',
          username: DEMO.cashier.username,
          password: DEMO.cashier.password,
          displayName: DEMO.cashier.displayName,
          role: DEMO.cashier.role,
          createdAt: now,
        }),
      );
      await StorageService.upsertUser(
        new User({
          id: 'u-mary',
          username: DEMO.waiter.username,
          password: DEMO.waiter.password,
          displayName: DEMO.waiter.displayName,
          role: DEMO.waiter.role,
          createdAt: now,
        }),
      );
    }

    // Persist default business profile if missing.
    const current = StorageService.business;
    await StorageService.saveBusiness(current);
  },
};
