import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = new Set();
const webPort = Number(process.env.GOMOKU_WEB_PORT || 5187);
const apiPort = Number(process.env.GOMOKU_API_PORT || 18087);
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

function run(binary, args, environment = {}) {
  const child = spawn(binary, args, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, ...environment },
  });
  children.add(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    children.delete(child);
    if (!stopping) stop(code ?? 1);
  });
  return child;
}

async function ensurePortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () =>
      reject(new Error(`端口 ${port} 已占用。请先关闭已运行的开发服务。`)),
    );
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

async function waitFor(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(700) });
      if (response.ok) return;
    } catch {
      /* Wait for the child to start listening. */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`服务启动失败：${url}`);
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('exit', () => {
  for (const child of children) child.kill();
});

try {
  await Promise.all([ensurePortAvailable(apiPort), ensurePortAvailable(webPort)]);
  const java = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
    : 'java';
  run(java, [
    '-Dfile.encoding=UTF-8',
    '-jar',
    'backend/target/gomoku-backend.jar',
    `--server.port=${apiPort}`,
  ]);
  await waitFor(`http://127.0.0.1:${apiPort}/api/health`);
  run(process.execPath, ['node_modules/vite/bin/vite.js']);
  await waitFor(`http://127.0.0.1:${webPort}`);
  console.log(`\n弈间已就绪：http://127.0.0.1:${webPort}\n`);
  if (process.argv.includes('--desktop')) {
    const electron = (await import('electron')).default;
    const environment = {
      ...process.env,
      GOMOKU_API_PORT: String(apiPort),
      VITE_DEV_SERVER_URL: `http://127.0.0.1:${webPort}`,
    };
    delete environment.ELECTRON_RUN_AS_NODE;
    const child = spawn(electron, ['.'], {
      cwd: root,
      stdio: 'inherit',
      windowsHide: false,
      env: environment,
    });
    children.add(child);
    child.on('error', (error) => {
      console.error(error.message);
      stop(1);
    });
    child.on('exit', (code) => {
      children.delete(child);
      stop(code ?? 0);
    });
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
