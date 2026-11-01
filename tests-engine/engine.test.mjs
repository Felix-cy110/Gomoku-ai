import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { RapfiEngine } from '../dist-electron/electron/engine/rapfi.js';
import { engineOptions } from '../dist-electron/electron/engine/options.js';
import { parseProbabilities, validatePosition } from '../dist-electron/electron/engine/protocol.js';
import { engineProcesses, isAlive, waitUntil } from './processes.mjs';

const fakeOptions = (mode) => ({
  command: process.execPath,
  args: [path.resolve('tests-engine/fixtures/fake-engine.mjs'), mode],
  cwd: process.cwd(),
  startupTimeoutMs: 2000,
  analysisTimeoutMs: 2000,
  shutdownTimeoutMs: 100,
});

test('拒绝越界、重复、错误类型和终局后继续落子的序列', () => {
  for (const history of [[-1], [225], ['0'], [0, 0], [0.5], [0, 15, 1, 16, 2, 17, 3, 18, 4, 19]])
    assert.throws(() => validatePosition({ id: 'test', moveHistory: history }));
  assert.throws(() => validatePosition({ id: 'bad\nEND', moveHistory: [] }));
  assert.equal(validatePosition({ id: 'test', moveHistory: [112, 113] }).game.turn, 'black');
});

test('只接收黑方视角的模型三项概率，不把传统评分当成胜率', () => {
  const result = parseProbabilities(['MESSAGE Evaluator Eval[Black]: 1 WR: 0.6 LR: 0.3 DR: 0.1']);
  assert.ok(Math.abs(result.blackWin - 0.6) < 0.0001);
  assert.ok(Math.abs(result.whiteWin - 0.3) < 0.0001);
  for (const line of [
    'MESSAGE Static Eval[Black]: 312 (WDL 82.64)',
    'MESSAGE Evaluator Eval[Black]: 1 WR: 0.6 LR: 0.6 DR: 0.1',
    'MESSAGE Evaluator Eval[Black]: 1 WR: -0.1 LR: 0.6 DR: 0.5',
  ])
    assert.throws(() => parseProbabilities([line]));
});

test('队列只保留最新局面，取消与终局会使旧结果失效', async (t) => {
  const engine = new RapfiEngine(fakeOptions('slow'));
  t.after(() => engine.stop());
  assert.equal((await engine.start()).state, 'ready');
  const first = engine.analyze({ id: 'first', moveHistory: [112] });
  const second = engine.analyze({ id: 'second', moveHistory: [112, 113] });
  const third = engine.analyze({ id: 'third', moveHistory: [112, 113, 114] });
  assert.equal((await first).code, 'cancelled');
  assert.equal((await second).code, 'cancelled');
  assert.equal((await third).ok, true);
  const cancelled = engine.analyze({ id: 'cancel', moveHistory: [] });
  engine.cancel('cancel');
  assert.equal((await cancelled).code, 'cancelled');
  const beforeEnd = engine.analyze({ id: 'beforeEnd', moveHistory: [112] });
  const terminal = await engine.analyze({
    id: 'terminal',
    moveHistory: [0, 15, 1, 16, 2, 17, 3, 18, 4],
  });
  assert.equal(terminal.analysis.blackWin, 1);
  assert.equal(terminal.analysis.source, 'terminal');
  assert.equal((await beforeEnd).code, 'cancelled');
});

for (const mode of ['no-model', 'hang', 'crash']) {
  test('引擎异常 ' + mode + ' 明确失败且释放进程', async (t) => {
    const options = fakeOptions(mode);
    if (mode === 'hang') options.startupTimeoutMs = 300;
    const engine = new RapfiEngine(options);
    t.after(() => engine.stop());
    const status = await engine.start();
    if (mode === 'crash') {
      assert.equal(status.state, 'ready');
      assert.equal((await engine.analyze({ id: 'crash', moveHistory: [] })).ok, false);
    } else assert.equal(status.state, 'error');
    await engine.stop();
    assert.equal(engine.getStatus().state, 'stopped');
  });
}

test('初始化期间退出不重启进程；忽略 END 的进程仍能有界关闭', async () => {
  const startup = new RapfiEngine(fakeOptions('hang'));
  const ready = startup.start();
  await startup.stop();
  await ready;
  assert.equal(startup.getStatus().state, 'stopped');
  const engine = new RapfiEngine(fakeOptions('ignore-end'));
  assert.equal((await engine.start()).state, 'ready');
  await engine.stop();
  assert.equal(engine.getStatus().state, 'stopped');
});

test('真实 Rapfi：权重预热、固定黑方视角、悔棋复现、重启与正常退出', async (t) => {
  const engine = new RapfiEngine(engineOptions(path.resolve('resources')));
  t.after(() => engine.stop());
  assert.equal((await engine.start()).state, 'ready');
  const owned = await engineProcesses(process.pid);
  assert.equal(owned.length, 2);
  const first = await engine.analyze({ id: 'one', moveHistory: [112] });
  assert.equal(first.ok, true);
  assert.ok(Math.abs(first.analysis.blackWin - 0.7204) < 0.002);
  assert.ok(first.analysis.blackWin > first.analysis.whiteWin);
  assert.equal((await engine.analyze({ id: 'two', moveHistory: [112, 113] })).ok, true);
  const undo = await engine.analyze({ id: 'undo', moveHistory: [112] });
  assert.equal(first.analysis.blackWin, undo.analysis.blackWin);
  assert.equal(first.analysis.draw, undo.analysis.draw);
  await engine.stop();
  await waitUntil(() => owned.every((row) => !isAlive(row.ProcessId)));
  assert.equal((await engine.start()).state, 'ready');
  assert.equal((await engine.analyze({ id: 'empty', moveHistory: [] })).ok, true);
});

test('强制结束父进程后，Windows 守护进程和 Rapfi 都自动退出', async (t) => {
  const owner = spawn(process.execPath, ['tests-engine/fixtures/engine-owner.mjs'], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => owner.kill());
  let output = '';
  owner.stdout.on('data', (chunk) => {
    output += chunk;
  });
  await waitUntil(() => output.includes('READY'), 10_000);
  const owned = await engineProcesses(owner.pid);
  assert.equal(owned.length, 2);
  const closed = once(owner, 'close');
  owner.kill();
  await closed;
  await waitUntil(() => owned.every((row) => !isAlive(row.ProcessId)));
});
