import { test, expect } from '@playwright/test';
import { BOARD_SIZE, CELL_COUNT, createGame, playMove, undoMove } from '../src/game/gomoku';

const at = (row: number, col: number) => row * BOARD_SIZE + col;

test('黑棋先下，合法落子交替，重复落子和越界不会改变棋局', () => {
  const start = createGame();
  const black = playMove(start, at(7, 7));
  expect(start.moves).toBe(0);
  expect(start.board[at(7, 7)]).toBeNull();
  expect(black.board[at(7, 7)]).toBe('black');
  expect(black.turn).toBe('white');
  for (const index of [at(7, 7), -1, CELL_COUNT, 1.5, NaN, Infinity]) {
    expect(playMove(black, index)).toBe(black);
  }
  const white = playMove(black, at(7, 8));
  expect(white.board[at(7, 8)]).toBe('white');
  expect(white.turn).toBe('black');
  expect(white.moves).toBe(2);
});

test('空棋盘悔棋不改变状态，连续悔棋恢复每一步且不修改原状态', () => {
  const start = createGame();
  expect(undoMove(start)).toBe(start);
  const first = playMove(start, at(7, 7));
  const second = playMove(first, at(7, 8));
  const third = playMove(second, at(6, 7));

  expect(undoMove(third)).toEqual(second);
  expect(undoMove(undoMove(third))).toEqual(first);
  expect(undoMove(undoMove(undoMove(third)))).toEqual(start);
  expect(third.board[at(6, 7)]).toBe('black');
  expect(third.moveHistory).toEqual([at(7, 7), at(7, 8), at(6, 7)]);
  expect(start.moveHistory).toEqual([]);
});

test('非法落子不进入历史，悔棋后换位置落子使用新的历史', () => {
  const first = playMove(createGame(), at(7, 7));
  const second = playMove(first, at(7, 8));
  const invalid = playMove(second, at(7, 7));
  expect(undoMove(invalid)).toEqual(first);

  const replacement = playMove(undoMove(second), at(8, 7));
  expect(replacement.board[at(7, 8)]).toBeNull();
  expect(replacement.board[at(8, 7)]).toBe('white');
  expect(replacement.lastMove).toBe(at(8, 7));
  expect(replacement.moves).toBe(2);
  expect(undoMove(replacement)).toEqual(first);
  expect(second.board[at(7, 8)]).toBe('white');
});

for (const color of ['black', 'white'] as const) {
  for (const [name, line] of [
    ['横向边缘', [0, 1, 2, 3, 4].map((col) => at(0, col))],
    ['纵向边缘', [0, 1, 2, 3, 4].map((row) => at(row, 14))],
    ['右下斜向', [0, 1, 2, 3, 4].map((i) => at(i, i))],
    ['左下斜向', [0, 1, 2, 3, 4].map((i) => at(i, 14 - i))],
  ] as const) {
    test(`${color === 'black' ? '黑棋' : '白棋'}${name}五连获胜，结束后不能继续落子`, () => {
      let game = createGame();
      let beforeWinningMove = game;
      for (let move = 0; move < 5; move++) {
        if (color === 'white') game = playMove(game, at(14, move * 2));
        if (move === 4) beforeWinningMove = game;
        game = playMove(game, line[move]);
        if (move < 4) {
          expect(game.result).toBeNull();
          if (color === 'black') game = playMove(game, at(14, move * 2));
        }
      }
      expect(game.result).toBe(color);
      expect(game.winningLine).toEqual(line);
      expect(playMove(game, at(10, 10))).toBe(game);
      expect(undoMove(game)).toEqual(beforeWinningMove);
      expect(playMove(undoMove(game), line[4])).toEqual(game);
    });
  }
}

test('补上中间缺口形成六连，同样获胜并标出完整连线', () => {
  let game = createGame();
  for (const [i, col] of [1, 2, 4, 5, 6].entries()) {
    game = playMove(game, at(7, col));
    expect(game.result).toBeNull();
    game = playMove(game, at(14, i * 2));
  }
  const beforeWinningMove = game;
  game = playMove(game, at(7, 3));
  expect(game.result).toBe('black');
  expect(game.winningLine).toEqual([1, 2, 3, 4, 5, 6].map((col) => at(7, col)));
  expect(undoMove(game)).toEqual(beforeWinningMove);
});

test('数组相邻的行尾与下一行行首不能算成连线', () => {
  let game = createGame();
  for (const [i, index] of [12, 13, 14, 15, 16].entries()) {
    game = playMove(game, index);
    game = playMove(game, at(14, i * 2));
  }
  expect(game.result).toBeNull();
  expect(game.winningLine).toEqual([]);
});

test('空位或对手棋子会打断连线', () => {
  for (const blocker of [false, true]) {
    let game = createGame();
    for (const [i, col] of [0, 1, 2, 4, 5].entries()) {
      game = playMove(game, at(6, col));
      game = playMove(game, blocker && i === 0 ? at(6, 3) : at(14, i * 2));
    }
    expect(game.result).toBeNull();
  }
});

test('225 个交叉点下满且无人五连时判和，重新开始清空棋盘', () => {
  const black: number[] = [];
  const white: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      ((row + Math.floor(col / 2)) % 2 === 0 ? black : white).push(at(row, col));
    }
  }
  let game = createGame();
  let beforeLastMove = game;
  for (let move = 0; move < CELL_COUNT; move++) {
    const index = (move % 2 === 0 ? black : white)[Math.floor(move / 2)];
    if (move === CELL_COUNT - 1) beforeLastMove = game;
    game = playMove(game, index);
    if (move < CELL_COUNT - 1) expect(game.result).toBeNull();
  }
  expect(game.result).toBe('draw');
  expect(game.moves).toBe(CELL_COUNT);
  expect(playMove(game, 0)).toBe(game);
  expect(undoMove(game)).toEqual(beforeLastMove);
  expect(playMove(undoMove(game), game.lastMove!)).toEqual(game);
  const fresh = createGame();
  expect(fresh.board.every((stone) => stone === null)).toBe(true);
  expect(fresh.turn).toBe('black');
  expect(fresh.result).toBeNull();
  expect(fresh.moveHistory).toEqual([]);
});
