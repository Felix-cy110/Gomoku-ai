import { AnalysisSource, type PositionAnalysis } from '../../shared/analysis.js';
import { Stone } from '../../shared/game-types.js';
import type { GameState } from './gomoku.js';

export interface AnalysisPoint {
  moveHistory: readonly number[];
  analysis: PositionAnalysis;
}

/** 仅保留当前落子序列的前缀，悔棋后的旧分支不能再次出现在曲线上。 */
export function retainAnalysisHistory(
  points: readonly AnalysisPoint[],
  moveHistory: readonly number[],
): AnalysisPoint[] {
  return points.filter(
    (point) =>
      point.moveHistory.length <= moveHistory.length &&
      point.moveHistory.every((move, index) => move === moveHistory[index]),
  );
}

export function terminalAnalysis(game: GameState): PositionAnalysis | undefined {
  if (!game.result) return undefined;
  return {
    blackWin: game.result === Stone.BLACK ? 1 : 0,
    whiteWin: game.result === Stone.WHITE ? 1 : 0,
    draw: game.result === 'draw' ? 1 : 0,
    source: AnalysisSource.TERMINAL,
    elapsedMs: 0,
  };
}
