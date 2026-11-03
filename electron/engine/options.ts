import path from 'node:path';
import type { EngineLaunch, EngineOptions } from './rapfi.js';

function timeout(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 100 || value > 120_000)
    throw new Error(`${name} 必须为 100～120000 毫秒。`);
  return value;
}

// 官方 250615 发布包中只为这些平台挑选了可直接运行的引擎，键为 `${platform}-${arch}`。
const ENGINE_LAUNCHERS: Readonly<Record<string, (directory: string) => EngineLaunch>> = {
  // Windows 经守护进程把引擎放入 Job Object，主进程被强制结束时同样回收 Rapfi。
  'win32-x64': (directory) => ({
    command: path.join(directory, 'rapfi-host.exe'),
    args: [String(process.pid), path.join(directory, 'pbrain-rapfi-windows-sse.exe')],
  }),
  // macOS 直接启动引擎：主进程退出后管道关闭，Rapfi 读到 EOF，在当前搜索结束后自行退出。
  'darwin-arm64': (directory) => ({
    command: path.join(directory, 'pbrain-rapfi-macos-apple-silicon'),
    args: [],
  }),
};

export function engineOptions(
  resourceDirectory: string,
  platform: string = process.platform,
  arch: string = process.arch,
): EngineOptions {
  const directory = path.join(resourceDirectory, 'rapfi');
  return {
    launch: ENGINE_LAUNCHERS[`${platform}-${arch}`]?.(directory),
    cwd: directory,
    startupTimeoutMs: timeout('GOMOKU_ENGINE_STARTUP_TIMEOUT_MS', 30_000),
    analysisTimeoutMs: timeout('GOMOKU_ENGINE_ANALYSIS_TIMEOUT_MS', 5_000),
    shutdownTimeoutMs: timeout('GOMOKU_ENGINE_SHUTDOWN_TIMEOUT_MS', 1_500),
  };
}
