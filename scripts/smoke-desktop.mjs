import { _electron as electron, expect } from '@playwright/test';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  backendProcesses,
  engineProcesses,
  isAlive,
  waitUntil,
} from '../tests-engine/processes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = path.join(root, '.local', `electron-smoke-${Date.now()}`);
await mkdir(profile, { recursive: true });
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.GOMOKU_API_PORT;
delete environment.VITE_DEV_SERVER_URL;

let app;
let forcedExitBackends = [];
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
  const health = await window.evaluate(() => window.desktop.getHealth());
  expect(health.service).toBe('yijian-lobby');
  await expect
    .poll(() => window.evaluate(async () => (await window.desktop.analysis.getStatus()).state), {
      timeout: 30_000,
    })
    .toBe('ready');
  const firstMainPid = await app.evaluate(() => process.pid);
  const firstEngineProcesses = await engineProcesses(firstMainPid);
  expect(firstEngineProcesses).toHaveLength(2);
  const invalidAnalysis = await window.evaluate(() =>
    window.desktop.analysis.analyze({ id: 'invalid', moveHistory: [0, 0] }),
  );
  expect(invalidAnalysis.code).toBe('invalid_position');
  expect(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.session.isPersistent(),
    ),
  ).toBe(false);
  await window.emulateMedia({ reducedMotion: 'reduce' });
  await window.evaluate(() => document.fonts.ready);
  await window.screenshot({ path: path.join(root, '.local/electron-home.png'), fullPage: true });
  await window.getByRole('button', { name: '选择单人模式' }).click();
  await window.getByText('高手过招', { exact: true }).click();
  await window.getByRole('button', { name: '确认对局设置' }).click();
  await expect(window.getByText(/人机对弈 · 高手过招/)).toBeVisible();
  await window.getByRole('button', { name: '关闭对局音效' }).click();
  expect(
    await window.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  await window.reload();
  await expect(window.getByRole('button', { name: '关闭对局音效' })).toBeVisible();
  await window.getByRole('button', { name: '选择单人模式' }).click();
  await expect(window.locator('input[name="difficulty"][value="normal"]')).toBeChecked();
  await expect(window.locator('input[name="color"][value="black"]')).toBeChecked();
  await window.keyboard.press('Escape');
  await window.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(window.getByRole('textbox')).toHaveCount(0);
  await expect(window.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  await expect(window.getByTestId('probability-black')).toBeVisible();
  await expect(window.getByRole('heading', { name: '胜率走势' })).toBeVisible();
  await expect(window.getByTestId('chart-point-black')).toHaveCount(1);
  await window.getByRole('button', { name: /^H8，/ }).click();
  await expect(window.getByTestId('probability-black')).toHaveText('72.0%');
  await expect(window.getByTestId('probability-white')).toHaveText('6.8%');
  await expect(window.getByTestId('chart-point-black')).toHaveCount(2);
  await expect(window.getByTestId('chart-line-black')).toHaveAttribute('d', /L/);
  for (const point of ['I8', 'H9', 'I9', 'J8', 'J9', 'G8', 'F8']) {
    await window.getByRole('button', { name: new RegExp(`^${point}，`) }).click();
    await expect(window.getByTestId('probability-black')).toBeVisible();
  }
  await expect(window.getByTestId('chart-point-black')).toHaveCount(9);
  await window.screenshot({
    path: path.join(root, '.local/electron-analysis.png'),
    fullPage: true,
  });
  await window.getByRole('button', { name: '重新开始' }).click();
  await expect(
    window.locator('[data-testid="chart-point-black"]:not([data-move="0"])'),
  ).toHaveCount(0);
  for (const point of ['D8', 'A1', 'E8', 'C1', 'F8', 'E1', 'G8', 'G1', 'H8']) {
    await window.getByRole('button', { name: new RegExp(`^${point}，`) }).click();
  }
  await expect(window.getByRole('heading', { name: '黑棋获胜', exact: true })).toBeVisible();
  await expect(window.locator('.winning-stone')).toHaveCount(5);
  await expect(window.getByTestId('probability-black')).toHaveText('100.0%');
  await expect(window.getByTestId('chart-point-black').last()).toHaveAttribute('data-move', '9');
  await window.screenshot({
    path: path.join(root, '.local/electron-local-game.png'),
    fullPage: true,
  });
  await window.getByRole('button', { name: '再来一局' }).click();
  await expect(window.locator('.game-stone')).toHaveCount(0);
  await expect(window.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  expect(await window.evaluate(() => typeof window.require)).toBe('undefined');
  expect(errors).toEqual([]);
  // Reuse the profile to verify a complete restart, not just a page reload.
  await window.getByRole('button', { name: '返回首页', exact: true }).click();
  await window.getByRole('button', { name: '关闭对局音效' }).click();
  await window.getByRole('button', { name: '选择单人模式' }).click();
  await window.getByText('高手过招', { exact: true }).click();
  await window.getByText('执白 · 后行', { exact: true }).click();
  await window.getByRole('button', { name: '确认对局设置' }).click();
  await app.close();
  await waitUntil(() => firstEngineProcesses.every((row) => !isAlive(row.ProcessId)));
  app = await electron.launch({
    args: ['.', `--user-data-dir=${profile}`],
    cwd: root,
    env: environment,
    timeout: 30_000,
  });
  const restartedWindow = await app.firstWindow();
  await expect
    .poll(
      () => restartedWindow.evaluate(async () => (await window.desktop.analysis.getStatus()).state),
      { timeout: 30_000 },
    )
    .toBe('ready');
  const restartedMainPid = await app.evaluate(() => process.pid);
  const restartedEngineProcesses = await engineProcesses(restartedMainPid);
  expect(restartedEngineProcesses).toHaveLength(2);
  await expect(restartedWindow.getByRole('button', { name: '关闭对局音效' })).toBeVisible();
  await restartedWindow.getByRole('button', { name: '选择单人模式' }).click();
  await expect(restartedWindow.locator('input[name="difficulty"][value="normal"]')).toBeChecked();
  await expect(restartedWindow.locator('input[name="color"][value="black"]')).toBeChecked();
  await expect(access(path.join(profile, 'lobby/preferences.json'))).rejects.toMatchObject({
    code: 'ENOENT',
  });
  // 只强制结束本次测试创建的 Electron 主进程，验证 Job 守护清理。
  forcedExitBackends = await backendProcesses(restartedMainPid);
  process.kill(restartedMainPid);
  app = undefined;
  await waitUntil(() => restartedEngineProcesses.every((row) => !isAlive(row.ProcessId)));
  console.log(
    'Electron smoke test passed: local NNUE inference, terminal result, normal and forced process cleanup, Java health, in-memory settings and local game.',
  );
} finally {
  await app?.close();
  for (const row of forcedExitBackends) if (isAlive(row.ProcessId)) process.kill(row.ProcessId);
}
