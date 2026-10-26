import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let javaProcess: ChildProcess | undefined;
let mainWindow: BrowserWindow | undefined;
let apiOrigin = '';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('No port available'));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function startBackend() {
  const externalPort = process.env.GOMOKU_API_PORT;
  const port = externalPort ? Number(externalPort) : await freePort();
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid backend port');
  apiOrigin = `http://127.0.0.1:${port}`;
  if (!externalPort) {
    const javaBinary = process.env.JAVA_HOME
      ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
      : 'java';
    javaProcess = spawn(
      javaBinary,
      [
        '-Dfile.encoding=UTF-8',
        '-jar',
        path.join(projectDirectory, 'backend/target/gomoku-backend.jar'),
        '--port',
        String(port),
        '--data-dir',
        path.join(app.getPath('userData'), 'lobby'),
      ],
      {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    javaProcess.stdout?.on('data', (chunk) => console.log(String(chunk).trim()));
    javaProcess.stderr?.on('data', (chunk) => console.error(String(chunk).trim()));
  }
  let startError: Error | undefined;
  javaProcess?.on('error', (error) => {
    startError = error;
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (startError) throw startError;
    if (javaProcess && javaProcess.exitCode !== null)
      throw new Error('Java service exited during startup');
    try {
      const response = await fetch(`${apiOrigin}/api/health`, { signal: AbortSignal.timeout(700) });
      if (response.ok && (await response.json()).service === 'yijian-lobby') return;
    } catch {
      /* The server takes a moment to bind its port. */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Java service did not become ready');
}

function createWindow() {
  const developmentUrl = process.env.VITE_DEV_SERVER_URL;
  const productionUrl = pathToFileURL(path.join(projectDirectory, 'dist/index.html')).href;
  const allowedDocument = developmentUrl ? new URL(developmentUrl).href : productionUrl;
  mainWindow = new BrowserWindow({
    title: '弈间 · 五子棋',
    width: 1440,
    height: 1000,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: '#f6f7f2',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(projectDirectory, 'dist-electron/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== allowedDocument.split('#')[0]) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
  if (developmentUrl) void mainWindow.loadURL(developmentUrl);
  else void mainWindow.loadFile(path.join(projectDirectory, 'dist/index.html'));
}

const ownsLock = app.requestSingleInstanceLock();
if (!ownsLock) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const dev = Boolean(process.env.VITE_DEV_SERVER_URL);
        const socketOrigin = dev
          ? new URL(process.env.VITE_DEV_SERVER_URL!).origin.replace('http:', 'ws:')
          : '';
        const csp = `default-src 'self'; script-src 'self'${dev ? " 'unsafe-inline'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'${dev ? ` ${socketOrigin}` : ''}; object-src 'none'; base-uri 'none'`;
        callback({
          responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] },
        });
      });
      await startBackend();
      ipcMain.handle(
        'lobby:request',
        async (event, method: unknown, route: unknown, body: unknown) => {
          if (
            event.sender !== mainWindow?.webContents ||
            event.senderFrame !== mainWindow.webContents.mainFrame
          )
            throw new Error('Untrusted sender');
          if (!['GET', 'PUT'].includes(String(method)) || route !== '/api/preferences')
            throw new Error('Unsupported request');
          const response = await fetch(`${apiOrigin}/api/preferences`, {
            method: String(method),
            headers: { 'Content-Type': 'application/json' },
            body: method === 'PUT' ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) throw new Error('Unable to load or save preferences');
          return response.json();
        },
      );
      createWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error) => {
      console.error(error);
      dialog.showErrorBox(
        '弈间启动失败',
        '请确认已安装 Java 17 或更新版本，并先运行 npm run build。\n\n' + String(error),
      );
      app.quit();
    });
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  javaProcess?.kill();
});
