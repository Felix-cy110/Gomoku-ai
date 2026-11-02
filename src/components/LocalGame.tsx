import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, RotateCcw, Undo2 } from 'lucide-react';
import { BOARD_SIZE, coordinate, createGame, playMove, undoMove } from '../game/gomoku';
import WinningLine from './WinningLine';
import AnalysisPanel from './AnalysisPanel';
import { usePositionAnalysis } from '../hooks/usePositionAnalysis';
import { undoPlayerTurn } from '../game/single-player';
import { DIFFICULTIES, type GamePreferences } from '../types';
import '../game.css';

interface Props {
  onExit: () => void;
  onRules: () => void;
  onStone: () => void;
  soundEnabled: boolean;
  opponent?: GamePreferences;
}

const STAR_POINTS = [48, 56, 112, 168, 176];
const CENTER = 112;

export default function LocalGame({ onExit, onRules, onStone, soundEnabled, opponent }: Props) {
  const [game, setGame] = useState(createGame);
  const [analysisSession, setAnalysisSession] = useState(0);
  const [focusIndex, setFocusIndex] = useState(CENTER);
  const boardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finished = game.result !== null;
  const computerTurn = Boolean(opponent && game.turn !== opponent.color && !finished);
  const analysis = usePositionAnalysis(
    game,
    analysisSession,
    computerTurn ? opponent?.difficulty : undefined,
  );
  const blocked = finished || computerTurn || Boolean(opponent && !window.desktop?.analysis);
  const canUndo = opponent ? undoPlayerTurn(game, opponent.color) !== game : game.moves > 0;
  const stoneSoundRef = useRef(onStone);
  stoneSoundRef.current = onStone;
  const winningStart = game.winningLine[0];
  const winningEnd = game.winningLine[game.winningLine.length - 1];
  const status =
    game.result === 'draw'
      ? '本局和棋'
      : game.result
        ? `${game.result === 'black' ? '黑棋' : '白棋'}获胜`
        : `轮到${game.turn === 'black' ? '黑棋' : '白棋'}落子`;

  useEffect(() => {
    if (!computerTurn || analysis.computerMove === undefined) return;
    const next = playMove(game, analysis.computerMove);
    if (next === game) return;
    setGame((current) => (current === game ? next : current));
    stoneSoundRef.current();
  }, [game, computerTurn, analysis.computerMove]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  function placeStone(index: number) {
    if (blocked || game.board[index]) return;
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
    setAnalysisSession((current) => current + 1);
    setGame(createGame());
    focusCell(CENTER);
  }

  function undo() {
    if (!canUndo || game.lastMove === null) return;
    setGame((current) => (opponent ? undoPlayerTurn(current, opponent.color) : undoMove(current)));
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
            {opponent ? '与 Rapfi，落子过招。' : '两个人，一盘好棋。'}
          </h1>
          <p>
            {opponent
              ? `你执${opponent.color === 'black' ? '黑先行' : '白后行'}，Rapfi 执${opponent.color === 'black' ? '白' : '黑'}。先连成五子的一方获胜。`
              : '黑白轮流，落子即开始。先连成五子的一方获胜。'}
          </p>
        </div>
        <span className="game-mode-tag">
          <span className="status-dot" />
          {opponent
            ? `人机对弈 · ${DIFFICULTIES.find((item) => item.value === opponent.difficulty)?.label} · ${opponent.color === 'black' ? '执黑先行' : '执白后行'}`
            : '本地双人 · 自由五子棋'}
        </span>
      </div>

      <div className="game-layout">
        <div className="board-section">
          <div className="board-topline">
            <h2 aria-live="polite" aria-atomic="true">
              {status}
            </h2>
            <span className="board-move-summary">
              已落 <span data-testid="move-count">{game.moves} 手</span> · 最近{' '}
              <span data-testid="last-move">
                {game.lastMove === null ? '—' : coordinate(game.lastMove)}
              </span>
            </span>
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
                    aria-disabled={Boolean(stone) || blocked}
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
                <WinningLine start={winningStart} end={winningEnd} soundEnabled={soundEnabled} />
              )}
            </div>
          </div>
          <p className="board-help" id="board-help">
            {opponent && !window.desktop?.analysis
              ? '请在桌面客户端与 Rapfi 对弈'
              : computerTurn
                ? analysis.canRetry
                  ? '模型落子暂不可用，请重试分析'
                  : 'Rapfi 正在思考…'
                : '点击交叉点落子'}
            <span>方向键移动 · 空格 / Enter 落子</span>
          </p>
        </div>

        <aside className="game-info" aria-label="对局信息">
          <AnalysisPanel game={game} analysis={analysis} />
          <div className="game-players">
            {(['black', 'white'] as const).map((color) => (
              <div
                key={color}
                className={`game-player ${!finished && game.turn === color ? 'current-player' : ''}`}
              >
                <span className={`small-stone stone-${color}`} />
                <strong>
                  {color === 'black' ? '黑棋' : '白棋'}
                  {opponent ? ` · ${opponent.color === color ? '你' : 'Rapfi'}` : ''}
                </strong>
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
              disabled={!canUndo}
              title={opponent ? '撤回到你上一手之前' : '撤回最近一手'}
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
