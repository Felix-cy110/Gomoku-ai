import { createInterface } from 'node:readline';
const mode = process.argv[2];
let count = 0;
let readingBoard = false;
let searchBoard = false;
let occupied = [];
let searchTimer;
function replyMove() {
  clearTimeout(searchTimer);
  searchTimer = undefined;
  const move =
    mode === 'invalid-move'
      ? 225
      : [112, 113, 114, 115, 116, 117].find((index) => !occupied.includes(index));
  console.log(`${move % 15},${Math.floor(move / 15)}`);
}
const keepAlive = setInterval(() => {}, 1000);
createInterface({ input: process.stdin }).on('line', (line) => {
  if (line === 'BOARD' || line === 'YXBOARD') {
    readingBoard = true;
    searchBoard = line === 'BOARD';
    occupied = [];
    return;
  }
  if (readingBoard) {
    if (line === 'DONE') {
      readingBoard = false;
      if (searchBoard && mode !== 'search-hang') searchTimer = setTimeout(replyMove, 180);
    } else {
      const [x, y] = line.split(',').map(Number);
      occupied.push(y * 15 + x);
    }
    return;
  }
  if (line === 'STOP' && searchTimer) replyMove();
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
