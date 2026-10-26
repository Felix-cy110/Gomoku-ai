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
  await window.getByRole('button', { name: '选择单人模式' }).click();
  await window.getByText('高手过招', { exact: true }).click();
  await window.getByRole('button', { name: '确认对局设置' }).click();
  await expect(window.getByText(/人机对弈 · 高手过招/)).toBeVisible();
  const saved = await window.evaluate(() => window.desktop.request('GET', '/api/preferences'));
  expect(saved.mode).toBe('single');
  expect(saved.difficulty).toBe('hard');
  await window.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(window.getByRole('textbox')).toHaveCount(0);
  await expect(window.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  for (const point of ['D8', 'A1', 'E8', 'C1', 'F8', 'E1', 'G8', 'G1', 'H8']) {
    await window.getByRole('button', { name: new RegExp(`^${point}，`) }).click();
  }
  await expect(window.getByRole('heading', { name: '黑棋获胜', exact: true })).toBeVisible();
  await expect(window.locator('.winning-stone')).toHaveCount(5);
  await window.screenshot({
    path: path.join(root, '.local/electron-local-game.png'),
    fullPage: true,
  });
  await window.getByRole('button', { name: '再来一局' }).click();
  await expect(window.locator('.game-stone')).toHaveCount(0);
  await expect(window.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  expect(await window.evaluate(() => typeof window.require)).toBe('undefined');
  expect(errors).toEqual([]);
  console.log(
    'Electron smoke test passed: production page, sandboxed preload, Java preferences, local game victory and restart.',
  );
} finally {
  await app?.close();
}
