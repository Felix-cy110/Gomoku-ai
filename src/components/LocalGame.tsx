import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { BOARD_SIZE, coordinate, createGame, playMove, undoMove } from '../game/gomoku';
import '../game.css';

interface Props {
  onExit: () => void;
  onRules: () => void;
  onStone: () => void;
}

const STAR_POINTS = [48, 56, 112, 168, 176];
const CENTER = 112;

export default function LocalGame({ onExit, onRules, onStone }: Props) {
  const [game, setGame] = useState(createGame);
  const [focusIndex, setFocusIndex] = useState(CENTER);
  const boardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finished = game.result !== null;
  const winningStart = game.winningLine[0];
  const winningEnd = game.winningLine[game.winningLine.length - 1];
  const status =
    game.result === 'draw'
      ? '本局和棋'
      : game.result
        ? `${game.result === 'black' ? '黑棋' : '白棋'}获胜`
        : `轮到${game.turn === 'black' ? '黑棋' : '白棋'}落子`;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  function placeStone(index: number) {
    if (game.result || game.board[index]) return;
    setGame((current) => playMove(current, index));
    onStone();
  }

  function focusCell(index: number) {
    setFocusIndex(index);
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus();
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    let next = index;
    switch (event.key) {
      case 'ArrowUp':
        next = Math.max(0, row - 1) * BOARD_SIZE + col;
        break;
      case 'ArrowDown':
        next = Math.min(BOARD_SIZE - 1, row + 1) * BOARD_SIZE + col;
        break;
      case 'ArrowLeft':
        next = row * BOARD_SIZE + Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        next = row * BOARD_SIZE + Math.min(BOARD_SIZE - 1, col + 1);
        break;
      case 'Home':
        next = row * BOARD_SIZE;
        break;
      case 'End':
        next = row * BOARD_SIZE + BOARD_SIZE - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusCell(next);
  }

  function restart() {
    setGame(createGame());
    focusCell(CENTER);
  }

  function undo() {
    if (game.lastMove === null) return;
    setGame(undoMove);
    focusCell(game.lastMove);
  }

  return (
    <section className="local-game" aria-labelledby="game-heading">
      <div className="game-heading-row">
        <div>
          <button className="game-back" onClick={onExit}>
            <ArrowLeft size={15} />
            返回首页
          </button>
          <span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span>
          <h1 id="game-heading" ref={headingRef} tabIndex={-1}>
            两个人，一盘好棋。
          </h1>
          <p>黑白轮流，落子即开始。先连成五子的一方获胜。</p>
        </div>
        <span className="game-mode-tag">
          <span className="status-dot" />
          本地双人 · 自由五子棋
        </span>
      </div>

      <div className="game-layout">
        <div className="board-section">
          <div className="board-topline">
            <span>弈间 · 一局一会</span>
            <span>15 × 15</span>
          </div>
          <div className="play-board">
            <div className="board-column-labels" aria-hidden="true">
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <span key={i}>{String.fromCharCode(65 + i)}</span>
              ))}
            </div>
            <div className="board-row-labels" aria-hidden="true">
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <div
              ref={boardRef}
              className={`board-grid turn-${game.turn} ${finished ? 'game-finished' : ''}`}
              role="group"
              aria-label="五子棋棋盘"
              aria-describedby="board-help"
            >
              {game.board.map((stone, index) => {
                const row = Math.floor(index / BOARD_SIZE);
                const col = index % BOARD_SIZE;
                const winning = game.winningLine.includes(index);
                return (
                  <button
                    key={index}
                    type="button"
                    data-index={index}
                    data-stone={stone ?? 'empty'}
                    className={`board-cell ${row === 0 ? 'edge-top' : ''} ${row === 14 ? 'edge-bottom' : ''} ${col === 0 ? 'edge-left' : ''} ${col === 14 ? 'edge-right' : ''}`}
                    aria-label={`${coordinate(index)}，${stone ? (stone === 'black' ? '黑棋' : '白棋') : '空位'}${winning ? '，获胜连线' : ''}`}
                    aria-disabled={Boolean(stone) || finished}
                    tabIndex={index === focusIndex ? 0 : -1}
                    onFocus={() => setFocusIndex(index)}
                    onKeyDown={(event) => navigate(event, index)}
                    onClick={() => placeStone(index)}
                  >
                    {STAR_POINTS.includes(index) && <i className="board-star" aria-hidden="true" />}
                    {stone ? (
                      <span
                        className={`game-stone stone-${stone} ${winning ? 'winning-stone' : ''}`}
                        aria-hidden="true"
                      >
                        {game.lastMove === index && <i className="last-move-mark" />}
                      </span>
                    ) : (
                      <span className={`ghost-stone stone-${game.turn}`} aria-hidden="true" />
                    )}
                  </button>
                );
              })}
              {game.winningLine.length > 0 && (
                <svg
                  className="winning-line-overlay"
                  viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <line
                    className="winning-line"
                    x1={(winningStart % BOARD_SIZE) + 0.5}
                    y1={Math.floor(winningStart / BOARD_SIZE) + 0.5}
                    x2={(winningEnd % BOARD_SIZE) + 0.5}
                    y2={Math.floor(winningEnd / BOARD_SIZE) + 0.5}
                    pathLength="1"
                  />
                </svg>
              )}
            </div>
          </div>
          <p className="board-help" id="board-help">
            点击交叉点落子<span>方向键移动 · 空格 / Enter 落子</span>
          </p>
        </div>

        <aside className="game-info" aria-label="对局信息">
          <div className={`turn-card ${finished ? 'result-card' : ''}`}>
            <span className="eyebrow">{finished ? 'WELL PLAYED' : 'YOUR NEXT MOVE'}</span>
            <div className="turn-symbol" aria-hidden="true">
              {finished ? (
                <Trophy size={31} strokeWidth={1.4} />
              ) : (
                <span className={`game-turn-stone stone-${game.turn}`} />
              )}
            </div>
            <div role="status" aria-live="polite" aria-atomic="true">
              <h2>{status}</h2>
              <p>
                {finished
                  ? game.result === 'draw'
                    ? '棋盘已满，双方握手言和。'
                    : '五子相连，这一局下得漂亮。'
                  : game.moves === 0
                    ? '黑棋先行，等你落下第一子。'
                    : `第 ${game.moves + 1} 手，想好就落子吧。`}
              </p>
            </div>
            <div className="game-counters">
              <div>
                <span>已落子</span>
                <strong>
                  {game.moves}
                  <small> 手</small>
                </strong>
              </div>
              <div>
                <span>最近一手</span>
                <strong>{game.lastMove === null ? '—' : coordinate(game.lastMove)}</strong>
              </div>
            </div>
          </div>
          <div className="game-players">
            {(['black', 'white'] as const).map((color) => (
              <div
                key={color}
                className={`game-player ${!finished && game.turn === color ? 'current-player' : ''}`}
              >
                <span className={`small-stone stone-${color}`} />
                <strong>{color === 'black' ? '黑棋' : '白棋'}</strong>
                <span>
                  {game.result === color
                    ? '胜方'
                    : !finished && game.turn === color
                      ? '正在思考'
                      : color === 'black'
                        ? '先行'
                        : '后行'}
                </span>
              </div>
            ))}
          </div>
          <div className="game-actions">
            <button
              className="undo-button"
              onClick={undo}
              disabled={game.moves === 0}
              title="撤回最近一手"
            >
              <Undo2 size={16} aria-hidden="true" />
              悔棋
            </button>
            <button className="primary-button new-game-button" onClick={restart}>
              <RotateCcw size={16} />
              {finished ? '再来一局' : '重新开始'}
            </button>
          </div>
          <button className="game-rules-button" onClick={onRules}>
            <BookOpen size={15} />
            查看规则
            <ArrowUpRight size={15} />
          </button>
          <p className="game-small-note">
            不设禁手，五子及以上连线均获胜。
            <br />
            此刻，只管享受下一步。
          </p>
        </aside>
      </div>
    </section>
  );
}
