import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);

export async function backendProcesses(parentId) {
  if (!Number.isInteger(parentId)) throw new Error('无效的父进程编号');
  const { stdout } = await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name = 'java.exe' AND ParentProcessId = " +
        parentId +
        '" | Select-Object ProcessId | ConvertTo-Json -Compress',
    ],
    { windowsHide: true },
  );
  return stdout.trim() ? [JSON.parse(stdout)].flat() : [];
}

export async function engineProcesses(parentId) {
  const { stdout } = await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name = 'rapfi-host.exe' OR Name = 'pbrain-rapfi-windows-sse.exe'\" | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress",
    ],
    { windowsHide: true },
  );
  const rows = stdout.trim() ? [JSON.parse(stdout)].flat() : [];
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
