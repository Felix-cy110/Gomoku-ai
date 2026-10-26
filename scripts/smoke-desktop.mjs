import { _electron as electron, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = path.join(root, '.local', `electron-smoke-${Date.now()}`);
await mkdir(profile, { recursive: true });
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.GOMOKU_API_PORT;
delete environment.VITE_DEV_SERVER_URL;

let app;
try {
  app = await electron.launch({
    args: ['.', `--user-data-dir=${profile}`],
    cwd: root,
    env: environment,
    timeout: 30_000,
  });
  const window = await app.firstWindow();
  const errors = [];
  window.on('pageerror', (error) => errors.push(error.message));
  await expect(window.getByRole('button', { name: '选择单人模式' })).toBeEnabled();
  expect(window.url()).toMatch(/^file:/);
  const preferences = await window.evaluate(() =>
    window.desktop.request('GET', '/api/preferences'),
  );
  expect(preferences.mode).toBe('single');
  await window.emulateMedia({ reducedMotion: 'reduce' });
  await window.evaluate(() => document.fonts.ready);
  await window.screenshot({ path: path.join(root, '.local/electron-home.png'), fullPage: true });
  await window.getByRole('button', { name: '选择双人模式' }).click();
  await window.getByRole('textbox', { name: '黑棋棋手昵称' }).fill('桌面棋手');
  await window.getByRole('button', { name: '确认对局设置' }).click();
  await expect(window.getByText(/好友对弈 · 桌面棋手/)).toBeVisible();
  const saved = await window.evaluate(() => window.desktop.request('GET', '/api/preferences'));
  expect(saved.mode).toBe('local');
  expect(saved.playerOne).toBe('桌面棋手');
  expect(await window.evaluate(() => typeof window.require)).toBe('undefined');
  expect(errors).toEqual([]);
  console.log(
    'Electron smoke test passed: production page, sandboxed preload, Java startup and preference persistence.',
  );
} finally {
  await app?.close();
}
