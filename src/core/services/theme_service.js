// Theme service — applies the light/dark preference to the document
// root as a data attribute (styles/main.css keys off
// [data-theme="dark"]) and persists the choice via StorageService.
//
// Applied as early as possible (see main.js) so there's no flash of
// the wrong theme on load.

import { StorageService } from './storage.js';

export const ThemeService = {
  /** Read the stored preference and apply it to <html>. Call once at boot. */
  init() {
    this.apply(StorageService.themePreference);
  },

  get current() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  },

  apply(mode) {
    const resolved = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolved === 'dark' ? '#1B1A17' : '#33475A');
    }
  },

  set(mode) {
    const resolved = mode === 'dark' ? 'dark' : 'light';
    this.apply(resolved);
    StorageService.themePreference = resolved;
  },

  toggle() {
    const next = this.current === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },
};
