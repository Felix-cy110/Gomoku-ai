import path from 'node:path';
import { RapfiEngine } from '../../dist-electron/electron/engine/rapfi.js';
import { engineOptions } from '../../dist-electron/electron/engine/options.js';
const engine = new RapfiEngine(engineOptions(path.resolve('resources')));
const status = await engine.start();
if (status.state !== 'ready') {
  await engine.stop();
  process.exit(1);
}
console.log('READY');
setInterval(() => {}, 1000);
