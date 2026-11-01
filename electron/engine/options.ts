import path from 'node:path';
import type { EngineOptions } from './rapfi.js';

function timeout(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 100 || value > 120_000)
    throw new Error(`${name} 必须为 100～120000 毫秒。`);
  return value;
}

export function engineOptions(resourceDirectory: string): EngineOptions {
  const directory = path.join(resourceDirectory, 'rapfi');
  return {
    command: path.join(directory, 'rapfi-host.exe'),
    args: [String(process.pid), path.join(directory, 'pbrain-rapfi-windows-sse.exe')],
    cwd: directory,
    startupTimeoutMs: timeout('GOMOKU_ENGINE_STARTUP_TIMEOUT_MS', 30_000),
    analysisTimeoutMs: timeout('GOMOKU_ENGINE_ANALYSIS_TIMEOUT_MS', 5_000),
    shutdownTimeoutMs: timeout('GOMOKU_ENGINE_SHUTDOWN_TIMEOUT_MS', 1_500),
  };
}
