import type { StoneColor } from '../types';

export const BOARD_SIZE = 15;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export interface GameState {
  board: (StoneColor | null)[];
  moves: number;
  moveHistory: readonly number[];
  turn: StoneColor;
  lastMove: number | null;
  result: StoneColor | 'draw' | null;
  winningLine: number[];
}

export function createGame(): GameState {
  return {
    board: Array<StoneColor | null>(CELL_COUNT).fill(null),
    moves: 0,
    moveHistory: [],
    turn: 'black',
    lastMove: null,
    result: null,
    winningLine: [],
  };
}

export function coordinate(index: number) {
  return `${String.fromCharCode(65 + (index % BOARD_SIZE))}${Math.floor(index / BOARD_SIZE) + 1}`;
}

function findWinningLine(board: GameState['board'], index: number, color: StoneColor): number[] {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  for (const [rowStep, colStep] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const line = [index];
    for (const direction of [-1, 1]) {
      let nextRow = row + rowStep * direction;
      let nextCol = col + colStep * direction;
      while (
        nextRow >= 0 &&
        nextRow < BOARD_SIZE &&
        nextCol >= 0 &&
        nextCol < BOARD_SIZE &&
        board[nextRow * BOARD_SIZE + nextCol] === color
      ) {
        const nextIndex = nextRow * BOARD_SIZE + nextCol;
        if (direction === -1) line.unshift(nextIndex);
        else line.push(nextIndex);
        nextRow += rowStep * direction;
        nextCol += colStep * direction;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

/** 非法落子或棋局结束后的落子不改变状态与历史。 */
export function playMove(state: GameState, index: number): GameState {
  if (
    state.result ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= CELL_COUNT ||
    state.board[index] !== null
  )
    return state;

  const board = [...state.board];
  board[index] = state.turn;
  const moves = state.moves + 1;
  const winningLine = findWinningLine(board, index, state.turn);
  return {
    board,
    moves,
    moveHistory: [...state.moveHistory, index],
    turn: state.turn === 'black' ? 'white' : 'black',
    lastMove: index,
    result: winningLine.length ? state.turn : moves === CELL_COUNT ? 'draw' : null,
    winningLine,
  };
}

/** 撤回最近一手；合法棋局在最后一手之前必然尚未结束。 */
export function undoMove(state: GameState): GameState {
  if (state.lastMove === null) return state;
  const turn = state.board[state.lastMove];
  if (turn === null) return state;

  const board = [...state.board];
  board[state.lastMove] = null;
  const moveHistory = state.moveHistory.slice(0, -1);
  return {
    board,
    moves: moveHistory.length,
    moveHistory,
    turn,
    lastMove: moveHistory.at(-1) ?? null,
    result: null,
    winningLine: [],
  };
}
