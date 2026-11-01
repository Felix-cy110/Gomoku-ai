import type { AnalysisRequest, Probabilities } from '../../shared/analysis.js';
import {
  BOARD_SIZE,
  CELL_COUNT,
  createGame,
  playMove,
  type GameState,
} from '../../src/game/gomoku.js';

export function validatePosition(input: unknown): { request: AnalysisRequest; game: GameState } {
  if (!input || typeof input !== 'object') throw new Error('分析请求无效。');
  const request = input as AnalysisRequest;
  if (typeof request.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(request.id))
    throw new Error('分析请求编号无效。');
  if (!Array.isArray(request.moveHistory) || request.moveHistory.length > CELL_COUNT)
    throw new Error('落子序列无效。');
  let game = createGame();
  for (const index of request.moveHistory) {
    const next = playMove(game, index);
    if (next === game) throw new Error('落子序列包含重复、越界或终局后的落子。');
    game = next;
  }
  return { request: { id: request.id, moveHistory: [...request.moveHistory] }, game };
}

export function positionCommands(moveHistory: readonly number[]): string {
  // YXBOARD 按时间顺序还原局面，不启动搜索，也不会替用户落子。
  const moves = moveHistory.map(
    (index, ply) =>
      `${index % BOARD_SIZE},${Math.floor(index / BOARD_SIZE)},${ply % 2 === 0 ? 1 : 2}`,
  );
  return ['YXBOARD', ...moves, 'DONE', 'TRACESEARCH', 'ABOUT'].join('\n') + '\n';
}

export function parseProbabilities(lines: readonly string[]): Probabilities {
  const line = lines.find((entry) => entry.startsWith('MESSAGE Evaluator Eval[Black]:'));
  const match = line?.match(/WR:\s*([\d.eE+-]+)\s+LR:\s*([\d.eE+-]+)\s+DR:\s*([\d.eE+-]+)/);
  if (!match) throw new Error('未收到神经网络概率，请检查 Rapfi 配置与权重。');
  const values = match.slice(1).map(Number);
  const sum = values.reduce((total, value) => total + value, 0);
  if (
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
    Math.abs(sum - 1) > 0.001
  )
    throw new Error('引擎返回的概率无效。');
  // 官方诊断输出保留四位小数，归一化仅消除舍入误差。
  return { blackWin: values[0] / sum, whiteWin: values[1] / sum, draw: values[2] / sum };
}
