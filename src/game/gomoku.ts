import type { StoneColor } from '../types';

export const BOARD_SIZE = 15;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export interface GameState {
  board: (StoneColor | null)[];
  moves: number;
  turn: StoneColor;
  lastMove: number | null;
  result: StoneColor | 'draw' | null;
  winningLine: number[];
}

export function createGame(): GameState {
  return {
    board: Array<StoneColor | null>(CELL_COUNT).fill(null),
    moves: 0,
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

/** Invalid and post-game moves leave the entire state unchanged. */
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
    turn: state.turn === 'black' ? 'white' : 'black',
    lastMove: index,
    result: winningLine.length ? state.turn : moves === CELL_COUNT ? 'draw' : null,
    winningLine,
  };
}
