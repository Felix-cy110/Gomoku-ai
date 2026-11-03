import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const isWindows = process.platform === 'win32';

// Windows 由守护进程托管 Rapfi，每个引擎对应 2 个进程；macOS 直接启动引擎，只有 1 个。
export const ENGINE_PROCESS_COUNT = isWindows ? 2 : 1;
const ENGINE_NAMES = isWindows
  ? ['rapfi-host.exe', 'pbrain-rapfi-windows-sse.exe']
  : ['pbrain-rapfi-macos-apple-silicon'];

async function windowsProcesses(filter) {
  const { stdout } = await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Get-CimInstance Win32_Process -Filter "${filter}" | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress`,
    ],
    { windowsHide: true },
  );
  return stdout.trim() ? [JSON.parse(stdout)].flat() : [];
}

async function unixProcesses(matches) {
  const { stdout } = await execute('ps', ['-A', '-o', 'pid=,ppid=,args=']);
  return stdout
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match) => match && matches(match[3]))
    .map((match) => ({
      ProcessId: Number(match[1]),
      ParentProcessId: Number(match[2]),
      Name: match[3],
    }));
}

export async function backendProcesses(parentId) {
  if (!Number.isInteger(parentId)) throw new Error('无效的父进程编号');
  const rows = isWindows
    ? await windowsProcesses(`Name = 'java.exe' AND ParentProcessId = ${parentId}`)
    : await unixProcesses((command) => /(^|\/)java(\s|$)/.test(command));
  return rows.filter((row) => row.ParentProcessId === parentId);
}

export async function engineProcesses(parentId) {
  const rows = isWindows
    ? await windowsProcesses(ENGINE_NAMES.map((name) => `Name = '${name}'`).join(' OR '))
    : await unixProcesses((command) => ENGINE_NAMES.some((name) => command.includes(name)));
  const hosts = rows.filter((row) => row.ParentProcessId === parentId);
  return [
    ...hosts,
    ...rows.filter((row) => hosts.some((host) => row.ParentProcessId === host.ProcessId)),
  ];
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

export async function waitUntil(predicate, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('等待条件超时');
}
