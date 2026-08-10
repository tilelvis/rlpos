// Auth + business + users providers (port of lib/core/providers/auth_provider.dart).
//
// "Providers" here are thin orchestration modules: they call StorageService
// and bump the corresponding store channel so subscribers rebuild.

import { store, CHANNELS, Auth } from '../store.js';
import { StorageService } from '../services/storage.js';
import { BusinessInfo } from '../models/business_info.js';
import { User } from '../models/user.js';

export const AuthProvider = {
  get currentUser() {
    return Auth.user;
  },

  /** Sign in by username + password. Returns the user or null. */
  signIn(username, password) {
    const u = StorageService.findUser(username);
    if (!u || u.password !== password) return null;
    Auth.setUser(u);
    return u;
  },

  signOut() {
    Auth.setUser(null);
  },

  /** Restore session from localStorage on app start. */
  restore() {
    return Auth.restore();
  },
};

export const BusinessProvider = {
  get info() {
    return StorageService.business;
  },

  async update(info) {
    await StorageService.saveBusiness(info);
    store.bump(CHANNELS.business);
  },

  setPaper(paper) {
    const info = this.info;
    return this.update(new BusinessInfo({ ...info.toMap(), preferredPaper: paper }));
  },
};

export const UserManagement = {
  async createUser({ username, password, displayName, role }) {
    const uname = (username || '').trim();
    const dname = (displayName || '').trim();
    if (uname.length === 0) throw new Error('Username is required.');
    if ((password || '').length === 0) throw new Error('Password is required.');
    if (StorageService.findUser(uname)) throw new Error('That username is already taken.');

    const user = new User({
      id: `u-${Date.now()}`,
      username: uname,
      password,
      displayName: dname.length === 0 ? uname : dname,
      role,
      createdAt: new Date().toISOString(),
    });
    await StorageService.upsertUser(user);
    store.bump(CHANNELS.users);
    return user;
  },

  async updateUser({ existing, username, password, displayName, role }) {
    const uname = (username || '').trim();
    const dname = (displayName || '').trim();
    if (uname.length === 0) throw new Error('Username is required.');

    const clash = StorageService.findUser(uname);
    if (clash && clash.id !== existing.id) {
      throw new Error('That username is already taken.');
    }

    if (existing.isAdmin && role !== 'admin' && this._adminCount() <= 1) {
      throw new Error('Cannot change the role of the last remaining admin.');
    }

    const updated = existing.copyWith({
      username: uname,
      password: (password && password.length > 0) ? password : existing.password,
      displayName: dname.length === 0 ? uname : dname,
      role,
    });

    await StorageService.upsertUser(updated);
    store.bump(CHANNELS.users);
    return updated;
  },

  async deleteUser(user) {
    if (user.isAdmin && this._adminCount() <= 1) {
      throw new Error('Cannot delete the last remaining admin account.');
    }
    await StorageService.deleteUser(user.id);
    store.bump(CHANNELS.users);
  },

  _adminCount() {
    return StorageService.users.filter((u) => u.isAdmin).length;
  },
};
