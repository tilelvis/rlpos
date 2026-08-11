// Runs `vite build` (or `vite`, for dev) with TAURI_BUILD=true set on the
// child process's environment. Tauri's tauri.conf.json calls this via
// `beforeBuildCommand` / `beforeDevCommand` instead of calling `vite`
// directly — see the comment there and in vite.config.js for why the
// desktop build needs to skip the PWA/service-worker plugin.
//
// Written as a plain Node script (not a shell one-liner) because setting
// an env var inline before a command is different syntax on bash vs.
// PowerShell vs. cmd.exe, and this needs to work the same way in local
// dev and on the windows-latest GitHub Actions runner.
import { spawnSync } from 'node:child_process';

const mode = process.argv[2]; // 'build' or 'dev'
if (mode !== 'build' && mode !== 'dev') {
  console.error('Usage: node scripts/vite-for-tauri.mjs <build|dev>');
  process.exit(1);
}

const result = spawnSync('npx', ['vite', ...(mode === 'build' ? ['build'] : [])], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, TAURI_BUILD: 'true' },
});

process.exit(result.status ?? 1);
