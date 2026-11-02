import { Stone, type StoneColor } from '../../shared/game-types.js';
import { undoMove, type GameState } from './gomoku.js';

/** 撤回到玩家上一手之前；执白时保留模型开局，避免撤回后立即重下。 */
export function undoPlayerTurn(game: GameState, playerColor: StoneColor): GameState {
  const firstPlayerMove = playerColor === Stone.BLACK ? 0 : 1;
  if (game.moves <= firstPlayerMove) return game;
  let previous = undoMove(game);
  if (previous.turn !== playerColor) previous = undoMove(previous);
  return previous;
}
