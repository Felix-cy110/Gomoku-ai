import { createInterface } from 'node:readline';
const mode = process.argv[2];
let count = 0;
const keepAlive = setInterval(() => {}, 1000);
createInterface({ input: process.stdin }).on('line', (line) => {
  if (line === 'END' && mode !== 'ignore-end') {
    clearInterval(keepAlive);
    process.exit(0);
  }
  if (line.startsWith('START')) console.log('OK');
  if (line !== 'ABOUT') return;
  count++;
  if (mode === 'hang') return;
  if (mode === 'crash' && count > 1) process.exit(2);
  const reply = () => {
    if (mode !== 'no-model')
      console.log('MESSAGE Evaluator Eval[Black]: 10 WR: 0.6000 LR: 0.3000 DR: 0.1000');
    console.log('name="Rapfi", version="test"');
  };
  if (mode === 'slow' && count > 1) setTimeout(reply, 180);
  else reply();
});
