import { AnalysisSource, type PositionAnalysis } from '../../shared/analysis.js';
import { Stone } from '../../shared/game-types.js';
import type { GameState } from './gomoku.js';

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
