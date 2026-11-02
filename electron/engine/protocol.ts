import type { AnalysisRequest, MoveRequest, Probabilities } from '../../shared/analysis.js';
import { Difficulty } from '../../shared/game-types.js';
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

function boardCommands(moveHistory: readonly number[], search: boolean): string {
  // YXBOARD 按时间顺序还原局面，不启动搜索，也不会替用户落子。
  const moves = moveHistory.map(
    (index, ply) =>
      `${index % BOARD_SIZE},${Math.floor(index / BOARD_SIZE)},${ply % 2 === 0 ? 1 : 2}`,
  );
  return [search ? 'BOARD' : 'YXBOARD', ...moves, 'DONE'].join('\n') + '\n';
}

export function positionCommands(moveHistory: readonly number[]): string {
  return boardCommands(moveHistory, false) + 'TRACESEARCH\nABOUT\n';
}

// 棋力档位通过搜索预算区分，不引入随机落子；实际耗时可能提前结束。
const SEARCH_LIMITS = {
  [Difficulty.EASY]: { timeMs: 200, depth: 4 },
  [Difficulty.NORMAL]: { timeMs: 700, depth: 10 },
  [Difficulty.HARD]: { timeMs: 1800, depth: 20 },
};

export function validateMoveRequest(input: unknown): { request: MoveRequest; game: GameState } {
  const { request, game } = validatePosition(input);
  const difficulty = (input as MoveRequest).difficulty;
  if (!Object.values(Difficulty).includes(difficulty)) throw new Error('棋力档位无效。');
  if (game.result) throw new Error('棋局已结束，不能请求落子。');
  return { request: { ...request, difficulty }, game };
}

export function moveCommands(request: MoveRequest): string {
  const limit = SEARCH_LIMITS[request.difficulty];
  return (
    `INFO TIMEOUT_TURN ${limit.timeMs}\nINFO TIMEOUT_MATCH 0\nINFO TIME_LEFT 2147483647\nINFO MAX_DEPTH ${limit.depth}\nINFO MAX_NODE 0\nINFO SHOW_DETAIL 0\n` +
    boardCommands(request.moveHistory, true)
  );
}

export function parseMove(lines: readonly string[], game: GameState): number {
  const coordinates = lines.filter((line) => /^\d+,\d+$/.test(line));
  if (coordinates.length !== 1) throw new Error('未收到唯一的模型落点。');
  const [x, y] = coordinates[0].split(',').map(Number);
  const move = y * BOARD_SIZE + x;
  if (x >= BOARD_SIZE || y >= BOARD_SIZE || playMove(game, move) === game)
    throw new Error('模型返回了无效落点。');
  return move;
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
