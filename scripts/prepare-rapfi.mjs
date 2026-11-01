import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resourceDir = path.join(root, 'resources/rapfi');
const cacheDir = path.join(root, '.local/rapfi-download');
const release = '250615';
const archiveSha256 = '1a3e24024062a153ac079060ee9589a37c6bdd1ecc54fed3908793c519594e05';
const origin = `https://github.com/dotb1ue/rapfi/releases/download/${release}`;
const files = [
  'pbrain-rapfi-windows-sse.exe',
  'model210901.bin',
  'mix9svqfreestyle_bsmix.bin.lz4',
  'AUTHORS',
];

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

async function download(url, target) {
  await run('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-File',
    path.join(root, 'scripts/download-file.ps1'),
    '-Uri',
    url,
    '-Destination',
    target,
  ]);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('本次集成支持 Windows x64；其他平台请使用网页预览，尚未提供本地引擎包。');
}
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
await run('tar.exe', ['-xf', archive, '-C', extracted, ...files]);
for (const file of files) await copyFile(path.join(extracted, file), path.join(resourceDir, file));
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
console.log(`Rapfi ${release} 与预训练权重已准备到 ${resourceDir}（CPU / SSE4.1）。`);
