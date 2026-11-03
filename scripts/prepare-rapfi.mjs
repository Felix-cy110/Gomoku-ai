import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, chmod, copyFile, mkdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resourceDir = path.join(root, 'resources/rapfi');
const cacheDir = path.join(root, '.local/rapfi-download');
const release = '250615';
const archiveSha256 = '1a3e24024062a153ac079060ee9589a37c6bdd1ecc54fed3908793c519594e05';
const origin = `https://github.com/dotb1ue/rapfi/releases/download/${release}`;
// 同一发布包内按平台挑选引擎；Apple Silicon 版本自带 ad-hoc 签名，最低要求 macOS 14。
const platforms = {
  'win32-x64': { engine: 'pbrain-rapfi-windows-sse.exe', description: 'Windows x64，CPU / SSE4.1' },
  'darwin-arm64': { engine: 'pbrain-rapfi-macos-apple-silicon', description: 'Apple Silicon，CPU' },
};
const target = platforms[`${process.platform}-${process.arch}`];
const isWindows = process.platform === 'win32';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} 退出码 ${code}`)),
    );
  });
}

async function download(url, destination) {
  if (isWindows) {
    await run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      path.join(root, 'scripts/download-file.ps1'),
      '-Uri',
      url,
      '-Destination',
      destination,
    ]);
    return;
  }
  // 先写入临时文件，中断的下载不会被当作完整缓存。
  const partialDownload = destination + '.partial';
  await run('curl', [
    '--fail',
    '--location',
    '--retry',
    '3',
    '--connect-timeout',
    '30',
    '--max-time',
    '600',
    '--output',
    partialDownload,
    url,
  ]);
  await rename(partialDownload, destination);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

if (!target) {
  throw new Error(
    '本地引擎支持 Windows x64 与 Apple Silicon Mac；其他平台请使用网页预览，尚未提供本地引擎包。',
  );
}
const files = [target.engine, 'model210901.bin', 'mix9svqfreestyle_bsmix.bin.lz4', 'AUTHORS'];
await mkdir(resourceDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });
const archive = path.join(cacheDir, 'Rapfi-engine.7z');
if (!(await exists(archive))) await download(`${origin}/Rapfi-engine.7z`, archive);
const actualHash = createHash('sha256')
  .update(await readFile(archive))
  .digest('hex');
if (actualHash !== archiveSha256)
  throw new Error(`Rapfi 下载包 SHA256 不匹配，请删除 ${archive} 后重新准备。`);
const extracted = path.join(cacheDir, 'extracted');
await mkdir(extracted, { recursive: true });
// Windows 与 macOS 自带的 tar 均为 bsdtar，可直接解压该包使用的 7z LZMA2 格式。
await run(isWindows ? 'tar.exe' : 'tar', ['-xf', archive, '-C', extracted, ...files]);
for (const file of files) await copyFile(path.join(extracted, file), path.join(resourceDir, file));
if (!isWindows) {
  const engine = path.join(resourceDir, target.engine);
  // 7z 不保存 Unix 权限；同时清除隔离属性，避免手动放入的下载包使 Gatekeeper 拦截未公证的引擎。
  await chmod(engine, 0o755);
  await run('xattr', ['-c', engine]);
}
await copyFile(path.join(root, 'config/rapfi.toml'), path.join(resourceDir, 'config.toml'));
await copyFile(
  path.join(root, 'THIRD_PARTY_NOTICES.md'),
  path.join(resourceDir, 'THIRD_PARTY_NOTICES.md'),
);
const license = path.join(cacheDir, 'Rapfi-Copying.txt');
if (!(await exists(license))) {
  await download(`https://raw.githubusercontent.com/dotb1ue/rapfi/${release}/Copying.txt`, license);
}
await copyFile(license, path.join(resourceDir, 'Copying.txt'));
if (isWindows) {
  const compiler = path.join(
    process.env.WINDIR || 'C:/Windows',
    'Microsoft.NET/Framework64/v4.0.30319/csc.exe',
  );
  await run(compiler, [
    '/nologo',
    '/optimize+',
    '/platform:x64',
    '/target:exe',
    '/codepage:65001',
    `/out:${path.join(resourceDir, 'rapfi-host.exe')}`,
    path.join(root, 'native/windows/RapfiHost.cs'),
  ]);
}
console.log(`Rapfi ${release} 与预训练权重已准备到 ${resourceDir}（${target.description}）。`);
